import jsPDF from 'jspdf';
import { formatarMoeda } from './pdfHelpers';
import {
  adicionarCabecalho,
  adicionarCards,
  adicionarNotas,
  adicionarRodape,
  gerarTabelaVendas,
  gerarTabelaCompras,
  gerarTabelaEstoque
} from './pdfGenerator';

export const exportarPDF = async ({
  tipoRelatorio,
  dados,
  produtos,
  dataInicio,
  dataFim,
  nomeArquivo
}) => {
  const doc = new jsPDF();
  doc.setFont('helvetica');
  
  // Cabeçalho
  const titulo = `RELATÓRIO DE ${tipoRelatorio.toUpperCase()}`;
  let yPosition = await adicionarCabecalho(doc, titulo, dataInicio, dataFim);
  
  // Gerar conteúdo específico por tipo
  if (tipoRelatorio === 'vendas') {
    yPosition = await gerarRelatorioVendas(doc, yPosition, dados, produtos);
  } else if (tipoRelatorio === 'compras') {
    yPosition = await gerarRelatorioCompras(doc, yPosition, dados, produtos);
  } else if (tipoRelatorio === 'estoque') {
    yPosition = await gerarRelatorioEstoque(doc, yPosition, dados);
  }
  
  // Notas e rodapé
  yPosition = adicionarNotas(doc, yPosition, dados.length);
  adicionarRodape(doc);
  
  // Salvar
  doc.save(nomeArquivo);
};

// Relatório de Vendas
const gerarRelatorioVendas = async (doc, yPosition, vendas, produtos) => {
  const totalVendas = vendas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
  const totalItens = vendas.reduce((sum, v) => sum + (v.itens?.length || 0), 0);
  const clientesUnicos = new Set(vendas.map(v => v.clienteId)).size;
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;
  
  // Cards
  const cards = [
    { label: 'Total de Vendas', valor: `R$ ${formatarMoeda(totalVendas)}` },
    { label: 'Itens Vendidos', valor: totalItens.toString() },
    { label: 'Clientes', valor: clientesUnicos.toString() },
    { label: 'Ticket Médio por Venda', valor: `R$ ${formatarMoeda(ticketMedio)}` }
  ];
  
  yPosition = adicionarCards(doc, yPosition, cards);
  
  // Título da seção
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(249, 115, 22);
  doc.text('Vendas Realizadas', 15, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 5;
  
  // Tabela
  yPosition = gerarTabelaVendas(doc, yPosition, vendas, produtos, totalVendas);
  
  return yPosition;
};

// Relatório de Compras
const gerarRelatorioCompras = async (doc, yPosition, compras, produtos) => {
  const totalCompras = compras.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
  const quantidadeTotal = compras.reduce((sum, c) => sum + (c.quantidade || 0), 0);
  const fornecedoresUnicos = new Set(compras.map(c => c.fornecedor)).size;
  const valorMedio = compras.length > 0 ? totalCompras / compras.length : 0;
  
  // Cards
  const cards = [
    { label: 'Total de Compras', valor: `R$ ${formatarMoeda(totalCompras)}` },
    { label: 'Itens Comprados', valor: quantidadeTotal.toString() },
    { label: 'Fornecedores Diferentes', valor: fornecedoresUnicos.toString() },
    { label: 'Valor Médio por Compra', valor: `R$ ${formatarMoeda(valorMedio)}` }
  ];
  
  yPosition = adicionarCards(doc, yPosition, cards);
  
  // Título da seção
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(249, 115, 22);
  doc.text('Compras Realizadas', 15, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 5;
  
  // Tabela
  yPosition = gerarTabelaCompras(doc, yPosition, compras, produtos, totalCompras, quantidadeTotal);
  
  return yPosition;
};

// Relatório de Estoque
const gerarRelatorioEstoque = async (doc, yPosition, produtos) => {
  const valorTotal = produtos.reduce((sum, p) => sum + ((p.quantidade || 0) * (p.precoVenda || 0)), 0);
  const quantidadeTotal = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
  const produtosBaixo = produtos.filter(p => (p.quantidade || 0) < (p.estoqueMinimo || 10)).length;
  const produtosSemEstoque = produtos.filter(p => (p.quantidade || 0) === 0).length;
  
  // Cards
  const cards = [
    { label: 'Valor Total Estoque', valor: `R$ ${formatarMoeda(valorTotal)}` },
    { label: 'Quantidade Total', valor: quantidadeTotal.toString() },
    { label: 'Estoque Baixo', valor: produtosBaixo.toString() },
    { label: 'Sem Estoque', valor: produtosSemEstoque.toString() }
  ];
  
  yPosition = adicionarCards(doc, yPosition, cards);
  
  // Título da seção
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(249, 115, 22);
  doc.text('Produtos em Estoque', 15, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 5;
  
  // Tabela
  yPosition = gerarTabelaEstoque(doc, yPosition, produtos, valorTotal, quantidadeTotal);
  
  return yPosition;
};
