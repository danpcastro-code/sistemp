
# SisTemp - Sistema de Controle de Vagas Temporárias

## 🛠️ RESOLVENDO "ERRO NA GRAVAÇÃO" AO CADASTRAR PSS

Se você recebe erro ao cadastrar um novo edital, siga estes dois passos:

### PASSO 1: A Chave de API correta
No Supabase, vá em **Project Settings > API**.
*   **ERRO:** Não use a "service_role".
*   **ERRO:** Não use chaves de outros sistemas (Stripe/Clerk).
*   **CORRETO:** Copie a chave **anon public**. Ela deve começar obrigatoriamente com `eyJ...`.
*   Cole esta chave na variável `SUPABASE_KEY` no arquivo `App.tsx`.

### PASSO 2: Reparar o Banco de Dados
O erro ocorre porque o banco de dados não tem a coluna `pss_list`. No **SQL Editor** do Supabase, execute este código:

```sql
-- 1. Cria a tabela se não existir
CREATE TABLE IF NOT EXISTS sistemp_data (
    id bigint PRIMARY KEY,
    vacancies jsonb DEFAULT '[]'::jsonb,
    parameters jsonb DEFAULT '[]'::jsonb,
    convocations jsonb DEFAULT '[]'::jsonb,
    pss_list jsonb DEFAULT '[]'::jsonb, 
    users jsonb DEFAULT '[]'::jsonb,
    agencies jsonb DEFAULT '[]'::jsonb,
    units jsonb DEFAULT '[]'::jsonb,
    profiles jsonb DEFAULT '[]'::jsonb,
    email_config jsonb DEFAULT '{}'::jsonb,
    logs jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. GARANTE que a coluna pss_list exista (caso a tabela já existisse antes)
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS pss_list jsonb DEFAULT '[]'::jsonb;

-- 3. Libera o acesso para gravação (Desativa RLS temporariamente se o erro persistir)
ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- 4. Cria o registro inicial
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

---
*Gestão Auditável e Resiliente.*
