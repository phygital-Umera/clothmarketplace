import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const HOSTED_BACKEND_URL = process.env.HOSTED_BACKEND_URL || 'https://upload.phygitaltech.in/';

interface UploadResponse {
    link: string;
    key: string;
}

/**
 * Upload using file path (replace your S3 file upload)
 */
export async function uploadFileToHostedServer(filePath: string): Promise<UploadResponse | null> {
    try {
        if (!filePath) return null;

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const res = await axios.post(`${HOSTED_BACKEND_URL}/upload`, form, {
            headers: form.getHeaders(),
        });

        const data = res.data?.data;

        return {
            link: data?.url || '',
            key: data?.filename || '',
        };
    } catch (error) {
        console.error('UPLOAD ERROR:', error);
        throw error;
    }
}

/**
 * Upload using BASE64 (replace uploadImageToS3)
 */
export async function uploadBase64ToHostedServer(
    base64: string,
    filename: string,
): Promise<UploadResponse | null> {
    try {
        const buffer = Buffer.from(base64, 'base64');

        const form = new FormData();
        form.append('file', buffer, {
            filename,
            contentType: 'image/jpeg',
        });

        const res = await axios.post(`${HOSTED_BACKEND_URL}/upload`, form, {
            headers: form.getHeaders(),
        });

        const data = res.data?.data;

        return {
            link: data?.url || '',
            key: data?.filename || '',
        };
    } catch (error) {
        console.error('BASE64 UPLOAD ERROR:', error);
        throw error;
    }
}
