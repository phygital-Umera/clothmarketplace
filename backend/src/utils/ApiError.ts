/* eslint-disable @typescript-eslint/no-explicit-any */
class ApiError extends Error {
    statusCode: number;
    data: unknown | null;
    success: boolean;
    errors: string[] | object[];

    constructor(
        statusCode: number,
        message = 'Something went wrong',
        errors: string[] | object[] = [],
        stack = '',
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, this.constructor);
        }
        // else {
        //     Error.captureStackTrace(this, this.constructor);
        // }
    }
}

export default ApiError;
