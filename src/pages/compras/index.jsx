import { useState, useEffect, useCallback } from 'react';
import { useCompras } from '../../hooks/useCompras';
import PageLayout from '../../components/layout-new/PageLayout';
import CompraForm from '../../components/forms/CompraForm';
import Modal from '../../components/modals/Modal';
import { Plus, Search, Edit, Trash2, ShoppingBag, Package, Eye } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingComponents';

// Hook para debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ComprasPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [compraParaEditar, setCompraParaEditar] = useState(null);
  const [compraParaExcluir, setCompraParaExcluir] = useState(null);
  const [compraDetalhes, setCompraDetalhes] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [carregamentoInicial, setCarregamentoInicial] = useState(true);

  const { compras, loading, error, listarCompras, adicionarCompra, atualizarCompra, deletarCompra } = useCompras();

  // Debounce para busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Carregamento inicial
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        await listarCompras();
      } catch (error) {
        console.error('Erro ao carregar compras:', error);
      } finally {
        setCarregamentoInicial(false);
      }
    };
    carregarDadosIniciais();
  }, []);

  // Recarrega compras quando a busca muda (com debounce)
  useEffect(() => {
    if (!carregamentoInicial) {
      listarCompras(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const handleSubmit = useCallback(async (data) => {
    try {
      if (data === null) {
        setShowForm(false);
        setCompraParaEditar(null);
        return;
      }

      if (compraParaEditar) {
        await atualizarCompra(compraParaEditar.id, data);
        setCompraParaEditar(null);
      } else {
        await adicionarCompra(data);
      }

      setSearchTerm('');
      setShowForm(false);
      await listarCompras('');
    } catch (err) {
      console.error('Erro ao salvar compra:', err);
      alert('Erro ao salvar compra: ' + err.message);
    }
  }, [compraParaEditar, atualizarCompra, adicionarCompra, listarCompras]);

  const handleExcluir = useCallback(async () => {
    try {
      await deletarCompra(compraParaExcluir.id);
      setCompraParaExcluir(null);
      await listarCompras(debouncedSearchTerm);
    } catch (err) {
      console.error('Erro ao excluir compra:', err);
    }
  }, [compraParaExcluir, deletarCompra, debouncedSearchTerm, listarCompras]);

  return (
    <PageLayout title="Compras">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-slate-600 dark:text-slate-400">Registre e gerencie as compras de mercadorias</p>
        </div>

        {/* Controles de busca */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Campo de busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por código, fornecedor ou produto..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Botão Nova Compra */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <Plus size={20} />
              Nova Compra
            </button>
          </div>
        </div>

        {/* Formulário de cadastro/edição */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {compraParaEditar ? 'Editar Compra' : 'Nova Compra'}
              </h2>
            </div>
            <CompraForm
              onSubmit={handleSubmit}
              initialData={compraParaEditar}
            />
          </div>
        )}

        {/* Lista de compras */}
        {loading && carregamentoInicial ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12">
            <LoadingSpinner text="Carregando compras..." />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-red-500 font-medium mb-2">Erro ao carregar compras</div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => listarCompras(debouncedSearchTerm)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : compras.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <EmptyState
              icon={ShoppingBag}
              title={searchTerm ? 'Nenhuma compra encontrada' : 'Nenhuma compra registrada'}
              description={searchTerm ? 'Tente ajustar os termos de busca' : 'Comece registrando sua primeira compra'}
              actionText={!searchTerm ? 'Nova Compra' : undefined}
              onAction={!searchTerm ? () => setShowForm(true) : undefined}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Indicador de loading para busca */}
            {loading && !carregamentoInicial && (
              <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-75 flex items-center justify-center z-10">
                <LoadingSpinner size="sm" text="Buscando compras..." />
              </div>
            )}
            <div className="relative">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Código
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Data
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Fornecedor
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Itens
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Valor Total
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {compras.map((compra, index) => (
                      <tr
                        key={compra.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-25 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                            #{compra.codigoCompra}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {compra.dataCompra ? new Date(compra.dataCompra).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {compra.fornecedor}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Package size={16} />
                            <span>{compra.itens?.length || 0} produto(s)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            R$ {(compra.valorTotal || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => {
                                setCompraDetalhes(compra);
                                setShowDetalhes(true);
                              }}
                              className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
                              title="Ver detalhes da compra"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setCompraParaEditar(compra);
                                setShowForm(true);
                              }}
                              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                              title="Editar compra"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setCompraParaExcluir(compra)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                              title="Excluir compra"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {compras.map((compra) => (
                  <div key={compra.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                          #{compra.codigoCompra}
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {compra.dataCompra ? new Date(compra.dataCompra).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCompraDetalhes(compra);
                            setShowDetalhes(true);
                          }}
                          className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setCompraParaEditar(compra);
                            setShowForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setCompraParaExcluir(compra)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{compra.fornecedor}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <Package size={16} />
                        <span>{compra.itens?.length || 0} produto(s)</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        R$ {(compra.valorTotal || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de detalhes da compra */}
        <Modal
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setCompraDetalhes(null);
          }}
          title="Detalhes da Compra"
          size="lg"
        >
          {compraDetalhes && (
            <div className="space-y-6">
              {/* Informações principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Código da Compra</label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">#{compraDetalhes.codigoCompra}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Data da Compra</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">
                    {new Date(compraDetalhes.dataCompra).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fornecedor</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">{compraDetalhes.fornecedor}</p>
                </div>
              </div>

              {/* Itens da compra */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Itens da Compra</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Categoria</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quantidade</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor de Compra</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor de Venda</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {compraDetalhes.itens?.map((item, index) => (
                        <tr key={index}>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{item.nomeProduto}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.categoria || '-'}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{item.quantidade}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">R$ {(item.valorCompra || item.valorUnitario)?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">R$ {item.valorVenda?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                            R$ {(item.quantidade * (item.valorCompra || item.valorUnitario)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan="5" className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">Valor Total:</td>
                        <td className="py-3 px-4 text-right font-bold text-lg text-red-600 dark:text-red-400">
                          R$ {compraDetalhes.valorTotal?.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Observações */}
              {compraDetalhes.observacoes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Observações</h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{compraDetalhes.observacoes}</p>
                </div>
              )}

              {/* Botões de ação */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                <button
                  onClick={() => {
                    setCompraParaEditar(compraDetalhes);
                    setShowForm(true);
                    setShowDetalhes(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                >
                  <Edit size={16} />
                  Editar Compra
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de confirmação de exclusão */}
        <Modal
          isOpen={!!compraParaExcluir}
          onClose={() => setCompraParaExcluir(null)}
          title="Confirmar Exclusão"
          footer={
            <>
              <button
                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-all duration-200"
                onClick={() => setCompraParaExcluir(null)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
                onClick={handleExcluir}
              >
                Excluir
              </button>
            </>
          }
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Excluir compra #{compraParaExcluir?.codigoCompra}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
}
