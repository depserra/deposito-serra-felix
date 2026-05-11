import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  BorderStyle,
  VerticalAlign,
  AlignmentType,
  TextRun,
  WidthType,
  ShadingType
} from 'docx';
import { EMPRESA } from '../constants/index';
import { formatCurrency, formatarData } from './formatters';

/**
 * Gera uma nota de venda em Word
 */
export async function gerarNotaVendaWord(venda, cliente = {}) {
  try {
    const doc = new Document({
      sections: [{
        children: [
          criarCabecalho(),
          paragrafoVazio(),

          // Título
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'NOTA DE VENDA', bold: true, size: 28, color: 'FFFFFF' })
                        ]
                      })
                    ],
                    shading: { fill: 'F97316', type: ShadingType.CLEAR },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                  })
                ]
              })
            ]
          }),

          paragrafoVazio(),

          // Dados da venda
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              criarLinhaInfo('Número da Venda:', String(venda.codigoVenda || '-')),
              criarLinhaInfo('Data:', formatarData(new Date(venda.dataVenda))),
              criarLinhaInfo('Hora:', new Date(venda.dataVenda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
            ]
          }),

          paragrafoVazio(),

          // Seção cliente
          criarTitulo('DADOS DO CLIENTE'),
          paragrafoVazio(),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              criarLinhaInfo('Nome:', cliente.nome || venda.clienteNome || 'Consumidor Final'),
              criarLinhaInfo(cliente.cpf ? 'CPF:' : 'CNPJ:', cliente.cpf || cliente.cnpj || '-'),
              ...(cliente.endereco ? [criarLinhaInfo('Endereço:', cliente.endereco)] : []),
              ...(cliente.telefone ? [criarLinhaInfo('Telefone:', cliente.telefone)] : []),
              ...(cliente.email ? [criarLinhaInfo('Email:', cliente.email)] : []),
            ]
          }),

          paragrafoVazio(),

          // Itens
          criarTitulo('ITENS DA VENDA'),
          paragrafoVazio(),
          criarTabelaItens(venda),

          paragrafoVazio(),

          // Resumo
          criarTitulo('RESUMO FINANCEIRO'),
          paragrafoVazio(),
          criarTabelaResumo(venda),

          paragrafoVazio(),

          // Pagamento
          criarTitulo('FORMA DE PAGAMENTO'),
          paragrafoVazio(),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              criarLinhaInfo('Forma de Pagamento:', obterFormaPagamento(venda.formaPagamento)),
              ...(venda.status === 'parcelado' && venda.parcelamento?.numeroParcelas
                ? [criarLinhaInfo('Parcelamento:', `${venda.parcelamento.numeroParcelas}x de ${formatCurrency(venda.parcelamento.valorParcela || 0)}`)]
                : [])
            ]
          }),

          // Observações
          ...(venda.observacoes ? [
            paragrafoVazio(),
            criarTitulo('OBSERVAÇÕES'),
            paragrafoVazio(),
            new Paragraph({
              spacing: { before: 100, after: 100, line: 240 },
              children: [new TextRun({ text: venda.observacoes, size: 20 })]
            })
          ] : []),

          paragrafoVazio(),
          paragrafoVazio(),

          criarRodape()
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NotaVenda_${venda.codigoVenda}_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao gerar nota de venda:', error);
    throw error;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function paragrafoVazio() {
  return new Paragraph({ children: [new TextRun({ text: '' })] });
}

function criarTitulo(texto) {
  return new Paragraph({
    border: { bottom: { color: 'F97316', space: 1, style: BorderStyle.SINGLE, size: 12 } },
    spacing: { after: 100 },
    children: [new TextRun({ text: texto, bold: true, size: 22 })]
  });
}

function criarLinhaInfo(label, valor) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 18 })]
          })
        ],
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 80, right: 80 }
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: valor || '-', size: 18 })]
          })
        ],
        width: { size: 70, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 80, right: 80 }
      })
    ]
  });
}

