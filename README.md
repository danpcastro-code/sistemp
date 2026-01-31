
# SisTemp - Sistema de Controle de Vagas Temporárias

Sistema auditável para gestão de ciclos de vida de contratos temporários (Lei 8.745/1993).

## 👥 Configuração de Banco de Dados (Supabase)

Se o sistema não estiver "memorizando" os dados, é provável que a tabela no Supabase não tenha sido inicializada corretamente.

### 1. Criar a Tabela e as Políticas
Copie e cole o código abaixo no **SQL Editor** do seu painel do Supabase e clique em **Run**:

```sql
-- 1. Cria a tabela principal se não existir
CREATE TABLE IF NOT EXISTS sistemp_data (
  id bigint PRIMARY KEY,
  vacancies jsonb DEFAULT '[]'::jsonb,
  parameters jsonb DEFAULT '[]'::jsonb,
  convocations jsonb DEFAULT '[]'::jsonb,
  users jsonb DEFAULT '[]'::jsonb,
  agencies jsonb DEFAULT '[]'::jsonb,
  units jsonb DEFAULT '[]'::jsonb,
  profiles jsonb DEFAULT '[]'::jsonb,
  email_config jsonb DEFAULT '{}'::jsonb, -- Nova coluna para integrações
  logs jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Habilita o RLS (Segurança de Linha)
ALTER TABLE sistemp_data ENABLE ROW LEVEL SECURITY;

-- 3. Cria política de acesso total (Leitura e Escrita)
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. INICIALIZA O REGISTRO RAIZ (Obrigatório para o sistema funcionar)
INSERT INTO sistemp_data (id, vacancies, parameters, convocations, users, email_config) 
VALUES (1, '[]', '[]', '[]', '[]', '{}') 
ON CONFLICT (id) DO NOTHING;
```

### 2. Verificar Conexão e Integração
No sistema SisTemp:
1. Vá em **Parametrização > Conexão e Nuvem** e clique em **Testar Comunicação**.
2. Vá em **Parametrização > Integração E-mail** para configurar suas chaves do EmailJS e tornar o envio permanente e funcional.

---
*Desenvolvido para gestão pública eficiente e auditável.*
