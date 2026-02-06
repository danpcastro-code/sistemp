
# CTU Gestão - Guia de Configuração Supabase

Para que o sistema salve os dados permanentemente na nuvem, você precisa realizar a configuração inicial no Supabase.

## 🚀 PASSO A PASSO RÁPIDO

### 1. Criar o Projeto
Acesse [supabase.com](https://supabase.com), crie uma conta e inicie um novo projeto. O nome pode ser qualquer um (ex: `ctu-gestao`).

### 2. Obter as Chaves (Credenciais)
No painel do Supabase:
1. Clique em **Project Settings** (ícone de engrenagem no menu lateral inferior).
2. Clique em **API**.
3. No campo **Project URL**, copie o link.
4. No campo **Project API keys**, copie a chave rotulada como `anon public`.

### 3. Atualizar o Sistema
Abra o arquivo `App.tsx` no seu editor de código e cole as informações nas constantes:
```typescript
const SUPABASE_URL = "SUA_URL_AQUI";
const SUPABASE_KEY = "SUA_CHAVE_ANON_AQUI";
```

### 4. Criar a Tabela (SQL Editor)
No painel do Supabase:
1. Clique em **SQL Editor** (ícone de terminal `>_` no menu lateral).
2. Clique em **New Query**.
3. Vá no sistema **CTU Gestão**, na aba **Parametrização > Conexão e Nuvem**.
4. Copie o **Script SQL de Reparo**.
5. Cole no editor do Supabase e clique em **RUN**.

---
**IMPORTANTE:** Se o sistema mostrar "Reparo Necessário" em vermelho no cabeçalho, certifique-se de que o Script SQL foi executado com sucesso e que o comando `DISABLE ROW LEVEL SECURITY` foi incluído.

*CTU Gestão - Controle de Vagas Temporárias.*
