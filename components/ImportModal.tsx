import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertCircle, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { CsvRow, Ticket, ImportAnalysis, ImportResult } from '../types';
import { analyzeImportData, executeSmartImport, saveImportLog } from '../services/supabaseService';
import { ImportPreviewTable } from './ImportPreviewTable';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'analyzing' | 'preview' | 'importing' | 'success';

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setLoading(false);
    setError(null);
    setFileName('');
    setAnalysis(null);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    let clean = value.replace(/[^\d.,-]/g, '');
    if (clean.includes(',') && clean.indexOf('.') < clean.indexOf(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean) || 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);
    setStep('analyzing');

    Papa.parse<CsvRow>(file, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            console.warn("CSV Warnings:", results.errors);
          }

          const ticketsFromCsv: Ticket[] = results.data.map(row => {
            const id = row["IHS Ticket ID"];
            if (!id) return null;

            return {
              ticket_id: id,
              driver_name: row["Driver"] || 'Não Informado',
              station: row["Station"] || '',
              pnr_value: parseCurrency(row["PNR Order Value"]),
              original_status: row["Status"] || 'Unknown',
              sla_deadline: row["SLA Deadline"],
              internal_status: 'Pendente',
              internal_notes: ''
            };
          }).filter((t): t is Ticket => t !== null);

          const analysisResult = await analyzeImportData(ticketsFromCsv);
          setAnalysis(analysisResult);
          setStep('preview');
        } catch (err: any) {
          console.error('Erro ao analisar importação:', err);

          let errorMessage = "Falha ao analisar arquivo";

          if (err.message?.includes('fetch')) {
            errorMessage = "Erro de conexão com o banco de dados. Verifique sua conexão.";
          } else if (err.message) {
            errorMessage = err.message;
          }

          setError(errorMessage);
          setStep('upload');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`Erro ao processar CSV: ${err.message}`);
        setStep('upload');
        setLoading(false);
      }
    });
  };

  const handleConfirmImport = async () => {
    if (!analysis) return;

    setLoading(true);
    setError(null);
    setStep('importing');

    try {
      const itemsToProcess = analysis.previews.filter(
        item => item.operation !== 'skip' || !item.error
      );

      const importResult = await executeSmartImport(itemsToProcess);

      const logId = await saveImportLog(fileName, importResult, analysis.previews);

      if (logId) {
        importResult.logId = logId;
      }

      setResult(importResult);
      setStep('success');

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Falha ao executar importação");
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadStep = () => (
    <>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Upload className="w-6 h-6 text-blue-600" />
        Importar CSV
      </h2>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 font-medium">Clique ou arraste seu arquivo CSV</p>
        <p className="text-sm text-gray-400 mt-1">Colunas: IHS Ticket ID, Driver, PNR Order Value...</p>
      </div>
    </>
  );

  const renderAnalyzingStep = () => (
    <>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Analisando Arquivo
      </h2>

      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Detectando duplicados...</p>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
      </div>
    </>
  );

  const renderPreviewStep = () => {
    if (!analysis) return null;

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Preview da Importação
          </h2>
          <button
            onClick={() => {
              reset();
            }}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">
                {analysis.summary.toCreate}
              </div>
              <div className="text-sm text-gray-600 mt-1">Novos Registros</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">
                {analysis.summary.toUpdate}
              </div>
              <div className="text-sm text-gray-600 mt-1">Serão Atualizados</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-600">
                {analysis.summary.toSkip}
              </div>
              <div className="text-sm text-gray-600 mt-1">Serão Ignorados</div>
            </div>
          </div>
        </div>

        {analysis.summary.toUpdate > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <p className="text-yellow-800">
              <strong>Atenção:</strong> {analysis.summary.toUpdate} registro(s) existente(s) será(ão) atualizado(s).
              Seus dados internos (Status Interno e Observações) serão preservados.
            </p>
          </div>
        )}

        <div className="mb-6">
          <ImportPreviewTable items={analysis.previews} />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded" id="confirm-checkbox" />
            <span>Confirmo que revisei os dados acima</span>
          </label>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const checkbox = document.getElementById('confirm-checkbox') as HTMLInputElement;
              if (!checkbox?.checked) {
                alert('Por favor, confirme que você revisei os dados antes de continuar.');
                return;
              }
              handleConfirmImport();
            }}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Executar Importação
          </button>
        </div>
      </>
    );
  };

  const renderImportingStep = () => (
    <>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        Importando Dados
      </h2>

      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 text-lg font-medium">Processando registros...</p>
        <p className="text-sm text-gray-500 mt-2">Aguarde enquanto salvamos os dados</p>
      </div>
    </>
  );

  const renderSuccessStep = () => {
    if (!result) return null;

    return (
      <>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          Importação Concluída
        </h2>

        <div className="text-center py-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-green-700 mb-4">Sucesso!</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">
                {result.newRecords}
              </div>
              <div className="text-sm text-gray-600 mt-1">Novos Criados</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-600">
                {result.updatedRecords}
              </div>
              <div className="text-sm text-gray-600 mt-1">Atualizados</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-gray-600">
                {result.skippedRecords}
              </div>
              <div className="text-sm text-gray-600 mt-1">Ignorados</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-semibold text-yellow-800 mb-2">Avisos:</h4>
              <ul className="space-y-1 text-sm text-yellow-700">
                {result.errors.map((err, index) => (
                  <li key={index}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-gray-600">
            A janela será fechada automaticamente em alguns segundos...
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {step === 'upload' && renderUploadStep()}
        {step === 'analyzing' && renderAnalyzingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
        {step === 'success' && renderSuccessStep()}

        {error && step !== 'success' && (
          <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
