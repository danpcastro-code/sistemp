
# CTU Gestão - Controle de Vagas Temporárias

Sistema de controle integral, automatizado e auditável das vagas e dos contratos temporários regidos pela Lei nº 8.745/1993.

## 🚀 PASSO A PASSO: CONFIGURAÇÃO SUPABASE

### 1. Criar o Projeto
Acesse [supabase.com](https://supabase.com) e crie um novo projeto.

### 2. Obter as Chaves
Vá em **Settings > API** e copie:
- **Project URL**
- **API Key (anon public)**

### 3. Atualizar o Sistema
No arquivo `App.tsx`, substitua as constantes `SUPABASE_URL` e `SUPABASE_KEY`.

### 4. Preparar Banco (SQL Editor)
No painel do Supabase, vá em **SQL Editor**, clique em **New Query**, cole o **Script SQL de Reparo** (encontrado na aba Parametrização do sistema) e clique em **RUN**.

---

## ☁️ DEPLOY NO VERCEL

O projeto está pronto para ser hospedado no Vercel com suporte a rotas SPA.

### Como publicar:
1. Conecte seu repositório Git ao [Vercel](https://vercel.com).
2. O Vercel detectará o framework **Vite**.
3. Mantenha as configurações padrão:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Variáveis de Ambiente (Recomendado)**:
   Para maior segurança, em vez de deixar as chaves no código, adicione-as no painel do Vercel (**Settings > Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
   
   E no código use: `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_KEY`.

### Sobre o arquivo `vercel.json`:
Este arquivo já está configurado para evitar erros 404 ao recarregar a página em rotas internas, redirecionando todas as requisições para o `index.html`.

---
**CTU Gestão - v1.8.0**
*Controle de Contratos Temporários.*
