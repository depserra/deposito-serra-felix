/**
 * ModalConversaoFornecedor.jsx
 *
 * Modal exibido durante a importação de NF-e quando não existe conversão
 * cadastrada para um produto/fornecedor.
 *
 * Props:
 *   itens            - array de { prod, cnpjFornecedor }
 *   produtos         - lista de produtos do estoque (para vinculação opcional)
 *   onConfirmar(dados) - chamada ao confirmar:
 *                        { fatorConversao, unidadeBase, produtoId? }
 *   onCancelar()     - abortar importação
 */

import React, { useState } from 'react';
import { AlertTriangle, Link2, HelpCircle, ChevronRight } from 'lucide-react';
import { UNIDADES } from '../../utils/conversaoUnidades';
import { formatQuantity, formatReal } from '../../utils/formatters';

export default function ModalConversaoFornecedor({ itens, produtos = [], onConfirmar, onCancelar }) {
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [fator, setFator] = useState('');
  const [unidadeBase, setUnidadeBase] = useState('kg');
  const [produtoIdVinculado, setProdutoIdVinculado] = useState('');
  const [salvarParaFuturo, setSalvarParaFuturo] = useState(true);
  const [erro, setErro] = useState('');
  const [respostas, setRespostas] = useState([]);

  if (!itens || itens.length === 0) return null;

  const total = itens.length;
  const itemAtual = itens[indiceAtual];
  const prod = itemAtual?.prod;

  if (!prod) return null;

  const handleConfirmar = () => {
    const fatorNum = parseFloat(fator);
    if (!fatorNum || fatorNum <= 0) {
      setErro('Informe um fator de conversão válido (maior que 0).');
      return;
    }
    if (!unidadeBase) {
      setErro('Selecione a unidade base do produto no estoque.');
      return;
    }
    setErro('');

    const novaResposta = {
      item: itemAtual,
      fatorConversao: fatorNum,
      unidadeBase,
      produtoId: produtoIdVinculado || undefined,
      salvarParaFuturo,
    };

    const novasRespostas = [...respostas, novaResposta];

    if (indiceAtual < total - 1) {
      setRespostas(novasRespostas);
      setIndiceAtual(prev => prev + 1);
      // Resetar campos para o próximo item
      setFator('');
      setUnidadeBase('kg');
      setProdutoIdVinculado('');
      setSalvarParaFuturo(true);
    } else {
      onConfirmar(novasRespostas);
    }
  };

  const unidadesOpcoes = Object.entries(UNIDADES).map(([sigla, { nome }]) => ({ sigla, nome }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Conversão de Unidade Necessária
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">
            {total > 1
              ? `Produto ${indiceAtual + 1} de ${total} — informe a conversão para continuar a importação.`
              : 'Informe a conversão para continuar a importação.'}
          </p>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {/* Produto do XML */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Produto na Nota Fiscal
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">{prod.nome}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>Código: <strong className="text-slate-700 dark:text-slate-300">{prod.codigoFornecedor}</strong></span>
              <span>Unidade: <strong className="text-slate-700 dark:text-slate-300">{prod.unidadeComercial}</strong></span>
              <span>Qtd na NF: <strong className="text-slate-700 dark:text-slate-300">{formatQuantity(prod.quantidadeComercial)}</strong></span>
              <span>Valor Unit.: <strong className="text-slate-700 dark:text-slate-300">{formatReal(prod.valorUnitComercial)}</strong></span>
            </div>
          </div>

          {/* Pergunta de conversão */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              1 <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded font-mono text-xs">{prod.unidadeComercial}</span>
              equivale a quantas unidades no estoque?
            </label>
            <div className="flex gap-3">
              <input
                id="fator-conversao-input"
                type="number"
                min="0.001"
                step="any"
                value={fator}
                onChange={e => { setFator(e.target.value); setErro(''); }}
                onWheel={e => e.target.blur()}
                placeholder="Ex: 10"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <select
                id="unidade-base-select"
                value={unidadeBase}
                onChange={e => setUnidadeBase(e.target.value)}
                className="px-3 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {unidadesOpcoes.map(({ sigla, nome }) => (
                  <option key={sigla} value={sigla}>{sigla.toUpperCase()} — {nome}</option>
                ))}
              </select>
            </div>
            {fator && parseFloat(fator) > 0 && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                → {formatQuantity(prod.quantidadeComercial)} {prod.unidadeComercial} = <strong>{formatQuantity(prod.quantidadeComercial * parseFloat(fator))} {unidadeBase}</strong> entrarão no estoque
              </p>
            )}
          </div>

          {/* Vincular produto existente (opcional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-500" />
              Vincular a um produto já cadastrado <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <select
              id="produto-vinculado-select"
              value={produtoIdVinculado}
              onChange={e => setProdutoIdVinculado(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— Criar como novo produto —</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.unidade}) — Estoque: {p.quantidade}
                </option>
              ))}
            </select>
          </div>

          {/* Salvar para futuro */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id="salvar-futuro-checkbox"
              type="checkbox"
              checked={salvarParaFuturo}
              onChange={e => setSalvarParaFuturo(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Salvar esta conversão automaticamente nas próximas importações deste fornecedor
            </span>
          </label>

          {erro && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{erro}</p>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            id="cancelar-conversao-btn"
            onClick={onCancelar}
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Cancelar Importação
          </button>
          <button
            type="button"
            id="confirmar-conversao-btn"
            onClick={handleConfirmar}
            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {indiceAtual < total - 1 ? (
              <>Confirmar e Próximo <ChevronRight className="w-4 h-4" /></>
            ) : (
              'Confirmar e Importar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
