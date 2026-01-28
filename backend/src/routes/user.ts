import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const addressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  isDefault: z.boolean().optional(),
});

router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, avatar: true, role: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.patch('/profile', async (req: AuthRequest, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    if (body.email) {
      const existing = await prisma.user.findFirst({
        where: { email: body.email, id: { not: req.user!.id } },
      });
      if (existing) throw new AppError('E-mail já em uso', 400);
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: body.name, email: body.email },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.patch('/password', async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    if (!user?.passwordHash) throw new AppError('Senha não configurada para esta conta', 400);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Senha atual incorreta', 400);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (e) {
    next(e);
  }
});

router.get('/addresses', async (req: AuthRequest, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(addresses);
  } catch (e) {
    next(e);
  }
});

router.post('/addresses', async (req: AuthRequest, res, next) => {
  try {
    const body = addressSchema.parse(req.body);
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.create({
      data: { ...body, userId: req.user!.id },
    });
    res.status(201).json(address);
  } catch (e) {
    next(e);
  }
});

router.patch('/addresses/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = addressSchema.partial().parse(req.body);
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError('Endereço não encontrado', 404);
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(address);
  } catch (e) {
    next(e);
  }
});

router.delete('/addresses/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError('Endereço não encontrado', 404);
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ message: 'Endereço removido' });
  } catch (e) {
    next(e);
  }
});

export const userRoutes = router;
