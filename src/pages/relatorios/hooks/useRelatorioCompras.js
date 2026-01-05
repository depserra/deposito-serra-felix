import { useMemo } from 'react';

export function useRelatorioCompras(compras, produtos, filtros = {}) {
  return useMemo(() => {
    // Aplicar filtros
    let comprasFiltradas = compras || [];
    
    // Filtro por período
    if (filtros.periodo && filtros.periodo !== 'todos') {
      const hoje = new Date();
      let inicio = new Date();
      
      switch(filtros.periodo) {
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
        default:
          inicio = new Date(2000, 0, 1);
      }
      
      comprasFiltradas = comprasFiltradas.filter(compra => {
        const dataCompra = new Date(compra.dataCompra);
        return dataCompra >= inicio && dataCompra <= hoje;
      });
    }
    
    // Filtro por fornecedor
    if (filtros.fornecedor) {
      const termoBusca = filtros.fornecedor.toLowerCase();
      comprasFiltradas = comprasFiltradas.filter(compra =>
        compra.fornecedor?.toLowerCase().includes(termoBusca)
      );
    }
    
    // Filtro por produto
    if (filtros.produto) {
      const termoBusca = filtros.produto.toLowerCase();
      comprasFiltradas = comprasFiltradas.filter(compra =>
        compra.itens?.some(item =>
          item.nomeProduto?.toLowerCase().includes(termoBusca)
        )
      );
    }
    
    const totalCompras = comprasFiltradas.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
    const quantidadeCompras = comprasFiltradas.length;

    // Compras por produto
    const produtosComprados = {};
    comprasFiltradas.forEach(compra => {
      (compra.itens || []).forEach(item => {
        const produto = produtos.find(p => p.id === item.produto);
        const nome = item.nomeProduto || produto?.nome || item.produto;
        
        if (!produtosComprados[nome]) {
          produtosComprados[nome] = { quantidade: 0, valor: 0 };
        }
        produtosComprados[nome].quantidade += item.quantidade || 0;
        produtosComprados[nome].valor += (item.quantidade || 0) * (item.valorCompra || item.valorUnitario || 0);
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
  }, [compras, produtos, filtros]);
}
