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
import { db } from '../services/firebase';

export function useFinanceiro() {
  const [contasReceber, setContasReceber] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [fluxoCaixa, setFluxoCaixa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============ CONTAS A RECEBER ============

  // Função para listar contas a receber
  async function listarContasReceber(filtros = {}) {
    try {
      setLoading(true);
      setError(null);

      const contasRef = collection(db, 'contasReceber');
      let queryRef = query(contasRef, orderBy('dataVencimento', 'asc'));

      // Aplicar filtros
      if (filtros.status) {
        queryRef = query(queryRef, where('status', '==', filtros.status));
      }
      if (filtros.clienteId) {
        queryRef = query(queryRef, where('clienteId', '==', filtros.clienteId));
      }
      if (filtros.dataInicio && filtros.dataFim) {
        queryRef = query(
          queryRef,
          where('dataVencimento', '>=', filtros.dataInicio),
          where('dataVencimento', '<=', filtros.dataFim)
        );
      }

      const snapshot = await getDocs(queryRef);
      const contasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  // Função para adicionar conta a receber
  async function adicionarContaReceber(dados) {
    try {
      setLoading(true);
      
      const contaData = {
        ...dados,
        valor: parseFloat(dados.valor) || 0,
        valorRecebido: 0,
        status: 'pendente',
        descricao: dados.descricao?.trim() || '',
        observacoes: dados.observacoes?.trim() || '',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'contasReceber'), contaData);
      return { id: docRef.id, ...contaData };
    } catch (err) {
      console.error('Erro ao adicionar conta a receber:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para registrar pagamento de conta a receber
  async function receberConta(contaId, dados) {
    try {
      setLoading(true);
      
      const dadosRecebimento = {
        valorRecebido: parseFloat(dados.valorRecebido) || 0,
        dataRecebimento: dados.dataRecebimento || new Date(),
        formaPagamento: dados.formaPagamento || '',
        observacoes: dados.observacoes || '',
        status: dados.valorRecebido >= dados.valorTotal ? 'recebida' : 'parcial',
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'contasReceber', contaId), dadosRecebimento);

      // Registrar no fluxo de caixa
      await adicionarMovimentoCaixa({
        tipo: 'entrada',
        valor: parseFloat(dados.valorRecebido),
        descricao: `Recebimento - ${dados.descricao || 'Conta a receber'}`,
        categoria: 'recebimento',
        contaReceberRef: contaId
      });

      return dadosRecebimento;
    } catch (err) {
      console.error('Erro ao receber conta:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ CONTAS A PAGAR ============

  // Função para listar contas a pagar
  async function listarContasPagar(filtros = {}) {
    try {
      setLoading(true);
      setError(null);

      const contasRef = collection(db, 'contasPagar');
      let queryRef = query(contasRef, orderBy('dataVencimento', 'asc'));

      // Aplicar filtros
      if (filtros.status) {
        queryRef = query(queryRef, where('status', '==', filtros.status));
      }
      if (filtros.fornecedor) {
        queryRef = query(queryRef, where('fornecedor', '==', filtros.fornecedor));
      }

      const snapshot = await getDocs(queryRef);
      const contasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  // Função para adicionar conta a pagar
  async function adicionarContaPagar(dados) {
    try {
      setLoading(true);
      
      const contaData = {
        ...dados,
        valor: parseFloat(dados.valor) || 0,
        valorPago: 0,
        status: 'pendente',
        descricao: dados.descricao?.trim() || '',
        fornecedor: dados.fornecedor?.trim() || '',
        categoria: dados.categoria || 'outros',
        observacoes: dados.observacoes?.trim() || '',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'contasPagar'), contaData);
      return { id: docRef.id, ...contaData };
    } catch (err) {
      console.error('Erro ao adicionar conta a pagar:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para pagar conta
  async function pagarConta(contaId, dados) {
    try {
      setLoading(true);
      
      const dadosPagamento = {
        valorPago: parseFloat(dados.valorPago) || 0,
        dataPagamento: dados.dataPagamento || new Date(),
        formaPagamento: dados.formaPagamento || '',
        observacoes: dados.observacoes || '',
        status: dados.valorPago >= dados.valorTotal ? 'paga' : 'parcial',
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'contasPagar', contaId), dadosPagamento);

      // Registrar no fluxo de caixa
      await adicionarMovimentoCaixa({
        tipo: 'saida',
        valor: parseFloat(dados.valorPago),
        descricao: `Pagamento - ${dados.descricao || 'Conta a pagar'}`,
        categoria: dados.categoria || 'despesa',
        contaPagarRef: contaId
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

  // ============ FLUXO DE CAIXA ============

  // Função para listar movimentos do fluxo de caixa
  async function listarFluxoCaixa(filtros = {}) {
    try {
      setLoading(true);
      setError(null);

      const fluxoRef = collection(db, 'fluxoCaixa');
      let queryRef = query(fluxoRef, orderBy('criadoEm', 'desc'));

      // Aplicar filtros
      if (filtros.tipo) {
        queryRef = query(queryRef, where('tipo', '==', filtros.tipo));
      }
      if (filtros.categoria) {
        queryRef = query(queryRef, where('categoria', '==', filtros.categoria));
      }
      if (filtros.dataInicio && filtros.dataFim) {
        queryRef = query(
          queryRef,
          where('criadoEm', '>=', filtros.dataInicio),
          where('criadoEm', '<=', filtros.dataFim)
        );
      }

      const snapshot = await getDocs(queryRef);
      const fluxoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  // Função para adicionar movimento no fluxo de caixa
  async function adicionarMovimentoCaixa(dados) {
    try {
      setLoading(true);
      
      const movimentoData = {
        ...dados,
        valor: parseFloat(dados.valor) || 0,
        descricao: dados.descricao?.trim() || '',
        categoria: dados.categoria || 'outros',
        criadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'fluxoCaixa'), movimentoData);
      return { id: docRef.id, ...movimentoData };
    } catch (err) {
      console.error('Erro ao adicionar movimento de caixa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ RELATÓRIOS FINANCEIROS ============

  // Função para obter resumo financeiro
  async function obterResumoFinanceiro(periodo = 'mes') {
    try {
      setLoading(true);
      
      const hoje = new Date();
      let dataInicio;
      
      switch(periodo) {
        case 'dia':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
          break;
        case 'semana':
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        case 'ano':
          dataInicio = new Date(hoje.getFullYear(), 0, 1);
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      }

      // Buscar movimentos do fluxo de caixa no período
      const fluxoQuery = query(
        collection(db, 'fluxoCaixa'),
        where('criadoEm', '>=', dataInicio)
      );

      const snapshot = await getDocs(fluxoQuery);
      const movimentos = snapshot.docs.map(doc => doc.data());

      const entradas = movimentos
        .filter(mov => mov.tipo === 'entrada')
        .reduce((acc, mov) => acc + (mov.valor || 0), 0);

      const saidas = movimentos
        .filter(mov => mov.tipo === 'saida')
        .reduce((acc, mov) => acc + (mov.valor || 0), 0);

      const saldo = entradas - saidas;

      return {
        entradas,
        saidas,
        saldo,
        totalMovimentos: movimentos.length
      };
    } catch (err) {
      console.error('Erro ao obter resumo financeiro:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para obter contas em atraso
  async function obterContasEmAtraso() {
    try {
      setLoading(true);
      const hoje = new Date();

      // Contas a receber em atraso
      const receberQuery = query(
        collection(db, 'contasReceber'),
        where('dataVencimento', '<', hoje),
        where('status', '!=', 'recebida')
      );

      // Contas a pagar em atraso
      const pagarQuery = query(
        collection(db, 'contasPagar'),
        where('dataVencimento', '<', hoje),
        where('status', '!=', 'paga')
      );

      const [receberSnapshot, pagarSnapshot] = await Promise.all([
        getDocs(receberQuery),
        getDocs(pagarQuery)
      ]);

      const contasReceberAtraso = receberSnapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'receber',
        ...doc.data()
      }));

      const contasPagarAtraso = pagarSnapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'pagar',
        ...doc.data()
      }));

      return {
        contasReceber: contasReceberAtraso,
        contasPagar: contasPagarAtraso,
        totalAtraso: [...contasReceberAtraso, ...contasPagarAtraso]
      };
    } catch (err) {
      console.error('Erro ao obter contas em atraso:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    // Estados
    contasReceber,
    contasPagar,
    fluxoCaixa,
    loading,
    error,

    // Contas a Receber
    listarContasReceber,
    adicionarContaReceber,
    receberConta,

    // Contas a Pagar
    listarContasPagar,
    adicionarContaPagar,
    pagarConta,

    // Fluxo de Caixa
    listarFluxoCaixa,
    adicionarMovimentoCaixa,

    // Relatórios
    obterResumoFinanceiro,
    obterContasEmAtraso
  };
}