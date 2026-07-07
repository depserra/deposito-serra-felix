/**
 * conversaoUnidades.test.js
 *
 * Testes unitários para o módulo de conversão de unidades.
 * Cobre todos os cenários exigidos no prompt de refatoração.
 */

import { describe, it, expect } from 'vitest';
import {
  calcularEntradaEstoque,
  calcularPrecoBaseEntrada,
  calcularVendaPorQuantidade,
  calcularVendaPorValor,
  validarIncrementoMinimo,
  estoquePermiteVenda,
  formatarQuantidade,
  extrairPesoDoNome,
  casasDecimaisDaUnidade,
} from '../conversaoUnidades';

// ─── calcularEntradaEstoque ───────────────────────────────────────────────────

describe('calcularEntradaEstoque', () => {
  it('deve multiplicar quantidade comprada pelo fator', () => {
    // 5 sacos de ração de 10 kg → 50 kg no estoque
    expect(calcularEntradaEstoque(5, 10)).toBe(50);
  });

  it('deve funcionar para caixas com múltiplos itens', () => {
    // 2 caixas com 12 parafusos → 24 unidades
    expect(calcularEntradaEstoque(2, 12)).toBe(24);
  });

  it('deve retornar 0 quando quantidade for 0', () => {
    expect(calcularEntradaEstoque(0, 10)).toBe(0);
  });

  it('deve usar fator 1 como padrão quando fator for inválido', () => {
    expect(calcularEntradaEstoque(5, 0)).toBe(5);
    expect(calcularEntradaEstoque(5, null)).toBe(5);
    expect(calcularEntradaEstoque(5, undefined)).toBe(5);
  });

  it('deve preservar casas decimais', () => {
    // 3.5 fardos de 6 L → 21 litros
    expect(calcularEntradaEstoque(3.5, 6)).toBe(21);
  });
});

// ─── calcularPrecoBaseEntrada ─────────────────────────────────────────────────

describe('calcularPrecoBaseEntrada', () => {
  it('deve dividir o preço do saco pelo fator', () => {
    // Saco de 10 kg custa R$ 50 → R$ 5 por kg
    expect(calcularPrecoBaseEntrada(50, 10)).toBe(5);
  });

  it('deve retornar o preço original quando fator for 1', () => {
    expect(calcularPrecoBaseEntrada(25.99, 1)).toBe(25.99);
  });

  it('deve retornar o preço original quando fator for inválido', () => {
    expect(calcularPrecoBaseEntrada(25.99, 0)).toBe(25.99);
  });
});

// ─── calcularVendaPorQuantidade ───────────────────────────────────────────────

describe('calcularVendaPorQuantidade — venda fracionada por quantidade', () => {
  it('deve calcular valor total corretamente', () => {
    // 2.5 kg × R$ 5.00/kg = R$ 12.50
    const { valorTotal } = calcularVendaPorQuantidade(2.5, 5);
    expect(valorTotal).toBe(12.5);
  });

  it('deve arredondar para 2 casas decimais', () => {
    const { valorTotal } = calcularVendaPorQuantidade(1.333, 3);
    expect(valorTotal).toBe(4); // 3.999 → 4.00
  });

  it('deve retornar 0 para quantidade 0', () => {
    const { valorTotal } = calcularVendaPorQuantidade(0, 5);
    expect(valorTotal).toBe(0);
  });

  it('deve retornar 0 para preço 0', () => {
    const { valorTotal } = calcularVendaPorQuantidade(2, 0);
    expect(valorTotal).toBe(0);
  });
});

// ─── calcularVendaPorValor ────────────────────────────────────────────────────

describe('calcularVendaPorValor — venda fracionada por valor em R$', () => {
  it('deve calcular quantidade a partir do valor', () => {
    // R$ 10 ÷ R$ 5/kg = 2 kg
    const { quantidade, valorTotal } = calcularVendaPorValor(10, 5, 0);
    expect(quantidade).toBe(2);
    expect(valorTotal).toBe(10);
  });

  it('deve respeitar incremento mínimo de 0.1 kg (arredondar para baixo)', () => {
    // R$ 7 ÷ R$ 5/kg = 1.4 kg → arredonda para 1.4 (múltiplo de 0.1)
    const { quantidade } = calcularVendaPorValor(7, 5, 0.1);
    expect(quantidade).toBe(1.4);
  });

  it('deve arredondar para baixo (cliente não paga a mais)', () => {
    // R$ 10 ÷ R$ 3/kg = 3.333... → com incremento 0.5 → 3.0
    const { quantidade } = calcularVendaPorValor(10, 3, 0.5);
    expect(quantidade).toBe(3);
  });

  it('deve retornar 0 quando preço for 0', () => {
    const { quantidade, valorTotal } = calcularVendaPorValor(10, 0, 0.1);
    expect(quantidade).toBe(0);
    expect(valorTotal).toBe(0);
  });

  it('deve funcionar sem incremento mínimo (incremento 0)', () => {
    const { quantidade } = calcularVendaPorValor(10, 4, 0);
    expect(quantidade).toBe(2.5);
  });
});

// ─── validarIncrementoMinimo ──────────────────────────────────────────────────

