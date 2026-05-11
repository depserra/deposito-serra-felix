# 📄 Novo Template de Comprovante de Venda

## ✨ O que foi criado?

Um template HTML + CSS profissional para geração de comprovantes de venda, totalmente customizável e pronto para impressão/PDF.

## 📦 Arquivos Criados

```
src/utils/templates/
├── comprovanteVendaTemplate.html    → Template HTML com CSS embutido
├── DOCUMENTACAO.md                   → Documentação completa
├── EXEMPLOS_NODEJS.js               → Exemplos de integração com Node.js
└── README.md                         → Este arquivo
```

## 🎯 Principais Características

✅ **Layout A4 Profissional**
- Dimensões corretas para impressão
- Margens otimizadas (20mm)
- Design minimalista

✅ **Design Corporativo**
- Cores da marca (Laranja #FF6B00 + Preto)
- Tipografia moderna
- Espaçamento profissional

✅ **Totalmente Dinâmico**
- Todos os dados são substituídos por placeholders
- Suporta produtos variáveis
- Desconto opcional

✅ **Compatibilidade**
- ✓ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✓ Impressão direta
- ✓ Salvar como PDF
- ✓ Puppeteer (Node.js)

✅ **Sem Dependências**
- HTML puro
- CSS moderno (Flexbox)
- Zero frameworks

## 🚀 Como Usar

### No React (Vendas)

O código já está integrado! A função `imprimirComprovanteVenda` já usa o novo template:

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

### Usar em outro lugar

```javascript
import { imprimirComprovanteVenda } from './utils/gerarComprovanteVenda.js';

// Preparar dados
const venda = {
  codigoVenda: '000245',
  dataVenda: new Date(),
  clienteNome: 'João Victor',
  valorTotal: 890.00,
  formaPagamento: 'pix',
  status: 'concluida',
  itens: [
    {
      produtoCodigo: '00123',
      produtoNome: 'Cimento',
      unidade: 'SC',
      quantidade: 2,
      valorUnitario: 32.90
    }
  ]
};

const cliente = {
  nome: 'João Victor',
  cpfCnpj: '123.456.789-00',
  endereco: 'Rua das Flores, 123',
  cidade: 'Chorozinho',
  estado: 'CE',
  cep: '62.875-000',
  telefone: '(85) 9 8888-8888'
};

// Imprimir
await imprimirComprovanteVenda(venda, cliente);
```

## 📋 Fluxo de Impressão

1. Usuário clica em **"Imprimir Comprovante"**
2. Template HTML é gerado com dados da venda
3. Uma nova janela/aba abre com o documento
4. Dialog de impressão aparece automaticamente
5. Usuário pode:
   - **Imprimir** para impressora
   - **Salvar como PDF** (Ctrl+S)
   - **Cancelar**

## 📊 Estrutura de Dados

### Venda
```javascript
{
  codigoVenda: '000245',
  dataVenda: Date,
  clienteNome: 'João',
  valorTotal: 890.00,
  desconto: 144.60,           // Opcional
  formaPagamento: 'pix',      // pix, dinheiro, cartao_credito, etc
  status: 'concluida',        // concluida, em_andamento, parcelado, cancelada
  troco: 0,                   // Opcional
  itens: [
    {
      produtoCodigo: '00123',
      produtoNome: 'Cimento',
      unidade: 'SC',
      quantidade: 2,
      valorUnitario: 32.90
    }
  ]
}
```

### Cliente
```javascript
{
  nome: 'João Victor',
  cpfCnpj: '123.456.789-00',
  endereco: 'Rua das Flores, 123',
  cidade: 'Chorozinho',
  estado: 'CE',
  cep: '62.875-000',
  telefone: '(85) 9 8888-8888'
}
```

## 🎨 Layout do Comprovante

```
┌─────────────────────────────────────┬──────────────┐
│  LOGO  │  DADOS DA EMPRESA          │  Nº DA VENDA │
│        │  (Razão, CNPJ, IE, End)    │     245      │
├─────────────────────────────────────┴──────────────┤
│  NOTA DE VENDA / COMPROVANTE DE VENDA              │
├──────────────┬──────────────────────────────────────┤
│ DATA         │ HORA                                 │
├──────────────┴──────────────────────────────────────┤
│  DADOS DO CLIENTE                                  │
│  Nome / CPF / Endereço / Cidade / CEP / Telefone  │
├────────────────────────────────────────────────────┤
│  CÓDIGO │ DESCRIÇÃO │ UN │ QTD │ VLR UNIT │ TOTAL  │
├────────────────────────────────────────────────────┤
│  Linhas de produtos                                │
├───────────────────────────────────────┬────────────┤
│  SUBTOTAL:                            │ R$ 1.034,60│
│  DESCONTO:                            │ - R$ 144,60│
│  ┌───────────────────────────────────┬────────────┐│
│  │ TOTAL GERAL:                      │ R$ 890,00  ││
│  └───────────────────────────────────┴────────────┘│
├────────────────────────────────────────────────────┤
│  INFORMAÇÕES DE PAGAMENTO                          │
│  Forma: PIX │ Valor Pago: R$ 890,00 │ Situação: PAGO
├────────────────────────────────────────────────────┤
│  Este comprovante não possui valor fiscal.         │
│  Obrigado pela preferência!                        │
│  www.sistemagestaofacil.com.br                    │
└────────────────────────────────────────────────────┘
```

## 🔧 Personalização

### Mudar Logo
Editar em `comprovanteVendaTemplate.html`:
```html
{{logo_empresa}}
```

### Mudar Cores
Editar CSS (buscar `#FF6B00`):
```css
color: #FF6B00;        /* Laranja principal */
background: #FF6B00;   /* Fundo */
```

### Mudar Dados da Empresa
Editar no template:
```html
<div class="company-name">SERRA DO FÉLIX...</div>
```

## 📱 Responsividade

O template é otimizado para:
- ✓ Impressão A4 (física e PDF)
- ✓ Navegadores web
- ✓ Diferentes tamanhos de papel

## 🐛 Solução de Problemas

| Problema | Solução |
|----------|---------|
| Página em branco | Verifique se template.html existe e tem dados |
| Dialog não abre | Desbloqueia popups no navegador |
| Dados não aparecem | Valida estrutura de dados |
| Cortes na impressão | Ajuste margem em Arquivo → Imprimir → Mais |

## 📚 Documentação Completa

Veja `DOCUMENTACAO.md` para:
- ✓ Lista completa de placeholders
- ✓ Mapeamento de forma de pagamento e status
- ✓ Integração com Puppeteer
- ✓ Especificações técnicas
- ✓ Troubleshooting detalhado

## 💡 Exemplos Avançados

Veja `EXEMPLOS_NODEJS.js` para:
- ✓ Gerar PDF no servidor
- ✓ Enviar por email
- ✓ API Express
- ✓ Integração com Cloud Storage
- ✓ Processamento em lote

## ✅ Checklist de Implementação

- [x] Template HTML criado
- [x] CSS profissional
- [x] Função de impressão
- [x] Integração no React
- [x] Documentação
- [x] Exemplos de uso

## 🚀 Próximas Etapas (Opcional)

1. Customizar logo (adicionar imagem real)
2. Personalizar dados da empresa
3. Adicionar endpoint API para geração de PDFs
4. Implementar envio por email
5. Adicionar histórico de comprovantes

## 📞 Suporte

Se encontrar problemas:
1. Verifique a documentação (`DOCUMENTACAO.md`)
2. Consulte exemplos (`EXEMPLOS_NODEJS.js`)
3. Valide estrutura de dados
4. Teste em navegador diferente
5. Verifique console (F12) para erros

---

**Criado em:** 10/05/2026
**Compatibilidade:** React + Node.js + Puppeteer
**Formato:** A4 (210mm × 297mm)
**Sem dependências externas** ✓
