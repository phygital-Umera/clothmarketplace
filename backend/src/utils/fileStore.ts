import fs from 'fs/promises';
import path from 'path';
import {Request} from 'express';
import {randomUUID} from 'crypto';
import {uploadBase64ToHostedServer, uploadFileToHostedServer} from './s3upload';
import {logger} from '@config/index';

const PUBLIC_DIR = path.join(__dirname, '../../public');

/**
 * Keep an uploaded file (already checked by multer) and return its URL.
 * Uses the hosted file server; if that is not reachable (e.g. local
 * development) the file is moved to public/uploads/<folder> and served from
 * there.
 */
export const storeUpload = async (
    req: Request,
    file: Express.Multer.File,
    folder: 'companies' | 'products' | 'offers' | 'coupons' | 'customer',
): Promise<string> => {
    try {
        const result = await uploadFileToHostedServer(file.path);
        if (result?.link) {
            await fs.unlink(file.path).catch(() => undefined);
            return result.link;
        }
    } catch {
        logger.warn(`Hosted upload failed, storing ${folder} image locally`);
    }

    const dir = path.join(PUBLIC_DIR, 'uploads', folder);
    await fs.mkdir(dir, {recursive: true});
    await fs.rename(file.path, path.join(dir, file.filename));
    return `${req.protocol}://${req.get('host')}/uploads/${folder}/${file.filename}`;
};

const extensionOf = (data: Buffer) => {
    if (data[0] === 0x89 && data[1] === 0x50) return 'png';
    if (data.subarray(0, 4).toString() === 'RIFF') return 'webp';
    return 'jpg';
};

/**
 * Keep a generated image (base64, e.g. an AI preview) and return its URL.
 * Same hosted-server-first, local-fallback rule as storeUpload.
 */
export const storeGenerated = async (
    req: Request,
    base64: string,
    folder: 'previews',
): Promise<string> => {
    const data = Buffer.from(base64, 'base64');
    const filename = `${randomUUID()}.${extensionOf(data)}`;
    try {
        const result = await uploadBase64ToHostedServer(base64, filename);
        if (result?.link) return result.link;
    } catch {
        logger.warn(`Hosted upload failed, storing ${folder} image locally`);
    }

    const dir = path.join(PUBLIC_DIR, 'uploads', folder);
    await fs.mkdir(dir, {recursive: true});
    await fs.writeFile(path.join(dir, filename), data);
    return `${req.protocol}://${req.get('host')}/uploads/${folder}/${filename}`;
};

/** Bytes of an image stored by storeUpload: read locally when it is ours, else download */
export const readStoredImage = async (url: string): Promise<Buffer> => {
    const local = url.match(/\/uploads\/([\w-]+)\/([\w.-]+)$/);
    if (local) {
        const file = path.join(PUBLIC_DIR, 'uploads', local[1], local[2]);
        const data = await fs.readFile(file).catch(() => null);
        if (data) return data;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load the product image (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
};
