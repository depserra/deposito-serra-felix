import { useState, useMemo, useEffect } from 'react';
import PageLayout from '../../components/layout-new/PageLayout';
import { useVendas } from '../../hooks/useVendas';
import { useCompras } from '../../hooks/useCompras';
import { useEstoque } from '../../hooks/useEstoque';
import { useClientes } from '../../hooks/useClientes';
import { FileText, Download, TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';

export default function RelatoriosPage() {
  const { vendas, listarVendas } = useVendas();
  const { compras, listarCompras } = useCompras();
  const { produtos, listarProdutos } = useEstoque();
  const { clientes, listarClientes } = useClientes();
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas');

  // Carregar dados ao montar o componente
  useEffect(() => {
    const carregarDados = async () => {
      try {
        await Promise.all([
          listarVendas(),
          listarCompras(),
          listarProdutos(),
          listarClientes()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    carregarDados();
  }, []);

  // Função para calcular o período
  const calcularPeriodo = (periodo) => {
    const hoje = new Date();
    let inicio = new Date();

    switch(periodo) {
      case 'hoje':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        break;
      case 'semana':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      case 'personalizado':
        if (dataInicio && dataFim) {
          return {
            inicio: new Date(dataInicio),
            fim: new Date(dataFim)
          };
        }
        return { inicio: new Date(0), fim: hoje };
      default:
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    return { inicio, fim: hoje };
  };

  // Dados filtrados por período
  const dadosFiltrados = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoSelecionado);
    
    const vendasFiltradas = (vendas || []).filter(venda => {
      const dataVenda = new Date(venda.dataVenda);
      return dataVenda >= inicio && dataVenda <= fim;
    });

    const comprasFiltradas = (compras || []).filter(compra => {
      const dataCompra = new Date(compra.dataCompra);
      return dataCompra >= inicio && dataCompra <= fim;
    });

    return { vendasFiltradas, comprasFiltradas };
  }, [vendas, compras, periodoSelecionado, dataInicio, dataFim]);

  // Relatório de Vendas
  const relatorioVendas = useMemo(() => {
    const { vendasFiltradas } = dadosFiltrados;
    
    const totalVendas = vendasFiltradas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
    const quantidadeVendas = vendasFiltradas.length;
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

    // Vendas por produto
    const produtoVendidos = {};
    vendasFiltradas.forEach(venda => {
      (venda.itens || []).forEach(item => {
        const produto = produtos.find(p => p.id === item.produto);
        const nomeProduto = produto?.nome || item.produto;
        
        if (!produtoVendidos[nomeProduto]) {
          produtoVendidos[nomeProduto] = {
            quantidade: 0,
            valor: 0
          };
        }
        produtoVendidos[nomeProduto].quantidade += item.quantidade || 0;
        produtoVendidos[nomeProduto].valor += (item.quantidade || 0) * (item.valorUnitario || 0);
      });
    });

    const produtosMaisVendidos = Object.entries(produtoVendidos)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    // Vendas por cliente
    const vendasPorCliente = {};
    vendasFiltradas.forEach(venda => {
      const cliente = venda.clienteNome || 'Cliente não identificado';
      if (!vendasPorCliente[cliente]) {
        vendasPorCliente[cliente] = {
          quantidade: 0,
          valor: 0
        };
      }
      vendasPorCliente[cliente].quantidade += 1;
      vendasPorCliente[cliente].valor += venda.valorTotal || 0;
    });

    const topClientes = Object.entries(vendasPorCliente)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return {
      totalVendas,
      quantidadeVendas,
      ticketMedio,
      produtosMaisVendidos,
      topClientes
    };
  }, [dadosFiltrados, produtos]);

  // Relatório de Compras
  const relatorioCompras = useMemo(() => {
    const { comprasFiltradas } = dadosFiltrados;
    
    const totalCompras = comprasFiltradas.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
    const quantidadeCompras = comprasFiltradas.length;

    // Compras por produto
    const produtosComprados = {};
    comprasFiltradas.forEach(compra => {
      (compra.itens || []).forEach(item => {
        const nome = item.nomeProduto || item.produto;
        
        if (!produtosComprados[nome]) {
          produtosComprados[nome] = {
            quantidade: 0,
            valor: 0
          };
        }
        produtosComprados[nome].quantidade += item.quantidade || 0;
        produtosComprados[nome].valor += (item.quantidade || 0) * (item.valorUnitario || 0);
      });
    });

    const produtosMaisComprados = Object.entries(produtosComprados)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return {
      totalCompras,
      quantidadeCompras,
      produtosMaisComprados
    };
  }, [dadosFiltrados]);

  // Relatório de Estoque
  const relatorioEstoque = useMemo(() => {
    const estoqueTotal = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    const valorEstoque = produtos.reduce((sum, p) => 
      sum + ((p.quantidade || 0) * (p.precoCompra || 0)), 0);
    
    const estoqueBaixo = produtos.filter(p => 
      (p.quantidade || 0) <= (p.estoqueMinimo || 0)
    ).sort((a, b) => a.quantidade - b.quantidade);

    const produtosSemEstoque = produtos.filter(p => (p.quantidade || 0) === 0);

    const categorias = {};
    produtos.forEach(p => {
      const cat = p.categoria || 'Sem categoria';
      if (!categorias[cat]) {
        categorias[cat] = {
          quantidade: 0,
          produtos: 0,
          valor: 0
        };
      }
      categorias[cat].quantidade += p.quantidade || 0;
      categorias[cat].produtos += 1;
      categorias[cat].valor += (p.quantidade || 0) * (p.precoCompra || 0);
    });

    const categoriasList = Object.entries(categorias)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor);

    return {
      estoqueTotal,
      valorEstoque,
      estoqueBaixo,
      produtosSemEstoque,
      categorias: categoriasList
    };
  }, [produtos]);

  // Relatório de Clientes
  const relatorioClientes = useMemo(() => {
    const totalClientes = clientes.length;
    
    const clientesComCompras = new Set(
      (vendas || []).map(v => v.clienteId).filter(Boolean)
    ).size;

    const clientesSemCompras = totalClientes - clientesComCompras;

    return {
      totalClientes,
      clientesComCompras,
      clientesSemCompras
    };
  }, [clientes, vendas]);

  // Função para exportar relatório
  const exportarRelatorio = () => {
    let conteudo = '';
    const { inicio, fim } = calcularPeriodo(periodoSelecionado);
    
    conteudo += `RELATÓRIO - ${relatorioAtivo.toUpperCase()}\n`;
    conteudo += `Período: ${inicio.toLocaleDateString()} a ${fim.toLocaleDateString()}\n`;
    conteudo += `Gerado em: ${new Date().toLocaleString()}\n\n`;

    if (relatorioAtivo === 'vendas') {
      conteudo += `Total de Vendas: R$ ${relatorioVendas.totalVendas.toFixed(2)}\n`;
      conteudo += `Quantidade de Vendas: ${relatorioVendas.quantidadeVendas}\n`;
      conteudo += `Ticket Médio: R$ ${relatorioVendas.ticketMedio.toFixed(2)}\n\n`;
      conteudo += `PRODUTOS MAIS VENDIDOS:\n`;
      relatorioVendas.produtosMaisVendidos.forEach((p, i) => {
        conteudo += `${i + 1}. ${p.nome} - Qtd: ${p.quantidade} - Valor: R$ ${p.valor.toFixed(2)}\n`;
      });
    } else if (relatorioAtivo === 'compras') {
      conteudo += `Total de Compras: R$ ${relatorioCompras.totalCompras.toFixed(2)}\n`;
      conteudo += `Quantidade de Compras: ${relatorioCompras.quantidadeCompras}\n\n`;
      conteudo += `PRODUTOS MAIS COMPRADOS:\n`;
      relatorioCompras.produtosMaisComprados.forEach((p, i) => {
        conteudo += `${i + 1}. ${p.nome} - Qtd: ${p.quantidade} - Valor: R$ ${p.valor.toFixed(2)}\n`;
      });
    } else if (relatorioAtivo === 'estoque') {
      conteudo += `Estoque Total: ${relatorioEstoque.estoqueTotal} unidades\n`;
      conteudo += `Valor do Estoque: R$ ${relatorioEstoque.valorEstoque.toFixed(2)}\n`;
      conteudo += `Produtos com Estoque Baixo: ${relatorioEstoque.estoqueBaixo.length}\n`;
      conteudo += `Produtos sem Estoque: ${relatorioEstoque.produtosSemEstoque.length}\n\n`;
      conteudo += `CATEGORIAS:\n`;
      relatorioEstoque.categorias.forEach((c, i) => {
        conteudo += `${i + 1}. ${c.nome} - Produtos: ${c.produtos} - Qtd: ${c.quantidade} - Valor: R$ ${c.valor.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${relatorioAtivo}_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
              onClick={exportarRelatorio}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Download size={18} />
              Exportar
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

        {/* Conteúdo do Relatório */}
        {relatorioAtivo === 'vendas' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
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

            {/* Produtos Mais Vendidos */}
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
                  <tbody>
                    {relatorioVendas.produtosMaisVendidos.map((produto, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">
                          R$ {produto.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Clientes */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Clientes</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Cliente</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Compras</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioVendas.topClientes.map((cliente, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{cliente.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cliente.quantidade}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">
                          R$ {cliente.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {relatorioAtivo === 'compras' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
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

            {/* Produtos Mais Comprados */}
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
                  <tbody>
                    {relatorioCompras.produtosMaisComprados.map((produto, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
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

        {relatorioAtivo === 'estoque' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Estoque Total</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioEstoque.estoqueTotal}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Valor do Estoque</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {relatorioEstoque.valorEstoque.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Estoque Baixo</h3>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {relatorioEstoque.estoqueBaixo.length}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Sem Estoque</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {relatorioEstoque.produtosSemEstoque.length}
                </p>
              </div>
            </div>

            {/* Categorias */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Estoque por Categoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Categoria</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produtos</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioEstoque.categorias.map((cat, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{cat.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cat.produtos}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cat.quantidade}</td>
                        <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-medium">
                          R$ {cat.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Produtos com Estoque Baixo */}
            {relatorioEstoque.estoqueBaixo.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Produtos com Estoque Baixo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Produto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Estoque Atual</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Estoque Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioEstoque.estoqueBaixo.map((produto, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                          <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
                            {produto.quantidade}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
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

        {relatorioAtivo === 'clientes' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Clientes</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
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
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Sem Compras</h3>
                <p className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                  {relatorioClientes.clientesSemCompras}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}