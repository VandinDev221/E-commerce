export class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export function errorHandler(err, _req, res, _next) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Erro interno do servidor';
    console.error('[ERROR]', message);
    console.error(err.stack);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(statusCode).json({
        error: message,
        ...(isDev && { detail: err.stack }),
    });
}
//# sourceMappingURL=errorHandler.js.map