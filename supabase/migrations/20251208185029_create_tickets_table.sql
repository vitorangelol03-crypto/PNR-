/*
  # Criar tabela de tickets com controle de status

  1. Nova Tabela
    - `tickets` - Tabela principal para armazenar todos os tickets/pacotes
      - `id` (int8, auto-increment, primary key) - ID interno do banco
      - `ticket_id` (text, unique, not null) - IHS Ticket ID (chave de negócio)
      - `spxtn` (text) - Código de rastreio (Tracking Code)
      - `created_time` (timestamptz) - Data/hora de criação do ticket
      - `driver_name` (text, not null) - Nome do motorista
      - `station` (text, not null) - Estação
      - `pnr_value` (numeric, default 0) - Valor do pedido PNR
      - `original_status` (text, not null) - Status original da entrega
      - `sla_deadline` (timestamptz) - Prazo SLA
      - `internal_status` (text, default 'Pendente') - Status interno (Pendente/Em Análise/Concluído)
      - `internal_notes` (text, default '') - Notas internas
      - `internal_status_updated_at` (timestamptz) - Data/hora da última atualização do status interno
      - `updated_at` (timestamptz, default now()) - Data/hora da última atualização do registro

  2. Índices
    - Índice único em `ticket_id` para evitar duplicatas
    - Índice em `sla_deadline` para ordenação por prazo
    - Índice em `internal_status` para filtros
    - Índice em `internal_status_updated_at` para ordenação por data de atualização

  3. Segurança
    - RLS habilitado na tabela
    - Política para permitir leitura pública (ajustar conforme necessidade)
    - Política para permitir inserção/atualização pública (ajustar conforme necessidade)

  Nota: As políticas RLS estão configuradas como públicas para simplificar o uso inicial.
        Em produção, ajuste conforme regras de negócio (auth.uid(), roles, etc).
*/

-- Criar tabela de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id bigserial PRIMARY KEY,
  ticket_id text UNIQUE NOT NULL,
  spxtn text,
  created_time timestamptz,
  driver_name text NOT NULL,
  station text NOT NULL,
  pnr_value numeric DEFAULT 0,
  original_status text NOT NULL,
  sla_deadline timestamptz,
  internal_status text DEFAULT 'Pendente',
  internal_notes text DEFAULT '',
  internal_status_updated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_tickets_internal_status ON tickets(internal_status);
CREATE INDEX IF NOT EXISTS idx_tickets_internal_status_updated_at ON tickets(internal_status_updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tickets_spxtn ON tickets(spxtn);

-- Adicionar comentários explicativos
COMMENT ON TABLE tickets IS 'Tabela principal de tickets/pacotes do sistema logístico';
COMMENT ON COLUMN tickets.ticket_id IS 'IHS Ticket ID - Identificador único do ticket';
COMMENT ON COLUMN tickets.spxtn IS 'Código de rastreio (Tracking Code)';
COMMENT ON COLUMN tickets.internal_status IS 'Status interno: Pendente, Em Análise ou Concluído';
COMMENT ON COLUMN tickets.internal_status_updated_at IS 'Data e hora da última atualização do status interno';

-- Habilitar RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT (leitura) pública
CREATE POLICY "Permitir leitura pública de tickets"
  ON tickets FOR SELECT
  USING (true);

-- Política para permitir INSERT (inserção) pública
CREATE POLICY "Permitir inserção pública de tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Política para permitir UPDATE (atualização) pública
CREATE POLICY "Permitir atualização pública de tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política para permitir DELETE (exclusão) pública
CREATE POLICY "Permitir exclusão pública de tickets"
  ON tickets FOR DELETE
  USING (true);