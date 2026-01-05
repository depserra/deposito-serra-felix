/**
 * Converte uma string de data no formato "YYYY-MM-DD" para um objeto Date
 * considerando o fuso horário local (evita problemas com UTC)
 * @param {string} dataString - Data no formato "YYYY-MM-DD"
 * @returns {Date} Objeto Date com a data no fuso local
 */
export function stringParaDataLocal(dataString) {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Formata uma data para o formato "DD/MM/YYYY"
 * @param {Date|string} data - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatarData(data) {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data para o formato "DD/MM/YYYY HH:mm"
 * @param {Date|string} data - Data a ser formatada
 * @returns {string} Data e hora formatadas
 */
export function formatarDataHora(data) {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
