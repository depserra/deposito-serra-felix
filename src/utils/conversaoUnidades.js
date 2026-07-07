/**
 * conversaoUnidades.js
 *
 * Módulo puro (sem dependências React/Firebase) com toda a lógica de conversão
 * de unidades. Centraliza o que antes estava espalhado e duplicado em:
 *  - VendaForm.jsx (extrairPesoDoNome)
 *  - parseNFeXML.js (extrairPesoDoNomeNFe)
 *
 * Regra geral: a conversão acontece SOMENTE na ENTRADA (compra/importação).
 * A saída (venda) debita sempre na unidade base do produto.
 */

// ─── Catálogo de unidades reconhecidas ───────────────────────────────────────

/**
 * Mapa de unidades suportadas com o número de casas decimais para exibição.
 * @type {Record<string, { nome: string, casasDecimais: number }>}
 */
export const UNIDADES = {
  un:   { nome: 'Unidade',      casasDecimais: 0 },
  kg:   { nome: 'Quilograma',   casasDecimais: 3 },
  g:    { nome: 'Grama',        casasDecimais: 0 },
  l:    { nome: 'Litro',        casasDecimais: 3 },
  ml:   { nome: 'Mililitro',    casasDecimais: 0 },
  m:    { nome: 'Metro',        casasDecimais: 2 },
  m2:   { nome: 'Metro²',       casasDecimais: 2 },
  m3:   { nome: 'Metro³',       casasDecimais: 3 },
  cx:   { nome: 'Caixa',        casasDecimais: 0 },
  pct:  { nome: 'Pacote',       casasDecimais: 0 },
  sc:   { nome: 'Saco',         casasDecimais: 0 },
  fd:   { nome: 'Fardo',        casasDecimais: 0 },
  rl:   { nome: 'Rolo',         casasDecimais: 0 },
  pc:   { nome: 'Peça',         casasDecimais: 0 },
  milh: { nome: 'Milheiro',     casasDecimais: 0 },
  dz:   { nome: 'Dúzia',        casasDecimais: 0 },
};

/**
 * Retorna as casas decimais para uma sigla de unidade.
 * @param {string} sigla
 * @returns {number}
 */
export function casasDecimaisDaUnidade(sigla) {
  return UNIDADES[sigla?.toLowerCase()]?.casasDecimais ?? 3;
}

// ─── Conversão de entrada (compra / importação NF-e) ─────────────────────────

/**
 * Calcula a quantidade que deve ser creditada no estoque (sempre na unidade base)
 * a partir da quantidade comprada e do fator de conversão cadastrado.
 *
 * @param {number} quantidadeComprada  - qCom do XML ou qtd informada no formulário
 * @param {number} fatorConversao      - quantas unidades base equivalem a 1 unidade de compra
 * @returns {number} quantidade em unidade base
 *
 * @example
 * // 5 sacos de ração de 10 kg → 50 kg no estoque
 * calcularEntradaEstoque(5, 10) // → 50
 *
 * @example
 * // 2 caixas com 12 parafusos cada → 24 unidades no estoque
 * calcularEntradaEstoque(2, 12) // → 24
 */
export function calcularEntradaEstoque(quantidadeComprada, fatorConversao) {
  const qtd   = Number(quantidadeComprada) || 0;
  const fator = Number(fatorConversao)     || 1;
  return qtd * fator;
}

/**
 * Dado o valor total da nota e o fator, calcula o preço de compra por unidade base.
 *
 * @param {number} valorUnitarioCompra  - preço por unidade de compra (vUnCom do XML)
 * @param {number} fatorConversao
 * @returns {number} preço por unidade base
 *
 * @example
 * // Saco de 10 kg custa R$ 50 → preço por kg = R$ 5
 * calcularPrecoBaseEntrada(50, 10) // → 5
 */
export function calcularPrecoBaseEntrada(valorUnitarioCompra, fatorConversao) {
  const valor = Number(valorUnitarioCompra) || 0;
  const fator = Number(fatorConversao)      || 1;
  return fator > 0 ? valor / fator : valor;
}

// ─── Conversão de saída (venda) ───────────────────────────────────────────────

/**
 * Calcula o valor total de uma venda a partir da quantidade vendida (em unidade base)
 * e do preço por unidade base.
 *
 * @param {number} quantidadeBase  - quantidade na unidade base do produto
 * @param {number} precoBase       - preço por unidade base
 * @returns {{ valorTotal: number }}
 */
export function calcularVendaPorQuantidade(quantidadeBase, precoBase) {
  const qtd   = Number(quantidadeBase) || 0;
  const preco = Number(precoBase)      || 0;
  return { valorTotal: Math.round(qtd * preco * 100) / 100 };
}

