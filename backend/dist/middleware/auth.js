import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
export const authMiddleware = async (req, _res, next) => {
    // Priorizar o header Authorization (Bearer) sobre o cookie,
    // pois o frontend sempre envia o token mais recente nele.
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;
    const token = bearerToken || req.cookies?.accessToken;
    if (!token) {
        return next(new AppError('Não autorizado', 401));
    }
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user)
            return next(new AppError('Usuário não encontrado', 401));
        req.user = { id: user.id, email: user.email, role: user.role };
        next();
    }
    catch {
        next(new AppError('Token inválido ou expirado', 401));
    }
};
export const requireAdmin = (req, _res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return next(new AppError('Acesso negado. Apenas administradores.', 403));
    }
    next();
};
//# sourceMappingURL=auth.js.map