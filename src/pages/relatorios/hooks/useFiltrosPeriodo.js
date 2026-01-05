import { useMemo } from 'react';

export function useFiltrosPeriodo(vendas, compras, periodoSelecionado, dataInicio, dataFim) {
  // Função para calcular o período
  const calcularPeriodo = (periodo) => {
    const hoje = new Date();
    let inicio = new Date();

    switch(periodo) {
      case 'todos':
        // Retorna uma data muito antiga para incluir tudo
        return { inicio: new Date(2000, 0, 1), fim: hoje };
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
          return { inicio: new Date(dataInicio), fim: new Date(dataFim) };
        }
        return { inicio: new Date(2000, 0, 1), fim: hoje };
      default:
        return { inicio: new Date(2000, 0, 1), fim: hoje };
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

  return { dadosFiltrados, calcularPeriodo };
}