describe('validarIncrementoMinimo', () => {
  it('deve aceitar múltiplos exatos do incremento', () => {
    expect(validarIncrementoMinimo(0.5, 0.1)).toBe(true);
    expect(validarIncrementoMinimo(1.0, 0.5)).toBe(true);
    expect(validarIncrementoMinimo(2, 1)).toBe(true);
  });

  it('deve rejeitar quantidades que não são múltiplos', () => {
    expect(validarIncrementoMinimo(0.15, 0.1)).toBe(false);
    expect(validarIncrementoMinimo(1.7, 0.5)).toBe(false);
  });

  it('deve sempre aceitar quando incremento for 0 (sem restrição)', () => {
    expect(validarIncrementoMinimo(0.0001, 0)).toBe(true);
    expect(validarIncrementoMinimo(3.14159, 0)).toBe(true);
  });

  it('deve lidar com imprecisão de ponto flutuante via tolerância', () => {
    // 0.1 + 0.2 = 0.30000000000000004 em JS
    expect(validarIncrementoMinimo(0.3, 0.1)).toBe(true);
  });

  it('deve rejeitar produto não fracionável com quantidade decimal', () => {
    // produto não fracionável: incremento = 1
    expect(validarIncrementoMinimo(1.5, 1)).toBe(false);
    expect(validarIncrementoMinimo(3, 1)).toBe(true);
  });
});

// ─── estoquePermiteVenda ──────────────────────────────────────────────────────

describe('estoquePermiteVenda', () => {
  it('deve permitir venda quando saldo for suficiente', () => {
    expect(estoquePermiteVenda(10, 5)).toBe(true);
    expect(estoquePermiteVenda(5, 5)).toBe(true); // exatamente o saldo
  });

  it('deve bloquear venda quando saldo for insuficiente', () => {
    expect(estoquePermiteVenda(4, 5)).toBe(false);
    expect(estoquePermiteVenda(0, 0.001)).toBe(false);
  });

  it('deve permitir venda de 0 mesmo com saldo 0', () => {
    expect(estoquePermiteVenda(0, 0)).toBe(true);
  });

  it('deve funcionar com quantidades decimais', () => {
    expect(estoquePermiteVenda(10.5, 10.5)).toBe(true);
    expect(estoquePermiteVenda(10.499, 10.5)).toBe(false);
  });
});

// ─── formatarQuantidade ───────────────────────────────────────────────────────

describe('formatarQuantidade', () => {
  it('deve formatar kg com 3 casas decimais', () => {
    expect(formatarQuantidade(2.5, 'kg')).toBe('2.5');
    expect(formatarQuantidade(2.500, 'kg')).toBe('2.5');
    expect(formatarQuantidade(2.123, 'kg')).toBe('2.123');
  });

  it('deve formatar unidade sem casas decimais', () => {
    expect(formatarQuantidade(5, 'un')).toBe('5');
    expect(formatarQuantidade(5.7, 'un')).toBe('6'); // arredonda
  });

  it('deve formatar metro com 2 casas decimais', () => {
    expect(formatarQuantidade(1.5, 'm')).toBe('1.5');
    expect(formatarQuantidade(1.555, 'm')).toBe('1.55'); // 2 casas
  });
});

// ─── extrairPesoDoNome (legado / migration) ───────────────────────────────────

describe('extrairPesoDoNome — helper legado para migration', () => {
  it('deve extrair peso em kg do nome', () => {
    expect(extrairPesoDoNome('Ração Golden 10kg')).toBe(10);
    expect(extrairPesoDoNome('Ração Premiatta 15 KG')).toBe(15);
    expect(extrairPesoDoNome('Ração Adulto 7,5kg')).toBe(7.5);
  });

  it('deve converter gramas para kg', () => {
    expect(extrairPesoDoNome('Petisco 500g')).toBe(0.5);
    expect(extrairPesoDoNome('Biscoito 200g')).toBe(0.2);
  });

  it('deve retornar 1 quando não encontrar peso', () => {
    expect(extrairPesoDoNome('Coleira Antipulgas')).toBe(1);
    expect(extrairPesoDoNome('')).toBe(1);
    expect(extrairPesoDoNome(null)).toBe(1);
  });

  it('deve retornar 1 quando peso for 0', () => {
    expect(extrairPesoDoNome('Produto 0kg')).toBe(1);
  });
});

// ─── casasDecimaisDaUnidade ───────────────────────────────────────────────────

describe('casasDecimaisDaUnidade', () => {
  it('deve retornar 0 para unidades inteiras', () => {
    expect(casasDecimaisDaUnidade('un')).toBe(0);
    expect(casasDecimaisDaUnidade('cx')).toBe(0);
  });

  it('deve retornar 3 para kg e litro', () => {
    expect(casasDecimaisDaUnidade('kg')).toBe(3);
    expect(casasDecimaisDaUnidade('l')).toBe(3);
  });

  it('deve retornar 3 como fallback para unidade desconhecida', () => {
    expect(casasDecimaisDaUnidade('xyz')).toBe(3);
    expect(casasDecimaisDaUnidade(null)).toBe(3);
  });
});
