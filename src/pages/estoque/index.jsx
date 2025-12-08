import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, TrendingUp, DollarSign, Filter, Eye } from 'lucide-react';
import { useEstoque } from '../../hooks/useEstoque';
import ProdutoForm from '../../components/forms/ProdutoForm';
import PageLayout from '../../components/layout-new/PageLayout';
import Modal from '../../components/modals/Modal';
import { LoadingSpinner, ProdutosSkeleton } from '../../components/ui/LoadingComponents';

export default function Estoque() {
  const { produtos, carregando, erro, adicionarProduto, atualizarProduto, deletarProduto, listarProdutos } = useEstoque();
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [produtoParaEditar, setProdutoParaEditar] = useState(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [produtoDetalhes, setProdutoDetalhes] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    listarProdutos();
  }, [listarProdutos]);

  // Categorias únicas
  const categorias = useMemo(() => {
    const cats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
    return cats.sort();
  }, [produtos]);

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(produto => {
      const matchBusca = produto.nome?.toLowerCase().includes(busca.toLowerCase());
      
      const matchCategoria = !filtroCategoria || produto.categoria === filtroCategoria;
      
      let matchEstoque = true;
      if (filtroEstoque === 'baixo') {
        matchEstoque = produto.quantidade <= (produto.estoqueMinimo || 0);
      } else if (filtroEstoque === 'zerado') {
        matchEstoque = produto.quantidade === 0;
      }
      
      return matchBusca && matchCategoria && matchEstoque;
    });
  }, [produtos, busca, filtroCategoria, filtroEstoque]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = produtos.length;
    const baixoEstoque = produtos.filter(p => p.quantidade <= (p.estoqueMinimo || 0)).length;
    const zerados = produtos.filter(p => p.quantidade === 0).length;
    const valorTotal = produtos.reduce((acc, p) => acc + (p.quantidade * (p.precoVenda || 0)), 0);
    
    return { total, baixoEstoque, zerados, valorTotal };
  }, [produtos]);

  const handleSubmit = async (dados) => {
    try {
      if (produtoParaEditar) {
        await atualizarProduto(produtoParaEditar.id, dados);
      } else {
        await adicionarProduto(dados);
      }
      setMostrarFormulario(false);
      setProdutoParaEditar(null);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  };

  const handleEditar = (produto) => {
    setProdutoParaEditar(produto);
    setMostrarFormulario(true);
  };

  const handleRemover = async () => {
    if (produtoParaExcluir) {
      await deletarProduto(produtoParaExcluir.id);
      setProdutoParaExcluir(null);
    }
  };

  // Função para obter nome completo da unidade
  const getNomeUnidade = (sigla) => {
    const unidades = {
      'un': 'Unidade',
      'kg': 'Quilograma',
      'g': 'Grama',
      'l': 'Litro',
      'ml': 'Mililitro',
      'm': 'Metro',
      'cm': 'Centímetro',
      'mm': 'Milímetro',
      'cx': 'Caixa',
      'pc': 'Peça',
      'pct': 'Pacote',
      'sc': 'Saco',
      'fd': 'Fardo',
      'm²': 'Metro Quadrado',
      'm³': 'Metro Cúbico'
    };
    return unidades[sigla?.toLowerCase()] || sigla || '-';
  };

  const handleNovoProduto = () => {
    setProdutoParaEditar(null);
    setMostrarFormulario(true);
  };

  return (
    <PageLayout title="Estoque">
      <div className="space-y-6">

        {/* Botão Novo Produto */}
        <div className="flex justify-end">
          <button
            onClick={handleNovoProduto}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        </div>

        {/* Formulário */}
        {mostrarFormulario && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}
              </h2>
            </div>
            <ProdutoForm
              onSubmit={handleSubmit}
              initialData={produtoParaEditar}
              onCancel={() => {
                setMostrarFormulario(false);
                setProdutoParaEditar(null);
              }}
            />
          </div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total de Produtos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Package className="text-blue-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Estoque Baixo</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.baixoEstoque}</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="text-orange-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Produtos Zerados</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.zerados}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <TrendingUp className="text-red-500" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Valor Total</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="text-green-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome do produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  mostrarFiltros 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600' 
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Filter size={20} />
              </button>
            </div>

            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Categoria
                  </label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status do Estoque
                  </label>
                  <select
                    value={filtroEstoque}
                    onChange={(e) => setFiltroEstoque(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="baixo">Estoque Baixo</option>
                    <option value="zerado">Estoque Zerado</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            {carregando ? (
              <ProdutosSkeleton />
            ) : erro ? (
              <div className="p-8 text-center">
                <p className="text-red-500">{erro}</p>
                <button
                  onClick={listarProdutos}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Package className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Quantidade</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preço</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {produtosFiltrados.map((produto) => {
                    const baixoEstoque = produto.quantidade <= (produto.estoqueMinimo || 0);
                    const zerado = produto.quantidade === 0;
                    
                    return (
                      <tr key={produto.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{produto.nome}</p>
                            {produto.descricao && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{produto.descricao}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                            {produto.categoria || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              zerado ? 'text-red-600' : baixoEstoque ? 'text-orange-600' : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {produto.quantidade || 0} {produto.unidade || 'un'}
                            </span>
                            {baixoEstoque && !zerado && (
                              <AlertTriangle className="text-orange-500" size={16} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-slate-100">
                          R$ {(produto.precoVenda || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100">
                          R$ {((produto.quantidade || 0) * (produto.precoVenda || 0)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setProdutoDetalhes(produto);
                                setShowDetalhes(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditar(produto)}
                              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                              title="Editar produto"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setProdutoParaExcluir(produto)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                              title="Remover produto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Rodapé com informações */}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Mostrando {produtosFiltrados.length} de {produtos.length} produtos
        </div>

        {/* Modal de detalhes do produto */}
        <Modal
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setProdutoDetalhes(null);
          }}
          title="Detalhes do Produto"
          size="lg"
        >
          {produtoDetalhes && (
            <div className="space-y-6">
              {/* Informações principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Produto</label>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">{produtoDetalhes.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">{produtoDetalhes.categoria || 'Sem categoria'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Unidade</label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">{getNomeUnidade(produtoDetalhes.unidade)}</p>
                </div>
              </div>

              {/* Informações de estoque */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Estoque</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Quantidade Atual</label>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{produtoDetalhes.quantidade || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Estoque Mínimo</label>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{produtoDetalhes.estoqueMinimo || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    {(produtoDetalhes.quantidade || 0) <= (produtoDetalhes.estoqueMinimo || 0) ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle size={14} />
                        Estoque Baixo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preços e valores */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preços</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Preço de Compra</label>
                    <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                      R$ {(produtoDetalhes.precoCompra || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Preço de Venda</label>
                    <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                      R$ {(produtoDetalhes.precoVenda || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Valor Total em Estoque</label>
                    <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                      R$ {((produtoDetalhes.quantidade || 0) * (produtoDetalhes.precoVenda || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {produtoDetalhes.descricao && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Descrição</h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{produtoDetalhes.descricao}</p>
                </div>
              )}

              {/* Botões de ação */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                <button
                  onClick={() => {
                    handleEditar(produtoDetalhes);
                    setShowDetalhes(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                >
                  <Edit size={16} />
                  Editar Produto
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de confirmação de exclusão */}
        <Modal
          isOpen={!!produtoParaExcluir}
          onClose={() => setProdutoParaExcluir(null)}
          title="Confirmar Exclusão"
          footer={(
            <>
              <button
                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-all duration-200"
                onClick={() => setProdutoParaExcluir(null)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
                onClick={handleRemover}
              >
                Excluir
              </button>
            </>
          )}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Excluir produto {produtoParaExcluir?.nome}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
}
