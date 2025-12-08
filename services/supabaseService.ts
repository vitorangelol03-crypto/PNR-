import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Ticket, KpiStats } from '../types';

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
}

export const fetchTicketsPaginated = async ({ 
  page, 
  pageSize, 
  searchTerm, 
  filters 
}: FetchParams): Promise<{ data: Ticket[], count: number }> => {
  if (!supabase) throw new Error("Supabase client not initialized");
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' });

  // 1. Busca Global (Barra Superior)
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.trim();
    // Verifica se é número para decidir a estratégia de busca no ticket_id (BigInt)
    // O PostgREST falha se tentarmos 'ilike' em coluna numérica sem cast, e falha se usarmos cast '::text' na URL.
    // Estratégia: Se numérico, busca ID exato OU texto parcial nos outros. Se texto, ignora ID.
    const isNumeric = /^\d+$/.test(term);

    if (isNumeric) {
      query = query.or(`ticket_id.eq.${term},station.ilike.%${term}%,spxtn.ilike.%${term}%`);
    } else {
      query = query.or(`station.ilike.%${term}%,spxtn.ilike.%${term}%`);
    }
  }

  // 2. Filtros por Coluna (Inputs da Tabela)
  if (filters) {
    if (filters.tracking) {
      const t = filters.tracking.trim();
      const isNum = /^\d+$/.test(t);
      if (isNum) {
        query = query.or(`ticket_id.eq.${t},spxtn.ilike.%${t}%`);
      } else {
        query = query.ilike('spxtn', `%${t}%`);
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
  const { data, count, error } = await query
    .order('sla_deadline', { ascending: true }) // Prioridade por prazo
    .range(from, to);

  if (error) throw error;

  return { 
    data: (data as Ticket[]) || [], 
    count: count || 0 
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
  
  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('ticket_id', id);

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