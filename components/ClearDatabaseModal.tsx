import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { clearAllData, ClearDatabaseProgress, getDeletePreviewCounts, PreviewCounts } from '../services/supabaseService';

interface ClearDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PeriodType = 'all' | '7days' | '30days' | '90days' | '6months' | '1year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

const calculateDateRange = (periodType: PeriodType): DateRange | null => {
  if (periodType === 'all') return null;

  const now = new Date();
  const end = now.toISOString();
  let start: Date;

  switch (periodType) {
    case '7days':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case '90days':
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case '6months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      break;
    case '1year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      return null;
  }

  return {
    start: start.toISOString(),
    end
  };
};

const formatDateForInput = (isoDate: string): string => {
  return isoDate.split('T')[0];
};

const formatDateDisplay = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR');
};

export const ClearDatabaseModal: React.FC<ClearDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ClearDatabaseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<PreviewCounts | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (periodType === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Por favor, selecione as datas inicial e final');
          setLoadingPreview(false);
          return;
        }

        const start = new Date(customStartDate);
        const end = new Date(customEndDate);

        if (start > end) {
          setError('Data inicial não pode ser maior que data final');
          setLoadingPreview(false);
          return;
        }

        if (start > new Date()) {
          setError('Datas futuras não são permitidas');
          setLoadingPreview(false);
          return;
        }

        startDate = start.toISOString();
        endDate = end.toISOString();
      } else if (periodType !== 'all') {
        const range = calculateDateRange(periodType);
        if (range) {
          startDate = range.start;
          endDate = range.end;
        }
      }

      const counts = await getDeletePreviewCounts(startDate, endDate);
      setPreviewCounts(counts);

      if (counts.tickets === 0 && counts.logs === 0) {
        setError('Nenhum registro encontrado no período selecionado');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClear = async () => {
    if (confirmText !== 'ZERAR') return;

    setLoading(true);
    setError(null);
    setCompleted(false);

    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const deleteAll = periodType === 'all';

      if (periodType === 'custom') {
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate).toISOString();
      } else if (periodType !== 'all') {
        const range = calculateDateRange(periodType);
        if (range) {
          startDate = range.start;
          endDate = range.end;
        }
      }

      const result = await clearAllData(
        { startDate, endDate, deleteAll },
        (prog) => setProgress(prog)
      );

      if (result.success) {
        setCompleted(true);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Erro ao limpar banco de dados');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao limpar banco de dados');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPeriodType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setConfirmText('');
    setProgress(null);
    setError(null);
    setCompleted(false);
    setPreviewCounts(null);
    onClose();
  };

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriodType(newPeriod);
    setPreviewCounts(null);
    setError(null);
    setConfirmText('');
  };

  if (!isOpen) return null;

  const isConfirmValid = confirmText === 'ZERAR';
  const needsPreview = periodType !== 'all' && !previewCounts;
  const canProceed = isConfirmValid && (periodType === 'all' || previewCounts);

  const getPeriodLabel = (): string => {
    switch (periodType) {
      case '7days': return 'últimos 7 dias';
      case '30days': return 'últimos 30 dias';
      case '90days': return 'últimos 90 dias';
      case '6months': return 'últimos 6 meses';
      case '1year': return 'último ano';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatDateDisplay(customStartDate)} até ${formatDateDisplay(customEndDate)}`;
        }
        return 'período personalizado';
      default: return 'todos os dados';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">
              Zerar Banco de Dados
            </h2>
          </div>
          {!loading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {!completed && !loading && (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Calendar className="inline mr-2" size={16} />
                  Selecione o período
                </label>
                <select
                  value={periodType}
                  onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="all">Todos os dados</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="90days">Últimos 90 dias</option>
                  <option value="6months">Últimos 6 meses</option>
                  <option value="1year">Último ano</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </div>

              {periodType === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setPreviewCounts(null);
                        setError(null);
                      }}
                      max={formatDateForInput(new Date().toISOString())}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data final
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setPreviewCounts(null);
                        setError(null);
                      }}
                      max={formatDateForInput(new Date().toISOString())}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                periodType === 'all' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <AlertTriangle className={`flex-shrink-0 mt-0.5 ${
                  periodType === 'all' ? 'text-red-600' : 'text-yellow-600'
                }`} size={20} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    periodType === 'all' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {periodType === 'all' ? 'ATENÇÃO: ESTA AÇÃO NÃO PODE SER DESFEITA!' : 'ATENÇÃO'}
                  </h3>
                  <p className={`text-sm ${
                    periodType === 'all' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {periodType === 'all'
                      ? 'Todos os tickets e histórico de importações serão permanentemente excluídos do sistema.'
                      : `Todos os tickets e logs criados ${getPeriodLabel()} serão permanentemente excluídos.`
                    }
                  </p>
                </div>
              </div>

              {previewCounts && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-blue-900 font-semibold mb-2">
                    Preview de Exclusão
                  </h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li><strong>{previewCounts.tickets}</strong> tickets serão excluídos</li>
                    <li><strong>{previewCounts.logs}</strong> logs de importação serão excluídos</li>
                    <li className="pt-2 border-t border-blue-200 mt-2">
                      Período: <strong>{getPeriodLabel()}</strong>
                    </li>
                  </ul>
                </div>
              )}

              {needsPreview && (
                <button
                  onClick={handlePreview}
                  disabled={loadingPreview || (periodType === 'custom' && (!customStartDate || !customEndDate))}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Carregando preview...
                    </>
                  ) : (
                    'Visualizar Registros a Excluir'
                  )}
                </button>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Para confirmar, digite <span className={`font-bold ${periodType === 'all' ? 'text-red-600' : 'text-yellow-600'}`}>ZERAR</span> no campo abaixo:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Digite ZERAR para confirmar"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    periodType === 'all'
                      ? 'border-gray-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-yellow-500'
                  } focus:border-transparent`}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {loading && progress && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="text-blue-600 animate-spin" size={20} />
                  <div className="flex-1">
                    <p className="text-blue-800 font-medium">{progress.message}</p>
                    {progress.stage === 'deleting_logs' && progress.totalLogs !== undefined && (
                      <p className="text-blue-600 text-sm mt-1">
                        Excluindo {progress.totalLogs} registros de histórico...
                      </p>
                    )}
                    {progress.stage === 'deleting_tickets' && progress.totalTickets !== undefined && (
                      <p className="text-blue-600 text-sm mt-1">
                        Excluindo {progress.totalTickets} tickets...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: progress.stage === 'counting' ? '25%' :
                           progress.stage === 'deleting_logs' ? '50%' :
                           progress.stage === 'deleting_tickets' ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          )}

          {completed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="text-green-800 font-semibold">
                  Banco de dados zerado com sucesso!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  {progress?.deletedTickets || 0} tickets e {progress?.deletedLogs || 0} registros de histórico foram excluídos.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          {!completed && (
            <button
              onClick={handleClear}
              disabled={!canProceed || loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                periodType === 'all'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processando...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Zerar Banco de Dados
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
