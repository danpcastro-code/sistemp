
# SisTemp - Sistema de Controle de Vagas Temporárias

## 🛠️ REPARO DE CONEXÃO (ERRO DE GRAVAÇÃO)

Se o sistema mostrar **"Erro na Gravação"**, significa que o banco de dados no Supabase não conhece os novos campos ou está bloqueando o acesso. Siga estes passos:

### 1. Script de Correção de Estrutura Completa
Vá ao painel do Supabase, abra o **SQL Editor**, selecione **New Query**, cole o código abaixo e clique em **Run**:

```sql
-- Garante que a tabela exista com todas as colunas de dados e parametrização
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

-- Script de Reparo de Colunas (Adiciona o que faltar)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sistemp_data' AND column_name='pss_list') THEN
        ALTER TABLE sistemp_data ADD COLUMN pss_list jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sistemp_data' AND column_name='agencies') THEN
        ALTER TABLE sistemp_data ADD COLUMN agencies jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sistemp_data' AND column_name='units') THEN
        ALTER TABLE sistemp_data ADD COLUMN units jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sistemp_data' AND column_name='profiles') THEN
        ALTER TABLE sistemp_data ADD COLUMN profiles jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Configuração de Segurança de Linha (RLS)
ALTER TABLE sistemp_data ENABLE ROW LEVEL SECURITY;

-- Liberação de Acesso Total para o App
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data FOR ALL USING (true) WITH CHECK (true);

-- Garante que exista o registro de ID 1 para salvamento
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

### 2. Diagnóstico Técnico
Se o erro persistir após rodar o SQL:
1. No navegador, aperte **F12**.
2. Clique na aba **Console**.
3. Procure por erros em vermelho. Se o erro for `403 (Forbidden)`, a política RLS falhou. Se for `404 (Not Found)`, a tabela tem outro nome.

---
*Gestão Pública Auditável e Resiliente.*
