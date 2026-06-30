import { useState, useCallback, useRef } from 'react';
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

export function useEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: null });

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  const invalidarCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: null };
  }, []);

  const listarProdutos = useCallback(async (filtros = {}) => {
    try {
      const forcarAtualizacao = filtros.forcarAtualizacao;
      const temFiltros = filtros.categoria || filtros.estoqueMinimo || filtros.nome;
      const cache = cacheRef.current;
      if (!forcarAtualizacao && !temFiltros && cache.data && cache.timestamp && Date.now() - cache.timestamp < 120000) {
        setProdutos(cache.data);
        return cache.data;
      }
      
      setLoading(true);
      setError(null);

      let queryRef = query(col('produtos'), orderBy('nome'));
      if (filtros.categoria) queryRef = query(queryRef, where('categoriaId', '==', filtros.categoria));
      if (filtros.estoqueMinimo) queryRef = query(queryRef, where('quantidade', '<=', filtros.estoqueMinimo));

      const snapshot = await getDocs(queryRef);
      let produtosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (filtros.nome) {
        const termo = filtros.nome.toLowerCase().trim();
        produtosData = produtosData.filter(p => 
          p.nome?.toLowerCase().includes(termo) ||
          p.codigo?.toLowerCase().includes(termo) ||
          p.descricao?.toLowerCase().includes(termo)
        );
      }

      if (!temFiltros) cacheRef.current = { data: produtosData, timestamp: Date.now() };
      setProdutos(produtosData);
      return produtosData;
    } catch (err) {
      console.error('Erro em listarProdutos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  const gerarCodigoCompra = () => Math.floor(10000 + Math.random() * 90000).toString();

  async function adicionarProduto(dados) {
    try {
      setLoading(true);
      const quantidade = parseInt(dados.quantidade) || 0;
      const precoCompra = parseFloat(dados.precoCompra) || 0;
      const valorTotal = quantidade * precoCompra;
      
      const produtoData = {
        ...dados,
        nome: dados.nome?.trim() || '',
        codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        quantidade,
        estoqueMinimo: parseInt(dados.estoqueMinimo) || 0,
        precoCompra,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        ativo: dados.ativo !== false,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const batch = writeBatch(db);
      const produtoRef = doc(col('produtos'));
      batch.set(produtoRef, produtoData);

      if (quantidade > 0 && precoCompra > 0) {
        const compraRef = doc(col('compras'));
        const codigoCompra = gerarCodigoCompra();
        batch.set(compraRef, {
          codigoCompra, fornecedor: dados.fornecedor?.trim() || 'Cadastro Inicial',
          dataCompra: new Date(), valorTotal,
          observacoes: `Compra automática - Cadastro inicial do produto: ${dados.nome?.trim() || ''}`,
          produtoId: produtoRef.id, nomeProduto: dados.nome?.trim() || '',
          itens: [{ nomeProduto: dados.nome?.trim() || '', categoria: dados.categoria?.trim() || '',
            quantidade, valorCompra: precoCompra, valorUnitario: precoCompra,
            valorVenda: parseFloat(dados.precoVenda) || 0 }],
          quantidade, valorCompra: precoCompra, precoCompra,
          precoVenda: parseFloat(dados.precoVenda) || 0,
          categoria: dados.categoria?.trim() || '', criadoEm: new Date(), atualizadoEm: new Date()
        });

        const movimentacaoRef = doc(col('movimentacoesEstoque'));
        batch.set(movimentacaoRef, {
          produtoId: produtoRef.id, produtoNome: dados.nome, tipo: 'entrada',
          quantidade, motivo: 'Cadastro inicial do produto', compraId: compraRef.id,
          codigoCompra, data: new Date()
        });
      }

      await batch.commit();
      invalidarCache();
      const novoProduto = { id: produtoRef.id, ...produtoData };
      setProdutos(prev => [...prev, novoProduto]);
      return novoProduto;
    } catch (err) {
      console.error('Erro ao adicionar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function atualizarProduto(id, dados) {
    try {
      setLoading(true);
      const dadosNormalizados = {
        ...dados,
        nome: dados.nome?.trim() || '', codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '', quantidade: parseInt(dados.quantidade) || 0,
        estoqueMinimo: parseInt(dados.estoqueMinimo) || 0,
        precoCompra: parseFloat(dados.precoCompra) || 0,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(colDoc('produtos', id), dadosNormalizados);
      invalidarCache();
      const produtoAtualizado = { id, ...dadosNormalizados };
      setProdutos(prev => prev.map(p => p.id === id ? produtoAtualizado : p));
      return produtoAtualizado;
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function deletarProduto(id) {
    try {
      setLoading(true);
      await deleteDoc(colDoc('produtos', id));
      invalidarCache();
      setProdutos(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar produto:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function ajustarEstoque(produtoId, novaQuantidade, motivo = '') {
    try {
      setLoading(true);
      await updateDoc(colDoc('produtos', produtoId), {
        quantidade: parseInt(novaQuantidade), atualizadoEm: serverTimestamp()
      });
      await addDoc(col('movimentosEstoque'), {
        produtoId, quantidade: parseInt(novaQuantidade),
        motivo: motivo || 'Ajuste manual', tipo: 'ajuste', criadoEm: serverTimestamp()
      });
      invalidarCache();
      setProdutos(prev => prev.map(p => p.id === produtoId ? { ...p, quantidade: parseInt(novaQuantidade) } : p));
      return true;
    } catch (err) {
      console.error('Erro ao ajustar estoque:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Categorias ─────────────────────────────────────────────────────────────

  async function listarCategorias() {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(query(col('categorias'), orderBy('nome')));
      const categoriasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  async function adicionarCategoria(dados) {
    try {
      setLoading(true);
      const categoriaData = {
        nome: dados.nome?.trim() || '', descricao: dados.descricao?.trim() || '',
        cor: dados.cor || '#3B82F6', ativo: dados.ativo !== false,
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
      };
      const docRef = await addDoc(col('categorias'), categoriaData);
      return { id: docRef.id, ...categoriaData };
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function atualizarCategoria(id, dados) {
    try {
      setLoading(true);
      const dadosNormalizados = {
        ...dados, nome: dados.nome?.trim() || '', descricao: dados.descricao?.trim() || '',
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(colDoc('categorias', id), dadosNormalizados);
      return { id, ...dadosNormalizados };
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function deletarCategoria(id) {
    try {
      setLoading(true);
      await deleteDoc(colDoc('categorias', id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Relatórios ─────────────────────────────────────────────────────────────

  async function obterProdutosEstoqueBaixo() {
    try {
      setLoading(true);
      const snapshot = await getDocs(col('produtos'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(produto => produto.quantidade <= produto.estoqueMinimo);
    } catch (err) {
      console.error('Erro ao obter produtos com estoque baixo:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function obterValorTotalEstoque() {
    try {
      setLoading(true);
      const snapshot = await getDocs(col('produtos'));
      let valorTotal = 0, valorCompra = 0;
      snapshot.docs.forEach(doc => {
        const p = doc.data();
        valorTotal += (p.quantidade || 0) * (p.precoVenda || 0);
        valorCompra += (p.quantidade || 0) * (p.precoCompra || 0);
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
    produtos, categorias, loading, error,
    listarProdutos, adicionarProduto, atualizarProduto, deletarProduto, ajustarEstoque, invalidarCache,
    listarCategorias, adicionarCategoria, atualizarCategoria, deletarCategoria,
    obterProdutosEstoqueBaixo, obterValorTotalEstoque
  };
}