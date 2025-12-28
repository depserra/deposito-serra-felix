import { useMemo } from 'react';

export function useRelatorioVendas(vendas, dadosFiltrados, produtos) {
  return useMemo(() => {
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
          produtoVendidos[nomeProduto] = { quantidade: 0, valor: 0 };
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
        vendasPorCliente[cliente] = { quantidade: 0, valor: 0 };
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
  }, [dadosFiltrados, produtos, vendas]);
}
