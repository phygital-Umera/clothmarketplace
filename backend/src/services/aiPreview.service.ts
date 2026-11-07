import {Request} from 'express';
import httpStatus from 'http-status';
import sharp from 'sharp';
import {PreviewStatus} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {readStoredImage, storeGenerated} from '../utils/fileStore';
import {config, logger} from '@config/index';
import shopProductService, {ShopScope} from './shopProduct.service';
import {Photo, checkRecolour, compositeGarment, garmentColour, loadPhoto, recolourGarment, segmentGarment, studioPhoto, toJpeg} from '../utils/recolour';

/*
 * AI color previews (Cloudflare Workers AI, FLUX.2 image editing).
 * The uploaded product image is only read: each preview is a new file and a
 * ProductColorPreview row, one per (product, color, source image).
 */

// FLUX.2 [klein] only accepts input images smaller than 512x512
const INPUT_MAX = 511;
const OUTPUT_SIZE = 1024;
const TIMEOUT_MS = 90_000;

class QuotaError extends Error {}

const promptFor = (colorName: string, hex: string) =>
    [
        `Professional e-commerce product photo of the exact garment from image 0, recoloured to ${colorName} (${hex.toUpperCase()}).`,
        'Keep the garment identical: same design, cut, silhouette, stitching, seams, pattern, print, fabric texture, buttons, logos and proportions.',
        'Change only the main fabric colour.',
        'Plain warm ivory studio backdrop (#F3F0EA), soft diffused lighting, subtle natural shadow, sharp focus, editorial fashion catalogue style.',
    ].join(' ');

/**
 * The model returns a square image, so the photo is padded to a square first
 * (and the result cropped back), otherwise the garment would be stretched.
 */
const squareOf = (photo: Photo) => {
    const side = Math.max(photo.width, photo.height);
    return {side, left: Math.floor((side - photo.width) / 2), top: Math.floor((side - photo.height) / 2)};
};
const toModelInput = (photo: Photo) => {
    const sq = squareOf(photo);
    return sharp(photo.data, {raw: {width: photo.width, height: photo.height, channels: 3}})
        .extend({top: sq.top, bottom: sq.side - photo.height - sq.top, left: sq.left, right: sq.side - photo.width - sq.left, background: '#ffffff'})
        .resize(INPUT_MAX, INPUT_MAX)
        .png()
        .toBuffer();
};
/** The model's square output, back to the photo's own shape and size */
const fromModelOutput = async (photo: Photo, base64: string) => {
    const sq = squareOf(photo);
    return sharp(Buffer.from(base64, 'base64'))
        .resize(sq.side, sq.side, {fit: 'fill'})
        .extract({left: sq.left, top: sq.top, width: photo.width, height: photo.height})
        .png()
        .toBuffer();
};

export const PHOTO_STYLES = ['GHOST', 'MANNEQUIN', 'MODEL'] as const;
export type PhotoStyle = (typeof PHOTO_STYLES)[number];

/** How a saree / lehenga / dupatta is worn, so the AI drapes it properly */
const drapeHint = (kind: string) => {
    const k = kind.toLowerCase();
    if (/saree|sari/.test(k)) return 'Drape the saree in the traditional Nivi style with the pallu over the left shoulder, showing its border and pallu design.';
    if (/lehenga|ghagra|chaniya/.test(k)) return 'Show the lehenga skirt with its full flare, the blouse (choli) and the dupatta draped over one shoulder.';
    if (/dupatta|stole|shawl/.test(k)) return 'Drape it naturally over the shoulders so its border and print are visible.';
    if (/kurta|kurti|anarkali|salwar|suit/.test(k)) return 'Show the full length of the kurta with its natural fall.';
    return '';
};

/** Who wears it, from the product's gender */
const wearer = (gender: string) =>
    gender === 'MEN' ? {who: "men's", model: 'a male Indian fashion model'}
    : gender === 'WOMEN' ? {who: "women's", model: 'a female Indian fashion model'}
    : gender === 'BOYS' ? {who: "boys'", model: 'a young Indian boy model'}
    : gender === 'GIRLS' ? {who: "girls'", model: 'a young Indian girl model'}
    : gender === 'KIDS' ? {who: "kids'", model: 'an Indian child model'}
    : {who: '', model: 'an Indian fashion model'};

