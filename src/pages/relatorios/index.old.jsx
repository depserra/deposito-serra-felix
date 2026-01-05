import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageLayout from '../../components/layout-new/PageLayout';
import Modal from '../../components/modals/Modal';
import { useVendas } from '../../hooks/useVendas';
import { useCompras } from '../../hooks/useCompras';
import { useEstoque } from '../../hooks/useEstoque';
import { useClientes } from '../../hooks/useClientes';
import { FileText, Download, TrendingUp, Package, Users, AlertTriangle, Filter } from 'lucide-react';

export default function RelatoriosPage() {
  const { vendas, listarVendas } = useVendas();
  const { compras, listarCompras } = useCompras();
  const { produtos, listarProdutos } = useEstoque();
  const { clientes, listarClientes } = useClientes();
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas');
  const [showModalPersonalizado, setShowModalPersonalizado] = useState(false);
  
  // Estados do filtro personalizado
  const [filtroPersonalizado, setFiltroPersonalizado] = useState({
    periodo: 'mes',
    dataInicio: '',
    dataFim: '',
    clientes: [],
    produtos: [],
    status: 'todos',
    tipoRelatorio: 'vendas'
  });
  
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  // Carregar dados ao montar o componente
  useEffect(() => {
    const carregarDados = async () => {
      try {
        await Promise.all([
          listarVendas(),
          listarCompras(),
          listarProdutos(),
          listarClientes()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    carregarDados();
  }, []);

  // Função para calcular o período
  const calcularPeriodo = (periodo) => {
    const hoje = new Date();
    let inicio = new Date();

    switch(periodo) {
      case 'hoje':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        break;
      case 'semana':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      case 'personalizado':
        if (dataInicio && dataFim) {
          return {
            inicio: new Date(dataInicio),
            fim: new Date(dataFim)
          };
        }
        return { inicio: new Date(0), fim: hoje };
      default:
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    return { inicio, fim: hoje };
  };

  // Dados filtrados por período
  const dadosFiltrados = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoSelecionado);
    
    const vendasFiltradas = (vendas || []).filter(venda => {
      const dataVenda = new Date(venda.dataVenda);
      return dataVenda >= inicio && dataVenda <= fim;
    });

    const comprasFiltradas = (compras || []).filter(compra => {
      const dataCompra = new Date(compra.dataCompra);
      return dataCompra >= inicio && dataCompra <= fim;
    });

    return { vendasFiltradas, comprasFiltradas };
  }, [vendas, compras, periodoSelecionado, dataInicio, dataFim]);

  // Relatório de Vendas
  const relatorioVendas = useMemo(() => {
    const { vendasFiltradas } = dadosFiltrados;
    
    const totalVendas = vendasFiltradas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
    const quantidadeVendas = vendasFiltradas.length;
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

    // Vendas por produto
    const produtoVendidos = {};
    vendasFiltradas.forEach(venda => {
      (venda.itens || []).forEach(item => {
        const produto = produtos.find(p => p.id === item.produto);
        const nomeProduto = produto?.nome || item.produto;
        
        if (!produtoVendidos[nomeProduto]) {
          produtoVendidos[nomeProduto] = {
            quantidade: 0,
            valor: 0
          };
        }
        produtoVendidos[nomeProduto].quantidade += item.quantidade || 0;
        produtoVendidos[nomeProduto].valor += (item.quantidade || 0) * (item.valorUnitario || 0);
      });
    });

    const produtosMaisVendidos = Object.entries(produtoVendidos)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    // Vendas por cliente
    const vendasPorCliente = {};
    vendasFiltradas.forEach(venda => {
      const cliente = venda.clienteNome || 'Cliente não identificado';
      if (!vendasPorCliente[cliente]) {
        vendasPorCliente[cliente] = {
          quantidade: 0,
          valor: 0
        };
      }
      vendasPorCliente[cliente].quantidade += 1;
      vendasPorCliente[cliente].valor += venda.valorTotal || 0;
    });

    const topClientes = Object.entries(vendasPorCliente)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return {
      totalVendas,
      quantidadeVendas,
      ticketMedio,
      produtosMaisVendidos,
      topClientes
    };
  }, [dadosFiltrados, produtos]);

  // Relatório de Compras
  const relatorioCompras = useMemo(() => {
    const { comprasFiltradas } = dadosFiltrados;
    
    const totalCompras = comprasFiltradas.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
    const quantidadeCompras = comprasFiltradas.length;

    // Compras por produto
    const produtosComprados = {};
    comprasFiltradas.forEach(compra => {
      (compra.itens || []).forEach(item => {
        const nome = item.nomeProduto || item.produto;
        
        if (!produtosComprados[nome]) {
          produtosComprados[nome] = {
            quantidade: 0,
            valor: 0
          };
        }
        produtosComprados[nome].quantidade += item.quantidade || 0;
        produtosComprados[nome].valor += (item.quantidade || 0) * (item.valorUnitario || 0);
      });
    });

    const produtosMaisComprados = Object.entries(produtosComprados)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return {
      totalCompras,
      quantidadeCompras,
      produtosMaisComprados
    };
  }, [dadosFiltrados]);

  // Relatório de Estoque
  const relatorioEstoque = useMemo(() => {
    const estoqueTotal = produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    const valorEstoque = produtos.reduce((sum, p) => 
      sum + ((p.quantidade || 0) * (p.precoCompra || 0)), 0);
    
    const estoqueBaixo = produtos.filter(p => 
      (p.quantidade || 0) <= (p.estoqueMinimo || 0)
    ).sort((a, b) => a.quantidade - b.quantidade);

    const produtosSemEstoque = produtos.filter(p => (p.quantidade || 0) === 0);

    const categorias = {};
    produtos.forEach(p => {
      const cat = p.categoria || 'Sem categoria';
      if (!categorias[cat]) {
        categorias[cat] = {
          quantidade: 0,
          produtos: 0,
          valor: 0
        };
      }
      categorias[cat].quantidade += p.quantidade || 0;
      categorias[cat].produtos += 1;
      categorias[cat].valor += (p.quantidade || 0) * (p.precoCompra || 0);
    });

    const categoriasList = Object.entries(categorias)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor);

    return {
      estoqueTotal,
      valorEstoque,
      estoqueBaixo,
      produtosSemEstoque,
      categorias: categoriasList
    };
  }, [produtos]);

  // Relatório de Clientes
  const relatorioClientes = useMemo(() => {
    const totalClientes = clientes.length;
    
    const clientesComCompras = new Set(
      (vendas || []).map(v => v.clienteId).filter(Boolean)
    ).size;

    const clientesSemCompras = totalClientes - clientesComCompras;

    return {
      totalClientes,
      clientesComCompras,
      clientesSemCompras
    };
  }, [clientes, vendas]);

  // Função para exportar relatório em PDF
  const exportarRelatorio = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const hoje = new Date();
    
    // Definir fonte padrão
    doc.setFont('helvetica');
    
    // Calcular período para exibir no cabeçalho
    const { inicio, fim } = calcularPeriodo(periodoSelecionado);
    const dataInicioPeriodo = new Date(inicio);
    const dataFimPeriodo = new Date(fim);
    
    // Usar dados já filtrados pelo sistema
    let dadosParaPDF = [];
    
    if (relatorioAtivo === 'vendas') {
      dadosParaPDF = dadosFiltrados.vendasFiltradas || [];
    } else if (relatorioAtivo === 'compras') {
      dadosParaPDF = dadosFiltrados.comprasFiltradas || [];
    } else if (relatorioAtivo === 'estoque') {
      dadosParaPDF = produtos || [];
    }
    
    // CABEÇALHO COM FUNDO LARANJA
    doc.setFillColor(249, 115, 22); // Laranja do site
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Carregar e adicionar logo
    try {
      const logoBase64 = await getImageBase64('/logo-serra-felix.png');
      doc.addImage(logoBase64, 'PNG', 12, 10, 25, 20); // x, y, width, height - proporções ajustadas
    } catch (error) {
      // Se falhar ao carregar logo, usar texto
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPÓSITO', 20, 18);
      doc.text('CONSTRUÇÃO', 20, 24);
    }
    
    // Resetar cor após logo
    doc.setTextColor(255, 255, 255);
    
    // Linha vertical separadora
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(50, 10, 50, 30);
    
    // Título no cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const tituloRelatorio = `RELATÓRIO DE ${relatorioAtivo.toUpperCase()}`;
    doc.text(tituloRelatorio, pageWidth / 2, 22, { align: 'center' });
    
    // Informações do lado direito do cabeçalho
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${hoje.toLocaleDateString('pt-BR')}`, pageWidth - 15, 18, { align: 'right' });
    doc.text(`Período: ${dataInicioPeriodo.toLocaleDateString('pt-BR')} a ${dataFimPeriodo.toLocaleDateString('pt-BR')}`, pageWidth - 15, 24, { align: 'right' });
    
    // Resetar cor do texto
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 52;
    
    // GERAR CARDS E TABELAS BASEADO NO TIPO DE RELATÓRIO
    if (relatorioAtivo === 'vendas') {
      const totalVendas = dadosParaPDF.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
      const totalItens = dadosParaPDF.reduce((sum, v) => sum + (v.itens?.length || 0), 0);
      const clientesUnicos = new Set(dadosParaPDF.map(v => v.clienteId)).size;
      const ticketMedio = dadosParaPDF.length > 0 ? totalVendas / dadosParaPDF.length : 0;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Card 1: Total de Vendas
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total de Vendas', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 2: Itens Vendidos
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Itens Vendidos', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(totalItens.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 3: Clientes
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Clientes', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(clientesUnicos.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 4: Ticket Médio
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 3, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Ticket Médio por Venda', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Vendas Realizadas', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE VENDAS - Expandida com todos os detalhes
      const tableData = [];
      dadosParaPDF.forEach(venda => {
        if (venda.itens && venda.itens.length > 0) {
          venda.itens.forEach((item, index) => {
            // Buscar informações do produto
            const produto = produtos.find(p => p.id === item.produto);
            
            tableData.push([
              index === 0 ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '',
              index === 0 ? venda.codigoVenda || '-' : '',
              produto?.fornecedor || '-',
              produto?.nome || item.produto || '-',
              produto?.categoria || '-',
              item.quantidade || 0,
              `R$ ${(item.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              index === 0 ? `R$ ${(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
            ]);
          });
        } else {
          tableData.push([
            new Date(venda.dataVenda).toLocaleDateString('pt-BR'),
            venda.codigoVenda || '-',
            '-',
            '-',
            '-',
            0,
            'R$ 0,00',
            `R$ ${(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);
        }
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Nº Venda', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Valor Total']],
        body: tableData,
        foot: [['', '', '', '', '', '', 'Total', `R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          halign: 'right',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2,
          halign: 'center'
        },
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
      
      yPosition = doc.lastAutoTable.finalY + 10;
      
    } else if (relatorioAtivo === 'compras') {
      const totalCompras = dadosParaPDF.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
      const quantidadeTotal = dadosParaPDF.reduce((sum, c) => sum + (c.quantidade || 0), 0);
      const fornecedoresUnicos = new Set(dadosParaPDF.map(c => c.fornecedor)).size;
      const valorMedio = dadosParaPDF.length > 0 ? totalCompras / dadosParaPDF.length : 0;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Card 1: Total de Compras
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total de Compras', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 2: Itens Comprados
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Itens Comprados', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(quantidadeTotal.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 3: Fornecedores Diferentes
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Fornecedores Diferentes', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(fornecedoresUnicos.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 4: Valor Médio por Compra
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 3, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Valor Médio por Compra', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Compras Realizadas', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE COMPRAS
      const tableData = dadosParaPDF.map(compra => {
        const produto = produtos.find(p => p.id === compra.produtoId);
        return [
          new Date(compra.dataCompra).toLocaleDateString('pt-BR'),
          compra.codigoCompra || '-',
          compra.fornecedor || '-',
          produto?.nome || compra.nomeProduto || '-',
          produto?.categoria || '-',
          compra.quantidade || 0,
          `R$ ${(compra.valorCompra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `R$ ${(compra.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Nº Compra', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Valor Total']],
        body: tableData,
        foot: [['', '', '', '', '', quantidadeTotal, '', `R$ ${totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 18 },
          5: { halign: 'center', cellWidth: 12 },
          6: { halign: 'right', cellWidth: 23 },
          7: { halign: 'right', cellWidth: 25 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 10;
      
    } else if (relatorioAtivo === 'estoque') {
      const valorTotal = dadosParaPDF.reduce((sum, p) => sum + ((p.quantidade || 0) * (p.precoVenda || 0)), 0);
      const quantidadeTotal = dadosParaPDF.reduce((sum, p) => sum + (p.quantidade || 0), 0);
      const produtosBaixo = dadosParaPDF.filter(p => (p.quantidade || 0) < (p.estoqueMinimo || 10)).length;
      const produtosSemEstoque = dadosParaPDF.filter(p => (p.quantidade || 0) === 0).length;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Cards similares aos anteriores...
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Valor Total Estoque', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Quantidade Total', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(quantidadeTotal.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Estoque Baixo', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(produtosBaixo.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 3, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Sem Estoque', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(produtosSemEstoque.toString(), startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Produtos em Estoque', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE ESTOQUE
      const tableData = dadosParaPDF.map(produto => [
        produto.nome || '-',
        produto.categoria || '-',
        `${produto.quantidade || 0} ${produto.unidade || ''}`,
        `R$ ${(produto.precoCompra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${(produto.precoVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${((produto.quantidade || 0) * (produto.precoVenda || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Categoria', 'Estoque', 'Preço Compra', 'Preço Venda', 'Valor Total']],
        body: tableData,
        foot: [['', '', quantidadeTotal, '', '', `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
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
      
      yPosition = doc.lastAutoTable.finalY + 10;
    }
    
    // SEÇÃO NOTAS E OBSERVAÇÕES
    if (yPosition < pageHeight - 50) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Notas e Observações:', 18, yPosition + 6);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('• Relatório gerado automaticamente', 18, yPosition + 12);
      doc.text(`• Total de ${dadosParaPDF.length} registro(s) encontrado(s)`, 18, yPosition + 17);
      
      yPosition += 30;
    }
    
    // RODAPÉ
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Gestão | Relatório gerado automaticamente', 15, footerY);
    doc.text(`Página 1 de 1 | ${hoje.toLocaleDateString('pt-BR')} ${hoje.toLocaleTimeString('pt-BR')}`, pageWidth - 15, footerY, { align: 'right' });
    
    // Salvar PDF
    const nomeArquivo = `relatorio_${relatorioAtivo}_${new Date().getTime()}.pdf`;
    doc.save(nomeArquivo);
  };

  // Função para carregar imagem como base64
  const getImageBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  // Função para gerar PDF personalizado
  const gerarPDFPersonalizado = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const hoje = new Date();
    
    // Definir fonte padrão
    doc.setFont('helvetica');
    
    // Calcular período
    let dataInicioPeriodo, dataFimPeriodo;
    const agora = new Date();
    
    switch(filtroPersonalizado.periodo) {
      case 'hoje':
        dataInicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        dataFimPeriodo = agora;
        break;
      case 'semana':
        dataInicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 7);
        dataFimPeriodo = agora;
        break;
      case 'mes':
        dataInicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataFimPeriodo = agora;
        break;
      case 'ano':
        dataInicioPeriodo = new Date(agora.getFullYear(), 0, 1);
        dataFimPeriodo = agora;
        break;
      case 'personalizado':
        dataInicioPeriodo = filtroPersonalizado.dataInicio ? new Date(filtroPersonalizado.dataInicio) : new Date(0);
        dataFimPeriodo = filtroPersonalizado.dataFim ? new Date(filtroPersonalizado.dataFim) : agora;
        break;
      default:
        dataInicioPeriodo = new Date(0);
        dataFimPeriodo = agora;
    }
    
    // Filtrar dados baseado nos critérios
    let dadosFiltrados = [];
    
    if (filtroPersonalizado.tipoRelatorio === 'vendas') {
      dadosFiltrados = vendas.filter(venda => {
        const dataVenda = new Date(venda.dataVenda);
        const dentroData = dataVenda >= dataInicioPeriodo && dataVenda <= dataFimPeriodo;
        const clienteValido = filtroPersonalizado.clientes.filter(id => id).length === 0 || 
                              filtroPersonalizado.clientes.includes(venda.clienteId);
        const statusValido = filtroPersonalizado.status === 'todos' || venda.status === filtroPersonalizado.status;
        let produtoValido = true;
        if (filtroPersonalizado.produtos.filter(id => id).length > 0) {
          produtoValido = venda.itens?.some(item => filtroPersonalizado.produtos.includes(item.produto));
        }
        return dentroData && clienteValido && statusValido && produtoValido;
      });
    } else if (filtroPersonalizado.tipoRelatorio === 'compras') {
      dadosFiltrados = compras.filter(compra => {
        const dataCompra = new Date(compra.dataCompra);
        const dentroData = dataCompra >= dataInicioPeriodo && dataCompra <= dataFimPeriodo;
        let produtoValido = true;
        if (filtroPersonalizado.produtos.filter(id => id).length > 0) {
          produtoValido = filtroPersonalizado.produtos.includes(compra.produtoId);
        }
        return dentroData && produtoValido;
      });
    } else if (filtroPersonalizado.tipoRelatorio === 'estoque') {
      dadosFiltrados = produtos.filter(produto => {
        return filtroPersonalizado.produtos.filter(id => id).length === 0 || 
               filtroPersonalizado.produtos.includes(produto.id);
      });
    }
    
    // CABEÇALHO COM FUNDO LARANJA
    doc.setFillColor(249, 115, 22); // Laranja do site
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Carregar e adicionar logo
    try {
      const logoBase64 = await getImageBase64('/logo-serra-felix.png');
      doc.addImage(logoBase64, 'PNG', 12, 10, 25, 20); // x, y, width, height - proporções ajustadas
    } catch (error) {
      // Se falhar ao carregar logo, usar texto
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPÓSITO', 20, 18);
      doc.text('CONSTRUÇÃO', 20, 24);
    }
    
    // Resetar cor após logo
    doc.setTextColor(255, 255, 255);
    
    // Linha vertical separadora
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(50, 10, 50, 30);
    
    // Título no cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const tituloRelatorio = `RELATÓRIO DE ${filtroPersonalizado.tipoRelatorio.toUpperCase()}`;
    doc.text(tituloRelatorio, pageWidth / 2, 22, { align: 'center' });
    
    // Informações do lado direito do cabeçalho
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${hoje.toLocaleDateString('pt-BR')}`, pageWidth - 15, 18, { align: 'right' });
    doc.text(`Período: ${dataInicioPeriodo.toLocaleDateString('pt-BR')} a ${dataFimPeriodo.toLocaleDateString('pt-BR')}`, pageWidth - 15, 24, { align: 'right' });
    
    // Resetar cor do texto
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 52;
    
    // CARDS DE RESUMO
    if (filtroPersonalizado.tipoRelatorio === 'vendas') {
      const totalVendas = dadosFiltrados.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
      const totalItens = dadosFiltrados.reduce((sum, v) => sum + (v.itens?.length || 0), 0);
      const clientesUnicos = new Set(dadosFiltrados.map(v => v.clienteId)).size;
      const ticketMedio = dadosFiltrados.length > 0 ? totalVendas / dadosFiltrados.length : 0;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Card 1: Total de Vendas
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total de Vendas', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 2: Itens Vendidos
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Itens Vendidos', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(totalItens.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 3: Clientes
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Clientes', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(clientesUnicos.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 4: Ticket Médio
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 3, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Ticket Médio por Venda', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Vendas Realizadas', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE VENDAS - Expandida com todos os detalhes
      const tableData = [];
      dadosFiltrados.forEach(venda => {
        if (venda.itens && venda.itens.length > 0) {
          venda.itens.forEach((item, index) => {
            // Buscar informações do produto
            const produto = produtos.find(p => p.id === item.produto);
            
            tableData.push([
              index === 0 ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '',
              index === 0 ? venda.codigoVenda || '-' : '',
              produto?.fornecedor || '-',
              produto?.nome || item.produto || '-',
              produto?.categoria || '-',
              item.quantidade || 0,
              `R$ ${(item.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              index === 0 ? `R$ ${(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
            ]);
          });
        } else {
          tableData.push([
            new Date(venda.dataVenda).toLocaleDateString('pt-BR'),
            venda.codigoVenda || '-',
            '-',
            '-',
            '-',
            0,
            'R$ 0,00',
            `R$ ${(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);
        }
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Nº Venda', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Valor Total']],
        body: tableData,
        foot: [['', '', '', '', '', '', 'Total', `R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          halign: 'right',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2,
          halign: 'center'
        },
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
      
      yPosition = doc.lastAutoTable.finalY + 10;
      
    } else if (filtroPersonalizado.tipoRelatorio === 'compras') {
      const totalCompras = dadosFiltrados.reduce((sum, c) => sum + (c.valorTotal || 0), 0);
      const quantidadeTotal = dadosFiltrados.reduce((sum, c) => sum + (c.quantidade || 0), 0);
      const fornecedoresUnicos = new Set(dadosFiltrados.map(c => c.fornecedor)).size;
      const valorMedio = dadosFiltrados.length > 0 ? totalCompras / dadosFiltrados.length : 0;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Card 1: Total de Compras
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total de Compras', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 2: Itens Comprados
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Itens Comprados', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(quantidadeTotal.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 3: Fornecedores Diferentes
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Fornecedores Diferentes', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(fornecedoresUnicos.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Card 4: Valor Médio por Compra
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Valor Médio por Compra', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Compras Realizadas', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE COMPRAS
      const tableData = dadosFiltrados.map(compra => {
        const produto = produtos.find(p => p.id === compra.produtoId);
        return [
          new Date(compra.dataCompra).toLocaleDateString('pt-BR'),
          compra.codigoCompra || '-',
          compra.fornecedor || '-',
          produto?.nome || compra.nomeProduto || '-',
          produto?.categoria || '-',
          compra.quantidade || 0,
          `R$ ${(compra.valorCompra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `R$ ${(compra.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Nº Compra', 'Fornecedor', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Valor Total']],
        body: tableData,
        foot: [['', '', '', '', '', quantidadeTotal, '', `R$ ${totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 18 },
          5: { halign: 'center', cellWidth: 12 },
          6: { halign: 'right', cellWidth: 23 },
          7: { halign: 'right', cellWidth: 25 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 10;
      
    } else if (filtroPersonalizado.tipoRelatorio === 'estoque') {
      const valorTotal = dadosFiltrados.reduce((sum, p) => sum + ((p.quantidade || 0) * (p.precoVenda || 0)), 0);
      const quantidadeTotal = dadosFiltrados.reduce((sum, p) => sum + (p.quantidade || 0), 0);
      const produtosBaixo = dadosFiltrados.filter(p => (p.quantidade || 0) < (p.estoqueMinimo || 10)).length;
      const produtosSemEstoque = dadosFiltrados.filter(p => (p.quantidade || 0) === 0).length;
      
      // Cards em grid centralizados
      const cardWidth = 45;
      const cardHeight = 22;
      const cardSpacing = 5;
      const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
      const startX = (pageWidth - totalCardsWidth) / 2;
      
      // Cards similares aos anteriores...
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Valor Total Estoque', startX + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(`R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + cardWidth + cardSpacing, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Quantidade Total', startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(quantidadeTotal.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 2, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Estoque Baixo', startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(produtosBaixo.toString(), startX + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX + (cardWidth + cardSpacing) * 3, yPosition, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Sem Estoque', startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text(produtosSemEstoque.toString(), startX + (cardWidth + cardSpacing) * 3 + cardWidth / 2, yPosition + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += cardHeight + 12;
      
      // TÍTULO DA SEÇÃO
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Produtos em Estoque', 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
      
      // TABELA DE ESTOQUE
      const tableData = dadosFiltrados.map(produto => [
        produto.nome || '-',
        produto.categoria || '-',
        `${produto.quantidade || 0} ${produto.unidade || ''}`,
        `R$ ${(produto.precoCompra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${(produto.precoVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${((produto.quantidade || 0) * (produto.precoVenda || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Categoria', 'Estoque', 'Preço Compra', 'Preço Venda', 'Valor Total']],
        body: tableData,
        foot: [['', '', quantidadeTotal, '', '', `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 8
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [249, 115, 22],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237]
        },
        styles: { 
          font: 'helvetica',
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
      
      yPosition = doc.lastAutoTable.finalY + 10;
    }
    
    // SEÇÃO NOTAS E OBSERVAÇÕES
    if (yPosition < pageHeight - 50) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Notas e Observações:', 18, yPosition + 6);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('• Relatório gerado automaticamente', 18, yPosition + 12);
      doc.text(`• Total de ${dadosFiltrados.length} registro(s) encontrado(s)`, 18, yPosition + 17);
      
      yPosition += 30;
    }
    
    // RODAPÉ
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Gestão | Relatório gerado automaticamente', 15, footerY);
    doc.text(`Página 1 de 1 | ${hoje.toLocaleDateString('pt-BR')} ${hoje.toLocaleTimeString('pt-BR')}`, pageWidth - 15, footerY, { align: 'right' });
    
    // Salvar PDF
    const nomeArquivo = `relatorio_${filtroPersonalizado.tipoRelatorio}_${new Date().getTime()}.pdf`;
    doc.save(nomeArquivo);
    
    setShowModalPersonalizado(false);
  };

  return (
    <PageLayout title="Relatórios">
      <div className="space-y-6">
        {/* Filtros de Período */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Período do Relatório</h2>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Período
              </label>
              <select
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Este Mês</option>
                <option value="ano">Este Ano</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {periodoSelecionado === 'personalizado' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </>
            )}

            <button
              onClick={exportarRelatorio}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Download size={18} />
              Exportar
            </button>
            
            <button
              onClick={() => setShowModalPersonalizado(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Filter size={18} />
              Relatório Personalizado
            </button>
          </div>
        </div>

        {/* Seleção de Tipo de Relatório */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setRelatorioAtivo('vendas')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'vendas'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <TrendingUp className={`w-8 h-8 mb-2 ${relatorioAtivo === 'vendas' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Vendas</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('compras')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'compras'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <FileText className={`w-8 h-8 mb-2 ${relatorioAtivo === 'compras' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Compras</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('estoque')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'estoque'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <Package className={`w-8 h-8 mb-2 ${relatorioAtivo === 'estoque' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Estoque</h3>
          </button>

          <button
            onClick={() => setRelatorioAtivo('clientes')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 ${
              relatorioAtivo === 'clientes'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            <Users className={`w-8 h-8 mb-2 ${relatorioAtivo === 'clientes' ? 'text-orange-500' : 'text-slate-400'}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Clientes</h3>
          </button>
        </div>

        {/* Conteúdo do Relatório */}
        {relatorioAtivo === 'vendas' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Total de Vendas</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  R$ {relatorioVendas.totalVendas.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Quantidade de Vendas</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioVendas.quantidadeVendas}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Ticket Médio</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {relatorioVendas.ticketMedio.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Produtos Mais Vendidos */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Produtos Mais Vendidos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Produto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioVendas.produtosMaisVendidos.map((produto, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">
                          R$ {produto.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Clientes */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Clientes</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Cliente</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Compras</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioVendas.topClientes.map((cliente, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{cliente.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cliente.quantidade}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">
                          R$ {cliente.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {relatorioAtivo === 'compras' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Total de Compras</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  R$ {relatorioCompras.totalCompras.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Quantidade de Compras</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioCompras.quantidadeCompras}
                </p>
              </div>
            </div>

            {/* Produtos Mais Comprados */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Produtos Mais Comprados</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Produto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioCompras.produtosMaisComprados.map((produto, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{produto.quantidade}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
                          R$ {produto.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {relatorioAtivo === 'estoque' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Estoque Total</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioEstoque.estoqueTotal}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Valor do Estoque</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {relatorioEstoque.valorEstoque.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Estoque Baixo</h3>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {relatorioEstoque.estoqueBaixo.length}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Sem Estoque</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {relatorioEstoque.produtosSemEstoque.length}
                </p>
              </div>
            </div>

            {/* Categorias */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Estoque por Categoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Categoria</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Produtos</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Quantidade</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioEstoque.categorias.map((cat, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{cat.nome}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cat.produtos}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white">{cat.quantidade}</td>
                        <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-medium">
                          R$ {cat.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Produtos com Estoque Baixo */}
            {relatorioEstoque.estoqueBaixo.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Produtos com Estoque Baixo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Produto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Estoque Atual</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-white">Estoque Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioEstoque.estoqueBaixo.map((produto, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{produto.nome}</td>
                          <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
                            {produto.quantidade}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                            {produto.estoqueMinimo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {relatorioAtivo === 'clientes' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Total de Clientes</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {relatorioClientes.totalClientes}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Clientes Ativos</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {relatorioClientes.clientesComCompras}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-600 dark:text-white mb-2">Sem Compras</h3>
                <p className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                  {relatorioClientes.clientesSemCompras}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Relatório Personalizado */}
      <Modal
        isOpen={showModalPersonalizado}
        onClose={() => setShowModalPersonalizado(false)}
        title="Gerar Relatório Personalizado"
        size="lg"
      >
        <div className="space-y-6">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Relatório *
            </label>
            <select
              value={filtroPersonalizado.tipoRelatorio}
              onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, tipoRelatorio: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vendas">Vendas</option>
              <option value="compras">Compras</option>
              <option value="estoque">Estoque</option>
              <option value="clientes">Clientes</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Período *
            </label>
            <select
              value={filtroPersonalizado.periodo}
              onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, periodo: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Última Semana</option>
              <option value="mes">Este Mês</option>
              <option value="ano">Este Ano</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Datas Personalizadas */}
          {filtroPersonalizado.periodo === 'personalizado' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={filtroPersonalizado.dataInicio}
                  onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, dataInicio: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={filtroPersonalizado.dataFim}
                  onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, dataFim: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Filtro de Clientes */}
          {(filtroPersonalizado.tipoRelatorio === 'vendas' || filtroPersonalizado.tipoRelatorio === 'clientes') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Clientes (opcional)
              </label>
              <div className="relative">
                <details className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 list-none">
                    {filtroPersonalizado.clientes.filter(id => id).length === 0 ? (
                      <span className="text-slate-500">Todos os clientes</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">
                        {filtroPersonalizado.clientes.filter(id => id).length} cliente(s) selecionado(s)
                      </span>
                    )}
                  </summary>
                  <div className="border-t border-slate-200 dark:border-slate-600">
                    {/* Campo de pesquisa */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Lista de clientes */}
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {clientes
                        .filter(cliente => 
                          cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
                        )
                        .map(cliente => (
                      <label
                        key={cliente.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filtroPersonalizado.clientes.includes(cliente.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                clientes: [...filtroPersonalizado.clientes, cliente.id]
                              });
                            } else {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                clientes: filtroPersonalizado.clientes.filter(id => id !== cliente.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-900 dark:text-slate-100">{cliente.nome}</span>
                      </label>
                    ))}
                      {clientes.filter(cliente => 
                        cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
                      ).length === 0 && (
                        <p className="text-center text-slate-500 dark:text-white py-3 text-sm">
                          Nenhum cliente encontrado
                        </p>
                      )}
                    </div>
                  </div>
                </details>
                
                {/* Tags dos clientes selecionados */}
                {filtroPersonalizado.clientes.filter(id => id).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filtroPersonalizado.clientes.filter(id => id).map(clienteId => {
                      const cliente = clientes.find(c => c.id === clienteId);
                      if (!cliente) return null;
                      return (
                        <div
                          key={clienteId}
                          className="group flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          onClick={() => {
                            setFiltroPersonalizado({
                              ...filtroPersonalizado,
                              clientes: filtroPersonalizado.clientes.filter(id => id !== clienteId)
                            });
                          }}
                        >
                          <span>{cliente.nome}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filtro de Produtos */}
          {(filtroPersonalizado.tipoRelatorio === 'vendas' || filtroPersonalizado.tipoRelatorio === 'compras' || filtroPersonalizado.tipoRelatorio === 'estoque') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Produtos (opcional)
              </label>
              <div className="relative">
                <details className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 list-none">
                    {filtroPersonalizado.produtos.filter(id => id).length === 0 ? (
                      <span className="text-slate-500">Todos os produtos</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">
                        {filtroPersonalizado.produtos.filter(id => id).length} produto(s) selecionado(s)
                      </span>
                    )}
                  </summary>
                  <div className="border-t border-slate-200 dark:border-slate-600">
                    {/* Campo de pesquisa */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={buscaProduto}
                        onChange={(e) => setBuscaProduto(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Lista de produtos */}
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {produtos
                        .filter(produto => 
                          produto.nome.toLowerCase().includes(buscaProduto.toLowerCase())
                        )
                        .map(produto => (
                      <label
                        key={produto.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filtroPersonalizado.produtos.includes(produto.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                produtos: [...filtroPersonalizado.produtos, produto.id]
                              });
                            } else {
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                produtos: filtroPersonalizado.produtos.filter(id => id !== produto.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-900 dark:text-slate-100">{produto.nome}</span>
                      </label>
                    ))}
                      {produtos.filter(produto => 
                        produto.nome.toLowerCase().includes(buscaProduto.toLowerCase())
                      ).length === 0 && (
                        <p className="text-center text-slate-500 dark:text-white py-3 text-sm">
                          Nenhum produto encontrado
                        </p>
                      )}
                    </div>
                  </div>
                </details>
                
                {/* Tags dos produtos selecionados */}
                {filtroPersonalizado.produtos.filter(id => id).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filtroPersonalizado.produtos.filter(id => id).map(produtoId => {
                      const produto = produtos.find(p => p.id === produtoId);
                      if (!produto) return null;
                      return (
                        <div
                          key={produtoId}
                          className="group flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          onClick={() => {
                            setFiltroPersonalizado({
                              ...filtroPersonalizado,
                              produtos: filtroPersonalizado.produtos.filter(id => id !== produtoId)
                            });
                          }}
                        >
                          <span>{produto.nome}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filtro de Status (apenas para vendas) */}
          {filtroPersonalizado.tipoRelatorio === 'vendas' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={filtroPersonalizado.status}
                onChange={(e) => setFiltroPersonalizado({ ...filtroPersonalizado, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="concluida">Concluídas</option>
                <option value="em_andamento">Fiado</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowModalPersonalizado(false)}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={gerarPDFPersonalizado}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Gerar PDF
            </button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}