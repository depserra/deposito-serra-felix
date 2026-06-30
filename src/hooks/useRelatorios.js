import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

export function useRelatorios() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);

  async function relatorioVendasPeriodo(dataInicio, dataFim) {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(
        col('vendas'), where('criadoEm', '>=', dataInicio),
        where('criadoEm', '<=', dataFim), orderBy('criadoEm', 'desc')
      ));
      const vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalVendas = vendas.length;
      const valorTotal = vendas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      const vendasPorStatus = vendas.reduce((acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; }, {});
      const vendasPorDia = vendas.reduce((acc, v) => {
        const data = v.criadoEm?.toDate?.()?.toDateString() || 'Data não disponível';
        acc[data] = (acc[data] || 0) + (v.valorTotal || 0);
        return acc;
      }, {});
      return { vendas, estatisticas: { totalVendas, valorTotal, ticketMedio, vendasPorStatus, vendasPorDia } };
    } catch (err) {
      console.error('Erro no relatório de vendas por período:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function relatorioProdutosMaisVendidos(limite = 10) {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(col('vendas'), where('status', '==', 'concluida'), orderBy('criadoEm', 'desc')));
      const vendas = snapshot.docs.map(doc => doc.data());
      const produtosVendidos = {};
      vendas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
          venda.itens.forEach(item => {
            const nome = item.produto || 'Produto não identificado';
            if (!produtosVendidos[nome]) produtosVendidos[nome] = { nome, quantidade: 0, valorTotal: 0, vezesVendido: 0 };
            produtosVendidos[nome].quantidade += item.quantidade || 0;
            produtosVendidos[nome].valorTotal += (item.quantidade || 0) * (item.valorUnitario || 0);
            produtosVendidos[nome].vezesVendido += 1;
          });
        }
      });
      return Object.values(produtosVendidos).sort((a, b) => b.quantidade - a.quantidade).slice(0, limite);
    } catch (err) {
      console.error('Erro no relatório de produtos mais vendidos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function relatorioClientesMaisAtivos(limite = 10) {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(col('vendas'), where('status', '==', 'concluida'), orderBy('criadoEm', 'desc')));
      const vendas = snapshot.docs.map(doc => doc.data());
      const clientesAtividade = {};
      vendas.forEach(venda => {
        const clienteId = venda.clienteId;
        const clienteNome = venda.clienteNome || 'Cliente não identificado';
        if (!clientesAtividade[clienteId]) clientesAtividade[clienteId] = { id: clienteId, nome: clienteNome, totalCompras: 0, valorTotal: 0, ultimaCompra: null };
        clientesAtividade[clienteId].totalCompras += 1;
        clientesAtividade[clienteId].valorTotal += venda.valorTotal || 0;
        const dataVenda = venda.criadoEm?.toDate?.() || new Date();
        if (!clientesAtividade[clienteId].ultimaCompra || dataVenda > clientesAtividade[clienteId].ultimaCompra) {
          clientesAtividade[clienteId].ultimaCompra = dataVenda;
        }
      });
      return Object.values(clientesAtividade).sort((a, b) => b.valorTotal - a.valorTotal).slice(0, limite);
    } catch (err) {
      console.error('Erro no relatório de clientes mais ativos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function relatorioFluxoCaixa(dataInicio, dataFim) {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(
        col('fluxoCaixa'), where('criadoEm', '>=', dataInicio),
        where('criadoEm', '<=', dataFim), orderBy('criadoEm', 'desc')
      ));
      const movimentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const entradas = movimentos.filter(m => m.tipo === 'entrada').reduce((a, m) => a + (m.valor || 0), 0);
      const saidas = movimentos.filter(m => m.tipo === 'saida').reduce((a, m) => a + (m.valor || 0), 0);
      const porCategoria = movimentos.reduce((acc, m) => {
        const cat = m.categoria || 'Outros';
        if (!acc[cat]) acc[cat] = { entrada: 0, saida: 0 };
        m.tipo === 'entrada' ? acc[cat].entrada += m.valor || 0 : acc[cat].saida += m.valor || 0;
        return acc;
      }, {});
      const fluxoPorDia = movimentos.reduce((acc, m) => {
        const data = m.criadoEm?.toDate?.()?.toDateString() || 'Data não disponível';
        if (!acc[data]) acc[data] = { entrada: 0, saida: 0 };
        m.tipo === 'entrada' ? acc[data].entrada += m.valor || 0 : acc[data].saida += m.valor || 0;
        return acc;
      }, {});
      return { movimentos, resumo: { entradas, saidas, saldo: entradas - saidas, totalMovimentos: movimentos.length }, porCategoria, fluxoPorDia };
    } catch (err) {
      console.error('Erro no relatório de fluxo de caixa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function relatorioEstoqueAtual() {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(col('produtos'), where('ativo', '==', true), orderBy('nome')));
      const produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalProdutos = produtos.length;
      const valorTotalEstoque = produtos.reduce((acc, p) => acc + ((p.quantidade || 0) * (p.precoVenda || 0)), 0);
      const valorTotalCompra = produtos.reduce((acc, p) => acc + ((p.quantidade || 0) * (p.precoCompra || 0)), 0);
      const produtosEstoqueBaixo = produtos.filter(p => p.quantidade <= p.estoqueMinimo);
      const produtosSemEstoque = produtos.filter(p => p.quantidade === 0);
      return {
        produtos,
        resumo: { totalProdutos, valorTotalEstoque, valorTotalCompra, margemLucro: valorTotalEstoque - valorTotalCompra, produtosEstoqueBaixo: produtosEstoqueBaixo.length, produtosSemEstoque: produtosSemEstoque.length },
        alertas: { produtosEstoqueBaixo, produtosSemEstoque }
      };
    } catch (err) {
      console.error('Erro no relatório de estoque:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function obterDadosDashboard() {
    try {
      setLoading(true);
      setError(null);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      const [vendasMesSnap, vendasDiaSnap, clientesSnap, produtosSnap, fluxoSnap] = await Promise.all([
        getDocs(query(col('vendas'), where('criadoEm', '>=', inicioMes), where('status', '==', 'concluida'))),
        getDocs(query(col('vendas'), where('criadoEm', '>=', inicioDia), where('status', '==', 'concluida'))),
        getDocs(col('clientes')),
        getDocs(query(col('produtos'), where('ativo', '==', true))),
        getDocs(query(col('fluxoCaixa'), where('criadoEm', '>=', inicioMes)))
      ]);

      const vendasMes = vendasMesSnap.docs.map(doc => doc.data());
      const vendasDia = vendasDiaSnap.docs.map(doc => doc.data());
      const faturamentoMes = vendasMes.reduce((a, v) => a + (v.valorTotal || 0), 0);
      const faturamentoDia = vendasDia.reduce((a, v) => a + (v.valorTotal || 0), 0);
      const produtos = produtosSnap.docs.map(doc => doc.data());
      const movimentosCaixa = fluxoSnap.docs.map(doc => doc.data());
      const entradas = movimentosCaixa.filter(m => m.tipo === 'entrada').reduce((a, m) => a + (m.valor || 0), 0);
      const saidas = movimentosCaixa.filter(m => m.tipo === 'saida').reduce((a, m) => a + (m.valor || 0), 0);

      return {
        vendas: { totalMes: vendasMes.length, faturamentoMes, totalDia: vendasDia.length, faturamentoDia, ticketMedio: vendasMes.length > 0 ? faturamentoMes / vendasMes.length : 0 },
        clientes: { total: clientesSnap.size },
        estoque: { totalProdutos: produtos.length, produtosEstoqueBaixo: produtos.filter(p => p.quantidade <= p.estoqueMinimo).length, valorTotal: produtos.reduce((a, p) => a + ((p.quantidade || 0) * (p.precoVenda || 0)), 0) },
        financeiro: { entradas, saidas, saldo: entradas - saidas }
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
    loading, error,
    relatorioVendasPeriodo, relatorioProdutosMaisVendidos,
    relatorioClientesMaisAtivos, relatorioFluxoCaixa,
    relatorioEstoqueAtual, obterDadosDashboard
  };
}