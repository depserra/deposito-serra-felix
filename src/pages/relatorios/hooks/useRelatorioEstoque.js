import { useMemo } from 'react';

export function useRelatorioEstoque(produtos) {
  return useMemo(() => {
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
        categorias[cat] = { quantidade: 0, produtos: 0, valor: 0 };
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
}
