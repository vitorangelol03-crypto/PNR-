export interface Ticket {
  id?: number; // Primary key interna do Supabase (se houver int8)
  ticket_id: string; // "IHS Ticket ID" -> Coluna no banco
  spxtn?: string; // Tracking Code / Código de Rastreio
  created_time?: string;
  driver_name: string; // "Driver" -> Coluna no banco
  station: string;
  pnr_value: number; // "PNR Order Value"
  original_status: string; // "Status" -> Coluna no banco
  sla_deadline: string;
  internal_status: string; // "Pendente", "Em Análise", "Concluído"
  internal_notes: string;
  updated_at?: string;
}

export interface CsvRow {
  "IHS Ticket ID": string;
  "Driver": string;
  "PNR Order Value": string;
  "Status": string;
  "SLA Deadline": string;
  "Station": string;
  [key: string]: string;
}

export type SupabaseConfig = {
  url: string;
  key: string;
};

export interface KpiStats {
  totalTickets: number;
  totalValue: number;
  pendingCount: number;
}

export interface DashboardData {
  tickets: Ticket[];
  totalCount: number;
}