import { formatCurrency } from './formatters.js';

// Configurações padrão por sistema
export const EMPRESA_CONFIGS = {
  deposito: {
    nome: 'Serra do Félix Materiais de Construção Ltda',
    logoPath: '/logo-serra-felix.png',
    logoAltText: 'Serra do Félix',
    telefone: '(85) 9.8173-2039',
    whatsapp: '(85) 9.8173-2039',
    instagram: '_depositoserradofelix',
    endereco: 'Rua das Pedras, 456 - Centro',
    cidade: 'Chorozinho - CE',
    cep: '62.875-000',
    cnpj: '12.345.678/0001-90',
    ie: '123456789',
  },
  racao: {
    nome: 'Casa de Ração Agro Serra do Félix',
    logoPath: '/logo-casa-racao.png',
    logoAltText: 'Casa de Ração',
    telefone: '(85) 9.8238-2670',
    whatsapp: '(85) 9.8238-2670',
    instagram: '@agro.serradofelix',
    endereco: '',
    cidade: '',
    cep: '',
    cnpj: '',
    ie: '',
  },
};

/**
 * Converte imagem local para base64 para embutir no HTML
 */
async function getLogoBase64(logoPath = '/logo-serra-felix.png') {
  try {
    const response = await fetch(logoPath);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Gera o HTML do comprovante com dados dinâmicos
 */
async function gerarHTMLComprovante(venda, cliente, produtos = [], empresaConfig = EMPRESA_CONFIGS.deposito) {
  const cfg = { ...EMPRESA_CONFIGS.deposito, ...empresaConfig };
  const logoBase64 = await getLogoBase64(cfg.logoPath);

  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" alt="${cfg.logoAltText}" style="max-width:100%;max-height:100%;object-fit:contain;" />`
    : `<div style="font-size:22px;font-weight:900;color:#FF6B00;line-height:1.1;font-family:Arial,sans-serif;">${cfg.logoAltText}</div>`;

  // Data/hora — suporte a Firestore Timestamp, ISO string e Date
  let dataVendaObj;
  if (venda.dataVenda) {
    if (typeof venda.dataVenda.toDate === 'function') {
      // Firestore Timestamp
      dataVendaObj = venda.dataVenda.toDate();
    } else if (typeof venda.dataVenda === 'object' && venda.dataVenda.seconds) {
      // Firestore Timestamp serializado
      dataVendaObj = new Date(venda.dataVenda.seconds * 1000);
    } else {
      dataVendaObj = new Date(venda.dataVenda);
    }
  } else {
    dataVendaObj = new Date();
  }
  const dataStr = dataVendaObj.toLocaleDateString('pt-BR');
  const horaStr = dataVendaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Número da venda formatado
  const numVenda = String(venda.codigoVenda || '000000').padStart(6, '0');

  // Linhas de produtos
  let linhasProdutos = '';
  if (venda.itens && Array.isArray(venda.itens)) {
    linhasProdutos = venda.itens.map((item, idx) => {
      const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';

      // Resolver nome: usa o salvo, ou busca na lista de produtos pelo ID
      const produtoInfo = produtos.find(p => p.id === item.produto);
      const nomeProduto = item.produtoNome || produtoInfo?.nome || item.produto || 'Produto';
      const codigoProduto = item.produtoCodigo || produtoInfo?.codigo || produtoInfo?.codigoProduto || String(idx + 1).padStart(5, '0');
      const unidade = item.unidade || produtoInfo?.unidade || 'UN';
      return `
        <tr style="background:${bg};border-bottom:1px solid #e8e8e8;">
          <td style="padding:5px 6px;font-size:9pt;">${codigoProduto}</td>
          <td style="padding:5px 6px;font-size:9pt;">${nomeProduto.toUpperCase()}</td>
          <td style="padding:5px 6px;font-size:9pt;text-align:center;">${unidade.toUpperCase()}</td>
          <td style="padding:5px 6px;font-size:9pt;text-align:right;">${item.quantidade || 0}</td>
          <td style="padding:5px 6px;font-size:9pt;text-align:right;">R$ ${formatCurrency(item.valorUnitario || 0)}</td>
          <td style="padding:5px 6px;font-size:9pt;text-align:right;">R$ ${formatCurrency(subtotal)}</td>
        </tr>`;
    }).join('');
  }

  // Subtotal e desconto
  const desconto = venda.desconto || 0;
  const subtotal = (venda.valorTotal || 0) + desconto;
  const total = venda.valorTotal || 0;

  const linhaDesconto = desconto > 0
    ? `<div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:9pt;border-bottom:1px solid #e0e0e0;">
        <span style="font-weight:600;color:#555;">DESCONTO:</span>
        <span style="font-weight:600;color:#e00;">R$ ${formatCurrency(desconto)}</span>
       </div>`
    : '';

  // Forma de pagamento
  const formaMap = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    cheque: 'Cheque',
    fiado: 'Fiado',
    em_andamento: 'Fiado'
  };
  const formaPagamento = formaMap[venda.formaPagamento] || venda.formaPagamento || 'N/A';

  // Situação
  const situacaoMap = {
    em_andamento: 'FIADO',
    concluida: 'PAGO',
    parcelado: 'PARCELADO',
    cancelada: 'CANCELADO'
  };
  const situacao = situacaoMap[venda.status] || 'N/A';
  const situacaoColor = venda.status === 'concluida' ? '#16a34a' : venda.status === 'cancelada' ? '#dc2626' : '#b45309';

  const troco = (venda.troco || 0) > 0 ? `R$ ${formatCurrency(venda.troco)}` : 'R$ 0,00';
  const valorPago = `R$ ${formatCurrency(venda.valorClientePaga || total)}`;

  // Dados cliente — campos conforme salvos no Firebase pelo ClienteForm
  const cNome    = cliente?.nome      || venda.clienteNome || '---';
  const cDoc     = cliente?.cpf       || cliente?.cpfCnpj  || cliente?.documento || '---';
  const cEnd     = cliente?.endereco  || '---';
  const cCidade  = cliente?.cidade    || '---';
  const cUf      = cliente?.estado    || cliente?.uf || '';
  const cCep     = cliente?.cep       ? `CEP: ${cliente.cep}` : '';
  const cTel     = cliente?.telefone  || '---';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante de Venda - ${numVenda}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: A4; margin: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #222;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm 10mm 14mm;
      background: #fff;
      position: relative;
    }
    @media print {
      .page { box-shadow: none; margin: 0; }
    }

    /* ── CABEÇALHO ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 3px solid #FF6B00;
      margin-bottom: 10px;
    }
    .header-logo {
      width: 38mm;
      height: 34mm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-empresa {
      flex: 1;
      padding-left: 10px;
    }
    .empresa-nome {
      font-size: 14pt;
      font-weight: 900;
      color: #FF6B00;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 6px;
    }
    .empresa-linha {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 8.5pt;
      color: #333;
      margin-bottom: 3px;
    }
    .empresa-icon {
      width: 13px;
      height: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #FF6B00;
      font-size: 10pt;
      flex-shrink: 0;
    }

    /* ── TITULO + Nº VENDA ── */
    .titulo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: 900;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .venda-box {
      border: 2.5px solid #FF6B00;
      padding: 6px 14px;
      text-align: center;
      min-width: 48mm;
    }
    .venda-box-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #FF6B00;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .venda-box-num {
      font-size: 20pt;
      font-weight: 900;
      color: #FF6B00;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    /* ── DATA/HORA ── */
    .datahora-row {
      display: flex;
      gap: 14mm;
      align-items: flex-start;
      padding: 6px 0;
      margin-bottom: 6px;
    }
    .datahora-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .datahora-icon-wrap {
      width: 22px;
      height: 22px;
      border: 2px solid #FF6B00;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #FF6B00;
      font-size: 9pt;
      margin-top: 1px;
    }
    .datahora-content {}
    .datahora-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .datahora-value {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 1px;
    }

    /* ── DADOS DO CLIENTE ── */
    .cliente-section {
      display: flex;
      margin-bottom: 10px;
    }
    .cliente-box {
      flex: 1;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 900;
      color: #FF6B00;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .cliente-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 3.5px;
      font-size: 8.5pt;
    }
    .cliente-label {
      font-weight: 700;
      color: #222;
      min-width: 38mm;
      flex-shrink: 0;
      text-transform: uppercase;
      font-size: 8pt;
    }
    .cliente-value {
      color: #333;
    }
    .cliente-row-inline {
      display: flex;
      gap: 20px;
    }

    /* ── TABELA DE PRODUTOS ── */
    .produtos-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .produtos-table thead tr {
      background: #FF6B00;
    }
    .produtos-table thead th {
      color: #fff;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 6px 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: none;
    }
    .produtos-table tbody td {
      font-size: 9pt;
      color: #222;
      padding: 5px 6px;
      border-bottom: 1px solid #e8e8e8;
      vertical-align: middle;
    }

    /* ── RESUMO ── */
    .resumo-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    .resumo-box {
      min-width: 72mm;
      border: 1px solid #e0e0e0;
    }
    .resumo-linha {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 10px;
      font-size: 9pt;
      border-bottom: 1px solid #e0e0e0;
    }
    .resumo-label { font-weight: 600; color: #444; }
    .resumo-value { font-weight: 600; color: #222; }
    .resumo-total-linha {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 10px;
      background: #FF6B00;
    }
    .resumo-total-label { font-size: 10.5pt; font-weight: 900; color: #fff; }
    .resumo-total-value { font-size: 13pt; font-weight: 900; color: #fff; }

    /* ── PAGAMENTO ── */
    .pagamento-section {
      background: #fff8f3;
      border: 1.5px solid #FFD4A3;
      padding: 8px 10px;
      margin-bottom: 10px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .pagamento-icon-wrap {
      width: 28px;
      height: 28px;
      background: #FF6B00;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
      color: #fff;
      font-size: 13pt;
    }
    .pagamento-content { flex: 1; }
    .pagamento-title {
      font-size: 8.5pt;
      font-weight: 900;
      color: #FF6B00;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 6px;
    }
    .pagamento-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 6px;
    }
    .pagamento-item-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #222;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .pagamento-item-value {
      font-size: 9pt;
      color: #333;
    }
    .situacao-pago { font-weight: 700; color: #16a34a; }
    .situacao-fiado { font-weight: 700; color: #b45309; }
    .situacao-cancelado { font-weight: 700; color: #dc2626; }
    .situacao-parcelado { font-weight: 700; color: #7c3aed; }

    /* ── RODAPÉ ── */
    .footer {
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid #e0e0e0;
      margin-top: 6px;
    }
    .footer-carrinho {
      font-size: 20pt;
      margin-bottom: 2px;
    }
    .footer-fiscal {
      font-size: 8.5pt;
      color: #444;
      margin-bottom: 3px;
    }
    .footer-obrigado {
      font-size: 12pt;
      font-weight: 700;
      color: #FF6B00;
      font-style: italic;
      margin-bottom: 6px;
    }
    .footer-emissor {
      font-size: 7.5pt;
      color: #888;
    }
    .footer-emissor a { color: #888; text-decoration: none; }
  </style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-logo">
      ${logoHTML}
    </div>
    <div class="header-empresa">
      <div class="empresa-nome">${cfg.nome}</div>
      ${cfg.cnpj ? `<div class="empresa-linha">
        <span class="empresa-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg></span>
        <span>CNPJ: ${cfg.cnpj}${cfg.ie ? ' &nbsp;|&nbsp; IE: ' + cfg.ie : ''}</span>
      </div>` : ''}
      ${cfg.endereco ? `<div class="empresa-linha">
        <span class="empresa-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
        <span>${cfg.endereco}<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${cfg.cidade}${cfg.cep ? ' - CEP: ' + cfg.cep : ''}</span>
      </div>` : ''}
      <div class="empresa-linha">
        <span class="empresa-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
        <span>${cfg.telefone}</span>
      </div>
      <div class="empresa-linha">
        <span class="empresa-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
        <span>${cfg.whatsapp} &nbsp;&nbsp;</span>
        <span class="empresa-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></span>
        <span>${cfg.instagram}</span>
      </div>
    </div>
  </div>

  <!-- TÍTULO + Nº VENDA -->
  <div class="titulo-row">
    <div class="doc-title">Nota de Venda / Comprovante de Venda</div>
    <div class="venda-box">
      <div class="venda-box-label">Nº da Venda</div>
      <div class="venda-box-num">${numVenda}</div>
    </div>
  </div>

  <!-- DATA / HORA + DADOS DO CLIENTE (lado a lado) -->
  <div style="display:flex;gap:10mm;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e0e0e0;">
    <!-- Data e Hora -->
    <div style="display:flex;flex-direction:column;gap:8px;min-width:50mm;">
      <div class="datahora-item">
        <div class="datahora-icon-wrap"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="datahora-content">
          <div class="datahora-label">Data da Venda</div>
          <div class="datahora-value">${dataStr}</div>
        </div>
      </div>
      <div class="datahora-item">
        <div class="datahora-icon-wrap"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="datahora-content">
          <div class="datahora-label">Hora</div>
          <div class="datahora-value">${horaStr}</div>
        </div>
      </div>
    </div>

    <!-- Dados do Cliente -->
    <div class="cliente-box">
      <div class="section-title">Dados do Cliente</div>
      <div class="cliente-row">
        <span class="cliente-label">Nome / Razão Social:</span>
        <span class="cliente-value">${cNome}</span>
      </div>
      <div class="cliente-row">
        <span class="cliente-label">CPF / CNPJ:</span>
        <span class="cliente-value">${cDoc}</span>
      </div>
      <div class="cliente-row">
        <span class="cliente-label">Endereço:</span>
        <span class="cliente-value">${cEnd}</span>
      </div>
      <div class="cliente-row">
        <span class="cliente-label">Cidade / UF:</span>
        <span class="cliente-value">${cCidade}${cUf ? ' - ' + cUf : ''} &nbsp; ${cCep}</span>
      </div>
      <div class="cliente-row">
        <span class="cliente-label">Telefone:</span>
        <span class="cliente-value">${cTel}</span>
      </div>
    </div>
  </div>

  <!-- TABELA DE PRODUTOS -->
  <table class="produtos-table">
    <thead>
      <tr>
        <th style="width:13%;text-align:left;">Código</th>
        <th style="width:40%;text-align:left;">Descrição do Produto</th>
        <th style="width:7%;text-align:center;">UN</th>
        <th style="width:8%;text-align:right;">QTD</th>
        <th style="width:14%;text-align:right;">Vlr Unit.</th>
        <th style="width:18%;text-align:right;">Vlr Total</th>
      </tr>
    </thead>
    <tbody>
      ${linhasProdutos}
    </tbody>
  </table>

  <!-- RESUMO FINANCEIRO -->
  <div class="resumo-section">
    <div class="resumo-box">
      <div class="resumo-linha">
        <span class="resumo-label">SUBTOTAL:</span>
        <span class="resumo-value">R$ ${formatCurrency(subtotal)}</span>
      </div>
      ${linhaDesconto}
      <div class="resumo-total-linha">
        <span class="resumo-total-label">TOTAL GERAL:</span>
        <span class="resumo-total-value">R$ ${formatCurrency(total)}</span>
      </div>
    </div>
  </div>

  <!-- INFORMAÇÕES DE PAGAMENTO -->
  <div class="pagamento-section">
    <div class="pagamento-icon-wrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
    <div class="pagamento-content">
      <div class="pagamento-title">Informações de Pagamento</div>
      <div class="pagamento-grid">
        <div>
          <div class="pagamento-item-label">Forma de Pagamento</div>
          <div class="pagamento-item-value">${formaPagamento}</div>
        </div>
        <div>
          <div class="pagamento-item-label">Valor Pago</div>
          <div class="pagamento-item-value">${valorPago}</div>
        </div>
        <div>
          <div class="pagamento-item-label">Troco</div>
          <div class="pagamento-item-value">${troco}</div>
        </div>
        <div>
          <div class="pagamento-item-label">Situação</div>
          <div class="pagamento-item-value situacao-${venda.status === 'concluida' ? 'pago' : venda.status === 'cancelada' ? 'cancelado' : venda.status === 'parcelado' ? 'parcelado' : 'fiado'}">${situacao}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <div style="text-align:left;">
        <div class="footer-fiscal">Este comprovante não possui valor fiscal.</div>
        <div class="footer-obrigado">Obrigado pela preferência!</div>
      </div>
    </div>
    <div class="footer-emissor">
      Emitido por: Sistema Gestão Fácil<br>
      <a href="#">www.sistemagestaofacil.com.br</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

/**
 * Imprime o comprovante usando um iframe oculto (sem abrir nova aba)
 * @param {Object} venda - Dados da venda
 * @param {Object} cliente - Dados do cliente
 * @param {Array} produtos - Lista de produtos para resolver nomes de vendas antigas
 */
export async function gerarComprovanteVenda(venda, cliente = {}, produtos = [], empresaConfig = null) {
  try {
    const html = await gerarHTMLComprovante(venda, cliente, produtos, empresaConfig || EMPRESA_CONFIGS.deposito);

    // Remove iframe anterior se existir
    const anterior = document.getElementById('__comprovante_iframe__');
    if (anterior) anterior.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__comprovante_iframe__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Aguarda imagens carregarem antes de imprimir
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove o iframe após a impressão
        setTimeout(() => iframe.remove(), 2000);
      }, 300);
    };
  } catch (error) {
    console.error('Erro ao gerar comprovante:', error);
    throw error;
  }
}

/**
 * Alias — imprime o comprovante
 */
export async function imprimirComprovanteVenda(venda, cliente = {}, produtos = [], empresaConfig = null) {
  return gerarComprovanteVenda(venda, cliente, produtos, empresaConfig);
}

export { formatCurrency };
