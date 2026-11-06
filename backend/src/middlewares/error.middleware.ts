import {Request, Response, NextFunction, ErrorRequestHandler} from 'express';
import {ZodError} from 'zod';
import httpStatus from 'http-status';
import {ApiError, ApiResponse, PrismaError} from '@utils/index';
import {Prisma} from '@prisma/client';
import {logger} from '@config/index';

// Hands the 404 to the error handler, which sends the one response
const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
    const message = `Cannot find the resource ${req.originalUrl} on the server at ${req.protocol}://${req.get('host')}`;
    next(new ApiError(httpStatus.NOT_FOUND, message));
};

// No console.log(err) here: printing a ZodError crashes Node 24's inspector
// ("Cannot read properties of undefined (reading 'value')"), which turned
// every validation error into a 500
const errorConverter: ErrorRequestHandler = (err, _req, _res, next) => {
    if (err instanceof ZodError) {
        const message = 'Validation failed';
        const errors = err.errors.map((error) => ({
            field: error.path.join('.'),
            message: error.message,
        }));

        err = new ApiError(httpStatus.BAD_REQUEST, message, errors);
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        err = new PrismaError(err);
    } else if (!(err instanceof ApiError)) {
        const statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        const message = err.message || httpStatus[statusCode];
        err = new ApiError(statusCode, message);
    }

    next(err);
};

const errorHandler: ErrorRequestHandler = (err, _, res, next) => {
    let {statusCode} = err;
    const {message} = err;
    statusCode = statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    // 4xx are expected (bad input, no access); only server errors need a trace
    if (statusCode >= 500) logger.error(err.stack || message);
    res.locals.errorMessage = message;
    res.status(statusCode).json(
        new ApiResponse(statusCode, undefined, message, err.errors || undefined),
    );
    next();
};

export {errorHandler, errorConverter, notFoundHandler};

// import {Request, Response, NextFunction} from 'express';
// import httpStatus from 'http-status';
// import {Prisma} from '@prisma/client';

// import logger from '@config/logger';
// import ApiError from '@utils/ApiError';
// import ApiResponse from '@utils/ApiResponse';
// import PrismaError from '@utils/PrismaError';

// export const errorMiddleware = (err: unknown, req: Request, res: Response, next: NextFunction) => {
//     // If headers already sent, delegate to Express default handler
//     if (res.headersSent) {
//         logger.error('Headers already sent, delegating error to Express', {error: err});
//         return next(err);
//     }

//     let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
//     let message = 'Internal Server Error';
//     let errors: string | object | null = null;

//     // Handle ApiError (custom app errors)
//     if (err instanceof ApiError) {
//         statusCode = err.statusCode;
//         const statusText = Object.entries(httpStatus).find(([, code]) => code === statusCode)?.[0];
//         message = err.message || statusText || message;
//         errors = err.errors ?? null;
//     }
//     // Handle Prisma known errors
//     else if (err instanceof Prisma.PrismaClientKnownRequestError) {
//         const prismaError = new PrismaError(err);
//         statusCode = prismaError.statusCode;
//         message = prismaError.message;
//         errors = prismaError.errors ?? null;
//     }
//     // Handle generic Error
//     else if (err instanceof Error) {
//         message = err.message || message;
//     }

//     // Log the error (first arg must be string, second arg = meta)
//     logger.error(message, {
//         method: req.method,
//         url: req.originalUrl,
//         statusCode,
//         stack: err instanceof Error ? err.stack : undefined,
//     });

//     // Send response
//     return res.status(statusCode).json(new ApiResponse(statusCode, null, message, errors));
// };
