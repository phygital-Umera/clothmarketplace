import {execFile} from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {randomUUID} from 'crypto';
import sharp from 'sharp';

/*
 * Colour photos of a garment: the garment changes colour, nothing else does.
 *
 *   1. segmentGarment()  — a local segmentation model (no key, no internet)
 *      finds the garment. It runs in its own process (see workers/segment.cjs).
 *   2. recolourGarment() — inside that mask the main fabric takes the new
 *      colour and keeps its own light and shade, so folds, seams, stitching
 *      and texture stay. Details far from the fabric colour (labels,
 *      embroidery, contrast trims) are left as they are. Outside the mask the
 *      photo is untouched, pixel for pixel.
 *   3. checkRecolour()   — before anything is saved: background unchanged,
 *      garment really in the new colour, and (for AI results) the garment
 *      still has the original's shape and folds — no stripes or new patterns.
 */

const WORK_MAX = 1024;

export type Photo = {data: Buffer; width: number; height: number};
export type GarmentMask = Buffer; // one byte per pixel, 0 = background, 255 = garment

/** The photo as raw RGB at working size (longest side 1024) */
export const loadPhoto = async (image: Buffer): Promise<Photo> => {
    const {data, info} = await sharp(image)
        .rotate()
        .resize(WORK_MAX, WORK_MAX, {fit: 'inside', withoutEnlargement: true})
        .flatten({background: '#ffffff'})
        .removeAlpha()
        .toColourspace('srgb')
        .raw()
        .toBuffer({resolveWithObject: true});
    if (info.channels !== 3) throw new Error(`Unexpected photo format (${info.channels} channels)`);
    return {data, width: info.width, height: info.height};
};

const WORKER = path.resolve(__dirname, '../../workers/segment.cjs');

/** Garment mask for the photo, from the segmentation model (8–15 s, once per photo) */
export async function segmentGarment(photo: Photo): Promise<GarmentMask> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'garment-'));
    const input = path.join(dir, `${randomUUID()}.png`);
    const output = path.join(dir, 'cut.png');
    try {
        await sharp(photo.data, {raw: {width: photo.width, height: photo.height, channels: 3}}).png().toFile(input);
        await new Promise<void>((resolve, reject) =>
            execFile(process.execPath, [WORKER, input, output], {timeout: 180_000, windowsHide: true}, (error, _out, stderr) =>
                error ? reject(new Error(stderr?.trim() || error.message)) : resolve(),
            ),
        );
        return await sharp(output)
            .resize(photo.width, photo.height, {fit: 'fill'})
            .ensureAlpha()
            .extractChannel(3)
            .raw()
            .toBuffer();
    } finally {
        await fs.rm(dir, {recursive: true, force: true}).catch(() => undefined);
    }
}

const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const hue = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
};

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const median = (values: number[]) => {
    const s = [...values].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 0;
};

/** The garment's main fabric colour (median of garment pixels) and its lightness */
const fabricOf = (photo: Photo, mask: GarmentMask) => {
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    const step = Math.max(1, Math.floor((photo.width * photo.height) / 60000));
    for (let i = 0; i < photo.width * photo.height; i += step) {
        if (mask[i] < 200) continue;
        rs.push(photo.data[i * 3]);
        gs.push(photo.data[i * 3 + 1]);
        bs.push(photo.data[i * 3 + 2]);
    }
    const main = [median(rs), median(gs), median(bs)];
    return {main, light: rgbToHsl(main[0], main[1], main[2])[2]};
};

const chromaOf = (r: number, g: number, b: number) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

/**
 * How much of this garment pixel is main fabric (1) versus a detail to keep
 * (0): labels, embroidery, contrast trims, a dress form.
 * Coloured fabric: same hue (incl. its sheen and shadows) is fabric, a
 * different hue is a detail. White / black / grey fabric: any clearly
 * coloured pixel is a detail.
 */
const fabricWeight = (main: number[]) => {
    // Off-white, ivory, cream, grey and black count as neutral fabric
    const neutral = chromaOf(main[0], main[1], main[2]) < 0.16;
    const [mh] = rgbToHsl(main[0], main[1], main[2]);
    return (r: number, g: number, b: number) => {
        const chroma = chromaOf(r, g, b);
        if (neutral) {
            const own = chromaOf(main[0], main[1], main[2]);
            const lo = own + 0.06;
            const hi = own + 0.12;
            return chroma < lo ? 1 : chroma > hi ? 0 : (hi - chroma) / (hi - lo);
        }
        if (chroma < 0.08) return 1; // grey sheen or deep shadow on the fabric
        const [h] = rgbToHsl(r, g, b);
        const gap = Math.min(Math.abs(h - mh), 1 - Math.abs(h - mh));
        return gap < 0.06 ? 1 : gap > 0.12 ? 0 : (0.12 - gap) / 0.06;
    };
};

