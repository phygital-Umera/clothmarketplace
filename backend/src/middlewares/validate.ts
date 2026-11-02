import {ZodError, ZodTypeAny} from 'zod';
import httpStatus from 'http-status';
import {NextFunction, Request, Response} from 'express';

const validate =
    <T extends ZodTypeAny>(schema: T) =>
    (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse({
                body: req.body,
                params: req.params,
                query: req.query,
                cookies: req.cookies,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((issue) => ({
                    message: `${issue.path.join('.')} is ${issue.message}`,
                }));
                res.status(httpStatus.BAD_REQUEST).json({
                    error: 'Invalid data',
                    details: errorMessages,
                });
            } else {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Internal Server Error',
                });
            }
        }
    };

export default validate;
