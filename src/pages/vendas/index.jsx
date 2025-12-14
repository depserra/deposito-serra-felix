import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVendas } from '../../hooks/useVendas';
import { useClientes } from '../../hooks/useClientes';
import { useEstoque } from '../../hooks/useEstoque';
import PageLayout from '../../components/layout-new/PageLayout';
import VendaForm from '../../components/forms/VendaForm';
import Modal from '../../components/modals/Modal';
import { Plus, Search, Edit, Trash2, FileText, CheckCircle, Clock, XCircle, Filter, Users, Eye } from 'lucide-react';
import { VendasSkeleton, LoadingSpinner, EmptyState } from '../../components/ui/LoadingComponents';

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

export default function VendasPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [vendaParaEditar, setVendaParaEditar] = useState(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null);
  const [vendaDetalhes, setVendaDetalhes] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [formError, setFormError] = useState(null);
  const [carregamentoInicial, setCarregamentoInicial] = useState(true);
  
  const { vendas, loading, error, listarVendas, adicionarVenda, atualizarVenda, deletarVenda } = useVendas();
  const { clientes, listarClientes, invalidarCache } = useClientes();
  const { produtos, listarProdutos } = useEstoque();
  
  // Debounce para busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Carregamento inicial otimizado
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        // Carregar em paralelo para melhor performance
        await Promise.all([
          listarClientes(),
          listarVendas(),
          listarProdutos()
        ]);
        setCarregamentoInicial(false);
      } catch (error) {
        console.error('Erro no carregamento inicial:', error);
        setCarregamentoInicial(false);
      }
    };
    carregarDadosIniciais();
  }, []);

  // Recarrega vendas quando filtros mudam (com debounce)
  useEffect(() => {
    if (!carregamentoInicial) {
      listarVendas(debouncedSearchTerm, statusFiltro);
    }
  }, [debouncedSearchTerm, statusFiltro, carregamentoInicial]);

  const handleSubmit = useCallback(async (data) => {
    try {
      if (data === null) {
        setShowForm(false);
        setVendaParaEditar(null);
        return;
      }

      const dadosProcessados = {
        ...data,
        valorTotal: Number(data.valorTotal || 0),
        itens: data.itens.map(item => ({
          ...item,
          quantidade: Number(item.quantidade || 0),
          valorUnitario: Number(item.valorUnitario || 0)
        }))
      };

      console.log('Dados processados:', dadosProcessados);

      if (vendaParaEditar) {
        console.log('Atualizando venda:', vendaParaEditar.id);
        await atualizarVenda(vendaParaEditar.id, dadosProcessados);
        setVendaParaEditar(null);
      } else {
        console.log('Adicionando nova venda');
        const novaVenda = await adicionarVenda(dadosProcessados);
        console.log('Nova venda adicionada:', novaVenda);
      }

      // Limpa os filtros para mostrar todas as vendas, incluindo a nova
      setSearchTerm('');
      setStatusFiltro('');
      setShowForm(false);
      
      // Recarrega a lista de vendas
      await listarVendas('', '');
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      alert('Erro ao salvar venda: ' + err.message);
    }
  }, [vendaParaEditar, atualizarVenda, adicionarVenda, listarVendas]);

  const handleExcluir = useCallback(async () => {
    try {
      await deletarVenda(vendaParaExcluir.id);
      setVendaParaExcluir(null);
      await listarVendas(debouncedSearchTerm, statusFiltro);
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
    }
  }, [vendaParaExcluir, deletarVenda, debouncedSearchTerm, statusFiltro, listarVendas]);

  const formatarStatus = (status) => {
    const statusMap = {
      'em_andamento': 'Fiado',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
  };

  // Função para buscar nome do produto pelo ID
  const getNomeProduto = useCallback((produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || produtoId;
  }, [produtos]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="text-emerald-500" size={18} />;
      case 'em_andamento':
        return <Clock className="text-amber-500" size={18} />;
      case 'cancelada':
        return <XCircle className="text-red-500" size={18} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full";
    switch (status) {
      case 'concluida':
        return `${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`;
      case 'em_andamento':
        return `${baseClasses} bg-amber-50 text-amber-700 border border-amber-200`;
      case 'cancelada':
        return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
      default:
        return baseClasses;
    }
  };

  return (
    <PageLayout title="Vendas">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-slate-600 dark:text-slate-400">Gerencie suas vendas de forma simples e eficiente</p>
        </div>

        {/* Controles de busca e filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Campo de busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por código, cliente ou produto..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtro de Status */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <select
                  className="pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer transition-all duration-200 min-w-[180px]"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                >
                <option value="">Todos os Status</option>
                  <option value="fiado">Fiado</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Botão Nova Venda */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <Plus size={20} />
              Nova Venda
            </button>
          </div>
        </div>

        {/* Formulário de cadastro/edição */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {vendaParaEditar ? 'Editar Venda' : 'Nova Venda'}
              </h2>
            </div>
            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                {formError}
              </div>
            )}
            <VendaForm
              onSubmit={handleSubmit}
              initialData={vendaParaEditar}
              clientes={clientes}
              onClienteAdicionado={async (novoCliente) => {
                // Invalida o cache e recarrega a lista de clientes para incluir o novo
                invalidarCache();
                await listarClientes();
                // Retorna apenas o ID para o formulário selecionar
                return novoCliente?.id;
              }}
            />
          </div>
        )}

        {/* Lista de vendas */}
        {/* Lista de vendas */}
        {loading && carregamentoInicial ? (
          <VendasSkeleton />
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-red-500 font-medium mb-2">Erro ao carregar vendas</div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button 
              onClick={() => listarVendas(debouncedSearchTerm, statusFiltro)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : vendas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <EmptyState 
              icon={FileText}
              title={searchTerm || statusFiltro ? 'Nenhuma venda encontrada' : 'Nenhuma venda cadastrada'}
              description={searchTerm || statusFiltro ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira venda'}
              actionText={!searchTerm && !statusFiltro ? 'Nova Venda' : undefined}
              onAction={!searchTerm && !statusFiltro ? () => setShowForm(true) : undefined}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Indicador de loading para busca */}
            {loading && !carregamentoInicial && (
              <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-75 flex items-center justify-center z-10">
                <LoadingSpinner size="sm" text="Buscando vendas..." />
              </div>
            )}
            <div className="relative">
            <>
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
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Valor Total
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {vendas.map((venda, index) => (
                      <tr
                        key={venda.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-25 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                            #{venda.codigoVenda}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {new Date(venda.dataVenda).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {venda.clienteNome}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            R$ {venda.valorTotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={getStatusBadge(venda.status)}>
                            {getStatusIcon(venda.status)}
                            {formatarStatus(venda.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => {
                                setVendaDetalhes(venda);
                                setShowDetalhes(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setVendaParaEditar(venda);
                                setShowForm(true);
                              }}
                              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                              title="Editar venda"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setVendaParaExcluir(venda)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                              title="Excluir venda"
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
                {vendas.map((venda) => (
                  <div key={venda.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                          #{venda.codigoVenda}
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(venda.dataVenda).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVendaDetalhes(venda);
                            setShowDetalhes(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setVendaParaEditar(venda);
                            setShowForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setVendaParaExcluir(venda)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{venda.clienteNome}</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">R$ {venda.valorTotal.toFixed(2)}</p>
                    </div>                    <div className="flex items-center">
                      <span className={getStatusBadge(venda.status)}>
                        {getStatusIcon(venda.status)}
                        {formatarStatus(venda.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
            </div>
          </div>
        )}

        {/* Modal de detalhes da venda */}
        <Modal
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setVendaDetalhes(null);
          }}
          title="Detalhes da Venda"
          size="lg"
        >
          {vendaDetalhes && (
            <div className="space-y-6">
              {/* Informações principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Código da Venda</label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">#{vendaDetalhes.codigoVenda}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Data da Venda</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">
                    {new Date(vendaDetalhes.dataVenda).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Cliente</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">{vendaDetalhes.clienteNome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <span className={getStatusBadge(vendaDetalhes.status)}>
                    {getStatusIcon(vendaDetalhes.status)}
                    {formatarStatus(vendaDetalhes.status)}
                  </span>
                </div>
                {vendaDetalhes.formaPagamento && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Forma de Pagamento</label>
                    <p className="text-lg font-medium text-slate-900 dark:text-white capitalize">
                      {vendaDetalhes.formaPagamento.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                )}
              </div>

              {/* Itens da venda */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Itens da Venda</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quantidade</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor Unitário</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {vendaDetalhes.itens?.map((item, index) => (
                        <tr key={index}>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{getNomeProduto(item.produto)}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{item.quantidade}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">R$ {item.valorUnitario?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                            R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan="3" className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">Valor Total:</td>
                        <td className="py-3 px-4 text-right font-bold text-lg text-green-600 dark:text-green-400">
                          R$ {vendaDetalhes.valorTotal?.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Observações */}
              {vendaDetalhes.observacoes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Observações</h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{vendaDetalhes.observacoes}</p>
                </div>
              )}

              {/* Botões de ação */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                <button
                  onClick={() => {
                    setVendaParaEditar(vendaDetalhes);
                    setShowForm(true);
                    setShowDetalhes(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                >
                  <Edit size={16} />
                  Editar Venda
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de confirmação de exclusão */}
        <Modal
          isOpen={!!vendaParaExcluir}
          onClose={() => setVendaParaExcluir(null)}
          title="Confirmar Exclusão"
          footer={
            <>
              <button
                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-all duration-200"
                onClick={() => setVendaParaExcluir(null)}
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
                  Excluir venda #{vendaParaExcluir?.codigoVenda}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
}