/** The photo with its garment in `hex`; background pixels are copied unchanged */
export function recolourGarment(photo: Photo, mask: GarmentMask, hex: string): Buffer {
    const {main, light: fabricLight} = fabricOf(photo, mask);
    const [th, ts, tl] = rgbToHsl(...hexToRgb(hex));
    // Leave room for shading on very dark and very light colours
    const base = Math.min(0.9, Math.max(0.12, tl));
    const isFabric = fabricWeight(main);
    const out = Buffer.from(photo.data);
    for (let i = 0; i < photo.width * photo.height; i++) {
        const a = mask[i] / 255;
        if (a === 0) continue;
        const r = photo.data[i * 3];
        const g = photo.data[i * 3 + 1];
        const b = photo.data[i * 3 + 2];
        const weight = a * isFabric(r, g, b);
        if (weight === 0) continue;
        const l = rgbToHsl(r, g, b)[2];
        const nl = Math.min(0.97, Math.max(0.02, base + (l - fabricLight) * 0.95));
        const [nr, ng, nb] = hslToRgb(th, ts, nl);
        out[i * 3] = Math.round(r * (1 - weight) + nr * weight);
        out[i * 3 + 1] = Math.round(g * (1 - weight) + ng * weight);
        out[i * 3 + 2] = Math.round(b * (1 - weight) + nb * weight);
    }
    return out;
}

/** Use the AI's garment, but keep the original photo outside the mask */
export async function compositeGarment(photo: Photo, mask: GarmentMask, generated: Buffer): Promise<Buffer> {
    const ai = await sharp(generated)
        .resize(photo.width, photo.height, {fit: 'fill'})
        .flatten({background: '#ffffff'})
        .removeAlpha()
        .toColourspace('srgb')
        .raw()
        .toBuffer();
    const out = Buffer.from(photo.data);
    for (let i = 0; i < photo.width * photo.height; i++) {
        const a = mask[i] / 255;
        if (a === 0) continue;
        for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(photo.data[i * 3 + c] * (1 - a) + ai[i * 3 + c] * a);
    }
    return out;
}

export type Check = {ok: boolean; reason?: string; colourDistance: number; backgroundChange: number; structure: number};

/**
 * Is this a correct colour photo? Compares it with the original:
 *  - background: average change outside the garment must be ~0
 *  - colour: the garment's fabric must be close to the chosen colour
 *  - structure: light and shade inside the garment must follow the original
 *    (an image with stripes or a new pattern does not)
 */
export function checkRecolour(photo: Photo, mask: GarmentMask, result: Buffer, hex: string): Check {
    const target = hexToRgb(hex);
    const [th, tsat, tl] = rgbToHsl(...target);
    const {main} = fabricOf(photo, mask);
    const isFabric = fabricWeight(main);
    let bgDiff = 0;
    let bgCount = 0;
    const origL: number[] = [];
    const newL: number[] = [];
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    const step = Math.max(1, Math.floor((photo.width * photo.height) / 80000));
    for (let i = 0; i < photo.width * photo.height; i += step) {
        const o = [photo.data[i * 3], photo.data[i * 3 + 1], photo.data[i * 3 + 2]];
        const n = [result[i * 3], result[i * 3 + 1], result[i * 3 + 2]];
        if (mask[i] < 20) {
            bgDiff += (Math.abs(o[0] - n[0]) + Math.abs(o[1] - n[1]) + Math.abs(o[2] - n[2])) / 3;
            bgCount++;
        } else if (mask[i] > 230 && isFabric(o[0], o[1], o[2]) === 1) {
            origL.push(luma(o[0], o[1], o[2]));
            newL.push(luma(n[0], n[1], n[2]));
            rs.push(n[0]);
            gs.push(n[1]);
            bs.push(n[2]);
        }
    }
    const backgroundChange = bgCount ? bgDiff / bgCount : 0;

    // Colour: hue and saturation must match; lightness may vary with shading
    const [gh, gsat, gl] = rgbToHsl(median(rs), median(gs), median(bs));
    const hueGap = Math.min(Math.abs(gh - th), 1 - Math.abs(gh - th));
    const colourDistance =
        tsat < 0.15
            ? Math.abs(gl - tl) * 2 + gsat // black, white, grey, beige-ish
            : hueGap * 4 + Math.abs(gsat - tsat) + Math.abs(gl - tl);

    // Structure: correlation of light and shade with the original fabric
    const n = origL.length;
    const mean = (a: number[]) => a.reduce((t, v) => t + v, 0) / (a.length || 1);
    const mo = mean(origL);
    const mn = mean(newL);
    let cov = 0;
    let vo = 0;
    let vn = 0;
    for (let k = 0; k < n; k++) {
        cov += (origL[k] - mo) * (newL[k] - mn);
        vo += (origL[k] - mo) ** 2;
        vn += (newL[k] - mn) ** 2;
    }
    const structure = vo && vn ? cov / Math.sqrt(vo * vn) : 1;

    const reason =
        n < 200
            ? 'No garment found in the photo'
            : backgroundChange > 3
              ? 'The background changed'
              : colourDistance > 0.6
                ? 'The garment is not in the chosen colour'
                : structure < 0.55
                  ? 'The garment lost its original look (a pattern or stripes appeared)'
                  : undefined;
    return {
        ok: !reason,
        reason,
        colourDistance: Math.round(colourDistance * 100) / 100,
        backgroundChange: Math.round(backgroundChange * 10) / 10,
        structure: Math.round(structure * 100) / 100,
    };
}

/** Raw RGB back to a JPEG */
export const toJpeg = (photo: Photo, rgb: Buffer) =>
    sharp(rgb, {raw: {width: photo.width, height: photo.height, channels: 3}}).jpeg({quality: 88, mozjpeg: true}).toBuffer();