function criarCabecalho() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: EMPRESA.NOME, bold: true, size: 32, color: 'FFFFFF' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `CNPJ: ${EMPRESA.CNPJ}`, size: 18, color: 'FFFFFF' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: EMPRESA.ENDERECO, size: 18, color: 'FFFFFF' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `Tel: ${EMPRESA.TELEFONE} | Email: ${EMPRESA.EMAIL}`, size: 18, color: 'FFFFFF' })]
              })
            ],
            shading: { fill: 'F97316', type: ShadingType.CLEAR },
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      })
    ]
  });
}

function criarTabelaItens(venda) {
  const cabecalho = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Descrição', bold: true, size: 18, color: 'FFFFFF' })] })],
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qtd', bold: true, size: 18, color: 'FFFFFF' })] })],
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        width: { size: 15, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Valor Un.', bold: true, size: 18, color: 'FFFFFF' })] })],
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        width: { size: 20, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Total', bold: true, size: 18, color: 'FFFFFF' })] })],
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        width: { size: 20, type: WidthType.PERCENTAGE }
      })
    ]
  });

  const linhasItens = (venda.itens && Array.isArray(venda.itens) ? venda.itens : []).map((item, index) => {
    const subtotal = (parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario) || 0);
    const bg = index % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: item.produto || 'Produto', size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: bg, type: ShadingType.CLEAR }
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.quantidade || '0'), size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: bg, type: ShadingType.CLEAR },
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(item.valorUnitario || 0), size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: bg, type: ShadingType.CLEAR },
          width: { size: 20, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(subtotal), bold: true, size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: bg, type: ShadingType.CLEAR },
          width: { size: 20, type: WidthType.PERCENTAGE }
        })
      ]
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalho, ...linhasItens]
  });
}

function criarTabelaResumo(venda) {
  const subtotal = (venda.itens && Array.isArray(venda.itens))
    ? venda.itens.reduce((acc, item) => acc + ((parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario) || 0)), 0)
    : 0;

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Subtotal:', bold: true, size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          width: { size: 70, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(subtotal), size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          width: { size: 30, type: WidthType.PERCENTAGE }
        })
      ]
    })
  ];

  if (venda.desconto && parseFloat(venda.desconto) > 0) {
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Desconto:', bold: true, size: 18, color: 'DC2626' })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `- ${formatCurrency(venda.desconto)}`, bold: true, size: 18, color: 'DC2626' })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 }
        })
      ]
    }));
  }

  if (venda.formaPagamento === 'cartao_credito' && venda.cartaoCredito?.taxaJuros && parseFloat(venda.cartaoCredito.taxaJuros) > 0) {
    const juros = (subtotal * parseFloat(venda.cartaoCredito.taxaJuros)) / 100;
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Juros:', bold: true, size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(juros), size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 80, right: 80 }
        })
      ]
    }));
  }

  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL:', bold: true, size: 22, color: 'FFFFFF' })] })],
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        width: { size: 70, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(venda.valorTotal || 0), bold: true, size: 22, color: 'FFFFFF' })] })],
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        shading: { fill: 'F97316', type: ShadingType.CLEAR },
        width: { size: 30, type: WidthType.PERCENTAGE }
      })
    ]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  });
}

function obterFormaPagamento(tipo) {
  const formas = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'cheque': 'Cheque',
    'pix': 'PIX',
    'nota_credito': 'Nota de Crédito',
    'boleto': 'Boleto'
  };
  return formas[tipo] || tipo || '-';
}

function criarRodape() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: EMPRESA.MENSAGEM_RODAPE, bold: true, size: 20, color: 'F97316' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: [new TextRun({
                  text: `Emitido em ${formatarData(new Date())} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                  size: 16,
                  color: '6B7280'
                })]
              })
            ],
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
            shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }
          })
        ]
      })
    ]
  });
}

export async function imprimirNotaVendaWord(venda, cliente = {}) {
  return gerarNotaVendaWord(venda, cliente);
}