
# SisTemp - Sistema de Controle de Vagas Temporárias

Sistema auditável para gestão de ciclos de vida de contratos temporários (Lei 8.745/1993).

## 🚀 Como publicar corretamente (Vercel)

Se o sistema travar na tela de "Carregando...", é porque a Vercel não está executando o Build.

### Passo 1: O que enviar para o GitHub?
Você deve enviar **A PASTA INTEIRA** do projeto. O repositório no GitHub deve conter:
- `App.tsx`
- `index.tsx`
- `index.html`
- `package.json` (Essencial)
- `tsconfig.json` (Essencial)
- `vite.config.ts` (Essencial)
- `vercel.json`
- Pasta `components/` com todos os arquivos dentro.

### Passo 2: Configurar na Vercel
1. No painel da Vercel, clique em **Add New > Project**.
2. Importe o repositório do GitHub.
3. Em **Framework Preset**, a Vercel deve detectar **Vite** automaticamente.
4. Clique em **Deploy**.

**IMPORTANTE**: Nunca faça o upload manual de apenas um arquivo `index.html`. O sistema é uma aplicação React completa e precisa de todos os arquivos para ser "montado" pela Vercel.

---
## 👥 Configuração de Banco de Dados (Supabase)

### 1. Preparar o Projeto Existente
No **SQL Editor** do Supabase, execute:

```sql
CREATE TABLE IF NOT EXISTS sistemp_data (
  id bigint PRIMARY KEY,
  vacancies jsonb DEFAULT '[]'::jsonb,
  parameters jsonb DEFAULT '[]'::jsonb,
  convocations jsonb DEFAULT '[]'::jsonb,
  users jsonb DEFAULT '[]'::jsonb,
  agencies jsonb DEFAULT '[]'::jsonb,
  units jsonb DEFAULT '[]'::jsonb,
  profiles jsonb DEFAULT '[]'::jsonb,
  logs jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE sistemp_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data FOR ALL USING (true) WITH CHECK (true);
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

---
*Desenvolvido para gestão pública eficiente e auditável.*
