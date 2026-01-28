# PostgreSQL – Passo a passo

Guia para usar **PostgreSQL** com o projeto E-commerce: instalar, criar banco/usuário, rodar migrações e subir a API.

---

## 1. Ter o PostgreSQL instalado e rodando

Você precisa do PostgreSQL instalado na sua máquina **ou** em um container (Docker).

### Opção A: Docker (recomendado)

1. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) se ainda não tiver.
2. Abra o terminal na pasta do projeto:
   ```powershell
   cd C:\xampp\htdocs\project\Ecommerce
   ```
3. Suba só o container do PostgreSQL:
   ```powershell
   docker-compose up -d postgres
   ```
4. O Docker usa o que está no `.env` da raiz (ou os valores padrão do `docker-compose.yml`):
   - usuário: `ecommerce`
   - senha: `ecommerce_secret`
   - banco: `ecommerce_db`
   - porta: `5432`
5. Aguarde alguns segundos e siga para o **Passo 2**.

### Opção B: PostgreSQL instalado no Windows

1. Baixe o instalador em: https://www.postgresql.org/download/windows/
2. Instale e, na etapa de configuração, anote a **senha do usuário `postgres`**.
3. Deixe a porta padrão **5432**.
4. Depois da instalação, o serviço **PostgreSQL** deve estar rodando (verifique em *Serviços* do Windows).
5. Você pode usar o usuário `postgres` ou criar o usuário `ecommerce` (Passo 2). Se quiser usar `postgres`, no **Passo 2** crie só o banco e no **Passo 3** use a `DATABASE_URL` com `postgres` e a senha que você definiu.

---

## 2. Criar o banco e o usuário no PostgreSQL

O projeto espera um banco chamado `ecommerce_db` e um usuário `ecommerce` com senha `ecommerce_secret`. Se você usa Docker com o `docker-compose` do projeto, o banco e o usuário já são criados automaticamente — **pode pular para o Passo 3**.

Se instalou o PostgreSQL manualmente, crie banco e usuário à mão:

1. Abra o **pgAdmin** (vem com o PostgreSQL) ou use o terminal:
   ```powershell
   psql -U postgres
   ```
2. Digite a senha do usuário `postgres`.
3. No **psql** (ou no pgAdmin, na janela de consulta), execute:
   ```sql
   CREATE USER ecommerce WITH PASSWORD 'ecommerce_secret';
   CREATE DATABASE ecommerce_db OWNER ecommerce;
   GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce;
   \q
   ```
4. Se preferir usar o usuário `postgres` em vez de `ecommerce`, crie só o banco:
   ```sql
   CREATE DATABASE ecommerce_db;
   \q
   ```
   Aí no **Passo 3** você vai usar no `.env`:
   `DATABASE_URL=postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/ecommerce_db`

---

## 3. Configurar o backend para usar o PostgreSQL

1. Abra a pasta do backend:
   ```powershell
   cd C:\xampp\htdocs\project\Ecommerce\backend
   ```
2. Abra o arquivo **`.env`** (se não existir, copie de `.env.example`).
3. Deixe a linha do banco assim (usuário `ecommerce`):
   ```env
   DATABASE_URL=postgresql://ecommerce:ecommerce_secret@localhost:5432/ecommerce_db
   ```
   - `ecommerce` = usuário  
   - `ecommerce_secret` = senha  
   - `localhost:5432` = servidor e porta  
   - `ecommerce_db` = nome do banco  

   Se estiver usando o usuário `postgres`:
   ```env
   DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/ecommerce_db
   ```

---

## 4. Instalar dependências do backend

No mesmo terminal, ainda na pasta `backend`:

```powershell
npm install
```

Isso instala o Node, o Prisma e as demais dependências do projeto.

---

## 5. Gerar o cliente Prisma

O Prisma precisa gerar o “cliente” que o Node usa para falar com o PostgreSQL:

```powershell
npx prisma generate
```

Se der certo, aparece uma mensagem indicando que o client foi gerado.

---

## 6. Criar as tabelas no banco (migração)

Aqui o Prisma lê o `schema.prisma` e cria todas as tabelas no PostgreSQL:

```powershell
npx prisma migrate dev --name init
```

- Se aparecer **“Can’t reach database server”**: o PostgreSQL não está rodando ou a porta/host estão errados (volte ao Passo 1 e 3).
- Se aparecer **“Authentication failed”**: usuário ou senha errados no `DATABASE_URL` (confira o Passo 2 e 3).

Quando terminar, as tabelas (User, Product, Order, etc.) estarão criadas no banco `ecommerce_db`.

---

## 7. Popular o banco com dados iniciais (seed)

O projeto tem um script que cria um usuário admin, categorias, produtos de exemplo e um cupom:

```powershell
npx prisma db seed
```

Depois disso você pode logar no sistema com:

- **E-mail:** `admin@ecommerce.com`  
- **Senha:** `admin123`

---

## 8. Subir a API

Com o banco criado e populado:

```powershell
npm run dev
```

A API sobe em **http://localhost:3001**.

Para testar:

- http://localhost:3001/health  
- http://localhost:3001/api/health  

Se `api/health` retornar `"database": "ok"`, o backend está falando com o PostgreSQL corretamente.

---

## 9. Subir o frontend (em outro terminal)

1. Abra um **novo** terminal.
2. Vá na pasta do frontend:
   ```powershell
   cd C:\xampp\htdocs\project\Ecommerce\frontend
   ```
3. Instale as dependências e rode o app:
   ```powershell
   npm install
   npm run dev
   ```
4. Acesse no navegador: **http://localhost:5173**

---

## Resumo da ordem dos comandos

| Onde        | Comando |
|------------|--------|
| Raiz do projeto | `docker-compose up -d postgres` (se usar Docker) |
| `backend/` | `npm install` |
| `backend/` | `npx prisma generate` |
| `backend/` | `npx prisma migrate dev --name init` |
| `backend/` | `npx prisma db seed` |
| `backend/` | `npm run dev` |
| `frontend/` (outro terminal) | `npm install` e `npm run dev` |

---

## Problemas comuns

| Erro | O que fazer |
|------|-------------|
| **P1001: Can’t reach database server** | PostgreSQL não está rodando. Inicie o serviço ou o container Docker. Confira se a porta é 5432. |
| **P1000: Authentication failed** | Usuário ou senha errados. Confira `DATABASE_URL` no `backend/.env` e se o usuário existe no PostgreSQL (Passo 2). |
| **500 nas rotas da API** | Normalmente banco não conectado ou tabelas não criadas. Rode os passos 5, 6 e 7 e verifique `api/health`. |

Se quiser, na próxima mensagem você pode colar o erro exato que aparecer (e em qual passo) que eu te digo o que ajustar.
