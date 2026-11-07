import multer from 'multer';
import {Request} from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {ApiError} from '@utils/index';
import {logger} from '@config/index';

// Define the temp directory path
const tempDir = path.join(__dirname, '../../public/temp');

// Ensure the temp directory exists
if (fs.existsSync(tempDir)) {
    const stats = fs.statSync(tempDir);
    if (!stats.isDirectory()) {
        fs.unlinkSync(tempDir);
        fs.mkdirSync(tempDir, {recursive: true});
    }
} else {
    fs.mkdirSync(tempDir, {recursive: true});
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, tempDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        // Never use the client's file name in the path: "../../x.js" would
        // escape public/temp. Random name + the extension fileFilter checked.
        const extension = path.extname(path.basename(file.originalname)).toLowerCase();
        const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
        cb(null, uniqueFilename);

        // Log the complete path of the uploaded file
        const filePath = path.join(tempDir, uniqueFilename);
        logger.info(`File uploaded: ${filePath}`);
    },
});

// Configure multer for file uploads
// const upload = multer({
//     storage,
//     fileFilter: (req: Request, file: Express.Multer.File, cb) => {
//         const allowedMimetypes = [
//             'image/jpeg',
//             'image/jpg',
//             'image/png',
//             'image/gif',
//             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
//             'application/vnd.ms-excel', // .xls
//             'text/csv', // .csv
//         ];

//         const extname = path.extname(file.originalname).toLowerCase();
//         const isMimetypeAllowed = allowedMimetypes.includes(file.mimetype);
//         const isExtnameAllowed = [
//             '.jpeg',
//             '.jpg',
//             '.png',
//             '.gif',
//             '.xlsx',
//             '.xls',
//             '.csv',
//         ].includes(extname);

//         if (isMimetypeAllowed && isExtnameAllowed) {
//             cb(null, true);
//         } else {
//             logger.error('File type not allowed.');
//             cb(new ApiError(400, 'File type not allowed.'));
//         }
//     },
//     limits: {fileSize: 32 * 1024 * 1024}, // Limit size to 32 MB
// });
// Replace with your actual ApiError class

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimetypes = [
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',

            // PDFs
            'application/pdf',

            // Documents
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'text/plain', // .txt
            'text/csv', // .csv

            // Audio
            'audio/mpeg', // .mp3
            'audio/wav', // .wav
            'audio/ogg', // .ogg
            'audio/mp4', // .mp4 (audio-only)
            'audio/x-wav', // .wav

            // Videos
            'video/mp4', // .mp4
            'video/x-msvideo', // .avi
            'video/x-matroska', // .mkv
            'video/webm', // .webm
            'video/quicktime', // .mov
            'video/x-flv', // .flv
            'video/x-ms-wmv', // .wmv
        ];

        const extname = path.extname(file.originalname).toLowerCase();
        const isMimetypeAllowed = allowedMimetypes.includes(file.mimetype);
        const isExtnameAllowed = [
            '.jpeg',
            '.jpg',
            '.png',
            '.gif',
            '.webp',
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.txt',
            '.csv',
            '.mp3',
            '.wav',
            '.ogg',
            '.mp4',
            '.avi',
            '.mkv',
            '.webm',
            '.mov',
            '.flv',
            '.wmv',
        ].includes(extname);

        if (isMimetypeAllowed && isExtnameAllowed) {
            cb(null, true);
        } else {
            logger.error('File type not allowed:', file.mimetype, file.originalname);
            cb(new ApiError(400, 'File type not allowed.'));
        }
    },
    limits: {fileSize: 32 * 1024 * 1024}, // Limit size to 32 MB
});

// Image-only uploader (logos etc.): random file names, so the client never
// controls the path, and a 2 MB limit
const IMAGE_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
};

const imageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, tempDir),
        filename: (req, file, cb) =>
            cb(null, `${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype] ?? ''}`),
    }),
    fileFilter: (req, file, cb) => {
        if (IMAGE_TYPES[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new ApiError(400, 'Images must be JPG, PNG, WEBP or SVG files.'));
        }
    },
    limits: {fileSize: 2 * 1024 * 1024},
});

/** Photos customers attach to reviews and returns: JPG, PNG or WEBP only (no SVG), up to 5 MB */
const PHOTO_TYPES: Record<string, string> = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'};
const customerPhotoUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, tempDir),
        filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${PHOTO_TYPES[file.mimetype] ?? ''}`),
    }),
    fileFilter: (req, file, cb) => {
        if (PHOTO_TYPES[file.mimetype]) cb(null, true);
        else cb(new ApiError(400, 'Photos must be JPG, PNG or WEBP files.'));
    },
    limits: {fileSize: 5 * 1024 * 1024, files: 1},
});

export {upload, imageUpload, customerPhotoUpload};
