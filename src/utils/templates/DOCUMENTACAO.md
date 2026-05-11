# Template de Comprovante de Venda - Documentação

## 📋 Visão Geral

Este é um template profissional de comprovante de venda em HTML + CSS, otimizado para geração de PDF com Puppeteer e compatível com impressão em navegadores.

## 🎯 Características

- ✅ Layout A4 profissional
- ✅ Cores corporativas (Laranja #FF6B00 + Preto/Grafite)
- ✅ Design minimalista e moderno
- ✅ Compatível com Puppeteer
- ✅ Otimizado para impressão
- ✅ Responsivo e profissional
- ✅ Sem dependências de frameworks

## 📁 Estrutura de Arquivos

```
src/utils/
├── templates/
│   └── comprovanteVendaTemplate.html    ← Template HTML
├── gerarComprovanteVenda.js             ← Funções de geração
└── formatters.js                        ← Utilitários
```

## 🚀 Como Usar

### 1. **Importar no seu código**

```javascript
import { imprimirComprovanteVenda } from './utils/gerarComprovanteVenda.js';
```

### 2. **Usar a função para imprimir**

```javascript
const venda = {
  codigoVenda: '000245',
  dataVenda: new Date(),
  clienteNome: 'João Victor da Silva',
  valorTotal: 890.00,
  desconto: 144.60,
  formaPagamento: 'pix',
  status: 'concluida',
  itens: [
    {
      produtoCodigo: '00123',
      produtoNome: 'CIMENTO CP II 50KG',
      unidade: 'SC',
      quantidade: 2,
      valorUnitario: 32.90
    },
    {
      produtoCodigo: '00234',
      produtoNome: 'AREIA FINA LAVADA M³',
      unidade: 'M³',
      quantidade: 1,
      valorUnitario: 120.00
    }
  ]
};

const cliente = {
  nome: 'João Victor da Silva',
  cpfCnpj: '123.456.789-00',
  endereco: 'Rua das Flores, 123 - Centro',
  cidade: 'Chorozinho',
  estado: 'CE',
  cep: '62.875-000',
  telefone: '(85) 9 8888-8888'
};

// Abre na página de impressão do navegador
await imprimirComprovanteVenda(venda, cliente);
```

## 📊 Estrutura de Dados Esperada

### Objeto de Venda

```javascript
{
  codigoVenda: string,           // Número único da venda
  dataVenda: Date,               // Data/hora da venda
  clienteNome: string,           // Nome do cliente
  valorTotal: number,            // Valor total da venda
  desconto: number,              // Valor do desconto (opcional)
  formaPagamento: string,        // 'pix', 'dinheiro', 'cartao_credito', etc
  status: string,                // 'concluida', 'em_andamento', 'parcelado', 'cancelada'
  troco: number,                 // Valor do troco (opcional)
  observacoes: string,           // Observações adicionais (opcional)
  itens: [
    {
      produtoCodigo: string,     // Código do produto
      produtoNome: string,       // Nome do produto
      unidade: string,           // Unidade (SC, M³, UN, etc)
      quantidade: number,        // Quantidade vendida
      valorUnitario: number      // Preço unitário
    }
  ]
}
```

### Objeto de Cliente

```javascript
{
  nome: string,                  // Nome ou razão social
  cpfCnpj: string,              // CPF ou CNPJ
  endereco: string,             // Endereço completo
  cidade: string,               // Cidade
  estado: string,               // UF (CE, SP, RJ, etc)
  cep: string,                  // CEP
  telefone: string              // Telefone
}
```

## 🎨 Placeholders do Template

O template usa placeholders que são substituídos dinamicamente:

| Placeholder | Descrição |
|---|---|
| `{{venda_numero}}` | Número do comprovante |
| `{{data_venda}}` | Data formatada |
| `{{hora_venda}}` | Hora formatada |
| `{{cliente_nome}}` | Nome do cliente |
| `{{cliente_cpf_cnpj}}` | CPF ou CNPJ |
| `{{cliente_endereco}}` | Endereço |
| `{{cliente_cidade}}` | Cidade |
| `{{cliente_uf}}` | Estado |
| `{{cliente_cep}}` | CEP |
| `{{cliente_telefone}}` | Telefone |
| `{{produtos_linhas}}` | Linhas da tabela de produtos |
| `{{subtotal}}` | Subtotal formatado |
| `{{desconto_linha}}` | Linha de desconto (HTML) |
| `{{total_geral}}` | Total formatado |
| `{{forma_pagamento}}` | Forma de pagamento |
| `{{valor_pago}}` | Valor pago |
| `{{troco}}` | Valor do troco |
| `{{situacao_pagamento}}` | Situação (PAGO, FIADO, etc) |

## 💻 Integração com React

Se estiver usando na aplicação React (vendas/index.jsx), já existe a integração pronta:

```javascript
const handleImprimirComprovante = useCallback(async () => {
  try {
    const cliente = obterClienteCompleto(vendaDetalhes.clienteId);
    await imprimirComprovanteVenda(vendaDetalhes, cliente || {});
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    alert('Erro ao imprimir comprovante: ' + error.message);
  }
}, [vendaDetalhes, obterClienteCompleto]);
```

## 🖨️ Fluxo de Impressão

1. ✅ Usuário clica no botão "Imprimir Comprovante"
2. ✅ Template HTML é gerado com dados da venda
3. ✅ HTML é convertido em Blob
4. ✅ Uma nova janela é aberta com o documento
5. ✅ Dialog de impressão do navegador é acionado
6. ✅ Usuário pode:
   - **Imprimir** para impressora
   - **Salvar como PDF** (Ctrl+S ou File → Save as PDF)
   - **Cancelar** operação

## 📱 Responsividade

O template é otimizado para:
- ✅ Impressão A4
- ✅ Visualização em navegadores
- ✅ PDF (via Puppeteer)
- ✅ Diferentes tamanhos de papel

## 🎯 Mapeamento de Forma de Pagamento

| Valor no Banco | Exibição |
|---|---|
| `pix` | PIX |
| `dinheiro` | Dinheiro |
| `cartao_credito` | Cartão de Crédito |
| `cartao_debito` | Cartão de Débito |
| `cheque` | Cheque |
| `fiado` | Fiado |

## 🎯 Mapeamento de Status

| Status | Situação |
|---|---|
| `em_andamento` | FIADO |
| `concluida` | PAGO |
| `parcelado` | PARCELADO |
| `cancelada` | CANCELADO |

## 📐 Especificações Técnicas

- **Formato**: A4 (210mm × 297mm)
- **Margens**: 20mm em todos os lados
- **Fonte Principal**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Cor Primária**: #FF6B00 (Laranja)
- **Cor Secundária**: #333333 (Preto)
- **Altura da tabela**: 8mm por linha

## ⚙️ Funções Disponíveis

### `gerarComprovanteVenda(venda, cliente)`
Gera o HTML e abre dialog de impressão do navegador.

```javascript
await gerarComprovanteVenda(venda, cliente);
```

### `imprimirComprovanteVenda(venda, cliente)`
Alias para `gerarComprovanteVenda`. Mantém compatibilidade com código existente.

```javascript
await imprimirComprovanteVenda(venda, cliente);
```

## 🔄 Compatibilidade com Puppeteer (Node.js)

Para usar com Puppeteer no servidor Node.js, será necessário expandir o arquivo `gerarComprovanteVenda.js` com funções adicionais:

```javascript
import puppeteer from 'puppeteer';

export async function gerarPDFComprovanteVenda(venda, cliente = {}) {
  let browser;
  try {
    const html = gerarHTMLComprovante(venda, cliente);
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}
```

## 🐛 Troubleshooting

### Dialog de impressão não abre
- Verifique se popups estão bloqueados no navegador
- Teste em uma aba privada/anônima
- Libere popups para o domínio

### Template aparece em branco
- Verifique se o arquivo `comprovanteVendaTemplate.html` existe em `src/utils/templates/`
- Confirme se o caminho está correto
- Verifique se o arquivo não está corrompido

### Dados não aparecem no comprovante
- Certifique-se de que todos os campos obrigatórios estão preenchidos
- Valide o formato dos dados (datas, números)
- Verifique se os placeholders correspondem aos dados

### PDF gerado com Puppeteer está vazio
- Adicione `waitUntil: 'networkidle0'` na função `setContent`
- Aumente o timeout para 30000ms
- Teste com HTML simples primeiro

## 📝 Notas Importantes

1. **Empresa**: Os dados da empresa são fixos no template (Serra do Félix)
2. **Sem Valor Fiscal**: O rodapé indica que não é documento fiscal
3. **Crédito**: Aparece "Sistema Gestão Fácil" no rodapé
4. **Impressão**: Otimizado para impressoras A4

## 🔐 Segurança

- Sem dependências externas perigosas
- Sem execução de scripts dinâmicos
- Dados processados no lado do cliente
- Template estático com substituição de strings

## 📞 Suporte

Se encontrar problemas, verifique:
- ✅ Estrutura de dados está correta
- ✅ Arquivo do template existe
- ✅ Formatter de moeda está funcionando
- ✅ Navegador não está bloqueando popups
