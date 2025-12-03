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

export function useEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============ PRODUTOS ============

  // Função para listar produtos
  async function listarProdutos(filtros = {}) {
    try {
      setLoading(true);
      setError(null);

      const produtosRef = collection(db, 'produtos');
      let queryRef = query(produtosRef, orderBy('nome'));

      // Aplicar filtros
      if (filtros.categoria) {
        queryRef = query(queryRef, where('categoriaId', '==', filtros.categoria));
      }
      if (filtros.estoqueMinimo) {
        queryRef = query(queryRef, where('quantidade', '<=', filtros.estoqueMinimo));
      }

      const snapshot = await getDocs(queryRef);
      let produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtro por nome (busca local para melhor performance)
      if (filtros.nome) {
        const termoBusca = filtros.nome.toLowerCase().trim();
        produtosData = produtosData.filter(produto => 
          produto.nome?.toLowerCase().includes(termoBusca) ||
          produto.codigo?.toLowerCase().includes(termoBusca) ||
          produto.descricao?.toLowerCase().includes(termoBusca)
        );
      }

      setProdutos(produtosData);
      return produtosData;
    } catch (err) {
      console.error('Erro em listarProdutos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para adicionar produto
  async function adicionarProduto(dados) {
    try {
      setLoading(true);
      
      const produtoData = {
        ...dados,
        nome: dados.nome?.trim() || '',
        codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        quantidade: parseInt(dados.quantidade) || 0,
        estoqueMinimo: parseInt(dados.estoqueMinimo) || 0,
        precoCompra: parseFloat(dados.precoCompra) || 0,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        ativo: dados.ativo !== false, // default true
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'produtos'), produtoData);
      return { id: docRef.id, ...produtoData };
    } catch (err) {
      console.error('Erro ao adicionar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para atualizar produto
  async function atualizarProduto(id, dados) {
    try {
      setLoading(true);
      
      const dadosNormalizados = {
        ...dados,
        nome: dados.nome?.trim() || '',
        codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        quantidade: parseInt(dados.quantidade) || 0,
        estoqueMinimo: parseInt(dados.estoqueMinimo) || 0,
        precoCompra: parseFloat(dados.precoCompra) || 0,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'produtos', id), dadosNormalizados);
      return { id, ...dadosNormalizados };
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para deletar produto
  async function deletarProduto(id) {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'produtos', id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para ajustar estoque
  async function ajustarEstoque(produtoId, novaQuantidade, motivo = '') {
    try {
      setLoading(true);
      
      // Atualizar quantidade do produto
      await updateDoc(doc(db, 'produtos', produtoId), {
        quantidade: parseInt(novaQuantidade),
        atualizadoEm: serverTimestamp()
      });

      // Registrar movimento de estoque
      const movimentoData = {
        produtoId,
        quantidade: parseInt(novaQuantidade),
        motivo: motivo || 'Ajuste manual',
        tipo: 'ajuste',
        criadoEm: serverTimestamp()
      };

      await addDoc(collection(db, 'movimentosEstoque'), movimentoData);
      return true;
    } catch (err) {
      console.error('Erro ao ajustar estoque:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ CATEGORIAS ============

  // Função para listar categorias
  async function listarCategorias() {
    try {
      setLoading(true);
      setError(null);

      const categoriasRef = collection(db, 'categorias');
      const queryRef = query(categoriasRef, orderBy('nome'));

      const snapshot = await getDocs(queryRef);
      const categoriasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCategorias(categoriasData);
      return categoriasData;
    } catch (err) {
      console.error('Erro em listarCategorias:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para adicionar categoria
  async function adicionarCategoria(dados) {
    try {
      setLoading(true);
      
      const categoriaData = {
        nome: dados.nome?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        cor: dados.cor || '#3B82F6',
        ativo: dados.ativo !== false,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'categorias'), categoriaData);
      return { id: docRef.id, ...categoriaData };
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para atualizar categoria
  async function atualizarCategoria(id, dados) {
    try {
      setLoading(true);
      
      const dadosNormalizados = {
        ...dados,
        nome: dados.nome?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'categorias', id), dadosNormalizados);
      return { id, ...dadosNormalizados };
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para deletar categoria
  async function deletarCategoria(id) {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'categorias', id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ============ RELATÓRIOS ============

  // Função para obter produtos com estoque baixo
  async function obterProdutosEstoqueBaixo() {
    try {
      setLoading(true);
      const produtosRef = collection(db, 'produtos');
      const snapshot = await getDocs(produtosRef);
      
      const produtosBaixoEstoque = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(produto => produto.quantidade <= produto.estoqueMinimo);

      return produtosBaixoEstoque;
    } catch (err) {
      console.error('Erro ao obter produtos com estoque baixo:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para obter valor total do estoque
  async function obterValorTotalEstoque() {
    try {
      setLoading(true);
      const produtosRef = collection(db, 'produtos');
      const snapshot = await getDocs(produtosRef);
      
      let valorTotal = 0;
      let valorCompra = 0;
      
      snapshot.docs.forEach(doc => {
        const produto = doc.data();
        valorTotal += (produto.quantidade || 0) * (produto.precoVenda || 0);
        valorCompra += (produto.quantidade || 0) * (produto.precoCompra || 0);
      });

      return { valorTotal, valorCompra, lucroEstimado: valorTotal - valorCompra };
    } catch (err) {
      console.error('Erro ao calcular valor do estoque:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    // Estados
    produtos,
    categorias, 
    loading,
    error,
    
    // Produtos
    listarProdutos,
    adicionarProduto,
    atualizarProduto,
    deletarProduto,
    ajustarEstoque,
    
    // Categorias
    listarCategorias,
    adicionarCategoria,
    atualizarCategoria,
    deletarCategoria,
    
    // Relatórios
    obterProdutosEstoqueBaixo,
    obterValorTotalEstoque
  };
}