class ApiResponse<T> {
    statusCode: number;
    status: boolean;
    message: string;
    data: T;
    errors: string | object | null;

    /**
     * Creates an instance of ApiResponse.
     * @param statusCode - The HTTP status code for the response.
     * @param data - The data to be returned with the response (optional).
     * @param message - A message to be included with the response (optional).
     * @param errors - An error message to be included with the response (optional).
     */
    constructor(statusCode: number, data: T, message: string, errors?: string) {
        this.statusCode = statusCode;
        this.status = statusCode < 300;
        this.message = message;
        this.data = data;
        this.errors = errors || null;
    }
}

export default ApiResponse;
