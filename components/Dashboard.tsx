import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase, fetchTicketsPaginated, fetchDashboardStats, fetchUniqueDrivers, updateTicketInternal, ColumnFilters } from '../services/supabaseService';
import { Ticket, KpiStats } from '../types';
import { ImportModal } from './ImportModal';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Truck, Search, Filter, AlertTriangle, Clock, 
  Upload, FileText, Loader2, ChevronLeft, ChevronRight, AlertCircle, X
} from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// --- Helpers for Display (Moved outside for reuse in charts data processing) ---
const formatDriverName = (name: string) => {
  if (!name) return 'N/A';
  // Remove pattern [12345] at the start
  return name.replace(/^\[.*?\]\s*/, '');
};

const translateStatus = (status: string) => {
  if (!status) return 'Desconhecido';
  const s = status.toLowerCase();
  
  if (s.includes('reversed')) return 'Devolvido';
  if (s.includes('returned')) return 'Devolvido';
  if (s.includes('forbilling')) return 'Faturamento';
  if (s.includes('delivered')) return 'Entregue';
  if (s.includes('created')) return 'Criado';
  if (s.includes('pending driver reply')) return 'Aguard. Resp.';
  if (s.includes('review driver reply')) return 'Análise Resp.';
  if (s.includes('cancelled')) return 'Cancelado';
  
  return status;
};

// Default statuses to ensure the filter dropdown is never empty
// Removed 'Cancelled' and 'Delivered' as requested
const KNOWN_STATUSES = [
  'Created',
  'Pending Driver Reply',
  'Review Driver Reply',
  'ForBilling',
  'Reversed'
];

