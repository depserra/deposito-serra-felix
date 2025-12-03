import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../services/firebase';

export function useRelatorios() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============ RELATÓRIOS DE VENDAS ============

  // Relatório de vendas por período
  async function relatorioVendasPeriodo(dataInicio, dataFim) {
    try {
      setLoading(true);
      setError(null);

      const vendasQuery = query(
        collection(db, 'vendas'),
        where('criadoEm', '>=', dataInicio),
        where('criadoEm', '<=', dataFim),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(vendasQuery);
      const vendas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular estatísticas
      const totalVendas = vendas.length;
      const valorTotal = vendas.reduce((acc, venda) => acc + (venda.valorTotal || 0), 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      
      const vendasPorStatus = vendas.reduce((acc, venda) => {
        acc[venda.status] = (acc[venda.status] || 0) + 1;
        return acc;
      }, {});

      const vendasPorDia = vendas.reduce((acc, venda) => {
        const data = venda.criadoEm?.toDate?.()?.toDateString() || 'Data não disponível';
        acc[data] = (acc[data] || 0) + (venda.valorTotal || 0);
        return acc;
      }, {});

      return {
        vendas,
        estatisticas: {
          totalVendas,
          valorTotal,
          ticketMedio,
          vendasPorStatus,
          vendasPorDia
        }
      };
    } catch (err) {
      console.error('Erro no relatório de vendas por período:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Relatório de produtos mais vendidos
  async function relatorioProdutosMaisVendidos(limite = 10) {
    try {
      setLoading(true);
      setError(null);

      const vendasQuery = query(
        collection(db, 'vendas'),
        where('status', '==', 'concluida'),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(vendasQuery);
      const vendas = snapshot.docs.map(doc => doc.data());

      // Agregar produtos vendidos
      const produtosVendidos = {};
      
      vendas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
          venda.itens.forEach(item => {
            const nome = item.produto || 'Produto não identificado';
            if (!produtosVendidos[nome]) {
              produtosVendidos[nome] = {
                nome,
                quantidade: 0,
                valorTotal: 0,
                vezesVendido: 0
              };
            }
            produtosVendidos[nome].quantidade += item.quantidade || 0;
            produtosVendidos[nome].valorTotal += (item.quantidade || 0) * (item.valorUnitario || 0);
            produtosVendidos[nome].vezesVendido += 1;
          });
        }
      });

      // Ordenar por quantidade vendida
      const produtosOrdenados = Object.values(produtosVendidos)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, limite);

      return produtosOrdenados;
    } catch (err) {
      console.error('Erro no relatório de produtos mais vendidos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ RELATÓRIOS DE CLIENTES ============

  // Relatório de clientes mais ativos
  async function relatorioClientesMaisAtivos(limite = 10) {
    try {
      setLoading(true);
      setError(null);

      const vendasQuery = query(
        collection(db, 'vendas'),
        where('status', '==', 'concluida'),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(vendasQuery);
      const vendas = snapshot.docs.map(doc => doc.data());

      // Agregar dados por cliente
      const clientesAtividade = {};
      
      vendas.forEach(venda => {
        const clienteId = venda.clienteId;
        const clienteNome = venda.clienteNome || 'Cliente não identificado';
        
        if (!clientesAtividade[clienteId]) {
          clientesAtividade[clienteId] = {
            id: clienteId,
            nome: clienteNome,
            totalCompras: 0,
            valorTotal: 0,
            ultimaCompra: null
          };
        }
        
        clientesAtividade[clienteId].totalCompras += 1;
        clientesAtividade[clienteId].valorTotal += venda.valorTotal || 0;
        
        const dataVenda = venda.criadoEm?.toDate?.() || new Date();
        if (!clientesAtividade[clienteId].ultimaCompra || dataVenda > clientesAtividade[clienteId].ultimaCompra) {
          clientesAtividade[clienteId].ultimaCompra = dataVenda;
        }
      });

      // Ordenar por valor total gasto
      const clientesOrdenados = Object.values(clientesAtividade)
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, limite);

      return clientesOrdenados;
    } catch (err) {
      console.error('Erro no relatório de clientes mais ativos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ RELATÓRIOS FINANCEIROS ============

  // Relatório de fluxo de caixa por período
  async function relatorioFluxoCaixa(dataInicio, dataFim) {
    try {
      setLoading(true);
      setError(null);

      const fluxoQuery = query(
        collection(db, 'fluxoCaixa'),
        where('criadoEm', '>=', dataInicio),
        where('criadoEm', '<=', dataFim),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(fluxoQuery);
      const movimentos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular totais
      const entradas = movimentos
        .filter(mov => mov.tipo === 'entrada')
        .reduce((acc, mov) => acc + (mov.valor || 0), 0);

      const saidas = movimentos
        .filter(mov => mov.tipo === 'saida')
        .reduce((acc, mov) => acc + (mov.valor || 0), 0);

      const saldo = entradas - saidas;

      // Agrupar por categoria
      const porCategoria = movimentos.reduce((acc, mov) => {
        const categoria = mov.categoria || 'Outros';
        if (!acc[categoria]) {
          acc[categoria] = { entrada: 0, saida: 0 };
        }
        if (mov.tipo === 'entrada') {
          acc[categoria].entrada += mov.valor || 0;
        } else {
          acc[categoria].saida += mov.valor || 0;
        }
        return acc;
      }, {});

      // Fluxo por dia
      const fluxoPorDia = movimentos.reduce((acc, mov) => {
        const data = mov.criadoEm?.toDate?.()?.toDateString() || 'Data não disponível';
        if (!acc[data]) {
          acc[data] = { entrada: 0, saida: 0 };
        }
        if (mov.tipo === 'entrada') {
          acc[data].entrada += mov.valor || 0;
        } else {
          acc[data].saida += mov.valor || 0;
        }
        return acc;
      }, {});

      return {
        movimentos,
        resumo: {
          entradas,
          saidas,
          saldo,
          totalMovimentos: movimentos.length
        },
        porCategoria,
        fluxoPorDia
      };
    } catch (err) {
      console.error('Erro no relatório de fluxo de caixa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ RELATÓRIOS DE ESTOQUE ============

  // Relatório de estoque atual
  async function relatorioEstoqueAtual() {
    try {
      setLoading(true);
      setError(null);

      const produtosQuery = query(
        collection(db, 'produtos'),
        where('ativo', '==', true),
        orderBy('nome')
      );

      const snapshot = await getDocs(produtosQuery);
      const produtos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular totais
      const totalProdutos = produtos.length;
      const valorTotalEstoque = produtos.reduce((acc, produto) => 
        acc + ((produto.quantidade || 0) * (produto.precoVenda || 0)), 0
      );
      const valorTotalCompra = produtos.reduce((acc, produto) => 
        acc + ((produto.quantidade || 0) * (produto.precoCompra || 0)), 0
      );

      // Produtos com estoque baixo
      const produtosEstoqueBaixo = produtos.filter(produto => 
        produto.quantidade <= produto.estoqueMinimo
      );

      // Produtos sem estoque
      const produtosSemEstoque = produtos.filter(produto => 
        produto.quantidade === 0
      );

      return {
        produtos,
        resumo: {
          totalProdutos,
          valorTotalEstoque,
          valorTotalCompra,
          margemLucro: valorTotalEstoque - valorTotalCompra,
          produtosEstoqueBaixo: produtosEstoqueBaixo.length,
          produtosSemEstoque: produtosSemEstoque.length
        },
        alertas: {
          produtosEstoqueBaixo,
          produtosSemEstoque
        }
      };
    } catch (err) {
      console.error('Erro no relatório de estoque:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ DASHBOARD GERAL ============

  // Dados para dashboard principal
  async function obterDadosDashboard() {
    try {
      setLoading(true);
      setError(null);

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      // Buscar dados em paralelo
      const [
        vendasMesSnapshot,
        vendasDiaSnapshot,
        clientesSnapshot,
        produtosSnapshot,
        fluxoMesSnapshot
      ] = await Promise.all([
        getDocs(query(
          collection(db, 'vendas'),
          where('criadoEm', '>=', inicioMes),
          where('status', '==', 'concluida')
        )),
        getDocs(query(
          collection(db, 'vendas'),
          where('criadoEm', '>=', inicioDia),
          where('status', '==', 'concluida')
        )),
        getDocs(collection(db, 'clientes')),
        getDocs(query(collection(db, 'produtos'), where('ativo', '==', true))),
        getDocs(query(
          collection(db, 'fluxoCaixa'),
          where('criadoEm', '>=', inicioMes)
        ))
      ]);

      // Processar vendas do mês
      const vendasMes = vendasMesSnapshot.docs.map(doc => doc.data());
      const faturamentoMes = vendasMes.reduce((acc, v) => acc + (v.valorTotal || 0), 0);

      // Processar vendas do dia
      const vendasDia = vendasDiaSnapshot.docs.map(doc => doc.data());
      const faturamentoDia = vendasDia.reduce((acc, v) => acc + (v.valorTotal || 0), 0);

      // Processar clientes
      const totalClientes = clientesSnapshot.size;

      // Processar produtos
      const produtos = produtosSnapshot.docs.map(doc => doc.data());
      const produtosEstoqueBaixo = produtos.filter(p => p.quantidade <= p.estoqueMinimo).length;

      // Processar fluxo de caixa
      const movimentosCaixa = fluxoMesSnapshot.docs.map(doc => doc.data());
      const entradas = movimentosCaixa
        .filter(m => m.tipo === 'entrada')
        .reduce((acc, m) => acc + (m.valor || 0), 0);
      const saidas = movimentosCaixa
        .filter(m => m.tipo === 'saida')
        .reduce((acc, m) => acc + (m.valor || 0), 0);

      return {
        vendas: {
          totalMes: vendasMes.length,
          faturamentoMes,
          totalDia: vendasDia.length,
          faturamentoDia,
          ticketMedio: vendasMes.length > 0 ? faturamentoMes / vendasMes.length : 0
        },
        clientes: {
          total: totalClientes
        },
        estoque: {
          totalProdutos: produtos.length,
          produtosEstoqueBaixo,
          valorTotal: produtos.reduce((acc, p) => acc + ((p.quantidade || 0) * (p.precoVenda || 0)), 0)
        },
        financeiro: {
          entradas,
          saidas,
          saldo: entradas - saidas
        }
      };
    } catch (err) {
      console.error('Erro ao obter dados do dashboard:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    
    // Relatórios de Vendas
    relatorioVendasPeriodo,
    relatorioProdutosMaisVendidos,
    
    // Relatórios de Clientes
    relatorioClientesMaisAtivos,
    
    // Relatórios Financeiros
    relatorioFluxoCaixa,
    
    // Relatórios de Estoque
    relatorioEstoqueAtual,
    
    // Dashboard
    obterDadosDashboard
  };
}