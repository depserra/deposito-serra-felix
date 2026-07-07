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

// Helper function to calculate Levenshtein distance between two strings
function getLevenshteinDistance(a, b) {
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

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

  async function adicionarProduto(dados, ignorarSimilaridade = false) {
    try {
      setLoading(true);
      const nomeLimpo = dados.nome?.trim() || '';
      if (!nomeLimpo) {
        throw new Error('O nome do produto é obrigatório.');
      }

      // Função de normalização rigorosa (remove acentos, espaços e caracteres especiais)
      const normalizar = (str) => {
        return (str || '')
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
      };

      const nomeNorm = normalizar(nomeLimpo);

      // 1. DUPLICADO EXATO (BLOQUEAR):
      // Verificar local (com comparação normalizada para bloquear diferenças de acentos/espaços/símbolos)
      const duplicadoLocal = produtos.find(p => p.ativo !== false && normalizar(p.nome) === nomeNorm);
      if (duplicadoLocal) {
        throw new Error(`Já existe um produto cadastrado com o nome semelhante/idêntico: "${duplicadoLocal.nome}".`);
      }

      // Verificar banco
      const q = query(col('produtos'), where('nome', '==', nomeLimpo));
      const querySnapshot = await getDocs(q);
      const existeBanco = querySnapshot.docs.some(doc => doc.data().ativo !== false);
      if (existeBanco) {
        throw new Error(`Já existe um produto cadastrado com o nome "${nomeLimpo}".`);
      }

      // 2. SIMILARIDADE (AVISO):
      if (!ignorarSimilaridade) {
        // Encontrar produto muito similar (ex: similaridade >= 85%)
        const similarProd = produtos.find(p => {
          if (p.ativo === false) return false;
          const pNorm = normalizar(p.nome);
          const dist = getLevenshteinDistance(nomeNorm, pNorm);
          const maxLen = Math.max(nomeNorm.length, pNorm.length);
          if (maxLen === 0) return false;
          const similarity = 1 - dist / maxLen;
          return similarity >= 0.85; // 85% de similaridade
        });

        if (similarProd) {
          return { similar: true, produtoSimilar: similarProd };
        }
      }

      // ✅ parseFloat preserva casas decimais (ex: 10.5 kg, 2.5 l)
      const quantidade = parseFloat(dados.quantidade) || 0;
      const precoCompra = parseFloat(dados.precoCompra) || 0;
      const valorTotal = quantidade * precoCompra;
      
      const produtoData = {
        ...dados,
        nome: dados.nome?.trim() || '',
        codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        quantidade,
        estoqueMinimo: parseFloat(dados.estoqueMinimo) || 0,
        precoCompra,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        // Campos de fracionamento (retrocompatíveis)
        vendaFracionada: dados.vendaFracionada || false,
        permiteFragmentacao: dados.permiteFragmentacao ?? dados.vendaFracionada ?? false,
        fatorConversao: Number(dados.fatorConversao) || 1,
        unidadeVenda: dados.unidadeVenda || dados.unidade || 'un',
        precoVendaUnitario: parseFloat(dados.precoVendaUnitario) || 0,
        incrementoMinimoVenda: parseFloat(dados.incrementoMinimoVenda) || 0,
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
      if (!err.message?.includes('Já existe')) {
        console.error('Erro ao adicionar produto:', err);
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function atualizarProduto(id, dados, ignorarSimilaridade = false) {
    try {
      setLoading(true);
      const nomeLimpo = dados.nome?.trim() || '';
      if (!nomeLimpo) {
        throw new Error('O nome do produto é obrigatório.');
      }

      // Função de normalização rigorosa
      const normalizar = (str) => {
        return (str || '')
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
      };

      const nomeNorm = normalizar(nomeLimpo);

      // 1. DUPLICADO EXATO (BLOQUEAR):
      // Verificar local
      const duplicadoLocal = produtos.find(p => p.id !== id && p.ativo !== false && normalizar(p.nome) === nomeNorm);
      if (duplicadoLocal) {
        throw new Error(`Já existe outro produto cadastrado com o nome semelhante/idêntico: "${duplicadoLocal.nome}".`);
      }

      // Verificar banco
      const q = query(col('produtos'), where('nome', '==', nomeLimpo));
      const querySnapshot = await getDocs(q);
      const existeBanco = querySnapshot.docs.some(doc => doc.id !== id && doc.data().ativo !== false);
      if (existeBanco) {
        throw new Error(`Já existe outro produto cadastrado com o nome "${nomeLimpo}".`);
      }

      // 2. SIMILARIDADE (AVISO):
      if (!ignorarSimilaridade) {
        const similarProd = produtos.find(p => {
          if (p.id === id || p.ativo === false) return false;
          const pNorm = normalizar(p.nome);
          const dist = getLevenshteinDistance(nomeNorm, pNorm);
          const maxLen = Math.max(nomeNorm.length, pNorm.length);
          if (maxLen === 0) return false;
          const similarity = 1 - dist / maxLen;
          return similarity >= 0.85; // 85% de similaridade
        });

        if (similarProd) {
          return { similar: true, produtoSimilar: similarProd };
        }
      }

      const dadosNormalizados = {
        ...dados,
        nome: dados.nome?.trim() || '',
        codigo: dados.codigo?.trim() || '',
        descricao: dados.descricao?.trim() || '',
        // ✅ parseFloat preserva casas decimais
        quantidade: parseFloat(dados.quantidade) || 0,
        estoqueMinimo: parseFloat(dados.estoqueMinimo) || 0,
        precoCompra: parseFloat(dados.precoCompra) || 0,
        precoVenda: parseFloat(dados.precoVenda) || 0,
        // Campos de fracionamento (retrocompatíveis)
        vendaFracionada: dados.vendaFracionada || false,
        permiteFragmentacao: dados.permiteFragmentacao ?? dados.vendaFracionada ?? false,
        fatorConversao: Number(dados.fatorConversao) || 1,
        unidadeVenda: dados.unidadeVenda || dados.unidade || 'un',
        precoVendaUnitario: parseFloat(dados.precoVendaUnitario) || 0,
        incrementoMinimoVenda: parseFloat(dados.incrementoMinimoVenda) || 0,
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(colDoc('produtos', id), dadosNormalizados);
      invalidarCache();
      const produtoAtualizado = { id, ...dadosNormalizados };
      setProdutos(prev => prev.map(p => p.id === id ? produtoAtualizado : p));
      return produtoAtualizado;
    } catch (err) {
      if (!err.message?.includes('Já existe')) {
        console.error('Erro ao atualizar produto:', err);
      }
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
      // ✅ parseFloat preserva casas decimais
      const qtd = parseFloat(novaQuantidade);
      if (isNaN(qtd) || qtd < 0) {
        throw new Error('Quantidade inválida: deve ser um número maior ou igual a zero.');
      }

      // Captura saldo atual para o log de auditoria
      const produtoAtual = produtos.find(p => p.id === produtoId);
      const saldoAntes = produtoAtual?.quantidade ?? 0;

      await updateDoc(colDoc('produtos', produtoId), {
        quantidade: qtd,
        atualizadoEm: serverTimestamp()
      });

      // ✅ Collection correta: movimentacoesEstoque (era 'movimentosEstoque')
      await addDoc(col('movimentacoesEstoque'), {
        produtoId,
        tipo: 'ajuste',
        quantidade: qtd,
        saldoAntes,
        saldoDepois: qtd,
        motivo: motivo || 'Ajuste manual',
        criadoEm: serverTimestamp()
      });

      invalidarCache();
      setProdutos(prev => prev.map(p => p.id === produtoId ? { ...p, quantidade: qtd } : p));
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