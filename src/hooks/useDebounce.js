import { useState, useEffect } from 'react';

/**
 * Hook para aplicar debounce em valores
 * @param {any} value - Valor a ser debounced
 * @param {number} delay - Tempo de delay em milissegundos
 * @returns {any} Valor com debounce aplicado
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
