import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Ticket, KpiStats, ImportPreviewItem, ImportAnalysis, FieldChange, ImportResult, ImportLog, BatchProgress } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (config: SupabaseConfig) => {
  try {
    supabase = createClient(config.url, config.key);
    return supabase;
  } catch (error) {
    console.error("Failed to initialize Supabase", error);
    return null;
  }
};

export const getSupabase = () => supabase;

// --- FUNÇÃO AUXILIAR: Dividir Array em Lotes ---
const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};

// --- FUNÇÃO AUXILIAR: Limpar Campos Undefined ---
const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      cleaned[key as keyof T] = value;
    }
  });
  return cleaned;
};

// --- FUNÇÃO AUXILIAR: Buscar Tickets em Lotes ---
const fetchTicketsInBatches = async (
  ticketIds: string[],
  spxtns: string[],
  batchSize: number = 200,
  onProgress?: (progress: BatchProgress) => void
): Promise<Ticket[]> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  let allTickets: Ticket[] = [];
  const existingIds = new Set<string>();

  const totalIds = ticketIds.length + spxtns.length;
  let processedIds = 0;

  // Buscar por ticket_ids em lotes
  if (ticketIds.length > 0) {
    const ticketIdBatches = batchArray(ticketIds, batchSize);
    const totalBatches = ticketIdBatches.length;

    for (let i = 0; i < ticketIdBatches.length; i++) {
      const batch = ticketIdBatches[i];

      if (onProgress) {
        onProgress({
          currentBatch: i + 1,
          totalBatches: totalBatches + (spxtns.length > 0 ? batchArray(spxtns, batchSize).length : 0),
          processedItems: processedIds,
          totalItems: totalIds,
          stage: 'analyzing',
          message: `Verificando tickets existentes (${i + 1}/${totalBatches})...`
        });
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .in('ticket_id', batch);

      if (error) throw error;

      const batchTickets = (data as Ticket[]) || [];
      batchTickets.forEach(ticket => {
        if (ticket.ticket_id && !existingIds.has(ticket.ticket_id)) {
          allTickets.push(ticket);
          existingIds.add(ticket.ticket_id);
        }
      });

      processedIds += batch.length;
    }
  }

  // Buscar por spxtns em lotes
  if (spxtns.length > 0) {
    const spxtnBatches = batchArray(spxtns, batchSize);
    const totalBatches = spxtnBatches.length;
    const offset = ticketIds.length > 0 ? batchArray(ticketIds, batchSize).length : 0;

    for (let i = 0; i < spxtnBatches.length; i++) {
      const batch = spxtnBatches[i];

      if (onProgress) {
        onProgress({
          currentBatch: offset + i + 1,
          totalBatches: offset + totalBatches,
          processedItems: processedIds,
          totalItems: totalIds,
          stage: 'analyzing',
          message: `Verificando códigos de rastreio (${i + 1}/${totalBatches})...`
        });
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .in('spxtn', batch);

      if (error) throw error;

      const batchTickets = (data as Ticket[]) || [];
      batchTickets.forEach(ticket => {
        if (ticket.ticket_id && !existingIds.has(ticket.ticket_id)) {
          allTickets.push(ticket);
          existingIds.add(ticket.ticket_id);
        }
      });

      processedIds += batch.length;
    }
  }

  return allTickets;
};

// --- FUNÇÃO UTILITÁRIA: Parse de Múltiplos Códigos de Rastreio ---
export const parseTrackingCodes = (input: string): string[] => {
  if (!input || input.trim() === '') return [];

  const codes = input
    .split('\n')
    .map(code => code.trim())
    .filter(code => code.length > 0);

  return codes.slice(0, 50);
};

// --- OTIMIZAÇÃO: Busca Paginada (Server-side Pagination) ---
export interface ColumnFilters {
  tracking?: string;
  driver?: string;
  value?: string;
  status?: string;
  internal?: string;
  notes?: string;
}

interface FetchParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  filters?: ColumnFilters;
  sortBy?: 'sla_deadline' | 'internal_status_updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  searchedCodes: string[];
  foundCodes: string[];
  notFoundCodes: string[];
}

