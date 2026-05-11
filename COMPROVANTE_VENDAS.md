# 🧾 Gerador de Comprovante de Venda

Sistema de geração de comprovantes de venda em PDF para impressão ou download.

## 📋 Características

- ✅ Comprovante em formato PDF otimizado para impressora térmica (80mm)
- ✅ Impressão direta a partir da tela de vendas
- ✅ Download do comprovante em PDF
- ✅ Dados dinâmicos da empresa
- ✅ Informações do cliente
- ✅ Resumo detalhado de itens e valores
- ✅ Suporte a parcelamento
- ✅ Suporte a descontos e juros

## 🚀 Como Usar

### Acessar Comprovante de Venda

1. **Na listagem de vendas:**
   - Clique no ícone de **impressora** (Printer) para abrir a janela de impressão
   - Ou clique em **Ver detalhes** para ver a venda completa

2. **Na modal de detalhes:**
   - Clique em **"Baixar Comprovante"** para fazer download em PDF
   - Clique em **"Imprimir Comprovante"** para abrir a janela de impressão do navegador

## ⚙️ Configurar Dados da Empresa

Os dados da empresa (nome, CNPJ, contatos) devem ser configurados em:

```
src/constants/index.js
```

Procure pela constante `EMPRESA` e atualize:

```javascript
export const EMPRESA = {
  NOME: 'DEPÓSITO SERRA DO FÉLIX',                    // Nome da empresa
  CNPJ: '00.000.000/0000-00',                        // CNPJ (substituir com o real)
  TELEFONE: '(00) 00000-0000',                       // Telefone de contato
  EMAIL: 'contato@serra-felix.com.br',              // Email
  ENDERECO: 'Rua/Avenida, Número - Cidade, UF',    // Endereço
  INSCRICAO_ESTADUAL: '00.000.000.000.000',        // Inscrição Estadual
  MENSAGEM_RODAPE: 'Obrigado pela preferência!'    // Mensagem de agradecimento
};
```

### Exemplo com dados reais:

```javascript
export const EMPRESA = {
  NOME: 'DEPÓSITO SERRA DO FÉLIX',
  CNPJ: '12.345.678/0001-99',
  TELEFONE: '(31) 98765-4321',
  EMAIL: 'vendas@serra-felix.com.br',
  ENDERECO: 'Rua Principal, 123 - Belo Horizonte, MG',
  INSCRICAO_ESTADUAL: '123.456.789.012',
  MENSAGEM_RODAPE: 'Obrigado pela preferência!'
};
```

## 📦 Conteúdo do Comprovante

O comprovante inclui:

- **Cabeçalho:** Nome e CNPJ da empresa
- **Identificação:** Número único da venda e data/hora
- **Dados do Cliente:** Nome, CPF ou CNPJ (se disponível)
- **Itens:** Tabela com produtos, quantidade, valor unitário e total
- **Resumo Financeiro:**
  - Subtotal
  - Desconto (se aplicável)
  - Juros (se pagamento com cartão de crédito)
  - Total da venda
- **Forma de Pagamento:** Tipo e parcelamento (se houver)
- **Observações:** Se houver observações na venda
- **Rodapé:** Mensagem de agradecimento

## 🖨️ Impressão em Impressora Térmica

O formato padrão do comprovante é de **80mm x 297mm**, ideal para impressoras térmicas de 80mm de largura.

### Para imprimir corretamente:

1. Na janela de impressão do navegador:
   - Selecione a impressora térmica
   - Desabilite "Cabeçalhos e rodapés"
   - Desabilite "Plano de fundo"
   - Margens: Nenhuma ou Mínimas
   - Clique em **Imprimir**

2. **Atalho rápido:** Use o ícone de impressora (🖨️) na listagem de vendas

## 📱 Plataformas Suportadas

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet com impressora térmica
- ✅ Mobile (apenas visualização)

## 🔧 Personalizações Futuras

Possíveis melhorias:

- [ ] QR Code com link para detalhes da venda
- [ ] Informações de garantia ou políticas
- [ ] Logo da empresa
- [ ] Campos adicionais customizáveis
- [ ] Múltiplos idiomas

## 📝 Notas Técnicas

- O comprovante é gerado usando [jsPDF](https://github.com/parallax/jsPDF)
- Tabelas são criadas com [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- Os dados são extraídos do Firestore em tempo real
- Não é necessária conexão com a internet após carregamento da página para gerar o PDF

## ❓ Troubleshooting

**P: O comprovante não está imprimindo.**
R: Verifique se o navegador tem permissão para usar popup de impressão. Alguns navegadores bloqueiam por padrão.

**P: A fonte está pequena demais.**
R: Aumente o zoom do navegador (Ctrl + +) antes de imprimir.

**P: Os dados da empresa não aparecem.**
R: Verifique se atualizou corretamente a constante `EMPRESA` em `src/constants/index.js` e se reiniciou o servidor.

**P: A tabela está cortada na impressão.**
R: Ajuste as margens na janela de impressão para "Nenhuma".
