# Plataforma E-commerce Moderna

Plataforma de e-commerce com React (frontend) e Node.js (backend), PostgreSQL, Redis, JWT, Stripe e Docker.

## Stack

| Camada        | Tecnologias                                                                 |
|---------------|-----------------------------------------------------------------------------|
| **Frontend**  | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Hook Form, Zod, Framer Motion |
| **Backend**   | Node.js, Express, TypeScript, Prisma                                       |
| **Banco**     | PostgreSQL + Redis (cache)                                                 |
| **Auth**      | JWT, Refresh Tokens, OAuth (Google/GitHub)                                 |
| **Pagamentos**| Stripe (sandbox)                                                           |
| **Outros**    | Cloudinary (imagens), Resend (e-mail)                                       |

## Funcionalidades

- [x] Autenticação (registro, login, JWT, OAuth, recuperação de senha)
- [x] Catálogo de produtos (filtros, paginação, avaliações)
- [x] Carrinho persistente e checkout (endereço, CPF/telefone, pagamento)
- [x] Pagamentos (Stripe sandbox)
- [x] Painel administrativo (produtos, pedidos, usuários, cupons)
- [x] Etiqueta de envio (padrão Shopee) para impressão
- [x] Wishlist, cupons, cálculo de frete por CEP
- [x] PWA e SEO básico

## Estrutura do projeto

```
Ecommerce/
├── api/              # Handlers serverless (Vercel)
├── backend/          # API Node.js + Express + Prisma
├── frontend/         # App React + Vite
├── docker-compose.yml
├── vercel.json
├── .env.example
├── DEPLOY-VERCEL.md
├── POSTGRESQL-PASSO-A-PASSO.md
└── MANUAL-DEPLOY-E-GIT.md
```

## Pré-requisitos

- **Node.js** 18+
- **PostgreSQL** (Docker ou local) — ver [POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md)
- Contas (conforme uso): Cloudinary, Stripe, Resend; opcional: Google/GitHub (OAuth)

---

## Como rodar

### Opção 1: Docker (recomendado)

```bash
cp .env.example .env
# Editar .env com suas chaves

docker-compose up -d postgres redis

cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev

# Em outro terminal
cd frontend && npm install && npm run dev
```

### Opção 2: Sem Docker (PostgreSQL local)

1. Instalar e subir o PostgreSQL — ver [POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md).
2. Em `backend/.env`:  
   `DATABASE_URL=postgresql://ecommerce:ecommerce_secret@localhost:5432/ecommerce_db`
3. Backend:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   npm run dev
   ```
4. Frontend (outro terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Verificação

- API: http://localhost:3001 — health: http://localhost:3001/api/health (`"database": "ok"`)
- App: http://localhost:5173

### Subir tudo com Docker

```bash
docker-compose up --build
```

---

## Deploy na Vercel (Neon)

Para publicar com **Neon** como PostgreSQL em produção:

1. Siga o guia **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)**.
2. Repositório de exemplo: [github.com/VandinDev221/E-commerce](https://github.com/VandinDev221/E-commerce).
3. Deploy manual (CLI): `npx vercel --prod --yes` (na raiz do projeto, após `vercel link`).

---

## Go-live (pronto para vender)

Checklist mínimo para produção:

1. Definir variáveis de produção na Vercel/host:
   - `DATABASE_URL` (Neon com `sslmode=require`)
   - `JWT_SECRET` e `JWT_REFRESH_SECRET` fortes
   - `FRONTEND_URL` com o domínio final
   - `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
2. Configurar webhook Stripe para:
   - URL: `https://SEU_DOMINIO/api/stripe/webhook`
   - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
3. Rodar migrações no banco de produção: `cd backend && npx prisma migrate deploy`
4. Executar smoke test pós-deploy:
   - `cd backend && API_URL=https://SEU_DOMINIO/api SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run smoke:prod`

---

## Importação Shopee em massa

Para importar **todos os produtos encontrados** na Shopee com margem automática de +15%:

1. Via navegador (com login Shopee no perfil salvo):
   - `cd backend && npm run shopee:sync`
2. Via arquivo JSON (quando a Shopee bloquear scraping direto):
   - `cd backend && SHOPEE_INPUT_FILE=/caminho/produtos.json npm run shopee:sync`

Formato do JSON:
- `[{"name":"Produto","price":99.9,"image":"https://...","sourceUrl":"https://shopee.com.br/..."}]`

Observações:
- O script envia em lotes para `/api/admin/products/import-shopee-home`.
- O backend aplica `price = costPrice * 1.15` automaticamente.
- Produtos são categorizados automaticamente (eletrônicos, acessórios, casa e cozinha etc.).

---

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| **500 em `/api/products`, `/api/auth/login`** | Banco não criado ou PostgreSQL parado | [POSTGRESQL-PASSO-A-PASSO.md](POSTGRESQL-PASSO-A-PASSO.md). Rodar `npx prisma migrate dev` e `npx prisma db seed` em `backend`. Verificar `/api/health`. |
| **500 em `/api/orders` (Vercel)** | Banco de produção sem colunas novas | Rodar migration no Neon: em `backend`, definir `DATABASE_URL` do Neon e executar `npx prisma migrate deploy` ou `node scripts/run-add-shipping-fields.js`. Ver [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) §7. |
| **404 em `/api/coupons/validate` ou `/api/shipping/cep/xxx`** | Roteamento ou deploy desatualizado | Fazer novo deploy. Conferir variáveis de ambiente na Vercel. |
| **"Could not connect to database"** | PostgreSQL inativo ou `DATABASE_URL` errado | Verificar se o PostgreSQL está na porta 5432 e se `backend/.env` tem usuário, senha e banco corretos. |
| **Redis** | Opcional em desenvolvimento | Sem Redis a API funciona; o cache fica desativado. |

---

## Licença

MIT
