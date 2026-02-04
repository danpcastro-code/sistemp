
# SisTemp - Guia de Configuração Supabase (As "Gavetas")

Para que o sistema funcione corretamente com o banco de dados e sincronize as informações, você deve configurar o seu projeto no Supabase seguindo os passos abaixo.

## 1. Configurar o Banco de Dados (SQL Editor)

Copie o código abaixo, vá até o menu **SQL Editor** no painel do seu projeto Supabase, cole e clique em **Run**:

```sql
-- Criar a tabela única para persistência de estado
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

-- Habilitar RLS (Segurança)
ALTER TABLE sistemp_data ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita pública (Acesso Total SisTemp)
DROP POLICY IF EXISTS "Acesso Total SisTemp" ON sistemp_data;
CREATE POLICY "Acesso Total SisTemp" ON sistemp_data FOR ALL USING (true) WITH CHECK (true);

-- Carga inicial de parametrização legal e operadores básicos
INSERT INTO sistemp_data (
  id, 
  parameters, 
  agencies, 
  units, 
  profiles, 
  users, 
  email_config
) VALUES (
  1, 
  '[
    {"id":"p1","label":"Art 2º, IV","days":730,"description":"Professores Substitutos e Visitantes","type":"legal","status":"active","lawRef":"Lei 8.745/1993","articleRef":"Art. 2º, IV"},
    {"id":"p2","label":"Art 2º, VI","days":1460,"description":"Técnicos Especializados","type":"legal","status":"active","lawRef":"Lei 8.745/1993","articleRef":"Art. 2º, VI"},
    {"id":"p3","label":"Art 2º, V","days":1825,"description":"Pesquisadores em geral","type":"legal","status":"active","lawRef":"Lei 8.745/1993","articleRef":"Art. 2º, V"},
    {"id":"p4","label":"Art 2º, I","days":365,"description":"Calamidade Pública","type":"legal","status":"active","lawRef":"Lei 8.745/1993","articleRef":"Art. 2º, I"}
  ]',
  '[{"id":"a1","name":"Universidade Federal","status":"active"}]',
  '[{"id":"u1","name":"Departamento de Computação","status":"active"},{"id":"u2","name":"Departamento de Artes","status":"active"},{"id":"u3","name":"Sede Administrativa","status":"active"}]',
  '[{"id":"f1","name":"Professor Visitante","status":"active"},{"id":"f2","name":"Professor Substituto","status":"active"},{"id":"f3","name":"Técnico Especializado","status":"active"}]',
  '[{"id":"1","name":"Administrador Sistema","username":"admin","password":"123","role":"admin"},{"id":"2","name":"Gestor RH","username":"rh","password":"123","role":"hr"}]',
  '{"sender":"rh.notificacao@orgao.gov.br","subject":"Aviso de Término de Contrato Temporário","template":"Prezado(a) {nome},\n\nSeu contrato expira em {data_fatal}."}'
) ON CONFLICT (id) DO NOTHING;
```

## 2. Configurar Armazenamento de Editais (Storage)

Para gerenciar os arquivos de PDF:
1. No menu lateral do Supabase, vá em **Storage**.
2. Clique em **New Bucket**.
3. Defina o nome como `editais`.
4. Marque a opção **Public bucket**.
5. Salve.

---
*Ambiente pronto para operação imediata.*
