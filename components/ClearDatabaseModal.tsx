import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { clearAllData, ClearDatabaseProgress } from '../services/supabaseService';

interface ClearDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClearDatabaseModal: React.FC<ClearDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ClearDatabaseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleClear = async () => {
    if (confirmText !== 'ZERAR') return;

    setLoading(true);
    setError(null);
    setCompleted(false);

    try {
      const result = await clearAllData((prog) => {
        setProgress(prog);
      });

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
    setConfirmText('');
    setProgress(null);
    setError(null);
    setCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  const isConfirmValid = confirmText === 'ZERAR';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="text-red-800 font-semibold mb-1">
                    ATENÇÃO: ESTA AÇÃO NÃO PODE SER DESFEITA!
                  </h3>
                  <p className="text-red-700 text-sm">
                    Todos os tickets e histórico de importações serão permanentemente excluídos do sistema.
                  </p>
                </div>
              </div>

              {progress && progress.stage === 'counting' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Total de registros:</strong>
                  </p>
                  <ul className="text-blue-700 text-sm mt-2 space-y-1">
                    <li>• Tickets: {progress.totalTickets || 0}</li>
                    <li>• Histórico de Importações: {progress.totalLogs || 0}</li>
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Para confirmar, digite <span className="font-bold text-red-600">ZERAR</span> no campo abaixo:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Digite ZERAR para confirmar"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              disabled={!isConfirmValid || loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
