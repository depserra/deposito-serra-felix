import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/layout-new/PageLayout';
import { useVendas } from '../../hooks/useVendas';
import { useCompras } from '../../hooks/useCompras';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  ShoppingBag,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingComponents';

// Função para formatar valores monetários no padrão brasileiro
const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
};

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState('mes'); // hoje, semana, mes, ano
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const { vendas, loading: loadingVendas, listarVendas } = useVendas();
  const { compras, loading: loadingCompras, listarCompras } = useCompras();

  useEffect(() => {
    listarVendas();
    listarCompras();
  }, []);

  // Calcular datas baseado no período
  const calcularPeriodo = () => {
    const hoje = new Date();
    let inicio = new Date();
    
    switch(periodo) {
      case 'hoje':
        inicio.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        inicio.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        inicio.setMonth(hoje.getMonth() - 1);
        break;
      case 'ano':
        inicio.setFullYear(hoje.getFullYear() - 1);
        break;
      case 'personalizado':
        return { inicio: dataInicio ? new Date(dataInicio) : inicio, fim: dataFim ? new Date(dataFim) : hoje };
      default:
        inicio.setMonth(hoje.getMonth() - 1);
    }
    
    return { inicio, fim: hoje };
  };

  // Filtrar dados por período
  const dadosFiltrados = useMemo(() => {
    const { inicio, fim } = calcularPeriodo();
    
    const vendasFiltradas = vendas.filter(v => {
      const dataVenda = v.dataVenda instanceof Date ? v.dataVenda : new Date(v.dataVenda);
      return dataVenda >= inicio && dataVenda <= fim;
    });
    
    const comprasFiltradas = compras.filter(c => {
      const dataCompra = c.dataCompra instanceof Date ? c.dataCompra : new Date(c.dataCompra);
      return dataCompra >= inicio && dataCompra <= fim;
    });
    
    return { vendas: vendasFiltradas, compras: comprasFiltradas };
  }, [vendas, compras, periodo, dataInicio, dataFim]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    // Separar vendas pagas (concluídas) de vendas fiado (em_andamento)
    const vendasPagas = dadosFiltrados.vendas.filter(v => v.status === 'concluida');
    const vendasFiado = dadosFiltrados.vendas.filter(v => v.status === 'em_andamento');
    
    const totalVendasPagas = vendasPagas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const totalVendasFiado = vendasFiado.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const totalCompras = dadosFiltrados.compras.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    const lucro = totalVendasPagas - totalCompras;
    const ticketMedio = vendasPagas.length > 0 ? totalVendasPagas / vendasPagas.length : 0;
    
    return {
      totalVendasPagas,
      totalVendasFiado,
      totalCompras,
      lucro,
      ticketMedio,
      quantidadeVendasPagas: vendasPagas.length,
      quantidadeVendasFiado: vendasFiado.length,
      quantidadeCompras: dadosFiltrados.compras.length
    };
  }, [dadosFiltrados]);

  const loading = loadingVendas || loadingCompras;

  return (
    <PageLayout title="Financeiro">
      <div className="space-y-6">
        {/* Header com filtros de período */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Resumo Financeiro</h2>
              <p className="text-sm text-slate-600 dark:text-white">Acompanhe suas vendas e despesas</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['hoje', 'semana', 'mes', 'ano'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodo === p
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Última Semana' : p === 'mes' ? 'Último Mês' : 'Último Ano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12">
            <LoadingSpinner text="Carregando dados financeiros..." />
          </div>
        ) : (
          <>
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {/* Total Vendas Pagas */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                  </div>
                  <ArrowUpRight className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Total em Vendas</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  R$ {formatarMoeda(estatisticas.totalVendasPagas)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeVendasPagas} venda(s) paga(s)
                </p>
              </div>

              {/* Total Vendas Fiado */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                    <Calendar className="text-amber-600 dark:text-amber-400" size={24} />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Vendas Fiado</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  R$ {formatarMoeda(estatisticas.totalVendasFiado)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeVendasFiado} venda(s) pendente(s)
                </p>
              </div>

              {/* Total Compras */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                  <ArrowDownRight className="text-red-500" size={20} />
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Total em Compras</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  R$ {formatarMoeda(estatisticas.totalCompras)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeCompras} compra(s)
                </p>
              </div>

              {/* Lucro */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    estatisticas.lucro >= 0 
                      ? 'bg-blue-100 dark:bg-blue-900/20' 
                      : 'bg-orange-100 dark:bg-orange-900/20'
                  }`}>
                    <DollarSign className={estatisticas.lucro >= 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-orange-600 dark:text-orange-400'
                    } size={24} />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">
                  {estatisticas.lucro >= 0 ? 'Lucro' : 'Prejuízo'}
                </p>
                <p className={`text-lg md:text-xl lg:text-2xl font-bold whitespace-nowrap ${
                  estatisticas.lucro >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  R$ {formatarMoeda(Math.abs(estatisticas.lucro))}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.lucro >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </div>

              {/* Ticket Médio */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Ticket Médio</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  R$ {formatarMoeda(estatisticas.ticketMedio)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  Por venda
                </p>
              </div>
            </div>

            {/* Vendas e Compras Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendas Recentes */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Vendas Recentes
                  </h3>
                </div>
                <div className="space-y-3">
                  {dadosFiltrados.vendas.slice(0, 5).map((venda) => {
                    const isFiado = venda.status === 'em_andamento';
                    return (
                      <div 
                        key={venda.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isFiado 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                            : 'bg-slate-50 dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {venda.clienteNome || 'Cliente não informado'}
                          </p>
                          <p className={`text-sm ${
                            isFiado 
                              ? 'text-orange-600 dark:text-orange-400 font-medium' 
                              : 'text-slate-500 dark:text-white'
                          }`}>
                            {venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '-'}
                            {isFiado && ' • Fiado'}
                          </p>
                        </div>
                        <p className={`font-semibold ${
                          isFiado 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          R$ {formatarMoeda(venda.valorTotal || 0)}
                        </p>
                      </div>
                    );
                  })}
                  {dadosFiltrados.vendas.length === 0 && (
                    <p className="text-center text-slate-500 dark:text-white py-4">
                      Nenhuma venda no período
                    </p>
                  )}
                </div>
              </div>

              {/* Compras Recentes */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingBag className="text-red-600 dark:text-red-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Compras Recentes
                  </h3>
                </div>
                <div className="space-y-3">
                  {dadosFiltrados.compras.slice(0, 5).map((compra) => (
                    <div key={compra.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {compra.fornecedor || 'Fornecedor não informado'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-white">
                          {compra.dataCompra ? new Date(compra.dataCompra).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        R$ {formatarMoeda(compra.valorTotal || 0)}
                      </p>
                    </div>
                  ))}
                  {dadosFiltrados.compras.length === 0 && (
                    <p className="text-center text-slate-500 dark:text-white py-4">
                      Nenhuma compra no período
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}