import {execFile} from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {createHash, randomUUID} from 'crypto';
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

/** Masks of recent photos (by content), so Clean background + Generate find the garment once */
const maskCache = new Map<string, GarmentMask>();
const MASK_CACHE_SIZE = 24;

/** Garment mask for the photo, from the segmentation model (8–15 s the first time, then cached) */
export async function segmentGarment(photo: Photo): Promise<GarmentMask> {
    const key = createHash('sha1').update(photo.data).update(`${photo.width}x${photo.height}`).digest('hex');
    const cached = maskCache.get(key);
    if (cached) {
        maskCache.delete(key);
        maskCache.set(key, cached);
        return cached;
    }
    const mask = await runSegmentation(photo);
    maskCache.set(key, mask);
    if (maskCache.size > MASK_CACHE_SIZE) maskCache.delete(maskCache.keys().next().value!);
    return mask;
}

async function runSegmentation(photo: Photo): Promise<GarmentMask> {
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

/** Size of a clean product photo (4:5, as the store shows products) */
const STUDIO = {width: 1000, height: 1250, fill: 0.84};

/**
 * A shop photo taken anywhere (on a bed, floor or mat) turned into a catalogue
 * photo: the garment is cut out with its mask and placed in the middle of a
 * plain white background with a soft shadow. The garment itself is not
 * changed, so its colour, texture and labels stay exactly as photographed.
 */
/** Keep only the biggest connected piece of the mask (drops stray bits of background) */
const largestPiece = (alpha: Buffer, width: number, height: number) => {
    const label = new Int32Array(width * height);
    const stack: number[] = [];
    let best = 0;
    let bestSize = 0;
    let next = 0;
    for (let start = 0; start < alpha.length; start++) {
        if (alpha[start] <= 128 || label[start]) continue;
        next++;
        let size = 0;
        label[start] = next;
        stack.push(start);
        while (stack.length) {
            const i = stack.pop()!;
            size++;
            const x = i % width;
            for (const j of [i - width, i + width, x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1]) {
                if (j >= 0 && j < alpha.length && !label[j] && alpha[j] > 128) {
                    label[j] = next;
                    stack.push(j);
                }
            }
        }
        if (size > bestSize) {
            bestSize = size;
            best = next;
        }
    }
    for (let i = 0; i < alpha.length; i++) if (alpha[i] > 128 && label[i] !== best) alpha[i] = 0;
};

export async function studioPhoto(photo: Photo, mask: GarmentMask, paint: Buffer = photo.data): Promise<Buffer> {
    const {width, height} = photo;
    const {main} = fabricOf(photo, mask);
    // How deep inside the garment each pixel is: low values = near the edge
    const n = width * height;
    const depth = await sharp(mask, {raw: {width, height, channels: 1}}).blur(10).extractChannel(0).raw().toBuffer();
    // The fabric colour around each edge pixel: the average of nearby pixels well
    // inside the garment (so a shadowed hem is compared with the shadowed fabric)
    const inner = Buffer.alloc(n);
    const innerRgb = Buffer.alloc(n * 3);
    for (let i = 0; i < n; i++) {
        if (mask[i] < 250 || depth[i] < 250) continue;
        inner[i] = 255;
        innerRgb[i * 3] = photo.data[i * 3];
        innerRgb[i * 3 + 1] = photo.data[i * 3 + 1];
        innerRgb[i * 3 + 2] = photo.data[i * 3 + 2];
    }
    const [weight, sum] = await Promise.all([
        sharp(inner, {raw: {width, height, channels: 1}}).blur(16).extractChannel(0).raw().toBuffer(),
        sharp(innerRgb, {raw: {width, height, channels: 3}}).blur(16).raw().toBuffer(),
    ]);
    // Tighten the mask edge a little so no background fringe comes along, and drop
    // edge pixels that are clearly not the fabric (bits of mat, floor or bedsheet)
    const alpha = Buffer.alloc(n);
    for (let i = 0; i < n; i++) {
        let a = Math.max(0, Math.min(255, Math.round(((mask[i] - 70) * 255) / 150)));
        if (a && depth[i] < 245) {
            const [r, g, b] = [photo.data[i * 3], photo.data[i * 3 + 1], photo.data[i * 3 + 2]];
            const near = weight[i] >= 8 ? [0, 1, 2].map((c) => (sum[i * 3 + c] * 255) / weight[i]) : main;
            const d = Math.hypot(r - near[0], g - near[1], b - near[2]);
            const chromaJump = chromaOf(r, g, b) - chromaOf(near[0], near[1], near[2]);
            const darker = luma(r, g, b) < luma(near[0], near[1], near[2]) * 0.6;
            if (d > 55 && (chromaJump > 0.1 || darker)) a = 0;
        }
        alpha[i] = a;
    }
    largestPiece(alpha, width, height);
    // Smooth the outline: removes single-pixel specks and gives a clean, soft edge
    const smooth = await sharp(alpha, {raw: {width, height, channels: 1}}).blur(2.2).extractChannel(0).raw().toBuffer();
    for (let i = 0; i < n; i++) alpha[i] = Math.max(0, Math.min(255, Math.round(((smooth[i] - 165) * 255) / 80)));
    let minX = width, minY = height, maxX = -1, maxY = -1, area = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const a = alpha[i];
            if (a > 128) {
                area++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0 || area < width * height * 0.03) throw new Error('No garment found in the photo');
    if (area > width * height * 0.97) throw new Error('The garment fills the whole photo; nothing to clean');

    // Phone photos indoors are dim: lift the garment so its bright parts are near
    // white (same gain on every channel, so the colour itself does not change)
    const lumas: number[] = [];
    for (let i = 0; i < width * height; i += 7) if (alpha[i] > 200) lumas.push(luma(photo.data[i * 3], photo.data[i * 3 + 1], photo.data[i * 3 + 2]));
    lumas.sort((x, y) => x - y);
    const bright = lumas[Math.floor(lumas.length * 0.97)] ?? 255;
    const gain = Math.min(1.35, Math.max(1, 235 / Math.max(1, bright)));
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        rgba[i * 4] = Math.min(255, Math.round(paint[i * 3] * gain));
        rgba[i * 4 + 1] = Math.min(255, Math.round(paint[i * 3 + 1] * gain));
        rgba[i * 4 + 2] = Math.min(255, Math.round(paint[i * 3 + 2] * gain));
        rgba[i * 4 + 3] = alpha[i];
    }
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const scale = Math.min((STUDIO.width * STUDIO.fill) / boxW, (STUDIO.height * STUDIO.fill) / boxH);
    const w = Math.max(1, Math.round(boxW * scale));
    const h = Math.max(1, Math.round(boxH * scale));
    const garment = await sharp(rgba, {raw: {width, height, channels: 4}})
        .extract({left: minX, top: minY, width: boxW, height: boxH})
        .resize(w, h, {kernel: 'lanczos3'})
        .png()
        .toBuffer();
    // Soft shadow: the garment's shape, dark, blurred and slightly lower
    const shape = await sharp(garment).extractChannel(3).raw().toBuffer();
    const shadowRgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) shadowRgba[i * 4 + 3] = Math.round(shape[i] * 0.22);
    const pad = 40;
    const shadow = await sharp(shadowRgba, {raw: {width: w, height: h, channels: 4}})
        .extend({top: pad, bottom: pad, left: pad, right: pad, background: {r: 0, g: 0, b: 0, alpha: 0}})
        .blur(14)
        .png()
        .toBuffer();
    const left = Math.round((STUDIO.width - w) / 2);
    const top = Math.round((STUDIO.height - h) / 2);
    return sharp({create: {width: STUDIO.width, height: STUDIO.height, channels: 3, background: '#ffffff'}})
        .composite([
            {input: shadow, left: left - pad, top: top - pad + 10},
            {input: garment, left, top},
        ])
        .jpeg({quality: 90, mozjpeg: true})
        .toBuffer();
}


