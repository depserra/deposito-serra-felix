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
  getDocs
} from 'firebase/firestore';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';
import { checkFirebaseConnection } from '../utils/firebaseInit';

const retryOperation = async (operation, maxRetries = 3, delay = 1000, timeout = 10000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na operação')), timeout)
      );
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState(new Map());
  const [ultimaBusca, setUltimaBusca] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col = (name) => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  async function listarClientes(searchTerm = '') {
    const cacheKey = `clientes_${activeSystem?.id ?? 'deposito'}_${searchTerm || 'all'}`;
    if (cache.has(cacheKey)) {
      const dadosCache = cache.get(cacheKey);
      if (Date.now() - dadosCache.timestamp < 120000) {
        setClientes(dadosCache.data);
        setLoading(false);
        return dadosCache.data;
      }
    }

    if (!isOnline) {
      if (cache.has(cacheKey)) {
        setClientes(cache.get(cacheKey).data);
        setError('Modo offline - dados podem não estar atualizados');
        return cache.get(cacheKey).data;
      }
      setError('Sem conexão com a internet e nenhum dado em cache');
      return [];
    }

    if (cache.has(cacheKey)) setClientes(cache.get(cacheKey).data);

    try {
      setLoading(true);
      setError(null);
      setUltimaBusca(searchTerm);

      const connectionCheck = await checkFirebaseConnection();
      if (!connectionCheck.success) throw new Error(`Falha na conexão: ${connectionCheck.message}`);

      const snapshot = await retryOperation(
        async () => getDocs(query(col('clientes'), orderBy('nome'), limit(50))),
        2, 800, 6000
      );
      let clientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (searchTerm && searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim();
        clientesData = clientesData.filter(c =>
          c.nome?.toLowerCase().includes(s) || c.apelido?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) || c.telefone?.includes(searchTerm) ||
          c.cpf?.includes(searchTerm)
        );
      }

      setClientes(clientesData);
      cache.set(cacheKey, { data: clientesData, timestamp: Date.now() });
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

  async function adicionarCliente(dados) {
    try {
      setSavingLoading(true);
      setError(null);
      const clienteData = {
        nome: dados.nome?.trim() || '', apelido: dados.apelido?.trim() || '',
        email: dados.email?.trim() || '', telefone: dados.telefone?.trim() || '',
        cpf: dados.cpf?.trim() || '', endereco: dados.endereco?.trim() || '',
        cidade: dados.cidade?.trim() || '', estado: dados.estado?.trim() || '',
        cep: dados.cep?.trim() || '', observacoes: dados.observacoes?.trim() || '',
        criadoEm: new Date(), atualizadoEm: new Date()
      };
      const novoClienteTemp = { id: 'temp_' + Date.now(), ...clienteData };
      setClientes(prev => [novoClienteTemp, ...prev]);
      const docRef = await retryOperation(async () => addDoc(col('clientes'), clienteData));
      const novoCliente = { id: docRef.id, ...clienteData };
      setClientes(prev => prev.map(c => c.id === novoClienteTemp.id ? novoCliente : c));
      return novoCliente;
    } catch (err) {
      setClientes(prev => prev.filter(c => !c.id.toString().startsWith('temp_')));
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  async function atualizarCliente(id, dados) {
    try {
      setSavingLoading(true);
      setError(null);
      const dadosNormalizados = {
        nome: dados.nome?.trim() || '', apelido: dados.apelido?.trim() || '',
        email: dados.email?.trim() || '', telefone: dados.telefone?.trim() || '',
        cpf: dados.cpf?.trim() || '', endereco: dados.endereco?.trim() || '',
        cidade: dados.cidade?.trim() || '', estado: dados.estado?.trim() || '',
        cep: dados.cep?.trim() || '', observacoes: dados.observacoes?.trim() || '',
        atualizadoEm: new Date()
      };
      setClientes(prev => prev.map(c => c.id === id ? { ...c, ...dadosNormalizados } : c));
      await updateDoc(colDoc('clientes', id), dadosNormalizados);
      return { id, ...dadosNormalizados };
    } catch (err) {
      await listarClientes(ultimaBusca);
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  async function deletarCliente(id) {
    try {
      setSavingLoading(true);
      setError(null);
      const clienteRemovido = clientes.find(c => c.id === id);
      setClientes(prev => prev.filter(c => c.id !== id));
      await deleteDoc(colDoc('clientes', id));
      return true;
    } catch (err) {
      if (clienteRemovido) setClientes(prev => [...prev, clienteRemovido]);
      setError(err.message);
      throw err;
    } finally {
      setSavingLoading(false);
    }
  }

  async function buscarHistoricoCompras(clienteId) {
    try {
      setLoading(true);
      const snapshot = await retryOperation(
        async () => getDocs(query(col('vendas'), where('clienteId', '==', clienteId))),
        2, 500
      );
      let vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      vendas = vendas.sort((a, b) => {
        for (let campo of ['criadoEm', 'datavenda', 'data', 'timestamp']) {
          if (a[campo] && b[campo]) {
            try {
              const dA = a[campo].toDate ? a[campo].toDate() : new Date(a[campo]);
              const dB = b[campo].toDate ? b[campo].toDate() : new Date(b[campo]);
              return dB - dA;
            } catch { continue; }
          }
        }
        return 0;
      }).slice(0, 10);
      return vendas;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function invalidarCache() { setCache(new Map()); }

  return {
    clientes, loading, savingLoading, error, isOnline,
    listarClientes,
    adicionarCliente: async (dados) => { const r = await adicionarCliente(dados); invalidarCache(); return r; },
    atualizarCliente: async (id, dados) => { const r = await atualizarCliente(id, dados); invalidarCache(); return r; },
    deletarCliente: async (id) => { const r = await deletarCliente(id); invalidarCache(); return r; },
    obterHistoricoCliente: buscarHistoricoCompras,
    cache, invalidarCache
  };
}