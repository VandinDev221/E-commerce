import type { Request, RequestHandler } from 'express';
export interface JwtPayload {
    userId: string;
    email: string;
}
export type AuthRequest = Request;
export declare const authMiddleware: RequestHandler;
export declare const requireAdmin: RequestHandler;
//# sourceMappingURL=auth.d.ts.map