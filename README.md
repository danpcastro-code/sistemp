
# SisTemp - Sistema de Controle de Vagas Temporárias

Sistema auditável para gestão de ciclos de vida de contratos temporários (Lei 8.745/1993).

## 👥 Configuração de Banco de Dados (Supabase)

Se o sistema não estiver "memorizando" os dados, é fundamental que a tabela no Supabase esteja configurada exatamente como abaixo.

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
  email_config jsonb DEFAULT '{}'::jsonb, -- Configurações de e-mail integradas
  logs jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Habilita o RLS (Segurança de Linha)
ALTER TABLE sistemp_data ENABLE ROW LEVEL SECURITY;

-- 3. Cria política de acesso total (Leitura e Escrita) para uso em rede interna protegida
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. INICIALIZA O REGISTRO RAIZ (Obrigatório para o sistema funcionar)
-- Se já existir, não faz nada. Se não existir, cria o container ID 1.
INSERT INTO sistemp_data (id, vacancies, parameters, convocations, users, email_config) 
VALUES (1, '[]', '[]', '[]', '[]', '{}') 
ON CONFLICT (id) DO NOTHING;
```

### 2. Verificar Conexão
No sistema SisTemp:
1. Vá em **Parametrização > Conexão e Nuvem**.
2. Clique em **Testar Comunicação Permanente**. 
3. Se aparecer "Conexão Íntegra", o sistema passará a memorizar cada clique seu automaticamente.

---
*Desenvolvido para gestão pública eficiente, auditável e resiliente.*
