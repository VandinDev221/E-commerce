import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
export const optionalAuth = async (req, _res, next) => {
    const token = req.cookies?.accessToken ||
        req.headers.authorization?.replace('Bearer ', '');
    if (!token)
        return next();
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });
        if (user)
            req.user = { id: user.id, email: user.email, role: user.role };
    }
    catch {
        // ignore
    }
    next();
};
//# sourceMappingURL=optionalAuth.js.map