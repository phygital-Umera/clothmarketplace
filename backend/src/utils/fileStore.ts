import fs from 'fs/promises';
import path from 'path';
import {Request} from 'express';
import {uploadFileToHostedServer} from './s3upload';
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
    folder: 'companies' | 'products',
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
