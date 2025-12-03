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
  limit, 
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { checkFirebaseConnection, logFirebaseStatus } from '../utils/firebaseInit';

// Função de retry para operações que podem falhar
const retryOperation = async (operation, maxRetries = 3, delay = 1000, timeout = 10000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Adicionar timeout à operação
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na operação')), timeout)
      );
      
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [cache, setCache] = useState(new Map());
  const [ultimaBusca, setUltimaBusca] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Função para listar clientes com cache e otimização
  async function listarClientes(searchTerm = '') {
    const cacheKey = `clientes_${searchTerm || 'all'}`;

    // Verificar cache primeiro (cache mais agressivo para melhor UX)
    if (cache.has(cacheKey)) {
      const dadosCache = cache.get(cacheKey);
      if (Date.now() - dadosCache.timestamp < 120000) { // Cache de 2 minutos
        setClientes(dadosCache.data);
        setLoading(false);
        return dadosCache.data;
      }
    }    // Se offline, usar apenas cache
    if (!isOnline) {
      if (cache.has(cacheKey)) {
        const dadosCache = cache.get(cacheKey);
        setClientes(dadosCache.data);
        setError('Modo offline - dados podem não estar atualizados');
        return dadosCache.data;
      } else {
        setError('Sem conexão com a internet e nenhum dado em cache');
        return [];
      }
    }

    // Mostrar dados do cache enquanto carrega novos (loading otimista)
    if (cache.has(cacheKey)) {
      setClientes(cache.get(cacheKey).data);
    }

    try {
      setLoading(true);
      setError(null);
      setUltimaBusca(searchTerm);
      
      // Verificar conexão antes de tentar operação
      const connectionCheck = await checkFirebaseConnection();
      if (!connectionCheck.success) {
        throw new Error(`Falha na conexão: ${connectionCheck.message}`);
      }

      const operation = async () => {
        const clientesRef = collection(db, 'clientes');
        let queryRef = query(clientesRef, orderBy('nome'), limit(50));
        return await getDocs(queryRef);
      };

      const snapshot = await retryOperation(operation, 2, 800, 6000);
      let clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Se houver termo de busca, filtra os resultados
      if (searchTerm && searchTerm.trim()) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        clientesData = clientesData.filter(cliente => {
          const nomeMatch = cliente.nome?.toLowerCase().includes(searchTermLower);
          const apelidoMatch = cliente.apelido?.toLowerCase().includes(searchTermLower);
          const emailMatch = cliente.email?.toLowerCase().includes(searchTermLower);
          const telefoneMatch = cliente.telefone?.includes(searchTerm);
          const cpfMatch = cliente.cpf?.includes(searchTerm);
          return nomeMatch || apelidoMatch || emailMatch || telefoneMatch || cpfMatch;
        });
      }

      // Atualiza imediatamente sem nova ordenação (já vem do Firebase ordenado)
      setClientes(clientesData);

      // Salvar no cache
      cache.set(cacheKey, {
        data: clientesData,
        timestamp: Date.now()
      });
      setCache(new Map(cache));

      return clientesData;
    } catch (err) {
      console.error('Erro em listarClientes:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para adicionar novo cliente
  async function adicionarCliente(dados) {
    try {
      setSavingLoading(true);
      setError(null);
      
      // Preparar os dados normalizados (operação mais rápida)
      const clienteData = {
        nome: dados.nome?.trim() || '',
        apelido: dados.apelido?.trim() || '',
        email: dados.email?.trim() || '',
        telefone: dados.telefone?.trim() || '',
        cpf: dados.cpf?.trim() || '',
        endereco: dados.endereco?.trim() || '',
        cidade: dados.cidade?.trim() || '',
        estado: dados.estado?.trim() || '',
        cep: dados.cep?.trim() || '',
        observacoes: dados.observacoes?.trim() || '',
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };

      // Otimização: Adicionar ao estado local imediatamente (UX otimista)
      const novoClienteTemp = { id: 'temp_' + Date.now(), ...clienteData };
      setClientes(prev => [novoClienteTemp, ...prev]);

      const operation = async () => {
        return await addDoc(collection(db, 'clientes'), clienteData);
      };
      
      const docRef = await retryOperation(operation);
      const novoCliente = { id: docRef.id, ...clienteData };
      
      // Substituir o item temporário pelo real
      setClientes(prev => prev.map(c => c.id === novoClienteTemp.id ? novoCliente : c));
      
      return novoCliente;
    } catch (err) {
      // Remover o item temporário em caso de erro
      setClientes(prev => prev.filter(c => !c.id.toString().startsWith('temp_')));
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  // Função para atualizar cliente
  async function atualizarCliente(id, dados) {
    try {
      setSavingLoading(true);
      setError(null);
      
      // Preparar os dados normalizados
      const dadosNormalizados = {
        nome: dados.nome?.trim() || '',
        apelido: dados.apelido?.trim() || '',
        email: dados.email?.trim() || '',
        telefone: dados.telefone?.trim() || '',
        cpf: dados.cpf?.trim() || '',
        endereco: dados.endereco?.trim() || '',
        cidade: dados.cidade?.trim() || '',
        estado: dados.estado?.trim() || '',
        cep: dados.cep?.trim() || '',
        observacoes: dados.observacoes?.trim() || '',
        atualizadoEm: new Date()
      };

      // Update otimista no estado local
      setClientes(prev => prev.map(c => 
        c.id === id ? { ...c, ...dadosNormalizados } : c
      ));

      await updateDoc(doc(db, 'clientes', id), dadosNormalizados);
      return { id, ...dadosNormalizados };
    } catch (err) {
      // Reverter em caso de erro
      await listarClientes(ultimaBusca);
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  // Função para deletar cliente
  async function deletarCliente(id) {
    try {
      setSavingLoading(true);
      setError(null);

      // Update otimista: remover da lista imediatamente
      const clienteRemovido = clientes.find(c => c.id === id);
      setClientes(prev => prev.filter(c => c.id !== id));

      // Deletar no Firebase
      await deleteDoc(doc(db, 'clientes', id));
      
      return true;
    } catch (err) {
      // Em caso de erro, restaurar o cliente na lista
      if (clienteRemovido) {
        setClientes(prev => [...prev, clienteRemovido]);
      }
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  // Função para buscar histórico de compras do cliente
  async function buscarHistoricoCompras(clienteId) {
    try {
      setLoading(true);
      
      const operation = async () => {
        // Fazemos a query sem orderBy para evitar a necessidade de índice composto
        const vendasQuery = query(
          collection(db, 'vendas'),
          where('clienteId', '==', clienteId)
        );
        return await getDocs(vendasQuery);
      };

      const snapshot = await retryOperation(operation, 2, 500); // Menos tentativas para histórico
      
      let vendas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenamos manualmente no JavaScript e limitamos a 10 registros
      vendas = vendas
        .sort((a, b) => {
          // Tenta diferentes campos de data para ordenação
          const camposData = ['criadoEm', 'datavenda', 'data', 'timestamp'];
          
          for (let campo of camposData) {
            if (a[campo] && b[campo]) {
              try {
                const dataA = a[campo].toDate ? a[campo].toDate() : new Date(a[campo]);
                const dataB = b[campo].toDate ? b[campo].toDate() : new Date(b[campo]);
                return dataB - dataA; // Ordem decrescente (mais recente primeiro)
              } catch (dateErr) {
                continue;
              }
            }
          }
          return 0;
        })
        .slice(0, 10);

      return vendas;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Função para limpar cache quando houver mudanças
  function invalidarCache() {
    setCache(new Map());
  }

  return {
    clientes,
    loading,
    savingLoading,
    error,
    isOnline,
    listarClientes,
    adicionarCliente: async (dados) => {
      const result = await adicionarCliente(dados);
      invalidarCache();
      return result;
    },
    atualizarCliente: async (id, dados) => {
      const result = await atualizarCliente(id, dados);
      invalidarCache();
      return result;
    },
    deletarCliente: async (id) => {
      const result = await deletarCliente(id);
      invalidarCache();
      return result;
    },
    obterHistoricoCliente: buscarHistoricoCompras,
    cache,
    invalidarCache
  };
}