
# SisTemp - Sistema de Controle de Vagas Temporárias

## 🛠️ REPARO DE CONEXÃO (ERRO DE GRAVAÇÃO)

Se o sistema mostrar **"Erro na Gravação"**, siga estes passos exatamente:

### 1. Script de Correção de Estrutura
Vá ao painel do Supabase, abra o **SQL Editor**, cole o código abaixo e clique em **Run**:

```sql
-- Garante que a tabela exista com todas as colunas
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

-- Adiciona pss_list se ela não existir (Reparo)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sistemp_data' AND column_name='pss_list') THEN
        ALTER TABLE sistemp_data ADD COLUMN pss_list jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- DESATIVA RLS TEMPORARIAMENTE PARA TESTE (Se houver erro de permissão 403)
-- ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- OU RECRIA A POLÍTICA DE ACESSO TOTAL
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- CRIA O REGISTRO INICIAL SE ESTIVER VAZIO
INSERT INTO sistemp_data (id, vacancies, parameters, convocations, pss_list, users, email_config) 
VALUES (1, '[]', '[]', '[]', '[]', '[]', '{}') 
ON CONFLICT (id) DO NOTHING;
```

### 2. Verificar Console
Se o erro persistir, aperte **F12** no seu navegador, vá na aba **Console** e procure por mensagens vermelhas começando com `"Erro Crítico Supabase"`. Lá estará o motivo técnico exato (ex: coluna faltando, erro de rede ou senha do banco expirada).

---
*Gestão Auditável e Segura.*