export type GarmentBrief = {gender: string; kind: string; colour: {name: string; hex: string}; details?: string};

/**
 * Prompt for a catalogue photo of the shop's garment, in the chosen style.
 * The more exact the garment description (colour measured from the photo, who
 * it is for, its type and the shop's own notes), the less the AI invents.
 */
const professionalPrompt = (style: PhotoStyle, g: GarmentBrief) => {
    const {who, model} = wearer(g.gender);
    const garment = [`${who} ${g.colour.name} (${g.colour.hex})`.trim(), g.kind, g.details ? `(${g.details})` : ''].filter(Boolean).join(' ');
    return [
        style === 'MODEL'
            ? `Professional e-commerce catalogue photo: ${model} wearing the exact garment from image 0, a ${garment}. Natural standing pose, front view, the whole garment visible, neutral expression, plain matching bottom wear if the garment is a top.`
            : style === 'MANNEQUIN'
              ? `Professional e-commerce catalogue photo of the exact garment from image 0, a ${garment}, worn by a plain white headless dress-form mannequin, front view, the whole garment visible.`
              : `Professional e-commerce catalogue photo of the exact garment from image 0, a ${garment}. Ghost-mannequin (invisible mannequin) shot: the garment has natural 3D body volume as if worn, front view; no person and no mannequin visible.`,
        drapeHint(`${g.kind} ${g.details ?? ''}`),
        `Keep the garment identical to image 0: exactly ${g.colour.name} (${g.colour.hex}), same collar or neckline, same sleeves, same fabric texture, weave or knit, same print, embroidery and border, same cuffs, hem, labels and proportions.`,
        'Do not add zips, buttons, pockets, hoods, logos or prints that are not in image 0.',
        'Pure white seamless studio background, soft even lighting, subtle natural shadow, sharp focus, high-end fashion catalogue quality.',
    ]
        .filter(Boolean)
        .join(' ');
};

/** Size of an AI professional photo (4:5, as the store shows products; multiples of 16) */
const PRO_SIZE = {width: 832, height: 1040};

/** Built-in recolour, used when no Cloudflare AI keys are set */
export const LOCAL_MODEL = 'built-in-recolour';

class AiPreviewService {
    /** Cloudflare Workers AI when its keys are set, otherwise the built-in recolour */
    get aiReady() {
        return !!(config.ai.cloudflareAccountId && config.ai.cloudflareApiToken);
    }

    get model() {
        return this.aiReady && config.ai.colourWithAi ? config.ai.imageModel : LOCAL_MODEL;
    }