export const Dashboard: React.FC = () => {
  // Data States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kpis, setKpis] = useState<KpiStats>({ totalTickets: 0, totalValue: 0, pendingCount: 0 });
  const [chartData, setChartData] = useState({ status: [], driver: [] });
  const [uniqueDrivers, setUniqueDrivers] = useState<string[]>([]);
  // Initialize with known statuses sorted
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(KNOWN_STATUSES.sort());
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filter & Pagination States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Date Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Global Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Column Filters
  const [colFilters, setColFilters] = useState<ColumnFilters>({
    tracking: '',
    driver: '',
    value: '',
    status: '',
    internal: '',
    notes: ''
  });
  const [debouncedColFilters, setDebouncedColFilters] = useState<ColumnFilters>(colFilters);

  const supabase = getSupabase();

  // Debounce global search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce column filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColFilters(colFilters);
      setPage(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [colFilters]);

  // Load Overview Data (KPIs, Charts, Drivers List) - Runs once or on heavy updates
  const loadStats = async () => {
    try {
      const [stats, drivers] = await Promise.all([
        fetchDashboardStats(startDate, endDate),
        fetchUniqueDrivers()
      ]);
      setKpis(stats.kpis);
      
      // Extract unique statuses from DB and merge with known defaults
      const rawStatuses = stats.statusDist.map((item: any) => item.name).filter(Boolean);
      const combinedStatuses = Array.from(new Set([...KNOWN_STATUSES, ...rawStatuses])).sort();
      setAvailableStatuses(combinedStatuses);
      
      // Process Chart Data: Translate Statuses and Format Driver Names
      const processedStatus = stats.statusDist.map((item: any) => ({
        name: translateStatus(item.name),
        value: item.value
      }));

      const processedDrivers = stats.driverDist.map((item: any) => ({
        name: formatDriverName(item.name),
        value: item.value
      }));

      setChartData({ status: processedStatus, driver: processedDrivers });
      setUniqueDrivers(drivers);
    } catch (err: any) {
      console.error("Error loading stats:", err);
      // Non-blocking error for stats
    }
  };

  // Load Table Data - Runs on page/filter change
  const loadTableData = useCallback(async () => {
    setLoadingTable(true);
    setErrorMsg(null);
    try {
      const { data, count } = await fetchTicketsPaginated({
        page,
        pageSize,
        searchTerm: debouncedSearch,
        filters: debouncedColFilters
      });
      setTickets(data);
      setTotalCount(count);
      setLastUpdate(new Date());
    } catch (err: any) {
      // Extract error message safely
      let msg = "Erro desconhecido";
      if (typeof err === 'string') msg = err;
      else if (err instanceof Error) msg = err.message;
      else if (err?.message) msg = err.message;
      else if (err?.details) msg = err.details;
      else if (err?.hint) msg = err.hint;
      else {
        try {
          msg = JSON.stringify(err);
        } catch {
          msg = "Erro interno (objeto não serializável)";
        }
      }

      console.error("Error loading table:", err);
      setErrorMsg(`Erro ao buscar dados: ${msg}`);
    } finally {
      setLoadingTable(false);
      setLoading(false); // Initial load done
    }
  }, [page, pageSize, debouncedSearch, debouncedColFilters]);

  // Initial Load
  useEffect(() => {
    if (!supabase) return;
    loadStats();
  }, [supabase]);

  // Reload stats when date filters change
  useEffect(() => {
    if (!supabase) return;
    loadStats();
  }, [startDate, endDate]);

  // Effect trigger for table data
  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Setup Realtime Subscription
  useEffect(() => {
    if (!supabase) return;

    const channel: RealtimeChannel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          loadTableData();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadTableData]);

  // Handlers
  const handleInternalStatusChange = async (id: string, newStatus: string) => {
    try {
      // Optimistic Update
      setTickets(prev => prev.map(t => t.ticket_id === id ? { ...t, internal_status: newStatus } : t));
      await updateTicketInternal(id, { internal_status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
      loadTableData(); // Revert
    }
  };

  const handleNotesChange = async (id: string, newNotes: string) => {
    try {
      await updateTicketInternal(id, { internal_notes: newNotes });
    } catch (err) {
      console.error("Failed to update notes", err);
    }
  };

  const handleColFilterChange = (field: keyof ColumnFilters, value: string) => {
    setColFilters(prev => ({ ...prev, [field]: value }));
  };

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const deadline = new Date(dateStr);
    const now = new Date();
    return deadline < now;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Compute unique status labels to avoid duplicates in dropdown
  const uniqueStatusOptions = React.useMemo(() => {
    const labels = new Set<string>();
    availableStatuses.forEach(st => {
      const label = translateStatus(st);
      if (label && label !== 'Todos') {
        labels.add(label);
      }
    });

    // Explicitly remove "Cancelado" and "Entregue" as requested
    labels.delete('Cancelado');
    labels.delete('Entregue');

    return Array.from(labels).sort();
  }, [availableStatuses]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Truck className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Logística Manager Pro</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden md:block">
            Atualizado: {lastUpdate.toLocaleTimeString()}
          </span>
          <button 
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Error Message Display */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Date Filter Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrar por Período:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Data Inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition"
              >
                <X className="w-3 h-3" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-500 font-medium">Total Tickets</h3>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{loading ? '...' : kpis.totalTickets}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-500 font-medium">Valor Total (PNR)</h3>
              <span className="text-green-500 font-bold">R$</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {loading ? '...' : kpis.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-500 font-medium">Pendentes</h3>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{loading ? '...' : kpis.pendingCount}</p>
          </div>
        </div>

        {/* Charts Section */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
              <h3 className="font-bold text-gray-700 mb-4 shrink-0">Status das Entregas</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.status}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.status.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
              <h3 className="font-bold text-gray-700 mb-4 shrink-0">Top 5 Motoristas (Volume)</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.driver} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100} 
                      tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '...' : val} 
                      tick={{fontSize: 10}} 
                      interval={0} 
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Data Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          {/* Top Bar - Global Search */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisa Global..." 
                  className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold sticky top-0 z-10">
                {/* Cabeçalho */}
                <tr>
                  <th className="px-6 py-3 min-w-[150px]">Cód. Rastreio</th>
                  <th className="px-6 py-3 min-w-[200px]">Motorista / Estação</th>
                  <th className="px-6 py-3 min-w-[100px]">Valor (R$)</th>
                  <th className="px-6 py-3 min-w-[140px]">Status Entr.</th>
                  <th className="px-6 py-3 min-w-[100px]">Prazo</th>
                  <th className="px-6 py-3 min-w-[140px]">Controle Interno</th>
                  <th className="px-6 py-3 min-w-[150px]">Notas</th>
                </tr>
                {/* Linha de Filtros */}
                <tr className="bg-gray-100/50 border-b border-gray-200">
                   <td className="px-2 py-2">
                     <input 
                       type="text" 
                       placeholder="Filtrar Rastreio/ID"
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                       value={colFilters.tracking}
                       onChange={(e) => handleColFilterChange('tracking', e.target.value)}
                     />
                   </td>
                   <td className="px-2 py-2">
                     <input 
                       type="text" 
                       placeholder="Filtrar Motorista/Est."
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                       value={colFilters.driver}
                       onChange={(e) => handleColFilterChange('driver', e.target.value)}
                     />
                   </td>
                   <td className="px-2 py-2">
                     <select 
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                       value={colFilters.value}
                       onChange={(e) => handleColFilterChange('value', e.target.value)}
                     >
                       <option value="">Todos</option>
                       <option value="0-20">Até R$ 20</option>
                       <option value="20-50">R$ 20 - R$ 50</option>
                       <option value="50-100">R$ 50 - R$ 100</option>
                       <option value="100-200">R$ 100 - R$ 200</option>
                       <option value="200-plus">Acima de R$ 200</option>
                     </select>
                   </td>
                   <td className="px-2 py-2">
                     <select
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                       value={colFilters.status}
                       onChange={(e) => handleColFilterChange('status', e.target.value)}
                     >
                       <option value="">Todos</option>
                       {uniqueStatusOptions.map((st) => (
                         <option key={st} value={st}>
                           {st}
                         </option>
                       ))}
                     </select>
                   </td>
                   <td className="px-2 py-2">
                     {/* Campo de filtro removido - apenas exibição de data */}
                   </td>
                   <td className="px-2 py-2">
                     <select 
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                       value={colFilters.internal}
                       onChange={(e) => handleColFilterChange('internal', e.target.value)}
                     >
                       <option value="">Todos</option>
                       <option value="Pendente">Pendente</option>
                       <option value="Em Análise">Em Análise</option>
                       <option value="Concluído">Concluído</option>
                     </select>
                   </td>
                   <td className="px-2 py-2">
                     <input 
                       type="text" 
                       placeholder="Filtrar Notas"
                       className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                       value={colFilters.notes}
                       onChange={(e) => handleColFilterChange('notes', e.target.value)}
                     />
                   </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loadingTable ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando dados do servidor...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      {errorMsg ? 'Erro ao carregar dados.' : 'Nenhum registro encontrado com os filtros atuais.'}
                    </td>
                  </tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.ticket_id} className="hover:bg-blue-50/30 transition group">
                      <td className="px-6 py-3 font-medium text-gray-900 font-mono">
                        {/* Exibe tracking code (spxtn) ou fallback para ID se não existir */}
                        {ticket.spxtn || ticket.ticket_id}
                        {ticket.spxtn && <div className="text-[10px] text-gray-400">{ticket.ticket_id}</div>}
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-800">{formatDriverName(ticket.driver_name)}</div>
                        <div className="text-xs text-gray-400">{ticket.station || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3 font-mono">
                        {(ticket.pnr_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate max-w-[140px]
                          ${(ticket.original_status || '').toLowerCase().includes('delivered') ? 'bg-green-100 text-green-800' : 
                            (ticket.original_status || '').toLowerCase().includes('reversed') ? 'bg-red-100 text-red-800' : 
                            (ticket.original_status || '').toLowerCase().includes('billing') ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {translateStatus(ticket.original_status)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                             {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleDateString() : '-'}
                          </span>
                          {ticket.sla_deadline && isOverdue(ticket.sla_deadline) && ticket.internal_status !== 'Concluído' && (
                            <span title="Atrasado">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <select 
                          value={ticket.internal_status || 'Pendente'}
                          onChange={(e) => handleInternalStatusChange(ticket.ticket_id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 cursor-pointer transition-colors
                            ${ticket.internal_status === 'Concluído' ? 'bg-green-100 text-green-700 focus:ring-green-500' :
                              ticket.internal_status === 'Em Análise' ? 'bg-yellow-100 text-yellow-700 focus:ring-yellow-500' :
                              'bg-gray-100 text-gray-600 focus:ring-gray-400'}`}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Análise">Em Análise</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <input 
                          type="text" 
                          defaultValue={ticket.internal_notes || ''}
                          onBlur={(e) => handleNotesChange(ticket.ticket_id, e.target.value)}
                          className="border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent w-full text-gray-600 placeholder-gray-300 text-xs py-1 transition-all"
                          placeholder="Adicionar nota..."
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
               Mostrando {tickets.length} de {totalCount} registros (Página {page} de {totalPages || 1})
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loadingTable}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition bg-white shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-1">
                 {/* Simple page Indicator */}
                 <span className="px-3 py-1 bg-white border border-gray-200 rounded text-sm font-medium">
                   {page}
                 </span>
              </div>
              <button 
                onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages || loadingTable}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition bg-white shadow-sm"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setImportOpen(false)}
        onSuccess={() => { loadTableData(); loadStats(); }}
      />
    </div>
  );
};