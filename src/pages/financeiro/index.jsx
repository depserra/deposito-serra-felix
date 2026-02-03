import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/layout-new/PageLayout';
import { useVendas } from '../../hooks/useVendas';
import { useCompras } from '../../hooks/useCompras';
import { useFinanceiro } from '../../hooks/useFinanceiro';
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
  const [modalAberto, setModalAberto] = useState(null); // 'recebido', 'aReceber', 'despesas', 'saldo'
  
  const { vendas, loading: loadingVendas, listarVendas } = useVendas();
  const { compras, loading: loadingCompras, listarCompras } = useCompras();
  const { contasReceber, loading: loadingFinanceiro, listarContasReceber } = useFinanceiro();

  useEffect(() => {
    listarVendas();
    listarCompras();
    listarContasReceber();
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
      case 'todos':
        // Mostrar todos os registros (desde 2000)
        inicio = new Date(2000, 0, 1);
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

    const contasReceberFiltradas = (contasReceber || []).filter(c => {
      // Usar data de criação ao invés de vencimento para filtrar por período
      const dataCriacao = c.criadoEm instanceof Date ? c.criadoEm : c.criadoEm?.toDate?.() || new Date(c.criadoEm);
      return dataCriacao >= inicio && dataCriacao <= fim;
    });
    
    return { vendas: vendasFiltradas, compras: comprasFiltradas, contasReceber: contasReceberFiltradas };
  }, [vendas, compras, contasReceber, periodo, dataInicio, dataFim]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    // Separar vendas pagas (concluídas) de vendas fiado (em_andamento)
    const vendasPagas = dadosFiltrados.vendas.filter(v => v.status === 'concluida');
    const vendasFiado = dadosFiltrados.vendas.filter(v => v.status === 'em_andamento');
    
    // Contas a receber (parcelas pendentes e pagas)
    const contasPendentes = dadosFiltrados.contasReceber.filter(c => c.status === 'pendente');
    const contasPagas = dadosFiltrados.contasReceber.filter(c => c.status === 'pago');
    
    const totalVendasPagas = vendasPagas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const totalVendasFiado = vendasFiado.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const totalContasPendentes = contasPendentes.reduce((acc, c) => acc + (c.valor || 0), 0);
    const totalContasPagas = contasPagas.reduce((acc, c) => acc + (c.valor || 0), 0);
    const totalCompras = dadosFiltrados.compras.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    
    // Consolidar totais
    const totalRecebido = totalVendasPagas + totalContasPagas;
    const totalAReceber = totalVendasFiado + totalContasPendentes;
    const saldo = totalRecebido - totalCompras;
    
    return {
      totalRecebido,
      totalAReceber,
      totalCompras,
      saldo,
      quantidadeVendasPagas: vendasPagas.length,
      quantidadeVendasFiado: vendasFiado.length,
      quantidadeParcelasPagas: contasPagas.length,
      quantidadeParcelasPendentes: contasPendentes.length,
      quantidadeCompras: dadosFiltrados.compras.length
    };
  }, [dadosFiltrados]);

  const loading = loadingVendas || loadingCompras || loadingFinanceiro;

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
              {['hoje', 'semana', 'mes', 'ano', 'todos'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodo === p
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Última Semana' : p === 'mes' ? 'Último Mês' : p === 'ano' ? 'Último Ano' : 'Todos'}
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
            {/* Cards de estatísticas - Resumo consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Recebido */}
              <div 
                onClick={() => setModalAberto('recebido')}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                  </div>
                  <ArrowUpRight className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Total Recebido</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  R$ {formatarMoeda(estatisticas.totalRecebido)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeVendasPagas} venda(s) + {estatisticas.quantidadeParcelasPagas} parcela(s)
                </p>
              </div>

              {/* Total a Receber */}
              <div 
                onClick={() => setModalAberto('aReceber')}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                    <Calendar className="text-amber-600 dark:text-amber-400" size={24} />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">A Receber</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  R$ {formatarMoeda(estatisticas.totalAReceber)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeVendasFiado} venda(s) + {estatisticas.quantidadeParcelasPendentes} parcela(s)
                </p>
              </div>

              {/* Total Compras */}
              <div 
                onClick={() => setModalAberto('despesas')}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                  <ArrowDownRight className="text-red-500" size={20} />
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Despesas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  R$ {formatarMoeda(estatisticas.totalCompras)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.quantidadeCompras} compra(s)
                </p>
              </div>

              {/* Saldo */}
              <div 
                onClick={() => setModalAberto('saldo')}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    estatisticas.saldo >= 0 
                      ? 'bg-blue-100 dark:bg-blue-900/20' 
                      : 'bg-orange-100 dark:bg-orange-900/20'
                  }`}>
                    <DollarSign className={estatisticas.saldo >= 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-orange-600 dark:text-orange-400'
                    } size={24} />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white mb-1">Saldo</p>
                <p className={`text-2xl font-bold ${
                  estatisticas.saldo >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  R$ {formatarMoeda(Math.abs(estatisticas.saldo))}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-2">
                  {estatisticas.saldo >= 0 ? 'Positivo' : 'Negativo'}
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

        {/* Modais de Detalhamento */}
        {modalAberto === 'recebido' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Total Recebido</h2>
                  <button onClick={() => setModalAberto(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">R$ {formatarMoeda(estatisticas.totalRecebido)}</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Vendas Pagas */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Vendas Pagas ({estatisticas.quantidadeVendasPagas})</h3>
                  <div className="space-y-2">
                    {dadosFiltrados.vendas.filter(v => v.status === 'concluida').map(venda => (
                      <div key={venda.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{venda.clienteNome || 'Cliente não informado'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {venda.codigoVenda} • {venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">R$ {formatarMoeda(venda.valorTotal || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Parcelas Pagas */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Parcelas Pagas ({estatisticas.quantidadeParcelasPagas})</h3>
                  <div className="space-y-2">
                    {dadosFiltrados.contasReceber.filter(c => c.status === 'pago').map(conta => (
                      <div key={conta.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{conta.clienteNome || 'Cliente não informado'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{conta.descricao}</p>
                        </div>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">R$ {formatarMoeda(conta.valor || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {modalAberto === 'aReceber' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">A Receber</h2>
                  <button onClick={() => setModalAberto(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">R$ {formatarMoeda(estatisticas.totalAReceber)}</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Vendas Fiado */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Vendas Fiado ({estatisticas.quantidadeVendasFiado})</h3>
                  <div className="space-y-2">
                    {dadosFiltrados.vendas.filter(v => v.status === 'em_andamento').map(venda => (
                      <div key={venda.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{venda.clienteNome || 'Cliente não informado'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {venda.codigoVenda} • {venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">R$ {formatarMoeda(venda.valorTotal || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Parcelas Pendentes */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Parcelas Pendentes ({estatisticas.quantidadeParcelasPendentes})</h3>
                  <div className="space-y-2">
                    {dadosFiltrados.contasReceber.filter(c => c.status === 'pendente').map(conta => {
                      const dataVencimento = conta.dataVencimento instanceof Date ? conta.dataVencimento : conta.dataVencimento?.toDate?.() || new Date(conta.dataVencimento);
                      const isVencida = dataVencimento < new Date();
                      return (
                        <div key={conta.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{conta.clienteNome || 'Cliente não informado'}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {conta.descricao} • Vence: {dataVencimento.toLocaleDateString('pt-BR')}
                              {isVencida && <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">VENCIDA</span>}
                            </p>
                          </div>
                          <p className="font-semibold text-amber-600 dark:text-amber-400">R$ {formatarMoeda(conta.valor || 0)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {modalAberto === 'despesas' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Despesas</h2>
                  <button onClick={() => setModalAberto(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">R$ {formatarMoeda(estatisticas.totalCompras)}</p>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Compras ({estatisticas.quantidadeCompras})</h3>
                <div className="space-y-2">
                  {dadosFiltrados.compras.map(compra => (
                    <div key={compra.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{compra.fornecedor || 'Fornecedor não informado'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {compra.codigoCompra} • {compra.dataCompra ? new Date(compra.dataCompra).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <p className="font-semibold text-red-600 dark:text-red-400">R$ {formatarMoeda(compra.valorTotal || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {modalAberto === 'saldo' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Saldo do Período</h2>
                  <button onClick={() => setModalAberto(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className={`text-3xl font-bold mt-2 ${estatisticas.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  R$ {formatarMoeda(Math.abs(estatisticas.saldo))}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {estatisticas.saldo >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Total Recebido</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {formatarMoeda(estatisticas.totalRecebido)}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Total Despesas</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {formatarMoeda(estatisticas.totalCompras)}</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Cálculo</h4>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <p>Recebido: R$ {formatarMoeda(estatisticas.totalRecebido)}</p>
                    <p>Despesas: R$ {formatarMoeda(estatisticas.totalCompras)}</p>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                    <p className="font-semibold">Saldo: R$ {formatarMoeda(Math.abs(estatisticas.saldo))} ({estatisticas.saldo >= 0 ? 'Positivo' : 'Negativo'})</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Valores a Receber</h4>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">R$ {formatarMoeda(estatisticas.totalAReceber)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Estes valores ainda não entraram no saldo acima
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}