    /** Only for callers that need the AI itself */
    public assertConfigured() {
        if (!config.ai.cloudflareAccountId || !config.ai.cloudflareApiToken) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                'AI preview is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN to the backend .env',
            );
        }
    }

    /** One call to Workers AI; returns the generated image as base64 */
    private async run(prompt: string, image: Buffer, size = {width: OUTPUT_SIZE, height: OUTPUT_SIZE}, model = config.ai.imageModel): Promise<string> {
        const form = new FormData();
        form.append('prompt', prompt);
        form.append(
            'input_image_0',
            new Blob([new Uint8Array(image)], {type: 'image/png'}),
            'source.png',
        );
        form.append('width', String(size.width));
        form.append('height', String(size.height));

        const url = `https://api.cloudflare.com/client/v4/accounts/${config.ai.cloudflareAccountId}/ai/run/${model}`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: {Authorization: `Bearer ${config.ai.cloudflareApiToken}`},
                body: form,
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (error) {
            const timeout = error instanceof Error && error.name === 'TimeoutError';
            throw new Error(
                timeout
                    ? 'The AI service took too long, try again'
                    : 'Could not reach the AI service',
            );
        }

        // Usually JSON {result: {image: base64}}; accept raw image bytes too
        const type = res.headers.get('content-type') ?? '';
        if (res.ok && type.startsWith('image/')) {
            return Buffer.from(await res.arrayBuffer()).toString('base64');
        }
        const body = (await res.json().catch(() => null)) as {
            result?: {image?: string};
            errors?: {message?: string}[];
        } | null;
        if (res.ok && body?.result?.image) return body.result.image;

        const message =
            body?.errors
                ?.map((e) => e.message)
                .filter(Boolean)
                .join('; ') || res.statusText;
        logger.warn(`Workers AI preview failed (${res.status}): ${message}`);
        if (res.status === 429 || /neuron|quota|limit/i.test(message)) {
            throw new QuotaError("Today's free AI allowance is used up. It resets at 5:30 AM (India time); try again after that.");
        }
        if (res.status === 401 || res.status === 403) {
            throw new Error('The AI service rejected the API token; check CLOUDFLARE_AI_API_TOKEN');
        }
        throw new Error(`AI generation failed: ${message}`);
    }

    /**
     * One colour photo. The AI result (when keys are set) only supplies the
     * garment; the original background is always kept. Every result is checked
     * against the original before it may be saved; a failed AI result falls
     * back to the built-in recolour, a failed recolour is reported, not saved.
     */
    private async makeColour(
        photo: Photo,
        mask: Buffer,
        modelInput: Buffer | null,
        color: {name: string; hexCode: string},
        run: {aiOff: boolean},
    ) {
        if (modelInput && !run.aiOff) {
            try {
                const generated = await fromModelOutput(photo, await this.run(promptFor(color.name, color.hexCode), modelInput));
                const rgb = await compositeGarment(photo, mask, generated);
                const check = checkRecolour(photo, mask, rgb, color.hexCode);
                if (check.ok) return {ok: true as const, rgb, model: this.model};
                logger.warn(`AI colour photo rejected (${color.name}): ${check.reason} ${JSON.stringify(check)}`);
            } catch (error) {
                // Out of free AI for today: built-in recolour for the rest of this run
                if (error instanceof QuotaError) run.aiOff = true;
                logger.warn(`AI colour photo failed (${color.name}), using built-in recolour: ${String(error)}`);
            }
        }
        const rgb = recolourGarment(photo, mask, color.hexCode);
        const check = checkRecolour(photo, mask, rgb, color.hexCode);
        return check.ok
            ? {ok: true as const, rgb, model: LOCAL_MODEL}
            : {ok: false as const, reason: `Not saved: ${check.reason}`};
    }

    /**
     * Generate a preview of the product in each selected color, one after
     * another (free-tier rate limits). Failures are kept per color so the
     * shop can retry just those.
     */
    public async generate(
        req: Request,
        scope: ShopScope,
        productId: string,
        input: {colorIds: string[]; imageId?: string},
    ) {
        const product = await shopProductService.get(scope, productId);

        const source = input.imageId
            ? product.images.find((img) => img.id === input.imageId)
            : product.images[0];
        if (!source) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                input.imageId ? 'Image not found' : 'Upload a product image first',
            );
        }
        const colors = input.colorIds.map((id) => product.colors.find((c) => c.id === id));
        if (colors.some((c) => !c)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Pick colors that are on this product', [
                {field: 'colorIds', message: 'Pick colors that are on this product'},
            ]);
        }

        // A clean white-background photo: work on the shop's original photo (the garment
        // is found far more reliably there) and put every colour on white the same way
        const original = source.cleanedFromId
            ? await prisma.productImage.findFirst({where: {id: source.cleanedFromId, productId}, select: {url: true}})
            : null;
        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(original?.url ?? source.url));
        } catch (error) {
            logger.warn(`Colour preview: cannot read image ${source.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        // Where the garment is: found once, used for every colour
        let mask: Buffer;
        try {
            mask = await segmentGarment(photo);
        } catch (error) {
            logger.warn(`Colour preview: garment detection failed: ${String(error)}`);
            throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Could not find the garment in this photo. Use a photo of the garment on a plain background.');
        }
        // Colour photos use the built-in recolour (free, checked); the AI's small daily
        // allowance is kept for professional photos unless CLOUDFLARE_AI_FOR_COLOURS=true
        const modelInput = this.aiReady && config.ai.colourWithAi ? await toModelInput(photo) : null;
        const runState = {aiOff: false};

        let quotaMessage: string | null = null;
        let failed = 0;
        for (const color of colors as NonNullable<(typeof colors)[number]>[]) {
            const key = {productId, colorId: color.id, sourceImageId: source.id};
            const row = await prisma.productColorPreview.upsert({
                where: {productId_colorId_sourceImageId: key},
                create: {
                    ...key,
                    model: this.model,
                    status: PreviewStatus.PENDING,
                    createdById: req.user.id,
                },
                update: {
                    model: this.model,
                    status: PreviewStatus.PENDING,
                    error: null,
                    createdById: req.user.id,
                },
                select: {id: true, url: true},
            });

            if (quotaMessage) {
                failed++;
                await prisma.productColorPreview.update({
                    where: {id: row.id},
                    data: {status: PreviewStatus.FAILED, error: quotaMessage},
                });
                continue;
            }
            try {
                const made = await this.makeColour(photo, mask, modelInput, color, runState);
                if (!made.ok) throw new Error(made.reason);
                const jpeg = original
                    ? await studioPhoto(photo, mask, made.rgb)
                    : await toJpeg(photo, made.rgb);
                const url = await storeGenerated(req, jpeg.toString('base64'), 'previews');
                await prisma.$transaction([
                    prisma.productColorPreview.update({
                        where: {id: row.id},
                        data: {status: PreviewStatus.READY, url, error: null, model: made.model},
                    }),
                    // Every size of this colour shows this photo (store, bag, orders, POS),
                    // unless the shop set its own photo for that variant
                    prisma.productVariant.updateMany({
                        where: {
                            productId,
                            color: {equals: color.name, mode: 'insensitive'},
                            OR: [{image: null}, {image: ''}, ...(row.url ? [{image: row.url}] : [])],
                        },
                        data: {image: url},
                    }),
                ]);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'AI generation failed';
                if (error instanceof QuotaError) quotaMessage = message;
                failed++;
                await prisma.productColorPreview.update({
                    where: {id: row.id},
                    data: {status: PreviewStatus.FAILED, error: message.slice(0, 300)},
                });
            }
        }
        return {
            product: await shopProductService.get(scope, productId),
            failed,
            error: quotaMessage,
        };
    }

    public async remove(scope: ShopScope, productId: string, previewId: string) {
        const product = await shopProductService.get(scope, productId);
        const preview = product.previews.find((p) => p.id === previewId);
        if (!preview) throw new ApiError(httpStatus.NOT_FOUND, 'Preview not found');
        await prisma.$transaction([
            prisma.productColorPreview.delete({where: {id: previewId}}),
            // Variants that showed this photo go back to the product's own photos
            ...(preview.url
                ? [prisma.productVariant.updateMany({where: {productId, image: preview.url}, data: {image: null}})]
                : []),
        ]);
        return {before: preview, after: await shopProductService.get(scope, productId)};
    }

    /**
     * Turn a shop photo (taken on a bed, floor or mat) into a catalogue photo:
     * the garment on a plain white background. Added as a new photo and made the
     * main one; the original stays, and colour photos are made from it.
     */
    public async cleanBackground(req: Request, scope: ShopScope, productId: string, imageId: string) {
        const product = await shopProductService.get(scope, productId);
        const source = product.images.find((img) => img.id === imageId);
        if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        if (source.cleanedFromId) throw new ApiError(httpStatus.BAD_REQUEST, 'This photo already has a clean background');
        if (source.aiStyle) throw new ApiError(httpStatus.BAD_REQUEST, 'This photo was made by the AI on a white background already');
        const existing = product.images.find((img) => img.cleanedFromId === source.id);
        if (existing) throw new ApiError(httpStatus.BAD_REQUEST, 'A clean photo of this image is already there');
        if (product.images.length >= 8) throw new ApiError(httpStatus.BAD_REQUEST, 'A product can have at most 8 images; delete one first');

        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(source.url));
        } catch (error) {
            logger.warn(`Clean background: cannot read image ${source.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        let jpeg: Buffer;
        try {
            jpeg = await studioPhoto(photo, await segmentGarment(photo));
        } catch (error) {
            logger.warn(`Clean background failed: ${String(error)}`);
            throw new ApiError(
                httpStatus.UNPROCESSABLE_ENTITY,
                'Could not find the garment in this photo. Take the photo from above with the whole garment in view.',
            );
        }
        const url = await storeGenerated(req, jpeg.toString('base64'), 'products');
        await prisma.$transaction([
            prisma.productImage.updateMany({where: {productId}, data: {isMain: false}}),
            prisma.productImage.create({
                data: {productId, url, altText: product.name, order: source.order, isMain: true, isAiGenerated: true, cleanedFromId: source.id},
            }),
        ]);
        return shopProductService.get(scope, productId);
    }

    /**
     * A professional catalogue photo made by the AI from a shop photo: the garment
     * on an invisible 3D mannequin, on a dress-form mannequin, or worn by a model.
     * Added as a new photo and made the main one; the shop photo stays. Colour
     * photos can then be made from it like from any photo.
     */
    public async professionalPhoto(req: Request, scope: ShopScope, productId: string, imageId: string, style: PhotoStyle, details?: string) {
        if (!this.aiReady) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                'Professional photos need the Cloudflare AI keys. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN to backend/.env (steps in backend/docs/colour-photos-setup.md) and restart the backend.',
            );
        }
        const product = await shopProductService.get(scope, productId);
        const source = product.images.find((img) => img.id === imageId);
        if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        if (product.images.length >= 8) throw new ApiError(httpStatus.BAD_REQUEST, 'A product can have at most 8 images; delete one first');

        // The AI works best from the clean cut-out when there is one
        const original = source.cleanedFromId ? source : product.images.find((img) => img.cleanedFromId === source.id) ?? source;
        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(original.url));
        } catch (error) {
            logger.warn(`Professional photo: cannot read image ${original.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        // Colour measured from the garment itself (the mask is cached, so this is quick after Clean background)
        let colour = {name: 'same colour as the photo', hex: ''};
        try {
            colour = garmentColour(photo, await segmentGarment(photo));
        } catch (error) {
            logger.warn(`Professional photo: could not measure the colour: ${String(error)}`);
        }
        const brief: GarmentBrief = {
            gender: product.gender,
            kind: [product.name, product.subcategory?.name].filter(Boolean).join(', '),
            colour,
            details: details?.trim() || undefined,
        };
        let base64: string;
        try {
            base64 = await this.run(professionalPrompt(style, brief), await toModelInput(photo), PRO_SIZE, config.ai.proModel);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'AI generation failed';
            throw new ApiError(error instanceof QuotaError ? httpStatus.TOO_MANY_REQUESTS : httpStatus.BAD_GATEWAY, message);
        }
        // Never save an empty or broken result
        const out = sharp(Buffer.from(base64, 'base64'));
        const stats = await out.stats().catch(() => null);
        const spread = stats ? stats.channels.slice(0, 3).reduce((t, c) => t + c.stdev, 0) / 3 : 0;
        if (spread < 8) throw new ApiError(httpStatus.BAD_GATEWAY, 'The AI returned an empty picture; try again');
        const jpeg = await out.flatten({background: '#ffffff'}).jpeg({quality: 90, mozjpeg: true}).toBuffer();

        const url = await storeGenerated(req, jpeg.toString('base64'), 'products');
        await prisma.$transaction([
            prisma.productImage.updateMany({where: {productId}, data: {isMain: false}}),
            prisma.productImage.create({
                data: {productId, url, altText: product.name, order: source.order, isMain: true, isAiGenerated: true, aiStyle: style},
            }),
        ]);
        return shopProductService.get(scope, productId);
    }
}

export default new AiPreviewService();
