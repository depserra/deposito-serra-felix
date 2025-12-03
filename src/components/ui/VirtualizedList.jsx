import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Componente de lista virtualizada
 * Renderiza apenas os itens visíveis na tela para melhorar performance
 */
export function VirtualizedList({ 
  items = [], 
  itemHeight = 80, 
  containerHeight = 600,
  renderItem,
  overscan = 3,
  onLoadMore,
  hasMore = false,
  isLoading = false
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef();
  const scrollTimeoutRef = useRef();

  // Calcula quais itens devem ser renderizados
  const visibleRange = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const { startIndex, endIndex } = visibleRange();
  const visibleItems = items.slice(startIndex, endIndex);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Handler de scroll otimizado com debounce
  const handleScroll = useCallback((e) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const newScrollTop = e.target.scrollTop;
      setScrollTop(newScrollTop);

      // Carrega mais itens quando chegar perto do fim
      if (
        hasMore && 
        !isLoading && 
        onLoadMore &&
        newScrollTop + containerHeight >= totalHeight - itemHeight * 5
      ) {
        onLoadMore();
      }
    }, 16); // ~60fps
  }, [hasMore, isLoading, onLoadMore, containerHeight, totalHeight, itemHeight]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={item.id || startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      )}
    </div>
  );
}
