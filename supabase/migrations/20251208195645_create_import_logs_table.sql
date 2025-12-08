/*
  # Criar tabela de LOG de Importações

  ## Objetivo
  Esta migration cria a tabela `import_logs` para armazenar o histórico completo
  de todas as importações de CSV realizadas no sistema, permitindo rastreabilidade
  e auditoria completa de todas as operações.

  ## 1. Nova Tabela: import_logs
  
  ### Colunas:
  - `id` (bigint, primary key, auto-incremento) - Identificador único do log
  - `import_date` (timestamptz) - Data e hora da importação
  - `imported_by` (text) - Usuário que realizou a importação
  - `total_rows` (integer) - Total de linhas processadas do CSV
  - `new_records` (integer) - Quantidade de registros novos criados
  - `updated_records` (integer) - Quantidade de registros atualizados
  - `skipped_records` (integer) - Quantidade de registros ignorados por erro
  - `file_name` (text) - Nome do arquivo CSV importado
  - `details` (jsonb) - Detalhes completos das mudanças em formato JSON
  - `created_at` (timestamptz) - Timestamp de criação do registro
  
  ## 2. Índices
  - Índice na coluna `import_date` para otimizar consultas por data
  - Índice na coluna `created_at` para ordenação

  ## 3. Segurança
  - Enable RLS (Row Level Security)
  - Permitir leitura pública (qualquer usuário pode ver o histórico)
  - Permitir inserção pública (qualquer usuário pode criar logs)

  ## Notas Importantes
  - A coluna `details` em JSONB permite flexibilidade para armazenar
    estruturas complexas de dados sem precisar modificar o schema
  - Os índices garantem performance mesmo com milhares de importações
  - RLS configurado para acesso público pois é uma aplicação interna
*/

-- Criar tabela de logs de importação
CREATE TABLE IF NOT EXISTS import_logs (
  id bigserial PRIMARY KEY,
  import_date timestamptz NOT NULL DEFAULT now(),
  imported_by text NOT NULL DEFAULT 'Sistema',
  total_rows integer NOT NULL DEFAULT 0,
  new_records integer NOT NULL DEFAULT 0,
  updated_records integer NOT NULL DEFAULT 0,
  skipped_records integer NOT NULL DEFAULT 0,
  file_name text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_import_logs_import_date ON import_logs(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (SELECT)
CREATE POLICY "Qualquer usuário pode visualizar logs"
  ON import_logs
  FOR SELECT
  USING (true);

-- Permitir inserção pública (INSERT)
CREATE POLICY "Qualquer usuário pode criar logs"
  ON import_logs
  FOR INSERT
  WITH CHECK (true);

-- Comentários na tabela para documentação
COMMENT ON TABLE import_logs IS 'Armazena histórico completo de todas as importações de CSV realizadas no sistema';
COMMENT ON COLUMN import_logs.details IS 'JSON com detalhes completos: lista de tickets afetados, mudanças campo a campo, erros, etc.';