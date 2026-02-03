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
import { db } from '../services/firebase';

// Função auxiliar para converter string de data para Date no timezone local
const stringParaDataLocal = (dataString) => {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export function useVendas() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: null });

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
        
        // Aplicar filtros localmente
        if (searchTerm) {
          const termLower = searchTerm.toLowerCase();
          vendasData = vendasData.filter(venda => 
            venda.codigoVenda?.includes(termLower) ||
            venda.clienteNome?.toLowerCase().includes(termLower) ||
            venda.itens?.some(item => 
              item.produto?.toLowerCase().includes(termLower)
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
      }
      
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

      // Atualizar cache
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
  }, []);

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
        valorTotal: Math.round((dados.valorTotal || 0) * 100) / 100,
        dataVenda: stringParaDataLocal(dados.dataVenda),
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };
      batch.set(vendaRef, vendaData);

      // 2. Dar baixa no estoque para cada item da venda (SEM FAZER LEITURAS!)
      if (dados.itens && dados.itens.length > 0) {
        for (const item of dados.itens) {
          if (item.produto) {
            const produtoRef = doc(db, 'produtos', item.produto);
            const quantidadeVendida = parseFloat(item.quantidade) || 0;
            
            // Atualiza quantidade do produto usando increment (sem precisar ler!)
            batch.update(produtoRef, {
              quantidade: increment(-quantidadeVendida),
              updatedAt: new Date().toISOString()
            });

            // Registra movimentação de estoque (simplificada)
            const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
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

      // 3. Se o status for parcelado, criar registros no financeiro
      if (dados.status === 'parcelado' && dados.parcelamento) {
        const { numeroParcelas, diaVencimento, valorParcela } = dados.parcelamento;
        
        if (numeroParcelas && diaVencimento && valorParcela) {
          const hoje = new Date();
          
          for (let i = 0; i < numeroParcelas; i++) {
            // Calcular data de vencimento da parcela - sempre adiciona i meses a partir de hoje
            const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + i, diaVencimento);
            
            // Se a primeira parcela já passou, ajustar todas para começar do próximo mês
            if (i === 0 && dataVencimento < hoje) {
              // Ajustar o mês inicial
              for (let j = 0; j < numeroParcelas; j++) {
                const dataVenc = new Date(hoje.getFullYear(), hoje.getMonth() + j + 1, diaVencimento);
                const contaRef = doc(collection(db, 'contasReceber'));
                const isPrimeiraParcela = j === 0;
                
                batch.set(contaRef, {
                  vendaId: vendaRef.id,
                  clienteId: dados.clienteId,
                  clienteNome: dados.clienteNome || '',
                  codigoVenda: codigoVenda,
                  descricao: `Parcela ${j + 1}/${numeroParcelas} - Venda #${codigoVenda}`,
                  valor: Math.round(valorParcela * 100) / 100,
                  dataVencimento: dataVenc,
                  dataPagamento: isPrimeiraParcela ? new Date() : null,
                  status: isPrimeiraParcela ? 'pago' : 'pendente',
                  numeroParcela: j + 1,
                  totalParcelas: numeroParcelas,
                  criadoEm: new Date(),
                  atualizadoEm: new Date()
                });
              }
              // Sair do loop externo
              break;
            }
            
            // Caso contrário, criar normalmente
            const contaRef = doc(collection(db, 'contasReceber'));
            const isPrimeiraParcela = i === 0;
            
            batch.set(contaRef, {
              vendaId: vendaRef.id,
              clienteId: dados.clienteId,
              clienteNome: dados.clienteNome || '',
              codigoVenda: codigoVenda,
              descricao: `Parcela ${i + 1}/${numeroParcelas} - Venda #${codigoVenda}`,
              valor: Math.round(valorParcela * 100) / 100,
              dataVencimento: dataVencimento,
              dataPagamento: isPrimeiraParcela ? new Date() : null,
              status: isPrimeiraParcela ? 'pago' : 'pendente',
              numeroParcela: i + 1,
              totalParcelas: numeroParcelas,
              criadoEm: new Date(),
              atualizadoEm: new Date()
            });
          }
        }
      }

      // 4. Executar todas as operações
      await batch.commit();

      // Invalidar cache
      invalidarCache();

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
      const batch = writeBatch(db);
      
      // 1. Buscar a venda original para comparar quantidades
      const vendaRef = doc(db, 'vendas', id);
      const vendaSnap = await getDoc(vendaRef);
      
      if (!vendaSnap.exists()) {
        throw new Error('Venda não encontrada');
      }
      
      const vendaOriginal = vendaSnap.data();
      const itensOriginais = vendaOriginal.itens || [];
      const itensNovos = dados.itens || [];
      
      // 2. Processar cada item para ajustar o estoque
      // Criar mapa dos itens originais para facilitar comparação
      const mapaOriginais = {};
      itensOriginais.forEach(item => {
        const produtoId = item.produto || item.produtoId || item.id;
        if (produtoId) {
          mapaOriginais[produtoId] = parseFloat(item.quantidade) || 0;
        }
      });
      
      // Processar itens novos
      for (const itemNovo of itensNovos) {
        const produtoId = itemNovo.produto || itemNovo.produtoId || itemNovo.id;
        if (!produtoId) continue;
        
        const quantidadeNova = parseFloat(itemNovo.quantidade) || 0;
        const quantidadeOriginal = mapaOriginais[produtoId] || 0;
        const diferencaQuantidade = quantidadeOriginal - quantidadeNova; // positivo = devolver, negativo = retirar
        
        if (diferencaQuantidade !== 0) {
          const produtoRef = doc(db, 'produtos', produtoId);
          
          try {
            // Verificar se o produto ainda existe
            const produtoSnap = await getDoc(produtoRef);
            if (produtoSnap.exists()) {
              // Atualizar estoque do produto usando increment (sem ler novamente!)
              batch.update(produtoRef, {
                quantidade: increment(diferencaQuantidade),
                updatedAt: new Date().toISOString()
              });
              
              // Registrar movimentação (simplificada)
              const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
              batch.set(movimentacaoRef, {
                produtoId: produtoId,
                tipo: diferencaQuantidade > 0 ? 'entrada' : 'saida',
                quantidade: Math.abs(diferencaQuantidade),
                motivo: `Edição de Venda #${vendaOriginal.codigoVenda || id}`,
                vendaId: id,
                data: new Date().toISOString(),
                createdAt: new Date().toISOString()
              });
            } else {
              console.warn(`Produto ${produtoId} não existe mais, ignorando atualização de estoque`);
            }
          } catch (error) {
            console.warn(`Erro ao atualizar produto ${produtoId}:`, error);
            // Continuar mesmo se o produto não existir
          }
        }
        
        // Remover do mapa para identificar itens removidos depois
        delete mapaOriginais[produtoId];
      }
      
      // 3. Processar itens que foram removidos (restaram no mapa)
      for (const [produtoId, quantidadeOriginal] of Object.entries(mapaOriginais)) {
        const produtoRef = doc(db, 'produtos', produtoId);
        
        try {
          // Verificar se o produto ainda existe
          const produtoSnap = await getDoc(produtoRef);
          if (produtoSnap.exists()) {
            // Devolver ao estoque usando increment (sem ler novamente!)
            batch.update(produtoRef, {
              quantidade: increment(quantidadeOriginal),
              updatedAt: new Date().toISOString()
            });
            
            // Registrar movimentação (simplificada)
            const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
            batch.set(movimentacaoRef, {
              produtoId: produtoId,
              tipo: 'entrada',
              quantidade: quantidadeOriginal,
              motivo: `Item removido da Venda #${vendaOriginal.codigoVenda || id}`,
              vendaId: id,
              data: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          } else {
            console.warn(`Produto ${produtoId} não existe mais, ignorando devolução de estoque`);
          }
        } catch (error) {
          console.warn(`Erro ao devolver produto ${produtoId}:`, error);
          // Continuar mesmo se o produto não existir
        }
      }
      
      // 4. Atualizar a venda
      const vendaData = {
        valorTotal: Math.round((dados.valorTotal || 0) * 100) / 100,
        atualizadoEm: new Date()
      };
      
      // Processar campos opcionais
      if (dados.status) vendaData.status = dados.status;
      if (dados.clienteId) vendaData.clienteId = dados.clienteId;
      if (dados.clienteNome) vendaData.clienteNome = dados.clienteNome;
      if (dados.observacoes !== undefined) vendaData.observacoes = dados.observacoes;
      if (dados.itens) vendaData.itens = dados.itens;
      
      // Processar dataVenda apenas se for string
      if (dados.dataVenda) {
        if (typeof dados.dataVenda === 'string') {
          vendaData.dataVenda = stringParaDataLocal(dados.dataVenda);
        } else if (dados.dataVenda instanceof Date) {
          vendaData.dataVenda = dados.dataVenda;
        }
      }
      
      batch.update(vendaRef, vendaData);
      
      // 5. Executar todas as operações
      await batch.commit();
      
      // Invalidar cache
      invalidarCache();
      
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
        
        // 2. Reverter estoque de cada item (SEM FAZER LEITURAS!)
        if (vendaData.itens && vendaData.itens.length > 0) {
          for (const item of vendaData.itens) {
            if (item.produto) {
              const produtoRef = doc(db, 'produtos', item.produto);
              const quantidadeDevolvida = parseFloat(item.quantidade) || 0;
              
              try {
                // Verificar se o produto ainda existe
                const produtoSnap = await getDoc(produtoRef);
                if (produtoSnap.exists()) {
                  // Atualiza quantidade do produto (devolvendo ao estoque) usando increment
                  batch.update(produtoRef, {
                    quantidade: increment(quantidadeDevolvida),
                    updatedAt: new Date().toISOString()
                  });

                  // Registra movimentação de estoque (simplificada)
                  const movimentacaoRef = doc(collection(db, 'movimentacoesEstoque'));
                  batch.set(movimentacaoRef, {
                    produtoId: item.produto,
                    tipo: 'entrada',
                    quantidade: quantidadeDevolvida,
                    motivo: `Cancelamento de Venda #${vendaData.codigoVenda || id}`,
                    vendaId: id,
                    data: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                  });
                } else {
                  console.warn(`Produto ${item.produto} não existe mais, ignorando devolução de estoque`);
                }
              } catch (error) {
                console.warn(`Erro ao devolver produto ${item.produto}:`, error);
                // Continuar mesmo se o produto não existir
              }
            }
          }
        }
        
        // 3. Remover parcelas associadas à venda (independente do status)
        try {
          const parcelasQuery = query(
            collection(db, 'contasReceber'),
            where('vendaId', '==', id)
          );
          const parcelasSnap = await getDocs(parcelasQuery);
          
          parcelasSnap.forEach((parcelaDoc) => {
            batch.delete(doc(db, 'contasReceber', parcelaDoc.id));
          });
        } catch (error) {
          console.warn('Erro ao buscar parcelas para exclusão:', error);
        }
        
        // 4. Remover a venda
        batch.delete(vendaRef);
        
        // 5. Executar todas as operações
        await batch.commit();
        
        // Invalidar cache
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

  return {
    vendas,
    loading,
    error,
    listarVendas,
    adicionarVenda,
    atualizarVenda,
    deletarVenda,
    gerarCodigoVenda,
    invalidarCache
  };
}