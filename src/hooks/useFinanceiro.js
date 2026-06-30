import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

export function useFinanceiro() {
  const [contasReceber, setContasReceber] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [fluxoCaixa, setFluxoCaixa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  // ── Contas a Receber ────────────────────────────────────────────────────────

  async function listarContasReceber(filtros = {}) {
    try {
      setLoading(true);
      setError(null);
      const contasRef = col('contasReceber');
      
      if (filtros.vendaId) {
        const queryRef = query(contasRef, where('vendaId', '==', filtros.vendaId));
        const snapshot = await getDocs(queryRef);
        const contasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        contasData.sort((a, b) => (a.numeroParcela || 0) - (b.numeroParcela || 0));
        setContasReceber(contasData);
        return contasData;
      }
      
      const snapshot = await getDocs(contasRef);
      let contasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (filtros.status) contasData = contasData.filter(c => c.status === filtros.status);
      if (filtros.clienteId) contasData = contasData.filter(c => c.clienteId === filtros.clienteId);
      
      contasData.sort((a, b) => {
        const dataA = a.dataVencimento instanceof Date ? a.dataVencimento : a.dataVencimento?.toDate?.() || new Date(a.dataVencimento);
        const dataB = b.dataVencimento instanceof Date ? b.dataVencimento : b.dataVencimento?.toDate?.() || new Date(b.dataVencimento);
        return dataA - dataB;
      });
      setContasReceber(contasData);
      return contasData;
    } catch (err) {
      console.error('Erro em listarContasReceber:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function adicionarContaReceber(dados) {
    try {
      setLoading(true);
      const contaData = {
        ...dados, valor: parseFloat(dados.valor) || 0, valorRecebido: 0, status: 'pendente',
        descricao: dados.descricao?.trim() || '', observacoes: dados.observacoes?.trim() || '',
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
      };
      const docRef = await addDoc(col('contasReceber'), contaData);
      return { id: docRef.id, ...contaData };
    } catch (err) {
      console.error('Erro ao adicionar conta a receber:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function receberConta(contaId, dados) {
    try {
      setLoading(true);
      const dadosRecebimento = {
        status: dados.status || 'pago', dataPagamento: dados.dataPagamento || new Date(),
        valorRecebido: parseFloat(dados.valorRecebido) || 0,
        formaPagamento: dados.formaPagamento || '', observacoes: dados.observacoes || '',
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(colDoc('contasReceber', contaId), dadosRecebimento);
      return dadosRecebimento;
    } catch (err) {
      console.error('Erro ao receber conta:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Contas a Pagar ──────────────────────────────────────────────────────────

  async function listarContasPagar(filtros = {}) {
    try {
      setLoading(true);
      setError(null);
      let queryRef = query(col('contasPagar'), orderBy('dataVencimento', 'asc'));
      if (filtros.status) queryRef = query(queryRef, where('status', '==', filtros.status));
      if (filtros.fornecedor) queryRef = query(queryRef, where('fornecedor', '==', filtros.fornecedor));
      const snapshot = await getDocs(queryRef);
      const contasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContasPagar(contasData);
      return contasData;
    } catch (err) {
      console.error('Erro em listarContasPagar:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function adicionarContaPagar(dados) {
    try {
      setLoading(true);
      const contaData = {
        ...dados, valor: parseFloat(dados.valor) || 0, valorPago: 0, status: 'pendente',
        descricao: dados.descricao?.trim() || '', fornecedor: dados.fornecedor?.trim() || '',
        categoria: dados.categoria || 'outros', observacoes: dados.observacoes?.trim() || '',
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
      };
      const docRef = await addDoc(col('contasPagar'), contaData);
      return { id: docRef.id, ...contaData };
    } catch (err) {
      console.error('Erro ao adicionar conta a pagar:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function pagarConta(contaId, dados) {
    try {
      setLoading(true);
      const dadosPagamento = {
        valorPago: parseFloat(dados.valorPago) || 0, dataPagamento: dados.dataPagamento || new Date(),
        formaPagamento: dados.formaPagamento || '', observacoes: dados.observacoes || '',
        status: dados.valorPago >= dados.valorTotal ? 'paga' : 'parcial',
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(colDoc('contasPagar', contaId), dadosPagamento);
      await adicionarMovimentoCaixa({
        tipo: 'saida', valor: parseFloat(dados.valorPago),
        descricao: `Pagamento - ${dados.descricao || 'Conta a pagar'}`,
        categoria: dados.categoria || 'despesa', contaPagarRef: contaId
      });
      return dadosPagamento;
    } catch (err) {
      console.error('Erro ao pagar conta:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Fluxo de Caixa ──────────────────────────────────────────────────────────

  async function listarFluxoCaixa(filtros = {}) {
    try {
      setLoading(true);
      setError(null);
      let queryRef = query(col('fluxoCaixa'), orderBy('criadoEm', 'desc'));
      if (filtros.tipo) queryRef = query(queryRef, where('tipo', '==', filtros.tipo));
      if (filtros.categoria) queryRef = query(queryRef, where('categoria', '==', filtros.categoria));
      if (filtros.dataInicio && filtros.dataFim) {
        queryRef = query(queryRef, where('criadoEm', '>=', filtros.dataInicio), where('criadoEm', '<=', filtros.dataFim));
      }
      const snapshot = await getDocs(queryRef);
      const fluxoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFluxoCaixa(fluxoData);
      return fluxoData;
    } catch (err) {
      console.error('Erro em listarFluxoCaixa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function adicionarMovimentoCaixa(dados) {
    try {
      setLoading(true);
      const movimentoData = {
        ...dados, valor: parseFloat(dados.valor) || 0,
        descricao: dados.descricao?.trim() || '', categoria: dados.categoria || 'outros',
        criadoEm: serverTimestamp()
      };
      const docRef = await addDoc(col('fluxoCaixa'), movimentoData);
      return { id: docRef.id, ...movimentoData };
    } catch (err) {
      console.error('Erro ao adicionar movimento de caixa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Relatórios ──────────────────────────────────────────────────────────────

  async function obterResumoFinanceiro(periodo = 'mes') {
    try {
      setLoading(true);
      const hoje = new Date();
      let dataInicio;
      switch(periodo) {
        case 'dia': dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); break;
        case 'semana': dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'mes': dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); break;
        case 'ano': dataInicio = new Date(hoje.getFullYear(), 0, 1); break;
        default: dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      }
      const snapshot = await getDocs(query(col('fluxoCaixa'), where('criadoEm', '>=', dataInicio)));
      const movimentos = snapshot.docs.map(doc => doc.data());
      const entradas = movimentos.filter(m => m.tipo === 'entrada').reduce((a, m) => a + (m.valor || 0), 0);
      const saidas = movimentos.filter(m => m.tipo === 'saida').reduce((a, m) => a + (m.valor || 0), 0);
      return { entradas, saidas, saldo: entradas - saidas, totalMovimentos: movimentos.length };
    } catch (err) {
      console.error('Erro ao obter resumo financeiro:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function obterContasEmAtraso() {
    try {
      setLoading(true);
      const hoje = new Date();
      const [receberSnap, pagarSnap] = await Promise.all([
        getDocs(query(col('contasReceber'), where('dataVencimento', '<', hoje), where('status', '!=', 'recebida'))),
        getDocs(query(col('contasPagar'), where('dataVencimento', '<', hoje), where('status', '!=', 'paga')))
      ]);
      const contasReceberAtraso = receberSnap.docs.map(doc => ({ id: doc.id, tipo: 'receber', ...doc.data() }));
      const contasPagarAtraso = pagarSnap.docs.map(doc => ({ id: doc.id, tipo: 'pagar', ...doc.data() }));
      return { contasReceber: contasReceberAtraso, contasPagar: contasPagarAtraso, totalAtraso: [...contasReceberAtraso, ...contasPagarAtraso] };
    } catch (err) {
      console.error('Erro ao obter contas em atraso:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    contasReceber, contasPagar, fluxoCaixa, loading, error,
    listarContasReceber, adicionarContaReceber, receberConta,
    listarContasPagar, adicionarContaPagar, pagarConta,
    listarFluxoCaixa, adicionarMovimentoCaixa,
    obterResumoFinanceiro, obterContasEmAtraso
  };
}