/**
 * Aplica as colunas shipping_cpf e shipping_phone na tabela Order.
 * Execute com: node scripts/run-add-shipping-fields.js
 * Requer DATABASE_URL no .env (ou use: set DATABASE_URL=... && node scripts/run-add-shipping-fields.js)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shipping_cpf" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shipping_phone" TEXT;');
  console.log('Colunas shipping_cpf e shipping_phone adicionadas (ou já existiam).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
