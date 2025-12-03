import { useState } from 'react';
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebase';export function useVendas() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gera um código único de 5 dígitos para a venda
  const gerarCodigoVenda = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Lista vendas com filtros
  const listarVendas = async (searchTerm = '', statusFiltro = null) => {
    try {
      setLoading(true);
      setError(null);
      const vendasRef = collection(db, 'vendas');
      
      // Buscar todas as vendas
      const queryRef = query(vendasRef, orderBy('dataVenda', 'desc'));
      const snapshot = await getDocs(queryRef);
      
      let vendasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataVenda: doc.data().dataVenda?.toDate()
      }));

      // Aplicar filtros localmente
      if (searchTerm) {
        const termLower = searchTerm.toLowerCase();
        vendasData = vendasData.filter(venda => 
          venda.codigoVenda.includes(termLower) ||
          venda.clienteNome?.toLowerCase().includes(termLower) ||
          venda.itens.some(item => 
            item.produto.toLowerCase().includes(termLower)
          )
        );
      }

      if (statusFiltro) {
        vendasData = vendasData.filter(venda => 
          venda.status === statusFiltro
        );
      }

      setVendas(vendasData);
      return vendasData;
    } catch (err) {
      console.error('Erro ao listar vendas:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Adiciona nova venda com baixa automática no estoque
  const adicionarVenda = async (dados) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const codigoVenda = gerarCodigoVenda();

      // 1. Criar a venda
      const vendaRef = doc(collection(db, 'vendas'));
      const vendaData = {
        ...dados,
        codigoVenda,
        dataVenda: new Date(dados.dataVenda),
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };
      batch.set(vendaRef, vendaData);

      // 2. Dar baixa no estoque para cada item da venda
      if (dados.itens && dados.itens.length > 0) {
        for (const item of dados.itens) {
          if (item.produto) {
            const produtoRef = doc(db, 'produtos', item.produto);
            const produtoSnap = await getDoc(produtoRef);
            
            if (produtoSnap.exists()) {
              const produtoAtual = produtoSnap.data();
              const quantidadeVendida = parseFloat(item.quantidade) || 0;
              const novaQuantidade = (produtoAtual.quantidade || 0) - quantidadeVendida;
              
              // Atualiza quantidade do produto
              batch.update(produtoRef, {
                quantidade: Math.max(0, novaQuantidade),
                updatedAt: new Date().toISOString()
              });

              // Registra movimentação de estoque
              const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
              batch.set(movimentacaoRef, {
                produtoId: item.produto,
                tipo: 'saida',
                quantidade: quantidadeVendida,
                quantidadeAnterior: produtoAtual.quantidade || 0,
                quantidadeNova: Math.max(0, novaQuantidade),
                motivo: `Venda #${codigoVenda}`,
                vendaId: vendaRef.id,
                data: new Date().toISOString(),
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }

      // 3. Executar todas as operações
      await batch.commit();

      return { id: vendaRef.id, ...vendaData };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };  // Atualiza uma venda
  const atualizarVenda = async (id, dados) => {
    try {
      setLoading(true);
      const vendaData = {
        ...dados,
        dataVenda: new Date(dados.dataVenda),
        atualizadoEm: new Date()
      };

      await updateDoc(doc(db, 'vendas', id), vendaData);
      return { id, ...vendaData };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Deleta uma venda e devolve produtos ao estoque
  const deletarVenda = async (id) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      // 1. Buscar a venda para reverter o estoque
      const vendaRef = doc(db, 'vendas', id);
      const vendaSnap = await getDoc(vendaRef);
      
      if (vendaSnap.exists()) {
        const vendaData = vendaSnap.data();
        
        // 2. Reverter estoque de cada item
        if (vendaData.itens && vendaData.itens.length > 0) {
          for (const item of vendaData.itens) {
            if (item.produto) {
              const produtoRef = doc(db, 'produtos', item.produto);
              const produtoSnap = await getDoc(produtoRef);
              
              if (produtoSnap.exists()) {
                const produtoAtual = produtoSnap.data();
                const quantidadeDevolvida = parseFloat(item.quantidade) || 0;
                const novaQuantidade = (produtoAtual.quantidade || 0) + quantidadeDevolvida;
                
                // Atualiza quantidade do produto (devolvendo ao estoque)
                batch.update(produtoRef, {
                  quantidade: novaQuantidade,
                  updatedAt: new Date().toISOString()
                });

                // Registra movimentação de estoque
                const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
                batch.set(movimentacaoRef, {
                  produtoId: item.produto,
                  tipo: 'entrada',
                  quantidade: quantidadeDevolvida,
                  quantidadeAnterior: produtoAtual.quantidade || 0,
                  quantidadeNova: novaQuantidade,
                  motivo: `Cancelamento de Venda #${vendaData.codigoVenda || id}`,
                  vendaId: id,
                  data: new Date().toISOString(),
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
        
        // 3. Remover a venda
        batch.delete(vendaRef);
        
        // 4. Executar todas as operações
        await batch.commit();
      }
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vendas,
    loading,
    error,
    listarVendas,
    adicionarVenda,
    atualizarVenda,
    deletarVenda,
    gerarCodigoVenda
  };
}