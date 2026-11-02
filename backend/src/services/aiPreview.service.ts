import {Request} from 'express';
import httpStatus from 'http-status';
import sharp from 'sharp';
import {PreviewStatus} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {readStoredImage, storeGenerated} from '../utils/fileStore';
import {config, logger} from '@config/index';
import shopProductService, {ShopScope} from './shopProduct.service';

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

/** Shrink to what the model accepts; PNG keeps detail for the edit */
const toModelInput = (data: Buffer) =>
    sharp(data)
        .rotate()
        .resize(INPUT_MAX, INPUT_MAX, {fit: 'inside', withoutEnlargement: true})
        .flatten({background: '#F3F0EA'})
        .png()
        .toBuffer();

class AiPreviewService {
    get model() {
        return config.ai.imageModel;
    }

    private assertConfigured() {
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
        this.assertConfigured();
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

        let image: Buffer;
        try {
            image = await toModelInput(await readStoredImage(source.url));
        } catch (error) {
            logger.warn(`AI preview: cannot read image ${source.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }

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
                select: {id: true},
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
                const base64 = await this.run(promptFor(color.name, color.hexCode), image);
                const url = await storeGenerated(req, base64, 'previews');
                await prisma.productColorPreview.update({
                    where: {id: row.id},
                    data: {status: PreviewStatus.READY, url, error: null},
                });
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
        await prisma.productColorPreview.delete({where: {id: previewId}});
        return {before: preview, after: await shopProductService.get(scope, productId)};
    }
}

export default new AiPreviewService();
