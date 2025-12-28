import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/layout-new/PageLayout';
import Modal from '../../components/modals/Modal';
import { useVendas } from '../../hooks/useVendas';
import { useCompras } from '../../hooks/useCompras';
import { useEstoque } from '../../hooks/useEstoque';
import { useClientes } from '../../hooks/useClientes';
import { FileText, Download, TrendingUp, Package, Users, Filter } from 'lucide-react';

// Hooks customizados
import { useFiltrosPeriodo } from './hooks/useFiltrosPeriodo';
import { useRelatorioVendas } from './hooks/useRelatorioVendas';
import { useRelatorioCompras } from './hooks/useRelatorioCompras';
import { useRelatorioEstoque } from './hooks/useRelatorioEstoque';

// Utilitários
import { exportarPDF } from './utils/exportarPDF';

export default function RelatoriosPage() {
  const { vendas, listarVendas } = useVendas();
  const { compras, listarCompras } = useCompras();
  const { produtos, listarProdutos } = useEstoque();
  const { clientes, listarClientes } = useClientes();
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas');
  const [showModalPersonalizado, setShowModalPersonalizado] = useState(false);
  
  // Estados do filtro personalizado
  const [filtroPersonalizado, setFiltroPersonalizado] = useState({
    periodo: 'mes',
    dataInicio: '',
    dataFim: '',
    clientes: [],
    produtos: [],
    status: 'todos',
    tipoRelatorio: 'vendas'
  });
  
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  // Carregar dados
  useEffect(() => {
    Promise.all([
      listarVendas(),
      listarCompras(),
      listarProdutos(),
      listarClientes()
    ]).catch(console.error);
  }, []);

  // Filtros e dados
  const { dadosFiltrados, calcularPeriodo } = useFiltrosPeriodo(
    vendas,
    compras,
    periodoSelecionado,
    dataInicio,
    dataFim
  );

  // Relatórios
  const relatorioVendas = useRelatorioVendas(vendas, dadosFiltrados, produtos);
  const relatorioCompras = useRelatorioCompras(dadosFiltrados, produtos);
  const relatorioEstoque = useRelatorioEstoque(produtos);
  
  const relatorioClientes = useMemo(() => {
    const totalClientes = clientes.length;
    const clientesComCompras = new Set((vendas || []).map(v => v.clienteId).filter(Boolean)).size;
    const clientesSemCompras = totalClientes - clientesComCompras;
    return { totalClientes, clientesComCompras, clientesSemCompras };
  }, [clientes, vendas]);

  // Exportar PDF
  const handleExportarRelatorio = async () => {
    const { inicio, fim } = calcularPeriodo(periodoSelecionado);
    const hoje = new Date();
    
    let dados = [];
    if (relatorioAtivo === 'vendas') {
      dados = dadosFiltrados.vendasFiltradas || [];
    } else if (relatorioAtivo === 'compras') {
      dados = dadosFiltrados.comprasFiltradas || [];
    } else if (relatorioAtivo === 'estoque') {
      dados = produtos || [];
    }
    
    await exportarPDF({
      tipoRelatorio: relatorioAtivo,
      dados,
      produtos,
      dataInicio: inicio,
      dataFim: fim,
      nomeArquivo: `relatorio_${relatorioAtivo}_${hoje.getTime()}.pdf`
    });
  };

  return (
    <PageLayout title="Relatórios">
      <div className="space-y-6">
        {/* Filtros de Período */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Período do Relatório</h2>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Período
              </label>
              <select
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Este Mês</option>
                <option value="ano">Este Ano</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {periodoSelecionado === 'personalizado' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleExportarRelatorio}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Download size={18} />
              Exportar
            </button>

            <button
              onClick={() => setShowModalPersonalizado(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Filter size={18} />
              Relatório Personalizado
            </button>
          </div>
        </div>

        {/* Seleção de Tipo de Relatório */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setRelatorioAtivo('vendas')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'vendas'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <TrendingUp className={`w-8 h-8 mb-2 ${relatorioAtivo === 'vendas' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Vendas</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('compras')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'compras'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <FileText className={`w-8 h-8 mb-2 ${relatorioAtivo === 'compras' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Compras</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('estoque')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'estoque'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <Package className={`w-8 h-8 mb-2 ${relatorioAtivo === 'estoque' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Estoque</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('clientes')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'clientes'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <Users className={`w-8 h-8 mb-2 ${relatorioAtivo === 'clientes' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Clientes</h3>
          </button>
        </div>

        {/* Conteúdo do Relatório - Vendas */}
        {relatorioAtivo === 'vendas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Vendas</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  R$ {relatorioVendas.totalVendas.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Quantidade de Vendas</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioVendas.quantidadeVendas}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Ticket Médio</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {relatorioVendas.ticketMedio.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Produtos Mais Vendidos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {relatorioVendas.produtosMaisVendidos.map((produto, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-semibold">
                          R$ {produto.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo do Relatório - Compras */}
        {relatorioAtivo === 'compras' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Compras</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  R$ {relatorioCompras.totalCompras.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Quantidade de Compras</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioCompras.quantidadeCompras}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Produtos Mais Comprados</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {relatorioCompras.produtosMaisComprados.map((produto, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-semibold">
                          R$ {produto.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo do Relatório - Estoque */}
        {relatorioAtivo === 'estoque' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Valor Total do Estoque</h3>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  R$ {relatorioEstoque.valorEstoque.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Quantidade Total</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioEstoque.estoqueTotal}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Produtos com Estoque Baixo</h3>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {relatorioEstoque.estoqueBaixo.length}
                </p>
              </div>
            </div>

            {relatorioEstoque.estoqueBaixo.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                    <span className="text-orange-600 dark:text-orange-400 text-sm">!</span>
                  </span>
                  Produtos com Estoque Baixo
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Estoque Atual</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Estoque Mínimo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {relatorioEstoque.estoqueBaixo.slice(0, 10).map((produto, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{produto.nome}</td>
                          <td className="py-3 px-4 text-right text-orange-600 dark:text-orange-400 font-semibold">
                            {produto.quantidade}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {produto.estoqueMinimo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo do Relatório - Clientes */}
        {relatorioAtivo === 'clientes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Clientes</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {relatorioClientes.totalClientes}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Clientes Ativos</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {relatorioClientes.clientesComCompras}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Clientes Sem Compras</h3>
                <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                  {relatorioClientes.clientesSemCompras}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Relatório Personalizado */}
      <Modal
        isOpen={showModalPersonalizado}
        onClose={() => setShowModalPersonalizado(false)}
        title="Gerar Relatório Personalizado"
        size="lg"
      >
        <div className="space-y-6">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Relatório *
            </label>
            <select
              value={filtroPersonalizado.tipoRelatorio}
              onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, tipoRelatorio: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="vendas">Vendas</option>
              <option value="compras">Compras</option>
              <option value="estoque">Estoque</option>
              <option value="clientes">Clientes</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Período *
            </label>
            <select
              value={filtroPersonalizado.periodo}
              onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, periodo: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Última Semana</option>
              <option value="mes">Este Mês</option>
              <option value="ano">Este Ano</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Datas Personalizadas */}
          {filtroPersonalizado.periodo === 'personalizado' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={filtroPersonalizado.dataInicio}
                  onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, dataInicio: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={filtroPersonalizado.dataFim}
                  onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, dataFim: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Filtro de Clientes */}
          {(filtroPersonalizado.tipoRelatorio === 'vendas' || filtroPersonalizado.tipoRelatorio === 'clientes') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Clientes (opcional)
              </label>
              <div className="relative">
                <details className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 list-none">
                    {filtroPersonalizado.clientes.filter(id => id).length === 0 ? (
                      <span className="text-slate-500">Todos os clientes</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">
                        {filtroPersonalizado.clientes.filter(id => id).length} cliente(s) selecionado(s)
                      </span>
                    )}
                  </summary>
                  <div className="border-t border-slate-200 dark:border-slate-600">
                    {/* Campo de pesquisa */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    {/* Lista de clientes */}
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {clientes
                        .filter(cliente => 
                          cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
                        )
                        .map(cliente => (
                      <label
                        key={cliente.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filtroPersonalizado.clientes.includes(cliente.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                clientes: [...filtroPersonalizado.clientes, cliente.id]
                              });
                            } else {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                clientes: filtroPersonalizado.clientes.filter(id => id !== cliente.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-slate-900 dark:text-slate-100">{cliente.nome}</span>
                      </label>
                    ))}
                      {clientes.filter(cliente => 
                        cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
                      ).length === 0 && (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-3 text-sm">
                          Nenhum cliente encontrado
                        </p>
                      )}
                    </div>
                  </div>
                </details>
                
                {/* Tags dos clientes selecionados */}
                {filtroPersonalizado.clientes.filter(id => id).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filtroPersonalizado.clientes.filter(id => id).map(clienteId => {
                      const cliente = clientes.find(c => c.id === clienteId);
                      if (!cliente) return null;
                      return (
                        <div
                          key={clienteId}
                          className="group flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          onClick={() => {
                            setFiltroPersonalizado({
                              ...filtroPersonalizado,
                              clientes: filtroPersonalizado.clientes.filter(id => id !== clienteId)
                            });
                          }}
                        >
                          <span>{cliente.nome}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filtro de Produtos */}
          {(filtroPersonalizado.tipoRelatorio === 'vendas' || filtroPersonalizado.tipoRelatorio === 'compras' || filtroPersonalizado.tipoRelatorio === 'estoque') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Produtos (opcional)
              </label>
              <div className="relative">
                <details className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 list-none">
                    {filtroPersonalizado.produtos.filter(id => id).length === 0 ? (
                      <span className="text-slate-500">Todos os produtos</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">
                        {filtroPersonalizado.produtos.filter(id => id).length} produto(s) selecionado(s)
                      </span>
                    )}
                  </summary>
                  <div className="border-t border-slate-200 dark:border-slate-600">
                    {/* Campo de pesquisa */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={buscaProduto}
                        onChange={(e) => setBuscaProduto(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    {/* Lista de produtos */}
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {produtos
                        .filter(produto => 
                          produto.nome.toLowerCase().includes(buscaProduto.toLowerCase())
                        )
                        .map(produto => (
                      <label
                        key={produto.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filtroPersonalizado.produtos.includes(produto.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                produtos: [...filtroPersonalizado.produtos, produto.id]
                              });
                            } else {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                produtos: filtroPersonalizado.produtos.filter(id => id !== produto.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-slate-900 dark:text-slate-100">{produto.nome}</span>
                      </label>
                    ))}
                      {produtos.filter(produto => 
                        produto.nome.toLowerCase().includes(buscaProduto.toLowerCase())
                      ).length === 0 && (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-3 text-sm">
                          Nenhum produto encontrado
                        </p>
                      )}
                    </div>
                  </div>
                </details>
                
                {/* Tags dos produtos selecionados */}
                {filtroPersonalizado.produtos.filter(id => id).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filtroPersonalizado.produtos.filter(id => id).map(produtoId => {
                      const produto = produtos.find(p => p.id === produtoId);
                      if (!produto) return null;
                      return (
                        <div
                          key={produtoId}
                          className="group flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          onClick={() => {
                            setFiltroPersonalizado({
                              ...filtroPersonalizado,
                              produtos: filtroPersonalizado.produtos.filter(id => id !== produtoId)
                            });
                          }}
                        >
                          <span>{produto.nome}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filtro de Status (apenas para vendas) */}
          {filtroPersonalizado.tipoRelatorio === 'vendas' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={filtroPersonalizado.status}
                onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="todos">Todos</option>
                <option value="concluida">Concluídas</option>
                <option value="em_andamento">Fiado</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowModalPersonalizado(false)}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleExportarRelatorio}
              className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Gerar PDF
            </button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
