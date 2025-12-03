import { useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Hook para paginação otimizada no Firestore
 * @param {string} collectionName - Nome da coleção
 * @param {number} pageSize - Tamanho da página (padrão: 50)
 * @param {string} orderByField - Campo para ordenar (padrão: 'createdAt')
 * @returns {Object} - Dados e funções de controle
 */
export function usePaginatedFirestore(collectionName, pageSize = 50, orderByField = 'createdAt') {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const lastDocRef = useRef(null);
  const cacheRef = useRef(new Map());

  // Carrega primeira página
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, 'desc'),
        limit(pageSize)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const item = { id: doc.id, ...doc.data() };
        cacheRef.current.set(doc.id, item);
        return item;
      });
      
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      setItems(data);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, orderByField, pageSize]);

  // Carrega próxima página
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !lastDocRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, 'desc'),
        startAfter(lastDocRef.current),
        limit(pageSize)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const item = { id: doc.id, ...doc.data() };
        cacheRef.current.set(doc.id, item);
        return item;
      });
      
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      setItems(prev => [...prev, ...data]);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Erro ao carregar mais dados:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, orderByField, pageSize, hasMore, isLoading]);

  // Adiciona item ao cache e lista
  const addItem = useCallback((item) => {
    cacheRef.current.set(item.id, item);
    setItems(prev => [item, ...prev]);
  }, []);

  // Atualiza item no cache e lista
  const updateItem = useCallback((id, updates) => {
    const cached = cacheRef.current.get(id);
    if (cached) {
      const updated = { ...cached, ...updates };
      cacheRef.current.set(id, updated);
      setItems(prev => prev.map(item => item.id === id ? updated : item));
    }
  }, []);

  // Remove item do cache e lista
  const removeItem = useCallback((id) => {
    cacheRef.current.delete(id);
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Busca item do cache (sem consultar Firebase)
  const getCachedItem = useCallback((id) => {
    return cacheRef.current.get(id);
  }, []);

  // Reseta tudo
  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    lastDocRef.current = null;
    cacheRef.current.clear();
  }, []);

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadInitial,
    loadMore,
    addItem,
    updateItem,
    removeItem,
    getCachedItem,
    reset
  };
}