export const fetchTicketsPaginated = async ({
  page,
  pageSize,
  searchTerm,
  filters,
  sortBy = 'sla_deadline',
  sortOrder = 'asc'
}: FetchParams): Promise<{ data: Ticket[], count: number, searchResult?: SearchResult }> => {
  if (!supabase) throw new Error("Supabase client not initialized");
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' });

  let searchedCodes: string[] = [];
  let isMultiCodeSearch = false;

  // 1. Busca Global (Barra Superior)
  if (searchTerm && searchTerm.trim() !== '') {
    const codes = parseTrackingCodes(searchTerm);

    if (codes.length > 1) {
      isMultiCodeSearch = true;
      searchedCodes = codes;

      const numericCodes = codes.filter(c => /^\d+$/.test(c));
      const textCodes = codes.filter(c => !/^\d+$/.test(c));

      const conditions: string[] = [];

      if (textCodes.length > 0) {
        conditions.push(`spxtn.in.(${textCodes.join(',')})`);
      }

      if (numericCodes.length > 0) {
        conditions.push(`ticket_id.in.(${numericCodes.join(',')})`);
        conditions.push(`spxtn.in.(${numericCodes.join(',')})`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    } else {
      const term = searchTerm.trim();
      const isNumeric = /^\d+$/.test(term);

      if (isNumeric) {
        query = query.or(`ticket_id.eq.${term},station.ilike.%${term}%,spxtn.ilike.%${term}%`);
      } else {
        query = query.or(`station.ilike.%${term}%,spxtn.ilike.%${term}%`);
      }
    }
  }

  // 2. Filtros por Coluna (Inputs da Tabela)
  if (filters) {
    if (filters.tracking) {
      const codes = parseTrackingCodes(filters.tracking);

      if (codes.length > 1) {
        isMultiCodeSearch = true;
        searchedCodes = codes;

        const numericCodes = codes.filter(c => /^\d+$/.test(c));
        const textCodes = codes.filter(c => !/^\d+$/.test(c));

        const conditions: string[] = [];

        if (textCodes.length > 0) {
          conditions.push(`spxtn.in.(${textCodes.join(',')})`);
        }

        if (numericCodes.length > 0) {
          conditions.push(`ticket_id.in.(${numericCodes.join(',')})`);
          conditions.push(`spxtn.in.(${numericCodes.join(',')})`);
        }

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      } else {
        const t = filters.tracking.trim();
        const isNum = /^\d+$/.test(t);
        if (isNum) {
          query = query.or(`ticket_id.eq.${t},spxtn.ilike.%${t}%`);
        } else {
          query = query.ilike('spxtn', `%${t}%`);
        }
      }
    }

    if (filters.driver) {
      const d = filters.driver.trim();
      query = query.or(`driver_name.ilike.%${d}%,station.ilike.%${d}%`);
    }

    if (filters.value) {
      // Processa faixas de valores (ex: "20-50" ou "200-plus")
      if (filters.value === '200-plus') {
         query = query.gte('pnr_value', 200);
      } else {
         const parts = filters.value.split('-');
         if (parts.length === 2) {
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);
            if (!isNaN(min)) query = query.gte('pnr_value', min);
            if (!isNaN(max)) query = query.lte('pnr_value', max);
         }
      }
    }

    if (filters.status) {
       const s = filters.status.toLowerCase();
       // Map translated terms back to DB queries
       if (s === 'devolvido') {
           query = query.or('original_status.ilike.%reversed%,original_status.ilike.%returned%');
       } else if (s === 'faturamento') {
           query = query.ilike('original_status', '%forbilling%');
       } else if (s === 'entregue') {
           query = query.ilike('original_status', '%delivered%');
       } else if (s === 'criado') {
           query = query.ilike('original_status', '%created%');
       } else if (s === 'aguard. resp.') {
           query = query.ilike('original_status', '%pending driver reply%');
       } else if (s === 'análise resp.') {
           query = query.ilike('original_status', '%review driver reply%');
       } else if (s === 'cancelado') {
           query = query.ilike('original_status', '%cancelled%');
       } else {
           // Fallback for manual typing or unknowns
           query = query.ilike('original_status', `%${filters.status}%`);
       }
    }

    if (filters.internal && filters.internal !== '') {
      query = query.eq('internal_status', filters.internal);
    }

    if (filters.notes) {
      query = query.ilike('internal_notes', `%${filters.notes}%`);
    }
  }

  // Ordenação e Paginação
  let orderedQuery = query;

  if (sortBy === 'internal_status_updated_at') {
    // Ordenar por data de atualização (nulls no final)
    orderedQuery = query.order('internal_status_updated_at', { ascending: sortOrder === 'asc', nullsFirst: false });
  } else {
    // Ordenar por SLA deadline (padrão)
    orderedQuery = query.order('sla_deadline', { ascending: sortOrder === 'asc' });
  }

  const { data, count, error } = await orderedQuery.range(from, to);

  if (error) throw error;

  const tickets = (data as Ticket[]) || [];

  let searchResult: SearchResult | undefined;

  if (isMultiCodeSearch && searchedCodes.length > 0) {
    const foundCodes: string[] = [];

    tickets.forEach(ticket => {
      const spxtn = ticket.spxtn?.toString() || '';
      const ticketId = ticket.ticket_id?.toString() || '';

      searchedCodes.forEach(code => {
        if (spxtn === code || ticketId === code) {
          if (!foundCodes.includes(code)) {
            foundCodes.push(code);
          }
        }
      });
    });

    const notFoundCodes = searchedCodes.filter(code => !foundCodes.includes(code));

    searchResult = {
      searchedCodes,
      foundCodes,
      notFoundCodes
    };
  }

  return {
    data: tickets,
    count: count || 0,
    searchResult
  };
};

// --- OTIMIZAÇÃO: Estatísticas Leves ---
// Baixa TODAS as linhas (em lotes) mas apenas colunas necessárias para calcular KPIs totais
export const fetchDashboardStats = async (startDate?: string, endDate?: string): Promise<{ kpis: KpiStats, statusDist: any[], driverDist: any[] }> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  let allTickets: any[] = [];
  let from = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  // Loop para buscar TODOS os registros, contornando o limite padrão de 1000 linhas
  while (hasMore) {
    let query = supabase
      .from('tickets')
      .select('pnr_value, internal_status, original_status, driver_name');

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_time', startDate);
    }
    if (endDate) {
      query = query.lte('created_time', endDate);
    }

    const { data, error } = await query.range(from, from + BATCH_SIZE - 1);

    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allTickets = [...allTickets, ...data];
      
      // Se retornou menos que o lote, acabou os dados
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        from += BATCH_SIZE;
      }
    }
  }

  const tickets = allTickets;

  // Calcular KPIs em memória (rápido pois são poucos bytes por linha)
  const kpis: KpiStats = {
    totalTickets: tickets.length,
    totalValue: tickets.reduce((acc, t) => acc + (Number(t.pnr_value) || 0), 0),
    pendingCount: tickets.filter(t => t.internal_status === 'Pendente').length
  };

  // Status Distribution
  const statusCounts: Record<string, number> = {};
  tickets.forEach(t => {
    const s = t.original_status || 'Unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusDist = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Driver Distribution (Top 5)
  const driverCounts: Record<string, number> = {};
  tickets.forEach(t => {
    const d = t.driver_name || 'Unknown';
    driverCounts[d] = (driverCounts[d] || 0) + 1;
  });
  const driverDist = Object.entries(driverCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return { kpis, statusDist, driverDist };
};

// --- Auxiliar: Buscar lista única de motoristas para o filtro ---
export const fetchUniqueDrivers = async (): Promise<string[]> => {
  if (!supabase) throw new Error("Supabase client not initialized");
  
  const { data } = await supabase
    .from('tickets')
    .select('driver_name')
    .order('driver_name');
    
  if (!data) return [];
  
  const drivers = Array.from(new Set(data.map(d => d.driver_name).filter(Boolean)));
  return drivers as string[];
};

export const updateTicketInternal = async (id: string, updates: Partial<Ticket>) => {
  if (!supabase) throw new Error("Supabase client not initialized");

  // Se está atualizando internal_status, também atualizar o timestamp
  if (updates.internal_status !== undefined) {
    updates.internal_status_updated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('ticket_id', id);

  if (error) throw error;
};

export interface BulkSearchResult {
  foundTickets: Ticket[];
  notFoundCodes: string[];
}

export const fetchTicketsByTrackingCodes = async (codes: string[]): Promise<BulkSearchResult> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  if (codes.length === 0) {
    return { foundTickets: [], notFoundCodes: [] };
  }

  const numericCodes = codes.filter(c => /^\d+$/.test(c));
  const textCodes = codes.filter(c => !/^\d+$/.test(c));

  const conditions: string[] = [];

  if (textCodes.length > 0) {
    conditions.push(`spxtn.in.(${textCodes.join(',')})`);
  }

  if (numericCodes.length > 0) {
    conditions.push(`ticket_id.in.(${numericCodes.join(',')})`);
    conditions.push(`spxtn.in.(${numericCodes.join(',')})`);
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .or(conditions.join(','));

  if (error) throw error;

  const foundTickets = (data as Ticket[]) || [];

  const foundCodes: string[] = [];
  foundTickets.forEach(ticket => {
    const spxtn = ticket.spxtn?.toString() || '';
    const ticketId = ticket.ticket_id?.toString() || '';

    codes.forEach(code => {
      if (spxtn === code || ticketId === code) {
        if (!foundCodes.includes(code)) {
          foundCodes.push(code);
        }
      }
    });
  });

  const notFoundCodes = codes.filter(code => !foundCodes.includes(code));

  return { foundTickets, notFoundCodes };
};

export const updateMultipleTicketsStatus = async (ticketIds: string[], newStatus: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('tickets')
    .update({
      internal_status: newStatus,
      internal_status_updated_at: new Date().toISOString()
    })
    .in('ticket_id', ticketIds);

  if (error) throw error;
};

export const upsertTickets = async (tickets: Ticket[]) => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const BATCH_SIZE = 100;
  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('tickets')
      .upsert(batch, { onConflict: 'ticket_id' });

    if (error) throw error;
  }
};

export const analyzeImportData = async (
  ticketsFromCsv: Ticket[],
  onProgress?: (progress: BatchProgress) => void
): Promise<ImportAnalysis> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const ticketIds = ticketsFromCsv.map(t => t.ticket_id).filter(Boolean);
  const spxtns = ticketsFromCsv.map(t => t.spxtn).filter(Boolean);

  // Validar que temos IDs para buscar
  if (ticketIds.length === 0 && spxtns.length === 0) {
    return {
      previews: ticketsFromCsv.map(t => ({
        ticket: t,
        operation: 'skip',
        changes: [],
        error: 'Ticket ID não encontrado'
      })),
      summary: {
        total: ticketsFromCsv.length,
        toCreate: 0,
        toUpdate: 0,
        toSkip: ticketsFromCsv.length
      }
    };
  }

  // Usar batching para buscar tickets existentes
  const existingTickets = await fetchTicketsInBatches(ticketIds, spxtns, 200, onProgress);

  const existingMap = new Map<string, Ticket>();
  existingTickets.forEach(ticket => {
    if (ticket.ticket_id) {
      existingMap.set(ticket.ticket_id, ticket);
    }
    if (ticket.spxtn) {
      existingMap.set(ticket.spxtn, ticket);
    }
  });

  const previews: ImportPreviewItem[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let toSkip = 0;

  // Rastrear ticket_ids já processados no CSV para detectar duplicatas internas
  const processedTicketIds = new Set<string>();
  const processedSpxtns = new Set<string>();

  ticketsFromCsv.forEach((newTicket, index) => {
    if (!newTicket.ticket_id) {
      previews.push({
        ticket: newTicket,
        operation: 'skip',
        changes: [],
        error: 'Ticket ID não encontrado'
      });
      toSkip++;
      return;
    }

    // Verificar duplicatas internas no CSV
    if (processedTicketIds.has(newTicket.ticket_id)) {
      previews.push({
        ticket: newTicket,
        operation: 'skip',
        changes: [],
        error: 'Ticket ID duplicado no arquivo CSV'
      });
      toSkip++;
      return;
    }

    // Verificar duplicatas por spxtn no CSV
    if (newTicket.spxtn && processedSpxtns.has(newTicket.spxtn)) {
      previews.push({
        ticket: newTicket,
        operation: 'skip',
        changes: [],
        error: 'Código de rastreio duplicado no arquivo CSV'
      });
      toSkip++;
      return;
    }

    // Marcar como processado
    processedTicketIds.add(newTicket.ticket_id);
    if (newTicket.spxtn) {
      processedSpxtns.add(newTicket.spxtn);
    }

    const existing = existingMap.get(newTicket.ticket_id) ||
                     (newTicket.spxtn ? existingMap.get(newTicket.spxtn) : undefined);

    if (existing) {
      const changes: FieldChange[] = [];

      const fieldsToCompare = [
        { key: 'driver_name', label: 'Motorista' },
        { key: 'station', label: 'Estação' },
        { key: 'pnr_value', label: 'Valor' },
        { key: 'original_status', label: 'Status' },
        { key: 'sla_deadline', label: 'SLA' }
      ];

      fieldsToCompare.forEach(({ key, label }) => {
        const oldVal = (existing as any)[key];
        const newVal = (newTicket as any)[key];

        if (oldVal !== newVal) {
          changes.push({
            field: label,
            oldValue: oldVal,
            newValue: newVal
          });
        }
      });

      if (changes.length > 0) {
        previews.push({
          ticket: newTicket,
          operation: 'update',
          changes,
          existingTicket: existing
        });
        toUpdate++;
      } else {
        previews.push({
          ticket: newTicket,
          operation: 'skip',
          changes: [],
          error: 'Nenhuma alteração detectada'
        });
        toSkip++;
      }
    } else {
      previews.push({
        ticket: newTicket,
        operation: 'create',
        changes: []
      });
      toCreate++;
    }
  });

  return {
    previews,
    summary: {
      total: ticketsFromCsv.length,
      toCreate,
      toUpdate,
      toSkip
    }
  };
};

export const executeSmartImport = async (
  previewItems: ImportPreviewItem[],
  onProgress?: (progress: BatchProgress) => void
): Promise<ImportResult> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const toCreate = previewItems.filter(item => item.operation === 'create');
  const toUpdate = previewItems.filter(item => item.operation === 'update');

  const errors: string[] = [];
  let newRecords = 0;
  let updatedRecords = 0;

  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(toCreate.length / BATCH_SIZE) + Math.ceil(toUpdate.length / BATCH_SIZE);
  let currentBatch = 0;

  try {
    // Processar criações em lotes
    const createBatches = batchArray(toCreate, BATCH_SIZE);
    for (let i = 0; i < createBatches.length; i++) {
      currentBatch++;

      if (onProgress) {
        onProgress({
          currentBatch,
          totalBatches,
          processedItems: newRecords + updatedRecords,
          totalItems: toCreate.length + toUpdate.length,
          stage: 'importing',
          message: `Criando novos registros (${i + 1}/${createBatches.length})...`
        });
      }

      const batch = createBatches[i];
      const ticketsToInsert = batch.map(item => item.ticket);

      const { error } = await supabase
        .from('tickets')
        .insert(ticketsToInsert);

      if (error) {
        errors.push(`Erro ao criar registros: ${error.message}`);
      } else {
        newRecords += batch.length;
      }
    }

    // Processar updates individualmente
    if (toUpdate.length > 0) {
      const updateBatches = batchArray(toUpdate, BATCH_SIZE);

      for (let i = 0; i < updateBatches.length; i++) {
        currentBatch++;

        if (onProgress) {
          onProgress({
            currentBatch,
            totalBatches,
            processedItems: newRecords + updatedRecords,
            totalItems: toCreate.length + toUpdate.length,
            stage: 'importing',
            message: `Atualizando registros existentes (${i + 1}/${updateBatches.length})...`
          });
        }

        const batch = updateBatches[i];

        for (const item of batch) {
          if (!item.existingTicket || !item.existingTicket.ticket_id) {
            errors.push(`Erro ao atualizar: ticket_id não encontrado`);
            continue;
          }

          const updates: Partial<Ticket> = {
            driver_name: item.ticket.driver_name,
            station: item.ticket.station,
            pnr_value: item.ticket.pnr_value,
            original_status: item.ticket.original_status,
            sla_deadline: item.ticket.sla_deadline,
            updated_at: new Date().toISOString(),
            internal_status: item.existingTicket.internal_status,
            internal_notes: item.existingTicket.internal_notes,
            internal_status_updated_at: item.existingTicket.internal_status_updated_at
          };

          if (item.ticket.spxtn && !item.existingTicket.spxtn) {
            updates.spxtn = item.ticket.spxtn;
          }

          const cleanedUpdates = cleanObject(updates);

          const { error } = await supabase
            .from('tickets')
            .update(cleanedUpdates)
            .eq('ticket_id', item.existingTicket.ticket_id);

          if (error) {
            errors.push(`Erro ao atualizar ticket ${item.existingTicket.ticket_id}: ${error.message}`);
          } else {
            updatedRecords++;
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed: previewItems.length,
      newRecords,
      updatedRecords,
      skippedRecords: previewItems.filter(item => item.operation === 'skip').length,
      errors
    };
  } catch (error: any) {
    return {
      success: false,
      totalProcessed: previewItems.length,
      newRecords,
      updatedRecords,
      skippedRecords: previewItems.filter(item => item.operation === 'skip').length,
      errors: [error.message || 'Erro desconhecido']
    };
  }
};

export const saveImportLog = async (
  fileName: string,
  result: ImportResult,
  previewItems: ImportPreviewItem[]
): Promise<number | null> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const details = {
    items: previewItems.map(item => ({
      ticket_id: item.ticket.ticket_id,
      operation: item.operation,
      changes: item.changes,
      error: item.error
    })),
    errors: result.errors
  };

  const { data, error } = await supabase
    .from('import_logs')
    .insert({
      file_name: fileName,
      total_rows: result.totalProcessed,
      new_records: result.newRecords,
      updated_records: result.updatedRecords,
      skipped_records: result.skippedRecords,
      details
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao salvar log:', error);
    return null;
  }

  return data?.id || null;
};

export const fetchImportLogs = async (page: number = 1, pageSize: number = 10): Promise<{ logs: ImportLog[], count: number }> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('import_logs')
    .select('*', { count: 'exact' })
    .order('import_date', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    logs: (data as ImportLog[]) || [],
    count: count || 0
  };
};

export interface ClearDatabaseProgress {
  stage: 'counting' | 'deleting_logs' | 'deleting_tickets' | 'completed';
  message: string;
  deletedLogs?: number;
  deletedTickets?: number;
  totalLogs?: number;
  totalTickets?: number;
}

export interface ClearDatabaseResult {
  success: boolean;
  deletedTickets: number;
  deletedLogs: number;
  error?: string;
}

export const clearAllData = async (
  onProgress?: (progress: ClearDatabaseProgress) => void
): Promise<ClearDatabaseResult> => {
  if (!supabase) throw new Error("Supabase client not initialized");

  try {
    let deletedTickets = 0;
    let deletedLogs = 0;

    if (onProgress) {
      onProgress({
        stage: 'counting',
        message: 'Contando registros...'
      });
    }

    const { count: ticketsCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    const { count: logsCount } = await supabase
      .from('import_logs')
      .select('*', { count: 'exact', head: true });

    const totalTickets = ticketsCount || 0;
    const totalLogs = logsCount || 0;

    if (onProgress) {
      onProgress({
        stage: 'deleting_logs',
        message: `Excluindo ${totalLogs} registros de histórico...`,
        totalLogs,
        totalTickets
      });
    }

    const { error: logsError } = await supabase
      .from('import_logs')
      .delete()
      .neq('id', 0);

    if (logsError) throw logsError;
    deletedLogs = totalLogs;

    if (onProgress) {
      onProgress({
        stage: 'deleting_tickets',
        message: `Excluindo ${totalTickets} tickets...`,
        deletedLogs,
        totalLogs,
        totalTickets
      });
    }

    const { error: ticketsError } = await supabase
      .from('tickets')
      .delete()
      .neq('ticket_id', '');

    if (ticketsError) throw ticketsError;
    deletedTickets = totalTickets;

    if (onProgress) {
      onProgress({
        stage: 'completed',
        message: 'Banco de dados zerado com sucesso!',
        deletedLogs,
        deletedTickets,
        totalLogs,
        totalTickets
      });
    }

    return {
      success: true,
      deletedTickets,
      deletedLogs
    };
  } catch (error: any) {
    return {
      success: false,
      deletedTickets: 0,
      deletedLogs: 0,
      error: error.message || 'Erro desconhecido ao limpar banco de dados'
    };
  }
};