# Manual – Git e Deploy (Vercel)

## 1. Git – subir alterações manualmente

Sempre na pasta do projeto:

```bash
cd c:\xampp\htdocs\project\Ecommerce
```

### Ver o que mudou

```bash
git status
```

### Incluir tudo e dar commit

```bash
git add .
git commit -m "descrição do que você fez"
```

Exemplos de mensagem:
- `fix: correção da etiqueta de envio`
- `feat: nova tela de relatórios`
- `chore: atualizar dependências`

### Enviar para o GitHub (branch main)

```bash
git push origin main
```

### Resumo em uma sequência

```bash
cd c:\xampp\htdocs\project\Ecommerce
git add .
git commit -m "sua mensagem aqui"
git push origin main
```

---

## 2. Deploy na Vercel

### 2.1 Deploy automático (recomendado)

1. Conecte o repositório na Vercel: **Settings → Git**.
2. Deixe a **Production Branch** como `main`.
3. Sempre que fizer `git push origin main`, a Vercel inicia o deploy sozinha.

### 2.2 Deploy manual pelo terminal (Vercel CLI)

1. Instale a CLI (uma vez):

```bash
npm i -g vercel
```

2. Na pasta do projeto, faça login (uma vez):

```bash
cd c:\xampp\htdocs\project\Ecommerce
vercel login
```

3. Deploy em produção:

```bash
vercel --prod
```

Ou use o script do projeto:

```bash
npm run deploy
```

### 2.3 Deploy manual pelo site da Vercel

1. Acesse [vercel.com](https://vercel.com) e abra o projeto.
2. Aba **Deployments**.
3. No último deploy, clique nos **três pontinhos (⋯)** → **Redeploy**.
4. Ou em **Deploy** (se aparecer) para um deploy novo.

### 2.4 Deploy Hook (sem abrir o painel)

1. Na Vercel: **Settings → Git**.
2. Em **Deploy Hooks**, crie um hook (ex.: "Deploy manual").
3. Copie a URL do hook.
4. Para disparar o deploy: abra essa URL no navegador ou use:

```bash
curl "URL_DO_HOOK"
```

---

## 3. Conferir se está tudo certo

- **Git:** `git status` deve mostrar "nothing to commit, working tree clean" após o push.
- **Vercel:** em **Deployments**, o último deploy deve estar "Ready" (verde).
- **Site:** abra a URL do projeto (ex.: `https://seu-projeto.vercel.app`) e teste as páginas e a API.

---

## 4. Alterações feitas (etiqueta e API)

- **Etiqueta:** o botão "Etiqueta" na lista de pedidos (admin) passou a usar `<Link>` e abre na mesma aba (sem `target="_blank"`).
- **API:** foi criado o handler `api/admin/orders/[id]/index.ts` na Vercel para GET `/api/admin/orders/:id`, evitando 404 na página da etiqueta.
- **Script:** em `package.json` foi adicionado `"deploy": "vercel --prod"` para deploy manual com `npm run deploy`.
