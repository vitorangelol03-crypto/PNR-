/*
  # Criação da Tabela Tickets - Logística Manager Pro

  ## Descrição
  Cria a tabela principal 'tickets' para gerenciar tickets logísticos com todos os campos necessários,
  índices otimizados, triggers automáticos e políticas de segurança RLS.

  ## 1. Nova Tabela: tickets
  
  ### Colunas de Identificação
  - `ticket_id` (text, PK) - ID único do ticket (IHS Ticket ID)
  - `spxtn` (text, nullable) - Código de rastreio da entrega
  
  ### Colunas de Dados da Entrega
  - `driver_name` (text, NOT NULL) - Nome do motorista responsável
  - `station` (text, NOT NULL) - Estação de origem/destino
  - `pnr_value` (numeric, NOT NULL, DEFAULT 0) - Valor do pedido (PNR Order Value)
  
  ### Colunas de Status e Prazos
  - `original_status` (text, NOT NULL) - Status original da entrega (sistema externo)
  - `sla_deadline` (timestamptz, nullable) - Prazo limite para resolução (SLA)
  
  ### Colunas de Controle Interno
  - `internal_status` (text, NOT NULL, DEFAULT 'Pendente') - Status interno: Pendente, Em Análise ou Concluído
  - `internal_notes` (text, DEFAULT '') - Observações internas do analista
  - `internal_status_updated_at` (timestamptz, nullable) - Data/hora da última alteração do status interno
  
  ### Colunas de Metadados
  - `created_time` (timestamptz, DEFAULT now()) - Data/hora de criação do registro
  - `updated_at` (timestamptz, DEFAULT now()) - Data/hora da última atualização

  ## 2. Índices para Otimização
  - Índice em `spxtn` para buscas por código de rastreio
  - Índice em `driver_name` para filtros por motorista
  - Índice em `original_status` para filtros por status
  - Índice em `internal_status` para filtros internos
  - Índice em `internal_status_updated_at` para ordenação por atualização (DESC, NULLS LAST)
  - Índice em `sla_deadline` para ordenação por prazo
  - Índice em `created_time` para ordenação por data de criação

  ## 3. Triggers
  - Trigger `update_tickets_updated_at` atualiza automaticamente `updated_at` em cada UPDATE

  ## 4. Segurança (RLS)
  - RLS habilitado na tabela `tickets`
  - Políticas públicas para SELECT, INSERT, UPDATE e DELETE (acesso total)
  
  ## 5. Notas Importantes
  - Tabela otimizada para paginação server-side com até 50.000+ registros
  - Suporta busca por múltiplos códigos de rastreio simultaneamente
  - Campos com valores padrão para evitar NULL desnecessários
  - RLS configurado para acesso público (sem autenticação necessária)
*/

-- 1. Remover tabela antiga se existir (garante recriação limpa)
DROP TABLE IF EXISTS tickets CASCADE;

-- 2. Criar tabela 'tickets' com estrutura completa
CREATE TABLE IF NOT EXISTS tickets (
  -- Identificação
  ticket_id text PRIMARY KEY,
  spxtn text,
  
  -- Dados da Entrega
  driver_name text NOT NULL,
  station text NOT NULL,
  pnr_value numeric NOT NULL DEFAULT 0,
  
  -- Status e Prazos
  original_status text NOT NULL,
  sla_deadline timestamptz,
  
  -- Controle Interno
  internal_status text NOT NULL DEFAULT 'Pendente',
  internal_notes text DEFAULT '',
  internal_status_updated_at timestamptz,
  
  -- Metadados
  created_time timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Criar índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_tickets_spxtn 
  ON tickets(spxtn);

CREATE INDEX IF NOT EXISTS idx_tickets_driver_name 
  ON tickets(driver_name);

CREATE INDEX IF NOT EXISTS idx_tickets_original_status 
  ON tickets(original_status);

CREATE INDEX IF NOT EXISTS idx_tickets_internal_status 
  ON tickets(internal_status);

CREATE INDEX IF NOT EXISTS idx_tickets_internal_status_updated_at 
  ON tickets(internal_status_updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline 
  ON tickets(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_tickets_created_time 
  ON tickets(created_time DESC);

-- 4. Criar função para atualizar 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para chamar a função em cada UPDATE
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas de acesso público

-- Política para SELECT (leitura)
DROP POLICY IF EXISTS "Permitir leitura pública de tickets" ON tickets;
CREATE POLICY "Permitir leitura pública de tickets"
  ON tickets FOR SELECT
  USING (true);

-- Política para INSERT (inserção)
DROP POLICY IF EXISTS "Permitir inserção pública de tickets" ON tickets;
CREATE POLICY "Permitir inserção pública de tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Política para UPDATE (atualização)
DROP POLICY IF EXISTS "Permitir atualização pública de tickets" ON tickets;
CREATE POLICY "Permitir atualização pública de tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política para DELETE (exclusão)
DROP POLICY IF EXISTS "Permitir exclusão pública de tickets" ON tickets;
CREATE POLICY "Permitir exclusão pública de tickets"
  ON tickets FOR DELETE
  USING (true);

-- 8. Adicionar comentários para documentação
COMMENT ON TABLE tickets IS 'Tabela principal de controle de tickets logísticos - Logística Manager Pro';
COMMENT ON COLUMN tickets.ticket_id IS 'ID único do ticket (IHS Ticket ID) - Chave Primária';
COMMENT ON COLUMN tickets.spxtn IS 'Código de rastreio da entrega (pode ser nulo)';
COMMENT ON COLUMN tickets.driver_name IS 'Nome do motorista responsável pela entrega';
COMMENT ON COLUMN tickets.station IS 'Estação de origem/destino da entrega';
COMMENT ON COLUMN tickets.pnr_value IS 'Valor do pedido em reais (PNR Order Value)';
COMMENT ON COLUMN tickets.original_status IS 'Status original da entrega vindo do sistema externo';
COMMENT ON COLUMN tickets.sla_deadline IS 'Prazo limite (deadline) para resolução do ticket conforme SLA';
COMMENT ON COLUMN tickets.internal_status IS 'Status interno de acompanhamento: Pendente, Em Análise ou Concluído';
COMMENT ON COLUMN tickets.internal_notes IS 'Observações e notas internas adicionadas pelo analista';
COMMENT ON COLUMN tickets.internal_status_updated_at IS 'Timestamp da última alteração do status interno';
COMMENT ON COLUMN tickets.created_time IS 'Data e hora de criação do registro';
COMMENT ON COLUMN tickets.updated_at IS 'Data e hora da última atualização do registro (auto-atualizado por trigger)';
