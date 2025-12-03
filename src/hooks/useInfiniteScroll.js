import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para implementar scroll infinito
 * @param {Function} fetchMore - Função para buscar mais dados
 * @param {boolean} hasMore - Se ainda há mais dados para carregar
 * @param {boolean} isLoading - Se está carregando dados
 * @returns {Object} - Ref para o elemento observer
 */
export function useInfiniteScroll(fetchMore, hasMore, isLoading) {
  const observerRef = useRef();
  const loadMoreRef = useRef();

  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMore, hasMore, isLoading]);

  return loadMoreRef;
}
