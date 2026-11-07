import {Request} from 'express';
import httpStatus from 'http-status';
import sharp from 'sharp';
import {PreviewStatus} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {readStoredImage, storeGenerated} from '../utils/fileStore';
import {config, logger} from '@config/index';
import shopProductService, {ShopScope} from './shopProduct.service';
import {Photo, checkRecolour, compositeGarment, loadPhoto, recolourGarment, segmentGarment, toJpeg} from '../utils/recolour';

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

/** Built-in recolour, used when no Cloudflare AI keys are set */
export const LOCAL_MODEL = 'built-in-recolour';

class AiPreviewService {
    /** Cloudflare Workers AI when its keys are set, otherwise the built-in recolour */
    get aiReady() {
        return !!(config.ai.cloudflareAccountId && config.ai.cloudflareApiToken);
    }

    get model() {
        return this.aiReady ? config.ai.imageModel : LOCAL_MODEL;
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
    private async run(prompt: string, image: Buffer): Promise<string> {
        const form = new FormData();
        form.append('prompt', prompt);
        form.append(
            'input_image_0',
            new Blob([new Uint8Array(image)], {type: 'image/png'}),
            'source.png',
        );
        form.append('width', String(OUTPUT_SIZE));
        form.append('height', String(OUTPUT_SIZE));

        const url = `https://api.cloudflare.com/client/v4/accounts/${config.ai.cloudflareAccountId}/ai/run/${this.model}`;
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
            throw new QuotaError('Daily free AI limit reached. Try again after 00:00 UTC');
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

        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(source.url));
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
        const modelInput = this.aiReady ? await toModelInput(photo) : null;
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
                const url = await storeGenerated(req, (await toJpeg(photo, made.rgb)).toString('base64'), 'previews');
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
}

export default new AiPreviewService();
