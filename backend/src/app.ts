import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import cookieParser from 'cookie-parser';

import {config, morgan, swaggerRouter} from '@config/index';
import {
    // xss,
    notFoundHandler,
    errorConverter,
    errorHandler,
} from '@middlewares/index';
import routes from '@routes/index';
import {ApiResponse} from '@utils/index';

// Create Express app
const app = express();
// Middleware setup
app.use(helmet()); // Set security HTTP headers
// Uploaded pictures are shown by the store and the panels, which run on other origins
app.use('/uploads', helmet.crossOriginResourcePolicy({policy: 'cross-origin'}));
app.use(express.json({limit: '16mb'})); // Parse JSON request body with size limit
app.use(express.urlencoded({extended: true, limit: '16mb'})); // Parse URL-encoded request body with size limit
app.use(express.static('public')); // Serve static files
app.use(cookieParser()); // Parse cookies
// TODO
// app.use(xss()); // Sanitize request data
app.use(compression()); // Apply gzip compression

// CORS configuration
app.use(
    // Only the frontends listed in CORS_ORIGINS (any origin when it is empty)
    cors({
        origin: config.cors.origins.length ? config.cors.origins : '*',
        credentials: true,
    }),
);
// Real client IP from X-Forwarded-For only behind a configured proxy (TRUST_PROXY)
app.set('trust proxy', config.trustProxy);
// Logging middleware
if (config.env !== 'test') {
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
}

// Rate limiting: see routes/user.routes.ts (login, register, password reset)

// Routes
app.use('/api/v1', routes); // API routes
app.use(swaggerRouter); // Swagger documentation routes
app.get('/', (req, res) => {
    res.status(httpStatus.OK).json(
        new ApiResponse(httpStatus.OK, undefined, 'Welcome to node api'),
    );
});

// Error handling
app.use(notFoundHandler);
app.use(errorConverter); // Convert errors to ApiError
app.use(errorHandler); // Handle errors

export default app;
