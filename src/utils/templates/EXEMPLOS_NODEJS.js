/**
 * EXEMPLO DE USO - Integração com Node.js + Puppeteer
 * 
 * Este arquivo demonstra como usar o template de comprovante
 * em um servidor Node.js para gerar PDFs automaticamente.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { formatCurrency } from '../formatters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ===== EXEMPLO 1: Gerar PDF e Salvar em Arquivo =====
 */
export async function exemploGerarPDFParaArquivo() {
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

  try {
    // Ler template
    const templatePath = path.join(__dirname, 'comprovanteVendaTemplate.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Substituir placeholders
    html = html.replace('{{venda_numero}}', venda.codigoVenda);
    html = html.replace('{{cliente_nome}}', cliente.nome);
    // ... e assim por diante

    // Gerar PDF com Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    // Salvar arquivo
    const nomeArquivo = `comprovante_${venda.codigoVenda}.pdf`;
    const caminhoSaida = path.join(process.cwd(), 'pdfs', nomeArquivo);
    
    fs.writeFileSync(caminhoSaida, pdfBuffer);
    console.log(`✅ PDF salvo em: ${caminhoSaida}`);

    return caminhoSaida;
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    throw error;
  }
}

/**
 * ===== EXEMPLO 2: Enviar PDF por Email =====
 */
export async function exemploEnviarPDFPorEmail(venda, cliente, emailDestinatario) {
  const nodemailer = require('nodemailer');

  const pdfBuffer = await exemploGerarPDFComPuppeteer(venda, cliente);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: 'noreply@serradofelix.com.br',
    to: emailDestinatario,
    subject: `Comprovante de Venda #${venda.codigoVenda}`,
    html: `
      <p>Prezado cliente,</p>
      <p>Segue em anexo o comprovante de sua venda.</p>
      <p>Obrigado pela preferência!</p>
      <p><strong>Serra do Félix Materiais de Construção</strong></p>
    `,
    attachments: [
      {
        filename: `comprovante_${venda.codigoVenda}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Email enviado para: ${emailDestinatario}`);
}

/**
 * ===== EXEMPLO 3: API Express para Gerar PDF =====
 */
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/comprovante/gerar-pdf', async (req, res) => {
  try {
    const { venda, cliente } = req.body;

    // Validar dados
    if (!venda || !venda.codigoVenda) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    // Gerar PDF
    const pdfBuffer = await exemploGerarPDFComPuppeteer(venda, cliente);

    // Enviar como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comprovante_${venda.codigoVenda}.pdf"`
    );
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: 'Erro ao gerar PDF' });
  }
});

/**
 * ===== EXEMPLO 4: Gerar PDF com Puppeteer (Função Auxiliar) =====
 */
