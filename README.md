
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
-- Sem este comando, o sistema não encontrará onde salvar os dados.
INSERT INTO sistemp_data (id, vacancies, parameters, convocations, users) 
VALUES (1, '[]', '[]', '[]', '[]') 
ON CONFLICT (id) DO NOTHING;
```

### 2. Verificar Conexão
No sistema SisTemp, vá em **Parametrização > Conexão e Nuvem** e clique em **Testar Comunicação**. Se aparecer "Conexão Íntegra", o sistema passará a salvar tudo permanentemente.

---
*Desenvolvido para gestão pública eficiente e auditável.*
