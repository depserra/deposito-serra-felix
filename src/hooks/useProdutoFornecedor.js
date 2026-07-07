/**
 * useProdutoFornecedor.js
 *
 * Hook para gerenciar a coleção 'produto_fornecedor_conversao'.
 * Esta coleção guarda a tabela De/Para entre o código do produto no fornecedor
 * (cProd do XML) e o produto interno, incluindo o fator de conversão de unidades.
 *
 * Estrutura de um documento:
 * {
 *   produtoId         : string   → ID do documento em 'produtos'
 *   cnpjFornecedor    : string   → CNPJ extraído do XML (14 dígitos, sem formatação)
 *   codigoFornecedor  : string   → valor de <cProd> no XML
 *   gtin              : string   → EAN/GTIN quando disponível (opcional)
 *   unidadeCompra     : string   → ex: 'SC', 'CX', 'FD', 'UN'
 *   fatorConversao    : number   → qtas unidades base = 1 unidade de compra
 *   unidadeBase       : string   → deve coincidir com produtos.unidade
 *   nomeProdutoFornecedor : string → xProd do XML (para referência)
 *   criadoEm         : timestamp
 *   atualizadoEm     : timestamp
 * }
 */

import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

export function useProdutoFornecedor() {
  const [conversoes, setConversoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  /**
   * Busca a conversão cadastrada para um par [cnpjFornecedor, codigoFornecedor].
   * Retorna o primeiro documento encontrado ou null.
   *
   * @param {string} cnpjFornecedor  - CNPJ sem formatação (só dígitos)
   * @param {string} codigoFornecedor - cProd do XML
   * @returns {Promise<object|null>}
   */
  const buscarConversao = useCallback(async (cnpjFornecedor, codigoFornecedor) => {
    if (!cnpjFornecedor || !codigoFornecedor) return null;
    try {
      const q = query(
        col('produto_fornecedor_conversao'),
        where('cnpjFornecedor', '==', cnpjFornecedor),
        where('codigoFornecedor', '==', codigoFornecedor)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const first = snap.docs[0];
      return { id: first.id, ...first.data() };
    } catch (err) {
      console.error('Erro em buscarConversao:', err);
      return null;
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Busca por GTIN/EAN — útil quando o fornecedor muda o cProd mas mantém o código de barras.
   *
   * @param {string} gtin
   * @returns {Promise<object|null>}
   */
  const buscarConversaoPorGtin = useCallback(async (gtin) => {
    if (!gtin) return null;
    try {
      const q = query(
        col('produto_fornecedor_conversao'),
        where('gtin', '==', gtin)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const first = snap.docs[0];
      return { id: first.id, ...first.data() };
    } catch (err) {
      console.error('Erro em buscarConversaoPorGtin:', err);
      return null;
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Lista todas as conversões de um produto interno (para exibir na tela do produto).
   *
   * @param {string} produtoId
   * @returns {Promise<object[]>}
   */
  const listarConversoesPorProduto = useCallback(async (produtoId) => {
    if (!produtoId) return [];
    try {
      setLoading(true);
      const q = query(
        col('produto_fornecedor_conversao'),
        where('produtoId', '==', produtoId),
        orderBy('criadoEm', 'desc')
      );
      const snap = await getDocs(q);
      const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversoes(dados);
      return dados;
    } catch (err) {
      console.error('Erro em listarConversoesPorProduto:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Cria ou atualiza uma conversão.
   * Se já existir um documento com o mesmo [cnpjFornecedor + codigoFornecedor], atualiza.
   * Caso contrário, cria um novo documento.
   *
   * @param {object} dados - campos do documento
   * @returns {Promise<object>} documento salvo (com id)
   */
  const salvarConversao = useCallback(async (dados) => {
    try {
      setLoading(true);

      // Verificar se já existe para não duplicar
      const existente = await buscarConversao(dados.cnpjFornecedor, dados.codigoFornecedor);

      const payload = {
        produtoId:          dados.produtoId          || '',
        cnpjFornecedor:     dados.cnpjFornecedor     || '',
        codigoFornecedor:   dados.codigoFornecedor   || '',
        gtin:               dados.gtin               || '',
        unidadeCompra:      dados.unidadeCompra      || 'UN',
        fatorConversao:     Number(dados.fatorConversao)  || 1,
        unidadeBase:        dados.unidadeBase        || 'un',
        nomeProdutoFornecedor: dados.nomeProdutoFornecedor || '',
        atualizadoEm:       serverTimestamp(),
      };

      if (existente) {
        // Atualizar
        await updateDoc(colDoc('produto_fornecedor_conversao', existente.id), payload);
        const atualizado = { ...existente, ...payload };
        setConversoes(prev => prev.map(c => c.id === existente.id ? atualizado : c));
        return atualizado;
      } else {
        // Criar
        payload.criadoEm = serverTimestamp();
        const docRef = await addDoc(col('produto_fornecedor_conversao'), payload);
        const novo = { id: docRef.id, ...payload };
        setConversoes(prev => [novo, ...prev]);
        return novo;
      }
    } catch (err) {
      console.error('Erro em salvarConversao:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buscarConversao, db]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Remove uma conversão pelo ID do documento.
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  const deletarConversao = useCallback(async (id) => {
    try {
      setLoading(true);
      await deleteDoc(colDoc('produto_fornecedor_conversao', id));
      setConversoes(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Erro em deletarConversao:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversoes,
    loading,
    error,
    buscarConversao,
    buscarConversaoPorGtin,
    listarConversoesPorProduto,
    salvarConversao,
    deletarConversao,
  };
}