async function exemploGerarPDFComPuppeteer(venda, cliente) {
  const templatePath = path.join(__dirname, 'comprovanteVendaTemplate.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Dados da venda
  const dataSeparada = new Date(venda.dataVenda).toLocaleDateString('pt-BR');
  const horaSeparada = new Date(venda.dataVenda).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Gerar linhas da tabela
  let linhasProdutos = '';
  if (venda.itens && Array.isArray(venda.itens)) {
    linhasProdutos = venda.itens
      .map(item => {
        const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
        return `
          <tr>
            <td>${item.produtoCodigo || '0000'}</td>
            <td>${item.produtoNome || 'Produto'}</td>
            <td class="text-center">${item.unidade || 'UN'}</td>
            <td class="text-right">${item.quantidade || 0}</td>
            <td class="text-right">R$ ${formatCurrency(item.valorUnitario || 0)}</td>
            <td class="text-right">R$ ${formatCurrency(subtotal)}</td>
          </tr>
        `;
      })
      .join('');
  }

  // Substituições
  const replacements = {
    '{{venda_numero}}': venda.codigoVenda || '000000',
    '{{data_venda}}': dataSeparada,
    '{{hora_venda}}': horaSeparada,
    '{{cliente_nome}}': cliente?.nome || venda.clienteNome || '---',
    '{{cliente_cpf_cnpj}}': cliente?.cpfCnpj || '---',
    '{{cliente_endereco}}': cliente?.endereco || '---',
    '{{cliente_cidade}}': cliente?.cidade || '---',
    '{{cliente_uf}}': cliente?.estado || '---',
    '{{cliente_cep}}': cliente?.cep || '---',
    '{{cliente_telefone}}': cliente?.telefone || '---',
    '{{produtos_linhas}}': linhasProdutos,
    '{{subtotal}}': `R$ ${formatCurrency(
      venda.valorTotal + (venda.desconto || 0)
    )}`,
    '{{desconto_linha}}': venda.desconto && venda.desconto > 0
      ? `<div class="resumo-item"><span class="resumo-item-label">Desconto:</span><span class="resumo-item-value">- R$ ${formatCurrency(
          venda.desconto
        )}</span></div>`
      : '',
    '{{total_geral}}': `R$ ${formatCurrency(venda.valorTotal || 0)}`,
    '{{forma_pagamento}}': venda.formaPagamento || '---',
    '{{valor_pago}}': `R$ ${formatCurrency(venda.valorTotal || 0)}`,
    '{{troco}}': `R$ ${formatCurrency(venda.troco || 0)}`,
    '{{situacao_pagamento}}': venda.status === 'concluida' ? 'PAGO' : 'PENDENTE'
  };

  // Aplicar substituições
  Object.keys(replacements).forEach(key => {
    html = html.replaceAll(key, replacements[key]);
  });

  // Gerar PDF
  let browser;
  try {
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

/**
 * ===== EXEMPLO 5: Integração com Firestore =====
 */
export async function exemploSalvarComprovanteNoStorage(venda, cliente) {
  // Supondo que você tenha Firebase Storage configurado
  const firebase = require('firebase-admin');
  const bucket = firebase.storage().bucket();

  try {
    const pdfBuffer = await exemploGerarPDFComPuppeteer(venda, cliente);

    const nomeArquivo = `comprovantes/${venda.codigoVenda}_${Date.now()}.pdf`;
    const file = bucket.file(nomeArquivo);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          vendaId: venda.id,
          codigoVenda: venda.codigoVenda,
          dataGeracao: new Date().toISOString()
        }
      }
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${nomeArquivo}`;
    console.log(`✅ PDF salvo em Cloud Storage: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('Erro ao salvar no Cloud Storage:', error);
    throw error;
  }
}

/**
 * ===== EXEMPLO 6: Batch Processing (Gerar múltiplos PDFs) =====
 */
export async function exemploGerarMultiplosPDFs(vendas) {
  const pdfGerados = [];

  for (const venda of vendas) {
    try {
      const pdfBuffer = await exemploGerarPDFComPuppeteer(venda, {});
      const nomeArquivo = `comprovante_${venda.codigoVenda}.pdf`;

      pdfGerados.push({
        codigoVenda: venda.codigoVenda,
        buffer: pdfBuffer,
        nomeArquivo: nomeArquivo
      });

      console.log(`✅ ${venda.codigoVenda} gerado`);
    } catch (error) {
      console.error(`❌ Erro em ${venda.codigoVenda}:`, error);
    }
  }

  return pdfGerados;
}

// ===== INSTRUÇÕES DE USO =====
/*
1. Instalar dependências:
   npm install puppeteer nodemailer firebase-admin

2. Para usar as funções:
   
   - Gerar e salvar PDF:
     const caminho = await exemploGerarPDFParaArquivo();

   - Enviar por email:
     await exemploEnviarPDFPorEmail(venda, cliente, 'cliente@email.com');

   - Usar API:
     npm start
     curl -X POST http://localhost:3000/api/comprovante/gerar-pdf \
       -H "Content-Type: application/json" \
       -d '{"venda": {...}, "cliente": {...}}'

   - Salvar no Cloud Storage:
     const url = await exemploSalvarComprovanteNoStorage(venda, cliente);

3. Variáveis de ambiente necessárias (.env):
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASSWORD=sua-senha-app
   FIREBASE_PROJECT_ID=seu-projeto
   FIREBASE_PRIVATE_KEY=sua-chave-privada
*/