/** Everyday colour names, to tell an image AI what colour the garment is */
const COLOUR_NAMES: [string, number, number, number][] = [
    ['white', 245, 245, 245], ['off-white', 236, 230, 214], ['cream', 240, 228, 196], ['beige', 216, 195, 165],
    ['light grey', 200, 200, 200], ['grey', 140, 140, 140], ['charcoal grey', 70, 72, 76], ['black', 25, 25, 25],
    ['navy blue', 30, 40, 80], ['royal blue', 50, 80, 180], ['sky blue', 140, 190, 230], ['teal', 0, 128, 128],
    ['turquoise', 64, 200, 200], ['sage green', 180, 195, 165], ['mint green', 170, 225, 190], ['olive green', 110, 115, 55],
    ['bottle green', 20, 80, 50], ['green', 50, 140, 70], ['lime green', 170, 210, 60], ['mustard yellow', 210, 165, 40],
    ['yellow', 240, 215, 60], ['orange', 235, 125, 40], ['peach', 245, 190, 160], ['coral', 240, 120, 100],
    ['red', 200, 40, 45], ['maroon', 120, 25, 40], ['wine', 95, 25, 45], ['pink', 235, 150, 180],
    ['baby pink', 245, 200, 210], ['magenta', 200, 40, 130], ['lavender', 190, 170, 220], ['purple', 110, 50, 140],
    ['brown', 120, 80, 50], ['tan', 190, 150, 105], ['khaki', 185, 175, 130], ['rust', 170, 75, 40],
];

/** The garment's main colour measured from the photo, e.g. {name: 'sage green', hex: '#B9C7A8'} */
export function garmentColour(photo: Photo, mask: GarmentMask) {
    const {main} = fabricOf(photo, mask);
    const [r, g, b] = main;
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    // Weighted distance, closer to how people see colour differences
    const dist = ([, R, G, B]: [string, number, number, number]) => 2 * (r - R) ** 2 + 4 * (g - G) ** 2 + 3 * (b - B) ** 2;
    const name = [...COLOUR_NAMES].sort((x, y) => dist(x) - dist(y))[0][0];
    return {name, hex};
}
