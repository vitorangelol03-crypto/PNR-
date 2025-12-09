import React, { useState, useEffect } from 'react';
import { X, FileDown, Loader2, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { ReportParams, ReportFormat, ReportPeriodType, ReportData } from '../types';
import { generateReportData, exportToCSV, exportToExcel } from '../services/supabaseService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<ReportFormat>('excel');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPeriodType('all');
      setStartDate('');
      setEndDate('');
      setFormat('excel');
      setPreviewData(null);
      setShowPreview(false);
      setError(null);
    }
  }, [isOpen]);

  const validateDates = (): boolean => {
    if (periodType === 'custom') {
      if (!startDate || !endDate) {
        setError('Por favor, selecione as datas inicial e final');
        return false;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();

      if (start > end) {
        setError('A data inicial não pode ser maior que a data final');
        return false;
      }

      if (start > today || end > today) {
        setError('Não é permitido selecionar datas futuras');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handlePreview = async () => {
    if (!validateDates()) return;

    setLoading(true);
    setError(null);

    try {
      const params: ReportParams = {
        periodType,
        startDate: periodType === 'custom' ? startDate : undefined,
        endDate: periodType === 'custom' ? endDate : undefined,
        format
      };

      const data = await generateReportData(params);
      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar preview do relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!previewData) {
      await handlePreview();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (format === 'csv') {
        exportToCSV(previewData);
      } else {
        exportToExcel(previewData);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileDown className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gerar Relatório</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={periodType}
              onChange={(e) => {
                setPeriodType(e.target.value as ReportPeriodType);
                setShowPreview(false);
                setPreviewData(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todos os dados</option>
              <option value="last7">Últimos 7 dias</option>
              <option value="last30">Últimos 30 dias</option>
              <option value="last90">Últimos 90 dias</option>
              <option value="last365">Último ano</option>
              <option value="custom">Período personalizado</option>
            </select>
          </div>

          {periodType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Formato do Relatório
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition">
                <input
                  type="radio"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={(e) => setFormat(e.target.value as ReportFormat)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Excel (.xlsx)</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Relatório completo com múltiplas planilhas: tickets, estatísticas, distribuições e histórico
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as ReportFormat)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">CSV (.csv)</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Arquivo simples com dados dos tickets, compatível com qualquer planilha
                  </p>
                </div>
              </label>
            </div>
          </div>

          {showPreview && previewData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Preview do Relatório
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Período:</span>
                  <span className="ml-2 font-medium text-gray-900">{previewData.metadata.period}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total de Registros:</span>
                  <span className="ml-2 font-medium text-gray-900">{previewData.metadata.totalRecords}</span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    R$ {previewData.statistics.totalValue.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tickets Pendentes:</span>
                  <span className="ml-2 font-medium text-gray-900">{previewData.statistics.pendingCount}</span>
                </div>
              </div>
              {previewData.metadata.totalRecords === 0 && (
                <div className="flex items-center gap-2 text-amber-700 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Nenhum registro encontrado para o período selecionado</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Erro</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition disabled:opacity-50"
          >
            Cancelar
          </button>

          {!showPreview ? (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Visualizar Preview
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || (previewData?.metadata.totalRecords === 0)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Gerar Relatório
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
