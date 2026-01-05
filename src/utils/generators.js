/**
 * Gera um código único para compra baseado em timestamp
 * @returns {string} Código da compra no formato CMP-timestamp
 */
export function gerarCodigoCompra() {
  return `CMP-${Date.now()}`;
}

/**
 * Gera um código único para venda baseado em timestamp
 * @returns {string} Código da venda no formato VND-timestamp
 */
export function gerarCodigoVenda() {
  return `VND-${Date.now()}`;
}
