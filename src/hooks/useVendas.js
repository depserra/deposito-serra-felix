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
  getDoc,
  writeBatch,
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

export function useVendas() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: null });

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  // Gera um código único de 5 dígitos para a venda
  const gerarCodigoVenda = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Invalidar cache (chamar após adicionar/editar/deletar)
  const invalidarCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: null };
  }, []);

  // Lista vendas com filtros
  const listarVendas = useCallback(async (searchTerm = '', statusFiltro = null) => {
    try {
      // Verificar cache (2 minutos)
      const cache = cacheRef.current;
      if (cache.data && cache.timestamp && Date.now() - cache.timestamp < 120000) {
        let vendasData = cache.data;
        if (searchTerm) {
          const termLower = searchTerm.toLowerCase();
          vendasData = vendasData.filter(venda => 
            venda.codigoVenda?.includes(termLower) ||
            venda.clienteNome?.toLowerCase().includes(termLower) ||
            venda.itens?.some(item => item.produto?.toLowerCase().includes(termLower))
          );
        }
        if (statusFiltro) {
          vendasData = vendasData.filter(venda => venda.status === statusFiltro);
        }
        setVendas(vendasData);
        return vendasData;
      }
      
      setLoading(true);
      setError(null);
      const queryRef = query(col('vendas'), orderBy('dataVenda', 'desc'));
      const snapshot = await getDocs(queryRef);
      
      let vendasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataVenda: doc.data().dataVenda?.toDate()
      }));

      if (searchTerm) {
        const termLower = searchTerm.toLowerCase();
        vendasData = vendasData.filter(venda => 
          venda.codigoVenda.includes(termLower) ||
          venda.clienteNome?.toLowerCase().includes(termLower) ||
          venda.itens.some(item => item.produto.toLowerCase().includes(termLower))
        );
      }
      if (statusFiltro) {
        vendasData = vendasData.filter(venda => venda.status === statusFiltro);
      }

      cacheRef.current = { data: vendasData, timestamp: Date.now() };
      setVendas(vendasData);
      return vendasData;
    } catch (err) {
      console.error('Erro ao listar vendas:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adiciona nova venda com baixa automática no estoque
  const adicionarVenda = async (dados) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const codigoVenda = gerarCodigoVenda();

      const vendaRef = doc(col('vendas'));
      const vendaData = {
        ...dados,
        codigoVenda,
        valorTotal: Math.round((dados.valorTotal || 0) * 100) / 100,
        dataVenda: stringParaDataLocal(dados.dataVenda),
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };
      batch.set(vendaRef, vendaData);

      if (dados.itens && dados.itens.length > 0) {
        for (const item of dados.itens) {
          if (item.produto) {
            const produtoRef = colDoc('produtos', item.produto);
            const quantidadeVendida = parseFloat(item.quantidade) || 0;
            batch.update(produtoRef, {
              quantidade: increment(-quantidadeVendida),
              updatedAt: new Date().toISOString()
            });
            const movimentacaoRef = doc(col('movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: item.produto,
              tipo: 'saida',
              quantidade: quantidadeVendida,
              motivo: `Venda #${codigoVenda}`,
              vendaId: vendaRef.id,
              data: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      if (dados.status === 'parcelado' && dados.parcelamento) {
        const { numeroParcelas, diaVencimento, valorParcela } = dados.parcelamento;
        if (numeroParcelas && diaVencimento && valorParcela) {
          const hoje = new Date();
          for (let i = 0; i < numeroParcelas; i++) {
            const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + i, diaVencimento);
            if (i === 0 && dataVencimento < hoje) {
              for (let j = 0; j < numeroParcelas; j++) {
                const dataVenc = new Date(hoje.getFullYear(), hoje.getMonth() + j + 1, diaVencimento);
                const contaRef = doc(col('contasReceber'));
                const isPrimeiraParcela = j === 0;
                batch.set(contaRef, {
                  vendaId: vendaRef.id, clienteId: dados.clienteId,
                  clienteNome: dados.clienteNome || '', codigoVenda,
                  descricao: `Parcela ${j + 1}/${numeroParcelas} - Venda #${codigoVenda}`,
                  valor: Math.round(valorParcela * 100) / 100, dataVencimento: dataVenc,
                  dataPagamento: isPrimeiraParcela ? new Date() : null,
                  status: isPrimeiraParcela ? 'pago' : 'pendente',
                  numeroParcela: j + 1, totalParcelas: numeroParcelas,
                  criadoEm: new Date(), atualizadoEm: new Date()
                });
              }
              break;
            }
            const contaRef = doc(col('contasReceber'));
            const isPrimeiraParcela = i === 0;
            batch.set(contaRef, {
              vendaId: vendaRef.id, clienteId: dados.clienteId,
              clienteNome: dados.clienteNome || '', codigoVenda,
              descricao: `Parcela ${i + 1}/${numeroParcelas} - Venda #${codigoVenda}`,
              valor: Math.round(valorParcela * 100) / 100, dataVencimento,
              dataPagamento: isPrimeiraParcela ? new Date() : null,
              status: isPrimeiraParcela ? 'pago' : 'pendente',
              numeroParcela: i + 1, totalParcelas: numeroParcelas,
              criadoEm: new Date(), atualizadoEm: new Date()
            });
          }
        }
      }

      await batch.commit();
      invalidarCache();
      return { id: vendaRef.id, ...vendaData };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const atualizarVenda = async (id, dados) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const vendaRef = colDoc('vendas', id);
      const vendaSnap = await getDoc(vendaRef);
      if (!vendaSnap.exists()) throw new Error('Venda não encontrada');
      
      const vendaOriginal = vendaSnap.data();
      const itensOriginais = vendaOriginal.itens || [];
      const itensNovos = dados.itens || [];
      const mapaOriginais = {};
      itensOriginais.forEach(item => {
        const produtoId = item.produto || item.produtoId || item.id;
        if (produtoId) mapaOriginais[produtoId] = parseFloat(item.quantidade) || 0;
      });

      for (const itemNovo of itensNovos) {
        const produtoId = itemNovo.produto || itemNovo.produtoId || itemNovo.id;
        if (!produtoId) continue;
        const quantidadeNova = parseFloat(itemNovo.quantidade) || 0;
        const quantidadeOriginal = mapaOriginais[produtoId] || 0;
        const diferenca = quantidadeOriginal - quantidadeNova;
        if (diferenca !== 0) {
          const produtoRef = colDoc('produtos', produtoId);
          try {
            const produtoSnap = await getDoc(produtoRef);
            if (produtoSnap.exists()) {
              batch.update(produtoRef, { quantidade: increment(diferenca), updatedAt: new Date().toISOString() });
              const movRef = doc(col('movimentacoesEstoque'));
              batch.set(movRef, {
                produtoId, tipo: diferenca > 0 ? 'entrada' : 'saida',
                quantidade: Math.abs(diferenca),
                motivo: `Edição de Venda #${vendaOriginal.codigoVenda || id}`,
                vendaId: id, data: new Date().toISOString(), createdAt: new Date().toISOString()
              });
            }
          } catch (e) { console.warn(`Erro produto ${produtoId}:`, e); }
        }
        delete mapaOriginais[produtoId];
      }

      for (const [produtoId, qtd] of Object.entries(mapaOriginais)) {
        const produtoRef = colDoc('produtos', produtoId);
        try {
          const produtoSnap = await getDoc(produtoRef);
          if (produtoSnap.exists()) {
            batch.update(produtoRef, { quantidade: increment(qtd), updatedAt: new Date().toISOString() });
            const movRef = doc(col('movimentacoesEstoque'));
            batch.set(movRef, {
              produtoId, tipo: 'entrada', quantidade: qtd,
              motivo: `Item removido da Venda #${vendaOriginal.codigoVenda || id}`,
              vendaId: id, data: new Date().toISOString(), createdAt: new Date().toISOString()
            });
          }
        } catch (e) { console.warn(`Erro produto ${produtoId}:`, e); }
      }

      const vendaData = { valorTotal: Math.round((dados.valorTotal || 0) * 100) / 100, atualizadoEm: new Date() };
      if (dados.status) vendaData.status = dados.status;
      if (dados.clienteId) vendaData.clienteId = dados.clienteId;
      if (dados.clienteNome) vendaData.clienteNome = dados.clienteNome;
      if (dados.observacoes !== undefined) vendaData.observacoes = dados.observacoes;
      if (dados.itens) vendaData.itens = dados.itens;
      if (dados.dataVenda) {
        if (typeof dados.dataVenda === 'string') vendaData.dataVenda = stringParaDataLocal(dados.dataVenda);
        else if (dados.dataVenda instanceof Date) vendaData.dataVenda = dados.dataVenda;
      }
      batch.update(vendaRef, vendaData);
      await batch.commit();
      invalidarCache();
      return { id, ...vendaData };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletarVenda = async (id) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const vendaRef = colDoc('vendas', id);
      const vendaSnap = await getDoc(vendaRef);
      if (vendaSnap.exists()) {
        const vendaData = vendaSnap.data();
        if (vendaData.itens && vendaData.itens.length > 0) {
          for (const item of vendaData.itens) {
            if (item.produto) {
              const produtoRef = colDoc('produtos', item.produto);
              const qtd = parseFloat(item.quantidade) || 0;
              try {
                const produtoSnap = await getDoc(produtoRef);
                if (produtoSnap.exists()) {
                  batch.update(produtoRef, { quantidade: increment(qtd), updatedAt: new Date().toISOString() });
                  const movRef = doc(col('movimentacoesEstoque'));
                  batch.set(movRef, {
                    produtoId: item.produto, tipo: 'entrada', quantidade: qtd,
                    motivo: `Cancelamento de Venda #${vendaData.codigoVenda || id}`,
                    vendaId: id, data: new Date().toISOString(), createdAt: new Date().toISOString()
                  });
                }
              } catch (e) { console.warn(`Erro produto ${item.produto}:`, e); }
            }
          }
        }
        try {
          const parcelasSnap = await getDocs(query(col('contasReceber'), where('vendaId', '==', id)));
          parcelasSnap.forEach(p => batch.delete(colDoc('contasReceber', p.id)));
        } catch (e) { console.warn('Erro ao buscar parcelas:', e); }
        batch.delete(vendaRef);
        await batch.commit();
        invalidarCache();
      }
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { vendas, loading, error, listarVendas, adicionarVenda, atualizarVenda, deletarVenda, gerarCodigoVenda, invalidarCache };
}