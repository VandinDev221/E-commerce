import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from './auth.js';

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });
    if (user) req.user = { id: user.id, email: user.email, role: user.role };
  } catch {
    // ignore
  }
  next();
}
