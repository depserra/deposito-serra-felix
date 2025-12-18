/**
 * Formata um valor numérico para o formato monetário brasileiro (1.234,56)
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00';
  }
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata um valor para exibir com R$
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado com símbolo R$
 */
export function formatReal(value) {
  return `R$ ${formatCurrency(value)}`;
}

/**
 * Formata um número para o formato decimal brasileiro (1.234,56)
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais (padrão: 2)
 * @returns {string} - Valor formatado
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00';
  }
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
