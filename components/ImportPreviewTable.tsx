import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
import { ImportPreviewItem } from '../types';

interface Props {
  items: ImportPreviewItem[];
}

export const ImportPreviewTable: React.FC<Props> = ({ items }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Plus className="w-3 h-3" />
            Novo
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </span>
        );
      case 'skip':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Ignorar
          </span>
        );
      default:
        return null;
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return `R$ ${value.toFixed(2)}`;
    }
    return String(value);
  };

  const displayedItems = items.slice(0, 100);
  const hasMore = items.length > 100;

  return (
    <div className="space-y-2">
      {hasMore && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          Mostrando os primeiros 100 de {items.length} registros para preview.
          Todos os {items.length} registros serão processados na importação.
        </div>
      )}

      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Ticket ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Motorista
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status Original
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Mudanças
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedItems.map((item, index) => (
              <React.Fragment key={index}>
                <tr
                  className={`hover:bg-gray-50 cursor-pointer ${
                    item.operation === 'skip' ? 'opacity-60' : ''
                  }`}
                  onClick={() => toggleRow(index)}
                >
                  <td className="px-2 py-3 text-center">
                    {item.changes.length > 0 && (
                      expandedRows.has(index) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getOperationBadge(item.operation)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.ticket.ticket_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {item.ticket.driver_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {item.ticket.original_status}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.error ? (
                      <span className="text-red-600">{item.error}</span>
                    ) : item.changes.length > 0 ? (
                      <span className="text-blue-600">
                        {item.changes.length} campo{item.changes.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>

                {expandedRows.has(index) && item.changes.length > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="space-y-2 text-sm">
                        <div className="font-medium text-gray-700 mb-2">
                          Alterações detectadas:
                        </div>
                        {item.changes.map((change, changeIndex) => (
                          <div
                            key={changeIndex}
                            className="flex items-center gap-3 pl-4"
                          >
                            <span className="font-medium text-gray-600 min-w-[100px]">
                              {change.field}:
                            </span>
                            <span className="text-red-600 line-through">
                              {formatValue(change.oldValue)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-green-600 font-medium">
                              {formatValue(change.newValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
