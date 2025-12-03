import { useState } from 'react';
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
  where
} from 'firebase/firestore';
import { db } from '../services/firebase';

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gera um código único de 5 dígitos para a compra
  const gerarCodigoCompra = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Lista compras com filtros
  const listarCompras = async (searchTerm = '') => {
    try {
      setLoading(true);
      setError(null);
      const comprasRef = collection(db, 'compras');

      // Buscar todas as compras
      const queryRef = query(comprasRef, orderBy('dataCompra', 'desc'));
      const snapshot = await getDocs(queryRef);

      let comprasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCompra: doc.data().dataCompra?.toDate()
      }));

      // Aplicar filtros localmente
      if (searchTerm) {
        const termLower = searchTerm.toLowerCase();
        comprasData = comprasData.filter(compra =>
          compra.codigoCompra?.includes(termLower) ||
          compra.fornecedor?.toLowerCase().includes(termLower) ||
          compra.itens?.some(item =>
            item.nomeProduto?.toLowerCase().includes(termLower)
          )
        );
      }

      setCompras(comprasData);
      return comprasData;
    } catch (err) {
      console.error('Erro ao listar compras:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Adiciona nova compra com atualização automática do estoque
  const adicionarCompra = async (dados) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const codigoCompra = gerarCodigoCompra();

      // 1. Criar a compra
      const compraRef = doc(collection(db, 'compras'));
      const compraData = {
        ...dados,
        codigoCompra,
        dataCompra: new Date(dados.dataCompra),
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };
      batch.set(compraRef, compraData);

      // 2. Atualizar o estoque para cada item da compra
      if (dados.itens && dados.itens.length > 0) {
        for (const item of dados.itens) {
          // Buscar produto por nome
          const produtosRef = collection(db, 'produtos');
          const q = query(produtosRef, where('nome', '==', item.nomeProduto));
          const produtoSnap = await getDocs(q);

          if (!produtoSnap.empty) {
            // Produto existe - atualizar quantidade
            const produtoDoc = produtoSnap.docs[0];
            const produtoAtual = produtoDoc.data();
            const quantidadeComprada = parseFloat(item.quantidade) || 0;
            const novaQuantidade = (produtoAtual.quantidade || 0) + quantidadeComprada;

            batch.update(doc(db, 'produtos', produtoDoc.id), {
              quantidade: novaQuantidade,
              valorUnitario: parseFloat(item.valorUnitario) || produtoAtual.valorUnitario,
              atualizadoEm: new Date()
            });

            // Registrar movimentação de estoque
            const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: produtoDoc.id,
              produtoNome: item.nomeProduto,
              tipo: 'entrada',
              quantidade: quantidadeComprada,
              motivo: 'Compra',
              compraId: compraRef.id,
              codigoCompra: codigoCompra,
              data: new Date()
            });
          } else {
            // Produto não existe - criar novo
            const novoProdutoRef = doc(collection(db, 'produtos'));
            batch.set(novoProdutoRef, {
              nome: item.nomeProduto,
              categoria: item.categoria || 'Geral',
              quantidade: parseFloat(item.quantidade) || 0,
              valorUnitario: parseFloat(item.valorUnitario) || 0,
              criadoEm: new Date(),
              atualizadoEm: new Date()
            });

            // Registrar movimentação de estoque
            const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: novoProdutoRef.id,
              produtoNome: item.nomeProduto,
              tipo: 'entrada',
              quantidade: parseFloat(item.quantidade) || 0,
              motivo: 'Compra (Primeiro cadastro)',
              compraId: compraRef.id,
              codigoCompra: codigoCompra,
              data: new Date()
            });
          }
        }
      }

      // Executar todas as operações em batch
      await batch.commit();

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

  // Atualiza compra existente
  const atualizarCompra = async (id, dados) => {
    try {
      setLoading(true);
      setError(null);

      const compraRef = doc(db, 'compras', id);
      const dadosAtualizados = {
        ...dados,
        dataCompra: new Date(dados.dataCompra),
        atualizadoEm: new Date()
      };

      await updateDoc(compraRef, dadosAtualizados);

      setCompras(prev => prev.map(c =>
        c.id === id ? { id, ...dadosAtualizados } : c
      ));

      return { id, ...dadosAtualizados };
    } catch (err) {
      console.error('Erro ao atualizar compra:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Deleta compra e reverte o estoque
  const deletarCompra = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar a compra antes de deletar para reverter o estoque
      const compraRef = doc(db, 'compras', id);
      const compraSnap = await getDoc(compraRef);

      if (!compraSnap.exists()) {
        throw new Error('Compra não encontrada');
      }

      const compraData = compraSnap.data();
      const batch = writeBatch(db);

      // Reverter estoque para cada item da compra
      if (compraData.itens && compraData.itens.length > 0) {
        for (const item of compraData.itens) {
          // Buscar produto por nome
          const produtosRef = collection(db, 'produtos');
          const q = query(produtosRef, where('nome', '==', item.nomeProduto));
          const produtoSnap = await getDocs(q);

          if (!produtoSnap.empty) {
            // Produto existe - diminuir quantidade
            const produtoDoc = produtoSnap.docs[0];
            const produtoAtual = produtoDoc.data();
            const quantidadeComprada = parseFloat(item.quantidade) || 0;
            const novaQuantidade = Math.max(0, (produtoAtual.quantidade || 0) - quantidadeComprada);

            batch.update(doc(db, 'produtos', produtoDoc.id), {
              quantidade: novaQuantidade,
              atualizadoEm: new Date()
            });

            // Registrar movimentação de estoque
            const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: produtoDoc.id,
              produtoNome: item.nomeProduto,
              tipo: 'saida',
              quantidade: quantidadeComprada,
              motivo: 'Exclusão de compra',
              compraId: id,
              codigoCompra: compraData.codigoCompra,
              data: new Date()
            });
          }
        }
      }

      // Deletar a compra
      batch.delete(compraRef);

      // Executar todas as operações
      await batch.commit();

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

  return {
    compras,
    loading,
    error,
    listarCompras,
    adicionarCompra,
    atualizarCompra,
    deletarCompra
  };
}
