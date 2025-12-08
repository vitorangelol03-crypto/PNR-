import React, { useState, useEffect } from 'react';
import { X, FileText, ChevronDown, ChevronRight, Calendar, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { ImportLog } from '../types';
import { fetchImportLogs } from '../services/supabaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, currentPage]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchImportLogs(currentPage, pageSize);
      setLogs(result.logs);
      setTotalCount(result.count);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const toggleLog = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Histórico de Importações
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Carregando histórico...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma importação registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasErrors = log.skipped_records > 0 || (log.details?.errors?.length || 0) > 0;

                return (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition"
                  >
                    <div
                      className="p-4 bg-white cursor-pointer flex items-center justify-between"
                      onClick={() => toggleLog(log.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {log.file_name}
                            </span>
                            {hasErrors ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Com Avisos
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Sucesso
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(log.import_date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {log.new_records}
                            </div>
                            <div className="text-xs text-gray-500">Novos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {log.updated_records}
                            </div>
                            <div className="text-xs text-gray-500">Atualizados</div>
                          </div>
                          {log.skipped_records > 0 && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-600">
                                {log.skipped_records}
                              </div>
                              <div className="text-xs text-gray-500">Ignorados</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">
                              Resumo da Importação
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Total Processado:</span>
                                <span className="ml-2 font-medium">{log.total_rows}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Importado por:</span>
                                <span className="ml-2 font-medium">{log.imported_by}</span>
                              </div>
                            </div>
                          </div>

                          {log.details?.errors && log.details.errors.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-red-700 mb-2">
                                Erros e Avisos
                              </h4>
                              <div className="bg-red-50 rounded p-3 space-y-1">
                                {log.details.errors.map((error, index) => (
                                  <div key={index} className="text-sm text-red-700">
                                    • {error}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {log.details?.items && (
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">
                                Detalhes dos Registros ({log.details.items.length})
                              </h4>
                              <div className="max-h-64 overflow-y-auto bg-white rounded border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Ticket ID
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Operação
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Mudanças
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {log.details.items.slice(0, 50).map((item, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">
                                          {item.ticket_id}
                                        </td>
                                        <td className="px-3 py-2">
                                          {item.operation === 'create' && (
                                            <span className="text-green-600">Novo</span>
                                          )}
                                          {item.operation === 'update' && (
                                            <span className="text-yellow-600">Atualizado</span>
                                          )}
                                          {item.operation === 'skip' && (
                                            <span className="text-gray-600">Ignorado</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {item.error ? (
                                            <span className="text-red-600">{item.error}</span>
                                          ) : (
                                            <span className="text-gray-600">
                                              {item.changes.length} campo{item.changes.length !== 1 ? 's' : ''}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {log.details.items.length > 50 && (
                                  <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                                    Mostrando 50 de {log.details.items.length} registros
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
