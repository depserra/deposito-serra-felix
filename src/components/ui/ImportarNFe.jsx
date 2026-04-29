// filepath: src/components/ui/ImportarNFe.jsx

import React, { useRef, useState } from 'react';
import { Upload, FileText, Check, AlertCircle, X, Package, Plus, RefreshCw } from 'lucide-react';
import { useImportacaoNFe } from '../../hooks/useImportacaoNFe';

export default function ImportarNFe({ onImportacaoConcluida }) {
  const fileInputRef = useRef(null);
  const {
    importarXML,
    importando,
    progresso,
    logImportacao,
    ultimoResultado,
    limparLog
  } = useImportacaoNFe();

  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        alert('Por favor, selecione um arquivo XML');
        return;
      }
      setArquivoSelecionado(file);
    }
  };

  const handleImportar = async () => {
    if (!arquivoSelecionado) return;

    try {
      const resultado = await importarXML(arquivoSelecionado);
      if (onImportacaoConcluida) {
        onImportacaoConcluida(resultado);
      }
    } catch (error) {
      alert(`Erro ao importar: ${error.message}`);
    }
  };

  const getTipoCor = (tipo) => {
    switch (tipo) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getIcone = (tipo) => {
    switch (tipo) {
      case 'success': return <Check className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Card com botão para abrir modal */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Importar Nota Fiscal (XML)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Importe produtos de notas fiscais eletrônicas (NFe/NFCe)
            </p>
          </div>
          <button
            onClick={() => setMostrarModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar XML
          </button>
        </div>
      </div>

      {/* Modal de Importação */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Importar Nota Fiscal Eletrônica
              </h3>
              <button
                onClick={() => {
                  setMostrarModal(false);
                  limparLog();
                  setArquivoSelecionado(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Área de upload */}
              {!importando && !ultimoResultado && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Clique ou arraste o arquivo XML da NFe
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Formatos aceitos: .xml
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Arquivo selecionado */}
              {arquivoSelecionado && !importando && !ultimoResultado && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {arquivoSelecionado.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {(arquivoSelecionado.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setArquivoSelecionado(null)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleImportar}
                    className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Iniciar Importação
                  </button>
                </div>
              )}

              {/* Barra de progresso */}
              {importando && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Processando...</span>
                    <span className="text-slate-600 dark:text-slate-300">{progresso}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Log de importação */}
              {logImportacao.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Log da Importação
                    </span>
                    <button
                      onClick={limparLog}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {logImportacao.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 text-sm ${getTipoCor(log.tipo)}`}
                      >
                        {getIcone(log.tipo)}
                        <span>{log.mensagem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultado final */}
              {ultimoResultado && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Importação Concluída!
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Nota Fiscal:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {ultimoResultado.notaFiscal}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Série:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {ultimoResultado.serie}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Fornecedor:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {ultimoResultado.fornecedor || 'Não identificado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Total Produtos:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {ultimoResultado.totalProdutos}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Novos:</span>
                      <p className="font-medium text-green-600">
                        +{ultimoResultado.produtosNovos}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Atualizados:</span>
                      <p className="font-medium text-yellow-600">
                        ~{ultimoResultado.produtosAtualizados}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do modal */}
            {ultimoResultado && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => {
                    limparLog();
                    setArquivoSelecionado(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Importar Outro
                </button>
                <button
                  onClick={() => {
                    setMostrarModal(false);
                    limparLog();
                    setArquivoSelecionado(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}