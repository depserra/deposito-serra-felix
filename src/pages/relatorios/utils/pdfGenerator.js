import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getImageBase64, formatarData, formatarMoeda } from './pdfHelpers';
import { COLORS, HEADER_CONFIG, CARD_CONFIG, TABLE_STYLES, FONT_SIZES } from './pdfStyles';

// Adiciona cabeçalho ao PDF
export const adicionarCabecalho = async (doc, titulo, dataInicio, dataFim) => {
  const pageWidth = doc.internal.pageSize.width;
  const hoje = new Date();
  
  // Fundo laranja
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, HEADER_CONFIG.height, 'F');
  
  // Logo
  try {
    const logoBase64 = await getImageBase64('/logo-serra-felix.png');
    const { x, y, width, height } = HEADER_CONFIG.logoPosition;
    doc.addImage(logoBase64, 'PNG', x, y, width, height);
  } catch (error) {
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DEPÓSITO', 20, 18);
    doc.text('CONSTRUÇÃO', 20, 24);
  }
  
  // Linha separadora
  doc.setTextColor(...COLORS.white);
  doc.setDrawColor(...COLORS.white);
  doc.setLineWidth(0.5);
  const { x1, y1, x2, y2 } = HEADER_CONFIG.separatorLine;
  doc.line(x1, y1, x2, y2);
  
  // Título
  doc.setFontSize(FONT_SIZES.title);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, pageWidth / 2, 22, { align: 'center' });
  
  // Informações
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${formatarData(hoje)}`, pageWidth - 15, 18, { align: 'right' });
  doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, pageWidth - 15, 24, { align: 'right' });
  
  doc.setTextColor(...COLORS.dark);
  return 52; // Retorna posição Y após cabeçalho
};

// Adiciona cards de resumo
export const adicionarCards = (doc, yPosition, cards) => {
  const pageWidth = doc.internal.pageSize.width;
  const { width: cardWidth, height: cardHeight, spacing: cardSpacing, radius } = CARD_CONFIG;
  const totalCardsWidth = (cardWidth * cards.length) + (cardSpacing * (cards.length - 1));
  const startX = (pageWidth - totalCardsWidth) / 2;
  
  cards.forEach((card, index) => {
    const x = startX + (cardWidth + cardSpacing) * index;
    
    // Card
    doc.setFillColor(...COLORS.bgCard);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, radius, radius, 'FD');
    
    // Label
    doc.setFontSize(FONT_SIZES.cardLabel);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.lightGray);
    doc.text(card.label, x + cardWidth / 2, yPosition + 6, { align: 'center' });
    
    // Valor
    doc.setFontSize(FONT_SIZES.cardValue);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(card.valor, x + cardWidth / 2, yPosition + 15, { align: 'center' });
  });
  
  doc.setTextColor(...COLORS.dark);
  return yPosition + cardHeight + 12;
};

// Adiciona seção de notas
export const adicionarNotas = (doc, yPosition, totalRegistros) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition < pageHeight - 50) {
    doc.setFillColor(...COLORS.bgCard);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Notas e Observações:', 18, yPosition + 6);
    
    doc.setFontSize(FONT_SIZES.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('• Relatório gerado automaticamente', 18, yPosition + 12);
    doc.text(`• Total de ${totalRegistros} registro(s) encontrado(s)`, 18, yPosition + 17);
    
    return yPosition + 30;
  }
  return yPosition;
};

// Adiciona rodapé
export const adicionarRodape = (doc) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 15;
  const hoje = new Date();
  
  doc.setFontSize(FONT_SIZES.footer);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text('Sistema de Gestão | Relatório gerado automaticamente', 15, footerY);
  doc.text(`Página 1 de 1 | ${formatarData(hoje)} ${hoje.toLocaleTimeString('pt-BR')}`, pageWidth - 15, footerY, { align: 'right' });
};

// Gera tabela de vendas
export const gerarTabelaVendas = (doc, yPosition, vendas, produtos, totalVendas) => {
  const tableData = [];
  
  vendas.forEach(venda => {
    if (venda.itens && venda.itens.length > 0) {
      venda.itens.forEach((item, index) => {
        const produto = produtos.find(p => p.id === item.produto);
        
        tableData.push([
          index === 0 ? formatarData(new Date(venda.dataVenda)) : '',
          index === 0 ? venda.codigoVenda || '-' : '',
          index === 0 ? venda.clienteNome || '-' : '',
          produto?.fornecedor || '-',
          produto?.nome || item.produto || '-',
          produto?.categoria || '-',
          item.quantidade || 0,
          `R$ ${formatarMoeda(item.valorUnitario || 0)}`,
          index === 0 ? `R$ ${formatarMoeda(venda.valorTotal || 0)}` : ''
        ]);
      });
    } else {
      tableData.push([
        formatarData(new Date(venda.dataVenda)),
        venda.codigoVenda || '-',
        venda.clienteNome || '-',
        '-',
        '-',
        '-',
        0,
        'R$ 0,00',
        `R$ ${formatarMoeda(venda.valorTotal || 0)}`
      ]);
    }
  });
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Data', 'Nº Venda', 'Cliente', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Total']],
    body: tableData,
    foot: [['', '', '', '', '', '', '', 'Total', `R$ ${formatarMoeda(totalVendas)}`]],
    theme: 'grid',
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 17, halign: 'center' },
      2: { cellWidth: 25, halign: 'left' },
      3: { cellWidth: 22, halign: 'left' },
      4: { cellWidth: 30, halign: 'left' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' }
    }
  });
  
  return doc.lastAutoTable.finalY + 10;
};

// Gera tabela de compras
export const gerarTabelaCompras = (doc, yPosition, compras, produtos, totalCompras, quantidadeTotal) => {
  const tableData = compras.map(compra => {
    const produto = produtos.find(p => p.id === compra.produtoId);
    return [
      formatarData(new Date(compra.dataCompra)),
      compra.codigoCompra || '-',
      compra.fornecedor || '-',
      produto?.nome || compra.nomeProduto || '-',
      produto?.categoria || '-',
      compra.quantidade || 0,
      `R$ ${formatarMoeda(compra.valorCompra || 0)}`,
      `R$ ${formatarMoeda(compra.valorTotal || 0)}`
    ];
  });
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Data', 'Nº Compra', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Valor Total']],
    body: tableData,
    foot: [['', '', '', '', '', quantidadeTotal, '', `R$ ${formatarMoeda(totalCompras)}`]],
    theme: 'grid',
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 28, halign: 'left' },
      3: { cellWidth: 35, halign: 'left' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' }
    }
  });
  
  return doc.lastAutoTable.finalY + 10;
};

// Gera tabela de estoque
export const gerarTabelaEstoque = (doc, yPosition, produtos, valorTotal, quantidadeTotal) => {
  const tableData = produtos.map(produto => [
    produto.nome || '-',
    produto.categoria || '-',
    `${produto.quantidade || 0} ${produto.unidade || ''}`,
    `R$ ${formatarMoeda(produto.precoCompra || 0)}`,
    `R$ ${formatarMoeda(produto.precoVenda || 0)}`,
    `R$ ${formatarMoeda((produto.quantidade || 0) * (produto.precoVenda || 0))}`
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Produto', 'Categoria', 'Estoque', 'Preço Compra', 'Preço Venda', 'Valor Total']],
    body: tableData,
    foot: [['', '', quantidadeTotal, '', '', `R$ ${formatarMoeda(valorTotal)}`]],
    theme: 'grid',
    ...TABLE_STYLES,
    styles: {
      ...TABLE_STYLES.styles,
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 50 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });
  
  return doc.lastAutoTable.finalY + 10;
};