/**
 * Calcula a quantidade (em unidade base) que o cliente leva dado um valor em R$.
 * Respeita o incremento mínimo arredondando para baixo.
 *
 * @param {number} valorDesejado     - valor em R$ que o cliente quer pagar
 * @param {number} precoBase         - preço por unidade base
 * @param {number} incrementoMinimo  - menor fração vendável (ex: 0.100 para 100g)
 * @returns {{ quantidade: number, valorTotal: number }}
 *
 * @example
 * // Cliente quer gastar R$ 10, ração custa R$ 5/kg, incremento 0.100 kg
 * calcularVendaPorValor(10, 5, 0.1) // → { quantidade: 2.000, valorTotal: 10.00 }
 */
export function calcularVendaPorValor(valorDesejado, precoBase, incrementoMinimo = 0) {
  const valor     = Number(valorDesejado)    || 0;
  const preco     = Number(precoBase)        || 0;
  const incremento = Number(incrementoMinimo) || 0;

  if (preco <= 0) return { quantidade: 0, valorTotal: 0 };

  // Arredondar para 10 casas antes de Math.floor para evitar imprecisão de ponto flutuante
  // Exemplo: 7 / 5 = 1.3999999999... → roundTo(1.4) → Math.floor → 1.4 correto
  const qtdExata = Math.round((valor / preco) * 1e10) / 1e10;

  let quantidade;
  if (incremento > 0) {
    // Arredondar para 10 casas antes de Math.floor para evitar imprecisão de ponto flutuante
    // Exemplo: 1.4 / 0.1 = 13.9999... → round → 14 → Math.floor → 14 → × 0.1 = 1.4
    const razao = Math.round((qtdExata / incremento) * 1e10) / 1e10;
    quantidade = Math.floor(razao) * incremento;
    // Arredondar o resultado para evitar 0.1 × 14 = 1.4000000000000002
    quantidade = Math.round(quantidade * 1e10) / 1e10;
  } else {
    quantidade = qtdExata;
  }

  const valorTotal = Math.round(quantidade * preco * 100) / 100;
  return { quantidade, valorTotal };
}

// ─── Validação ────────────────────────────────────────────────────────────────

/**
 * Verifica se a quantidade informada é um múltiplo válido do incremento mínimo.
 *
 * @param {number} quantidade
 * @param {number} incrementoMinimo  - 0 ou falsy significa sem restrição
 * @param {number} tolerancia        - margem de erro de ponto flutuante (default 1e-9)
 * @returns {boolean}
 */
export function validarIncrementoMinimo(quantidade, incrementoMinimo, tolerancia = 1e-9) {
  const incremento = Number(incrementoMinimo) || 0;
  if (incremento <= 0) return true;

  const qtd   = Number(quantidade) || 0;
  const resto = qtd % incremento;
  return resto < tolerancia || (incremento - resto) < tolerancia;
}

/**
 * Verifica se a venda deixaria o estoque abaixo de zero.
 *
 * @param {number} saldoAtual
 * @param {number} quantidadeVendida
 * @returns {boolean} true se a operação for segura
 */
export function estoquePermiteVenda(saldoAtual, quantidadeVendida) {
  return (Number(saldoAtual) || 0) - (Number(quantidadeVendida) || 0) >= 0;
}

// ─── Formatação ──────────────────────────────────────────────────────────────

/**
 * Formata uma quantidade com o número correto de casas decimais para a unidade.
 *
 * @param {number} valor
 * @param {string} siglaUnidade  - ex: 'kg', 'un', 'l'
 * @returns {string}
 */
export function formatarQuantidade(valor, siglaUnidade) {
  const casas = casasDecimaisDaUnidade(siglaUnidade);
  const num   = Number(valor) || 0;

  if (casas === 0) return String(Math.round(num));

  // Remove zeros desnecessários mas mantém ao menos 1 casa decimal
  const formatado = num.toFixed(casas);
  return casas > 0 ? formatado.replace(/\.?0+$/, '') || '0' : formatado;
}

// ─── Helper: extração de peso do nome (legado / migration) ───────────────────

/**
 * Tenta extrair um peso em kg a partir do nome do produto.
 * Usado APENAS no script de migration para produtos de ração legados que ainda
 * não têm fatorConversao explícito cadastrado.
 *
 * NÃO deve ser usado em novos fluxos — use produto_fornecedor_conversao.
 *
 * @param {string} nome
 * @returns {number} peso em kg, ou 1 se não encontrar
 */
export function extrairPesoDoNome(nome) {
  if (!nome) return 1;
  const match = nome.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|kilo|g)\b/i);
  if (!match) return 1;

  let num = parseFloat(match[1].replace(',', '.'));
  const unitMatch = match[0].toLowerCase();
  if (unitMatch.includes('g') && !unitMatch.includes('kg')) {
    num = num / 1000; // gramas → kg
  }
  return num > 0 ? num : 1;
}
