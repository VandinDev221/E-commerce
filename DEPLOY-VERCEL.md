# Deploy na Vercel

Este projeto pode rodar na Vercel com **frontend** (React) e **API** (Express) no mesmo deploy.

## O que a Vercel faz

- **Build:** instala e compila o backend (`backend/`), depois o frontend (`frontend/`).
- **Frontend:** servido como site estático a partir de `frontend/dist`.
- **API:** todas as requisições `/api/*` são tratadas pelo backend em modo serverless (arquivo `api/[[...slug]].ts`).

## Pré-requisitos

1. **PostgreSQL na nuvem** (obrigatório). Este guia usa **[Neon](https://neon.tech)** (free tier).
2. **Conta na [Vercel](https://vercel.com)** e projeto conectado ao repositório Git (ex: `https://github.com/VandinDev221/E-commerce`).

## Passo a passo

### 0. Enviar o código para o GitHub

Se o repositório ainda estiver vazio, envie o projeto:

```bash
cd c:\xampp\htdocs\project\Ecommerce
git init
git remote add origin https://github.com/VandinDev221/E-commerce.git
git add .
git commit -m "Projeto e-commerce completo"
git branch -M main
git push -u origin main
```

### 1. Configurar o Neon (PostgreSQL)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (ou faça login).
2. **New Project** → escolha nome, região e PostgreSQL 15+.
3. No painel do projeto, vá em **Connection Details**.
4. Copie a **Connection string** (ex.: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
5. Para **Vercel/serverless**, use a URL **pooled** se o Neon mostrar duas opções (evita esgotar conexões):
   - Formato pooled: host termina em `-pooler` ou a URL tem `?pgbouncer=true` ou similar (conforme o painel do Neon).
   - Se houver só uma URL, use essa; o Prisma funciona com a URL direta do Neon.

Guarde essa URL como `DATABASE_URL` para o próximo passo.

### 2. Criar o projeto na Vercel

- Acesse [vercel.com](https://vercel.com) e faça login.
- **Add New** → **Project** e importe o repositório do e-commerce.
- **Root Directory:** deixe a raiz do repositório (onde está `vercel.json`).
- Não altere **Build Command** e **Output Directory**; eles vêm do `vercel.json`.

### 3. Variáveis de ambiente

Em **Settings → Environment Variables** do projeto na Vercel, configure (para **Production**, **Preview** e **Development**):

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL copiada do Neon (ex: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`) |
| `JWT_SECRET` | Sim | Chave secreta para JWT (ex: string longa aleatória) |
| `JWT_REFRESH_SECRET` | Sim | Chave para refresh tokens |
| `FRONTEND_URL` | Sim | URL do frontend na Vercel (ex: `https://seu-projeto.vercel.app`) |
| `VITE_API_URL` | Não* | Se não definir, o frontend usa `/api` (mesmo domínio). Deixe vazio para mesmo domínio. |
| `REDIS_URL` | Não | Cache Redis (opcional; sem isso o cache fica desativado) |
| `CLOUDINARY_*` | Não | Upload de imagens (opcional) |
| `STRIPE_*` | Não | Pagamentos (opcional) |
| `RESEND_*` | Não | E-mail (opcional) |

\* Para o frontend chamar a API no mesmo domínio (recomendado na Vercel), **não** defina `VITE_API_URL`. O build usará `/api` e as requisições irão para a mesma origem.

### 4. Migrações e seed no banco (Neon)

O Vercel **não** roda migrações nem seed automaticamente. Faça isso uma vez no seu banco:

**Na sua máquina (recomendado)**

Use a **mesma** `DATABASE_URL` que você colocou na Vercel (a URL do Neon):

```bash
cd backend
# Cole a Connection string do Neon (igual à variável na Vercel)
set DATABASE_URL=postgresql://usuario:senha@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
npx prisma migrate deploy
npx prisma db seed
```

No PowerShell: `$env:DATABASE_URL="postgresql://..."; npx prisma migrate deploy; npx prisma db seed`

**Opção B – no painel do seu provedor de PostgreSQL**

- Crie o banco e o usuário.
- Rode as migrações (SQL gerado por `prisma migrate deploy` ou export do Prisma) e o seed manualmente se necessário.

### 5. Deploy

- Dê **Deploy** no projeto.
- Após o build, o site estará em `https://seu-projeto.vercel.app` e a API em `https://seu-projeto.vercel.app/api/...`.

### 6. Conferir

- Frontend: `https://seu-projeto.vercel.app`
- Health da API: `https://seu-projeto.vercel.app/api/health` (deve retornar `database: "ok"` se o banco estiver acessível).

## Limites e dicas

- **Timeout:** funções serverless na Vercel têm limite de tempo (ex.: 30 s no plano Hobby). Requisições pesadas ou lentas podem falhar.
- **Cold start:** a primeira requisição após um tempo sem uso pode ser mais lenta.
- **Redis:** opcional; sem `REDIS_URL` o backend não usa cache e continua funcionando.
- **CORS:** `FRONTEND_URL` deve ser exatamente a URL do frontend na Vercel (com `https://`) para login e cookies funcionarem corretamente.

## Deploy só do frontend na Vercel

Se preferir hospedar a API em outro lugar (Railway, Render, etc.):

1. No projeto Vercel, defina **Root Directory** como `frontend`.
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Environment Variable:** `VITE_API_URL` = URL completa da sua API (ex: `https://sua-api.railway.app/api`).
5. Não use o `api/` nem o backend no mesmo projeto Vercel; a API fica só no outro serviço.
