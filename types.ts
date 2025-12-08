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
  internal_status_updated_at?: string; // Data/hora da última atualização do status interno
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

export type ImportOperationType = 'create' | 'update' | 'skip';

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ImportPreviewItem {
  ticket: Ticket;
  operation: ImportOperationType;
  changes: FieldChange[];
  error?: string;
  existingTicket?: Ticket;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  errors: string[];
  logId?: number;
}

export interface ImportLog {
  id: number;
  import_date: string;
  imported_by: string;
  total_rows: number;
  new_records: number;
  updated_records: number;
  skipped_records: number;
  file_name: string;
  details: {
    items: Array<{
      ticket_id: string;
      operation: ImportOperationType;
      changes: FieldChange[];
      error?: string;
    }>;
    errors: string[];
  };
  created_at: string;
}

export interface ImportAnalysis {
  previews: ImportPreviewItem[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
}