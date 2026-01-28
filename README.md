# Plataforma E-commerce Moderna

Plataforma completa de e-commerce com React (frontend) e Node.js (backend), PostgreSQL, Redis, JWT, Stripe/Mercado Pago e Docker.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Redux Toolkit + React Hook Form + Zod + Framer Motion
- **Backend:** Node.js + Express + TypeScript + Prisma
- **Banco de Dados:** PostgreSQL + Redis (cache)
- **Auth:** JWT + Refresh Tokens + OAuth (Google/GitHub)
- **Pagamentos:** Stripe (sandbox)
- **Imagens:** Cloudinary
- **E-mail:** Resend

## Deploy na Vercel (com Neon)

Para colocar o projeto na Vercel usando **Neon** como PostgreSQL, siga o guia **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)**. Repositório de exemplo: [github.com/VandinDev221/E-commerce](https://github.com/VandinDev221/E-commerce).

## Pré-requisitos

- Node.js 18+
- PostgreSQL (Docker ou instalado localmente) — ver **[POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md)**
- Contas: Cloudinary, Stripe, Resend (e opcionalmente Google/GitHub para OAuth)

## Como rodar

### Primeira vez (obrigatório para evitar erro 500)

**Guia completo:** veja **[POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md)** para instalar o PostgreSQL, criar banco/usuário e rodar o projeto.

**Resumo rápido:**

1. Subir o PostgreSQL (Docker: `docker-compose up -d postgres` ou instalar localmente).
2. Criar banco e usuário (se não usar Docker) — ver o guia.
3. No `backend/.env`: `DATABASE_URL=postgresql://ecommerce:ecommerce_secret@localhost:5432/ecommerce_db`
4. No `backend`: `npm install` → `npx prisma generate` → `npx prisma migrate dev --name init` → `npx prisma db seed` → `npm run dev`
5. Verificar: http://localhost:3001/api/health (deve retornar `"database": "ok"`).
6. No `frontend`: `npm install` → `npm run dev` → acessar http://localhost:5173

### 1. Com Docker (recomendado)

```bash
# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas chaves

# Subir apenas Postgres e Redis
docker-compose up -d postgres redis

# Backend (na pasta backend: migrate + seed + dev)
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

### 2. Backend (desenvolvimento)

```bash
cd backend
# .env já pode existir; confira DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

API em: http://localhost:3001

### 3. Frontend (desenvolvimento)

```bash
cd frontend
npm install
npm run dev
```

App em: http://localhost:5173

### 4. Tudo com Docker

```bash
docker-compose up --build
```

## Estrutura do Projeto

```
Ecommerce/
├── backend/          # API Node.js + Express + Prisma
├── frontend/         # App React + Vite
├── docker-compose.yml
└── .env.example
```

## Funcionalidades

- [x] Autenticação (registro, login, JWT, OAuth, recuperação de senha)
- [x] Catálogo de produtos (filtros, paginação, avaliações)
- [x] Carrinho persistente e checkout em 3 etapas
- [x] Pagamentos (Stripe sandbox)
- [x] Painel administrativo
- [x] Wishlist, cupons, cálculo de frete por CEP
- [x] PWA e SEO básico

## Solução de problemas

| Problema | Causa provável | O que fazer |
|----------|----------------|-------------|
| **500 em `/api/products`, `/api/auth/login`, etc.** | Banco não criado ou PostgreSQL parado | Ver [POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md). Rodar `npx prisma migrate dev` e `npx prisma db seed` na pasta `backend`. Verificar http://localhost:3001/api/health |
| **"Could not connect to database"** | PostgreSQL não está rodando ou `DATABASE_URL` errado | Conferir se o PostgreSQL está ativo (porta 5432) e se no `backend/.env` o `DATABASE_URL` está correto (usuário, senha, nome do banco) |
| **Redis** | Opcional para desenvolvimento | Se não tiver Redis, a API ainda funciona; o cache é ignorado. Para produção, use Redis. |

## Licença

MIT
