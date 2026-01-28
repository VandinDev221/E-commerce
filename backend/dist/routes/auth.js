import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
const router = Router();
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
});
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
});
function generateTokens(userId, email) {
    const accessToken = jwt.sign({ userId, email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refreshToken = jwt.sign({ userId, email }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
    return { accessToken, refreshToken };
}
router.post('/register', async (req, res, next) => {
    try {
        const body = registerSchema.parse(req.body);
        const existing = await prisma.user.findUnique({ where: { email: body.email } });
        if (existing)
            throw new AppError('E-mail já cadastrado', 400);
        const passwordHash = await bcrypt.hash(body.password, 10);
        const verifyToken = uuidv4();
        const user = await prisma.user.create({
            data: {
                email: body.email,
                passwordHash,
                name: body.name ?? null,
                emailVerifyToken: verifyToken,
            },
        });
        await sendVerificationEmail(body.email, verifyToken);
        const { accessToken, refreshToken } = generateTokens(user.id, user.email);
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(201).json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            accessToken,
            expiresIn: config.jwt.expiresIn,
        });
    }
    catch (e) {
        next(e);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        const body = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (!user || !user.passwordHash)
            throw new AppError('E-mail ou senha inválidos', 401);
        const valid = await bcrypt.compare(body.password, user.passwordHash);
        if (!valid)
            throw new AppError('E-mail ou senha inválidos', 401);
        const { accessToken, refreshToken } = generateTokens(user.id, user.email);
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            accessToken,
            expiresIn: config.jwt.expiresIn,
        });
    }
    catch (e) {
        next(e);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token)
            throw new AppError('Refresh token ausente', 401);
        const decoded = jwt.verify(token, config.jwt.refreshSecret);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            throw new AppError('Usuário não encontrado', 401);
        const { accessToken, refreshToken } = generateTokens(user.id, user.email);
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            accessToken,
            expiresIn: config.jwt.expiresIn,
        });
    }
    catch (e) {
        next(e);
    }
});
router.post('/logout', (_req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado' });
});
router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, avatar: true, role: true, emailVerified: true },
        });
        if (!user)
            throw new AppError('Usuário não encontrado', 404);
        res.json(user);
    }
    catch (e) {
        next(e);
    }
});
router.get('/verify-email', async (req, res, next) => {
    try {
        const token = req.query.token;
        if (!token)
            throw new AppError('Token inválido', 400);
        const user = await prisma.user.findFirst({
            where: { emailVerifyToken: token },
        });
        if (!user)
            throw new AppError('Token inválido ou expirado', 400);
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyToken: null },
        });
        res.json({ message: 'E-mail verificado com sucesso' });
    }
    catch (e) {
        next(e);
    }
});
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = forgotSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const token = uuidv4();
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: token,
                    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
                },
            });
            await sendPasswordResetEmail(email, token);
        }
        res.json({ message: 'Se o e-mail existir, você receberá um link para redefinir a senha' });
    }
    catch (e) {
        next(e);
    }
});
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = resetSchema.parse(req.body);
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });
        if (!user)
            throw new AppError('Token inválido ou expirado', 400);
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
        });
        res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (e) {
        next(e);
    }
});
export const authRoutes = router;
//# sourceMappingURL=auth.js.map