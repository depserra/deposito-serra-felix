import { useState, useCallback, useRef } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
  where,
  increment
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

// Função auxiliar para converter string de data para Date no timezone local
const stringParaDataLocal = (dataString) => {
  if (!dataString) return new Date();
  if (dataString instanceof Date) return dataString;
  if (typeof dataString === 'string' && dataString.includes('T')) {
    const d = new Date(dataString);
    if (!isNaN(d.getTime())) return d;
  }
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: null });

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  const gerarCodigoCompra = () => Math.floor(10000 + Math.random() * 90000).toString();

  const invalidarCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: null };
  }, []);

  const listarCompras = useCallback(async (searchTerm = '') => {
    try {
      const cache = cacheRef.current;
      if (cache.data && cache.timestamp && Date.now() - cache.timestamp < 120000) {
        let comprasData = cache.data;
        if (searchTerm) {
          const termLower = searchTerm.toLowerCase();
          comprasData = comprasData.filter(compra =>
            compra.codigoCompra?.includes(termLower) ||
            compra.fornecedor?.toLowerCase().includes(termLower) ||
            compra.itens?.some(item => item.nomeProduto?.toLowerCase().includes(termLower))
          );
        }
        setCompras(comprasData);
        return comprasData;
      }
      
      setLoading(true);
      setError(null);
      const queryRef = query(col('compras'), orderBy('dataCompra', 'desc'));
      const snapshot = await getDocs(queryRef);

      let comprasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCompra: doc.data().dataCompra?.toDate()
      }));

      if (searchTerm) {
        const termLower = searchTerm.toLowerCase();
        comprasData = comprasData.filter(compra =>
          compra.codigoCompra?.includes(termLower) ||
          compra.fornecedor?.toLowerCase().includes(termLower) ||
          compra.itens?.some(item => item.nomeProduto?.toLowerCase().includes(termLower))
        );
      }

      cacheRef.current = { data: comprasData, timestamp: Date.now() };
      setCompras(comprasData);
      return comprasData;
    } catch (err) {
      console.error('Erro ao listar compras:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  const adicionarCompra = async (dados) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const codigoCompra = gerarCodigoCompra();

      const compraRef = doc(col('compras'));
      const compraData = {
        ...dados,
        codigoCompra,
        dataCompra: stringParaDataLocal(dados.dataCompra),
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };
      batch.set(compraRef, compraData);

      if (dados.itens && dados.itens.length > 0) {
        const todosProdutosSnap = await getDocs(col('produtos'));
        const produtosMap = new Map();
        todosProdutosSnap.docs.forEach(doc => {
          produtosMap.set(doc.data().nome, { id: doc.id, ...doc.data() });
        });

        for (const item of dados.itens) {
          const produtoExistente = produtosMap.get(item.nomeProduto);
          if (produtoExistente) {
            const quantidadeComprada = parseFloat(item.quantidade) || 0;
            batch.update(colDoc('produtos', produtoExistente.id), {
              quantidade: increment(quantidadeComprada),
              atualizadoEm: new Date()
            });
            const movimentacaoRef = doc(col('movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: produtoExistente.id, produtoNome: item.nomeProduto,
              tipo: 'entrada', quantidade: quantidadeComprada,
              valorCompra: parseFloat(item.valorCompra) || 0,
              valorVenda: parseFloat(item.valorVenda) || 0,
              fornecedor: dados.fornecedor || '', motivo: 'Compra',
              compraId: compraRef.id, codigoCompra, data: new Date()
            });
          } else {
            const novoProdutoRef = doc(col('produtos'));
            batch.set(novoProdutoRef, {
              nome: item.nomeProduto, categoria: item.categoria || 'Geral',
              quantidade: parseFloat(item.quantidade) || 0,
              precoCompra: parseFloat(item.valorCompra) || 0,
              precoVenda: parseFloat(item.valorVenda) || 0,
              unidade: item.unidade || 'un', criadoEm: new Date(), atualizadoEm: new Date()
            });
            const movimentacaoRef = doc(col('movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: novoProdutoRef.id, produtoNome: item.nomeProduto,
              tipo: 'entrada', quantidade: parseFloat(item.quantidade) || 0,
              valorCompra: parseFloat(item.valorCompra) || 0,
              valorVenda: parseFloat(item.valorVenda) || 0,
              fornecedor: dados.fornecedor || '', motivo: 'Compra (Primeiro cadastro)',
              compraId: compraRef.id, codigoCompra, data: new Date()
            });
          }
        }
      }

      await batch.commit();
      invalidarCache();
      const novaCompra = { id: compraRef.id, ...compraData };
      setCompras(prev => [novaCompra, ...prev]);
      return novaCompra;
    } catch (err) {
      console.error('Erro ao adicionar compra:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const atualizarCompra = async (id, dados) => {
    try {
      setLoading(true);
      setError(null);
      const compraRef = colDoc('compras', id);
      const dadosAtualizados = {
        ...dados,
        dataCompra: stringParaDataLocal(dados.dataCompra),
        atualizadoEm: new Date()
      };
      await updateDoc(compraRef, dadosAtualizados);
      invalidarCache();
      setCompras(prev => prev.map(c => c.id === id ? { id, ...dadosAtualizados } : c));
      return { id, ...dadosAtualizados };
    } catch (err) {
      console.error('Erro ao atualizar compra:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletarCompra = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const compraRef = colDoc('compras', id);
      const compraSnap = await getDoc(compraRef);
      if (!compraSnap.exists()) throw new Error('Compra não encontrada');

      const compraData = compraSnap.data();
      const batch = writeBatch(db);

      if (compraData.itens && compraData.itens.length > 0) {
        for (const item of compraData.itens) {
          const q = query(col('produtos'), where('nome', '==', item.nomeProduto));
          const produtoSnap = await getDocs(q);
          if (!produtoSnap.empty) {
            const produtoDoc = produtoSnap.docs[0];
            const produtoAtual = produtoDoc.data();
            const qtdComprada = parseFloat(item.quantidade) || 0;
            const novaQtd = Math.max(0, (produtoAtual.quantidade || 0) - qtdComprada);
            batch.update(colDoc('produtos', produtoDoc.id), { quantidade: novaQtd, atualizadoEm: new Date() });
            const movimentacaoRef = doc(col('movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: produtoDoc.id, produtoNome: item.nomeProduto,
              tipo: 'saida', quantidade: qtdComprada,
              motivo: 'Exclusão de compra', compraId: id,
              codigoCompra: compraData.codigoCompra, data: new Date()
            });
          }
        }
      }

      batch.delete(compraRef);
      await batch.commit();
      invalidarCache();
      setCompras(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar compra:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { compras, loading, error, listarCompras, adicionarCompra, atualizarCompra, deletarCompra, invalidarCache };
}
