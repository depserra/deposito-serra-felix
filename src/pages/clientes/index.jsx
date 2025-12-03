import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClientes } from '../../hooks/useClientes';
import { useEstoque } from '../../hooks/useEstoque';
import PageLayout from '../../components/layout-new/PageLayout';
import ClienteForm from '../../components/forms/ClienteForm';
import Modal from '../../components/modals/Modal';
import { Plus, Search, Edit, Trash2, History, Users, X, Eye } from 'lucide-react';
import { ClientesSkeleton, LoadingSpinner, EmptyState } from '../../components/ui/LoadingComponents';
import { useVendas } from '../../hooks/useVendas';

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

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteParaEditar, setClienteParaEditar] = useState(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [formError, setFormError] = useState(null);
  const [carregamentoInicial, setCarregamentoInicial] = useState(true);
  const [showHistorico, setShowHistorico] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState(null);
  const [historicoCompras, setHistoricoCompras] = useState([]);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [clienteDetalhes, setClienteDetalhes] = useState(null);

  const {
    clientes,
    loading,
    savingLoading,
    error,
    isOnline,
    listarClientes,
    adicionarCliente,
    atualizarCliente,
    deletarCliente,
    obterHistoricoCliente,
    cache,
    invalidarCache
  } = useClientes();

  const { vendas, listarVendas } = useVendas();
  const { produtos, listarProdutos } = useEstoque();
  
  // Debounce para busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Carregamento inicial otimizado
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        await Promise.all([
          listarClientes(),
          listarProdutos()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      } finally {
        setCarregamentoInicial(false);
      }
    };
    carregarDadosIniciais();
  }, []);

  // Recarrega clientes quando o termo de busca muda (com debounce)
  useEffect(() => {
    if (!carregamentoInicial) {
      listarClientes(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const handleSubmit = useCallback(async (data) => {
    try {
      setFormError(null);
      
      if (data === null) {
        setShowForm(false);
        setClienteParaEditar(null);
        return;
      }

      if (clienteParaEditar) {
        await atualizarCliente(clienteParaEditar.id, data);
        setClienteParaEditar(null);
      } else {
        await adicionarCliente(data);
      }

      // Não limpar o searchTerm para manter a busca atual
      setShowForm(false);
      
      // Não recarregar - o hook já atualiza o estado otimisticamente
    } catch (err) {
      setFormError(err.message);
    }
  }, [clienteParaEditar, atualizarCliente, adicionarCliente]);

  const handleExcluir = useCallback(async () => {
    try {
      const clienteId = clienteParaExcluir.id;
      
      // Fechar modal imediatamente
      setClienteParaExcluir(null);
      
      // Deletar no Firebase - o hook useClientes já faz update otimista
      await deletarCliente(clienteId);
      
      // Invalidar cache para garantir consistência em próximas buscas
      invalidarCache();
      
    } catch (err) {
      // Em caso de erro, recarregar a lista para reverter o update otimista
      await listarClientes(debouncedSearchTerm);
    }
  }, [clienteParaExcluir, deletarCliente, invalidarCache, debouncedSearchTerm, listarClientes]);

  const handleShowHistorico = useCallback(async (cliente) => {
    try {
      setClienteHistorico(cliente);
      setShowHistorico(true);
      setHistoricoCompras([]); // Limpar dados anteriores imediatamente
      
      // Buscar histórico imediatamente
      try {
        const historico = await obterHistoricoCliente(cliente.id);
        setHistoricoCompras(historico || []);
      } catch (error) {
        setHistoricoCompras([]);
      }
    } catch (error) {
      setHistoricoCompras([]);
    }
  }, [obterHistoricoCliente]);

  const handleShowDetalhes = useCallback((cliente) => {
    setClienteDetalhes(cliente);
    setShowDetalhes(true);
  }, []);

  // Função para buscar nome do produto pelo ID
  const getNomeProduto = useCallback((produtoId) => {
    if (!produtos || produtos.length === 0) {
      return produtoId;
    }
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || produtoId;
  }, [produtos]);

  // Função para formatar data do Firebase
  const formatarData = (data) => {
    if (!data) return 'Data não informada';
    try {
      // Se for Timestamp do Firebase
      if (data.toDate && typeof data.toDate === 'function') {
        return data.toDate().toLocaleDateString('pt-BR');
      }
      // Se for Date ou string
      return new Date(data).toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <PageLayout title="Clientes">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-slate-600 dark:text-slate-400">Gerencie seus clientes de forma simples e eficiente</p>
          {!isOnline && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Modo offline - algumas funcionalidades podem estar limitadas
            </div>
          )}
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
                  placeholder="Buscar por nome, email ou telefone..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Botão Novo Cliente */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <Plus size={20} />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Formulário de cadastro/edição */}
        {showForm && (
          <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-8 ${savingLoading ? 'opacity-75 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {clienteParaEditar ? 'Editar Cliente' : 'Novo Cliente'}
                {savingLoading && (
                  <span className="ml-2 text-sm text-blue-600">Salvando...</span>
                )}
              </h2>
            </div>
            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                {formError}
              </div>
            )}
            {savingLoading && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Salvando cliente...</span>
              </div>
            )}
            <ClienteForm
              onSubmit={handleSubmit}
              initialData={clienteParaEditar}
              loading={savingLoading}
            />
          </div>
        )}

        {/* Lista de clientes */}
        {loading && carregamentoInicial ? (
          <ClientesSkeleton />
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-red-500 font-medium mb-2">
              {isOnline ? 'Erro ao carregar clientes' : 'Sem conexão'}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => listarClientes(debouncedSearchTerm)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                disabled={!isOnline}
              >
                {isOnline ? 'Tentar novamente' : 'Aguardando conexão'}
              </button>
              {!isOnline && (
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Recarregar página
                </button>
              )}
            </div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <EmptyState 
              icon={Users}
              title={searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              description={searchTerm ? 'Tente ajustar os termos de busca' : 'Comece criando seu primeiro cliente'}
              actionText={!searchTerm ? 'Novo Cliente' : undefined}
              onAction={!searchTerm ? () => setShowForm(true) : undefined}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Indicador de loading apenas para busca/carregamento de dados */}
            {loading && !carregamentoInicial && searchTerm && (
              <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-75 flex items-center justify-center z-10">
                <LoadingSpinner size="sm" text="Buscando clientes..." />
              </div>
            )}
            <div className="relative">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Telefone
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        CPF
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {clientes.map((cliente, index) => (
                      <tr
                        key={cliente.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-25 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {cliente.nome}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600 dark:text-slate-400">{cliente.telefone || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600 dark:text-slate-400">{cliente.cpf || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => handleShowDetalhes(cliente)}
                              className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
                              title="Ver detalhes do cliente"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleShowHistorico(cliente)}
                              className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                              title="Ver histórico de compras"
                            >
                              <History size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setClienteParaEditar(cliente);
                                setShowForm(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                              title="Editar cliente"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setClienteParaExcluir(cliente)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                              title="Excluir cliente"
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
                {clientes.map((cliente) => (
                  <div key={cliente.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {cliente.nome}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{cliente.telefone || 'Telefone não informado'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowDetalhes(cliente)}
                          className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleShowHistorico(cliente)}
                          className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                          title="Histórico"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setClienteParaEditar(cliente);
                            setShowForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setClienteParaExcluir(cliente)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <p><span className="font-medium">CPF:</span> {cliente.cpf || 'Não informado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação de exclusão */}
        <Modal
          isOpen={!!clienteParaExcluir}
          onClose={() => setClienteParaExcluir(null)}
          title="Confirmar Exclusão"
          footer={
            <>
              <button
                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-all duration-200"
                onClick={() => setClienteParaExcluir(null)}
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
                  Excluir cliente {clienteParaExcluir?.nome}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de histórico de compras */}
        {showHistorico && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">
                  Histórico de Compras - {clienteHistorico?.nome || ''}
                </h3>
                <button
                  onClick={() => {
                    setShowHistorico(false);
                    setClienteHistorico(null);
                  }}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {historicoCompras.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">
                    Nenhuma compra registrada para este cliente.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {historicoCompras.map((venda) => (
                      <div
                        key={venda.id}
                        className="border border-gray-200 dark:border-gray-700 rounded p-3 space-y-2"
                        >
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {formatarData(venda.dataVenda)}
                            </span>
                            <span className="text-blue-600 font-medium">
                              R$ {(venda.valorTotal || 0).toFixed(2)}
                            </span>
                          </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {venda.itens && venda.itens.length > 0 ? (
                            venda.itens.map((item, index) => (
                                <div key={index} className="flex justify-between">
                                  <span>{getNomeProduto(item.produto)}</span>
                                  <span>{item.quantidade || 1}x R$ {(item.valorUnitario || 0).toFixed(2)}</span>
                                </div>
                              ))
                          ) : (
                            <div className="text-gray-400 dark:text-gray-500 italic">Itens não especificados</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de detalhes do cliente */}
        <Modal
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setClienteDetalhes(null);
          }}
          title="Detalhes do Cliente"
          size="lg"
        >
          {clienteDetalhes && (
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Nome</label>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{clienteDetalhes.nome || 'Não informado'}</p>
                  </div>
                  {clienteDetalhes.apelido && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Apelido</label>
                      <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.apelido}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Telefone</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.telefone || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">CPF</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.cpf || 'Não informado'}</p>
                  </div>
                  {clienteDetalhes.email && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">E-mail</label>
                      <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Endereço Completo</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.endereco || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Cidade</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.cidade || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Estado</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.estado || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">CEP</label>
                    <p className="text-slate-900 dark:text-slate-100">{clienteDetalhes.cep || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {clienteDetalhes.observacoes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Observações</h3>
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{clienteDetalhes.observacoes}</p>
                </div>
              )}

              {/* Datas */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Informações de Cadastro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {clienteDetalhes.criadoEm && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Cadastrado em</label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {new Date(clienteDetalhes.criadoEm.seconds ? clienteDetalhes.criadoEm.toDate() : clienteDetalhes.criadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {clienteDetalhes.atualizadoEm && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Última atualização</label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {new Date(clienteDetalhes.atualizadoEm.seconds ? clienteDetalhes.atualizadoEm.toDate() : clienteDetalhes.atualizadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowDetalhes(false);
                    setClienteDetalhes(null);
                    handleShowHistorico(clienteDetalhes);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
                >
                  <History size={16} />
                  Ver Histórico
                </button>
                <button
                  onClick={() => {
                    setClienteParaEditar(clienteDetalhes);
                    setShowForm(true);
                    setShowDetalhes(false);
                    setClienteDetalhes(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                >
                  <Edit size={16} />
                  Editar
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageLayout>
  );
}