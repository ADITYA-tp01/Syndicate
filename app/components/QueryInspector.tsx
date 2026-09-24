'use client';

import { ChevronDown, ChevronUp, Copy, Clock, Terminal } from 'lucide-react';
import { useState } from 'react';

interface QueryResult {
  result: any[];
  columns: string[];
  ms: number;
  cypher: string;
  params: any;
}

interface QueryInspectorProps {
  queries: QueryResult[];
}

export default function QueryInspector({ queries }: QueryInspectorProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (queries.length === 0) {
    return (
      <div className="border-t border-gray-800 bg-gray-900/50 p-4">
        <div className="text-center text-gray-500 py-8">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No queries executed yet</p>
          <p className="text-xs mt-1">Run an investigation action to see Cypher here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800 bg-gray-900/50 flex flex-col h-72 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Query Inspector
        </h3>
        <span className="text-xs text-gray-500 font-mono">{queries.length} queries</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {queries.map((query, index) => (
          <QueryItem
            key={index}
            query={query}
            index={index}
            total={queries.length}
            isExpanded={expanded === index}
            onToggle={() => setExpanded(expanded === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
}

function QueryItem({
  query,
  index,
  total,
  isExpanded,
  onToggle,
}: {
  query: QueryResult;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { result, columns, ms, cypher, params } = query;
  const rowCount = Array.isArray(result) ? result.length : 0;
  const safeMs = typeof ms === 'number' ? ms : 0;
  const safeCypher = cypher || '';
  const cols = columns || [];
  const rows = Array.isArray(result) ? result : [];

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono">#{total - index}</span>
          <span className="text-xs font-mono text-primary">{safeMs.toFixed(2)}ms</span>
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">{rowCount} rows</span>
        </div>
        <div className="flex items-center gap-1">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-800 p-3 bg-gray-950">
          {/* Params */}
          {params && Object.keys(params).length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">PARAMS</div>
              <pre className="text-xs text-gray-300 font-mono bg-black/50 p-2 rounded">{JSON.stringify(params, null, 2)}</pre>
            </div>
          )}

          {/* Cypher */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">CYPHER</div>
              <button
                onClick={() => navigator.clipboard.writeText(safeCypher)}
                className="px-2 py-0.5 text-[10px] bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="text-xs text-gray-300 font-mono bg-black/50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">{safeCypher}</pre>
          </div>

          {/* Results */}
          {rowCount > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">RESULT ({rowCount} rows)</div>
              <div className="max-h-40 overflow-x-auto overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      {cols.map((col, i) => (
                        <th key={i} className="text-left px-2 py-1">{col || `col_${i}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                        {(Array.isArray(row) ? row : [row]).map((cell: any, ci: number) => (
                          <td key={ci} className="px-2 py-1 text-gray-300 max-w-xs truncate">
                            {formatCell(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 20 && (
                      <tr>
                        <td colSpan={Math.max(cols.length, 1)} className="px-2 py-1 text-center text-gray-500">
                          ... and {rows.length - 20} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatCell(cell: any): string {
  if (cell === null || cell === undefined) return 'null';
  if (typeof cell === 'object') {
    if (cell.identity !== undefined) return `node:${cell.identity}`;
    if (cell.start !== undefined && cell.end !== undefined) return `edge:${cell.start}→${cell.end}`;
    if (cell.length !== undefined) return `path[${cell.length}]`;
    return JSON.stringify(cell);
  }
  return String(cell);
}