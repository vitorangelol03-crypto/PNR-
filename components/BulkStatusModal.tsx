import React, { useState } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Ticket } from '../types';
import { parseTrackingCodes, fetchTicketsByTrackingCodes, updateMultipleTicketsStatus } from '../services/supabaseService';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkStatusModal: React.FC<BulkStatusModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'input' | 'confirm' | 'processing' | 'result'>('input');
  const [inputCodes, setInputCodes] = useState('');
  const [foundTickets, setFoundTickets] = useState<Ticket[]>([]);
  const [notFoundCodes, setNotFoundCodes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleSearch = async () => {
    const codes = parseTrackingCodes(inputCodes);

    if (codes.length === 0) {
      return;
    }

    setProcessing(true);

    try {
      const result = await fetchTicketsByTrackingCodes(codes);
      setFoundTickets(result.foundTickets);
      setNotFoundCodes(result.notFoundCodes);

      const initialSelection = new Set(result.foundTickets.map(t => t.ticket_id));
      setSelectedTicketIds(initialSelection);

      setStep('confirm');
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      alert('Erro ao buscar tickets. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedTicketIds.size === 0) {
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      const ticketIdsArray = Array.from(selectedTicketIds);
      await updateMultipleTicketsStatus(ticketIdsArray, selectedStatus);

      setSuccessCount(ticketIdsArray.length);
      setErrorCount(0);
      setStep('result');

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setErrorCount(selectedTicketIds.size);
      setSuccessCount(0);
      setStep('result');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setInputCodes('');
    setFoundTickets([]);
    setNotFoundCodes([]);
    setSelectedStatus('');
    setSelectedTicketIds(new Set());
    setProcessing(false);
    setSuccessCount(0);
    setErrorCount(0);
    onClose();
  };

  const toggleTicket = (ticketId: string) => {
    const newSet = new Set(selectedTicketIds);
    if (newSet.has(ticketId)) {
      newSet.delete(ticketId);
    } else {
      newSet.add(ticketId);
    }
    setSelectedTicketIds(newSet);
  };

  const toggleAll = () => {
    if (selectedTicketIds.size === foundTickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(foundTickets.map(t => t.ticket_id)));
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-100 text-green-700';
      case 'Em Análise':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            Atualização em Massa de Status Interno
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cole os códigos de rastreio (um por linha):
                </label>
                <textarea
                  value={inputCodes}
                  onChange={(e) => setInputCodes(e.target.value)}
                  placeholder="BR2536718289585&#10;BR250031979091X&#10;BR251853908611Z"
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {parseTrackingCodes(inputCodes).length} códigos detectados
                </p>
              </div>

              <button
                onClick={handleSearch}
                disabled={processing || parseTrackingCodes(inputCodes).length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Tickets'
                )}
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700">Encontrados</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{foundTickets.length}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-700">Não Encontrados</span>
                  </div>
                  <p className="text-3xl font-bold text-red-700">{notFoundCodes.length}</p>
                </div>
              </div>

              {notFoundCodes.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-700 mb-2">Códigos não encontrados:</p>
                  <div className="flex flex-wrap gap-2">
                    {notFoundCodes.map(code => (
                      <span key={code} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione o novo status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Escolha um status...</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Análise">Em Análise</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>

              {foundTickets.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.size === foundTickets.length}
                        onChange={toggleAll}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium text-gray-700">
                        Selecionar Todos ({selectedTicketIds.size}/{foundTickets.length})
                      </span>
                    </label>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sel.</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status Atual</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Novo Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {foundTickets.map(ticket => (
                          <tr key={ticket.ticket_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedTicketIds.has(ticket.ticket_id)}
                                onChange={() => toggleTicket(ticket.ticket_id)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-700">
                              {ticket.spxtn || ticket.ticket_id}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(ticket.internal_status || 'Pendente')}`}>
                                {ticket.internal_status || 'Pendente'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {selectedStatus && selectedTicketIds.has(ticket.ticket_id) ? (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(selectedStatus)}`}>
                                  {selectedStatus}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!selectedStatus || selectedTicketIds.size === 0}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                >
                  Atualizar {selectedTicketIds.size} Ticket{selectedTicketIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">Atualizando tickets...</p>
              <p className="text-sm text-gray-500 mt-2">Por favor, aguarde.</p>
            </div>
          )}

          {step === 'result' && (
            <div className="flex flex-col items-center justify-center py-12">
              {successCount > 0 && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-700 mb-2">Sucesso!</h3>
                  <p className="text-gray-600">
                    {successCount} ticket{successCount !== 1 ? 's' : ''} atualizado{successCount !== 1 ? 's' : ''} com sucesso.
                  </p>
                </div>
              )}
              {errorCount > 0 && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-700 mb-2">Erro!</h3>
                  <p className="text-gray-600">
                    Falha ao atualizar os tickets. Tente novamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
