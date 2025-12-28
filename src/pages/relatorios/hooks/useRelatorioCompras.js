import { useMemo } from 'react';

export function useRelatorioCompras(dadosFiltrados, produtos) {
  return useMemo(() => {
    const { comprasFiltradas } = dadosFiltrados;
    
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
  }, [dadosFiltrados, produtos]);
}
