import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { prisma } from './lib/prisma.js';
import { cacheDelPattern } from './lib/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { productRoutes } from './routes/products.js';
import { categoryRoutes } from './routes/categories.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';
import { wishlistRoutes } from './routes/wishlist.js';
import { userRoutes } from './routes/user.js';
import { adminRoutes } from './routes/admin.js';
import { blogRoutes } from './routes/blog.js';
import { shippingRoutes } from './routes/shipping.js';
import { couponRoutes } from './routes/coupons.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Necessário atrás de proxy (ex: Vercel): evita ValidationError do express-rate-limit com X-Forwarded-For
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    database = 'error';
    console.error('[HEALTH] Database:', (e as Error).message);
  }
  res.json({ status: database === 'ok' ? 'ok' : 'degraded', database, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/coupons', couponRoutes);

app.use(errorHandler);

// Na Vercel, o app é exportado e usado como serverless; não inicia listen nem setInterval
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    const cleanIntervalMinutes = Number(process.env.CACHE_CLEAN_MINUTES) || 15;
    const cleanIntervalMs = cleanIntervalMinutes * 60 * 1000;
    setInterval(async () => {
      try {
        const productKeys = await cacheDelPattern('product');
        const categoryKeys = await cacheDelPattern('categories');
        const blogKeys = await cacheDelPattern('blog');
        const total = productKeys + categoryKeys + blogKeys;
        if (total > 0) {
          console.log(`[Cache] Autolimpeza: ${total} chave(s) removida(s)`);
        }
      } catch {
        // Redis pode estar desligado
      }
    }, cleanIntervalMs);
  });
}

export default app;
