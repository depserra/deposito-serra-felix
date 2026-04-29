// filepath: src/utils/parseNFeXML.js

/**
 * Parser para arquivos XML de Nota Fiscal Eletrônica (NFe)
 * Suporta as versões 3.10 e 4.00 da NFe
 */

/**
 * Parse do XML da NFe e extração dos produtos
 * @param {string} xmlContent - Conteúdo do arquivo XML
 * @returns {object} - Dados da nota e array de produtos
 */
export function parseNFeXML(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Verificar se é NFe ou NFCe
  const isNFe = xmlDoc.getElementsByTagName('NFe').length > 0 || 
                xmlDoc.getElementsByTagName('nfeProc').length > 0 ||
                xmlDoc.getElementsByTagName('procNFe').length > 0;
  
  if (!isNFe) {
    const hasNFe = xmlDoc.getElementsByTagName('infNFe').length > 0;
    if (!hasNFe) {
      throw new Error('Arquivo XML não é uma Nota Fiscal Eletrônica válida');
    }
  }
  
  // Extrair informações da nota fiscal
  const notaFiscal = extractNotaFiscalInfo(xmlDoc);
  
  // Extrair produtos
  const produtos = extractProdutos(xmlDoc);
  
  return {
    notaFiscal,
    produtos
  };
}

/**
 * Extrai informações gerais da nota fiscal
 */
function extractNotaFiscalInfo(xmlDoc) {
  const getText = (tag) => {
    const elements = xmlDoc.getElementsByTagName(tag);
    return elements.length > 0 ? elements[0].textContent?.trim() : '';
  };
  
  // Tentar diferentes estruturas de XML
  const ide = xmlDoc.getElementsByTagName('ide')[0] || xmlDoc.getElementsByTagName('infNFe')[0];
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  const dest = xmlDoc.getElementsByTagName('dest')[0];
  const total = xmlDoc.getElementsByTagName('total')[0];
  
  return {
    numero: ide ? (ide.getElementsByTagName('nNF')[0]?.textContent || ide.getElementsByTagName('nnf')[0]?.textContent) : '',
    serie: ide ? (ide.getElementsByTagName('serie')[0]?.textContent) : '',
    dataEmissao: ide ? (ide.getElementsByTagName('dhEmi')[0]?.textContent || ide.getElementsByTagName('dEmi')[0]?.textContent) : '',
    modelo: ide ? (ide.getElementsByTagName('mod')[0]?.textContent) : '',
    fornecedor: emit ? {
      nome: emit.getElementsByTagName('xNome')[0]?.textContent || emit.getElementsByTagName('xnome')[0]?.textContent || '',
      cnpj: emit.getElementsByTagName('CNPJ')[0]?.textContent || emit.getElementsByTagName('cnpj')[0]?.textContent || '',
      cpf: emit.getElementsByTagName('CPF')[0]?.textContent || emit.getElementsByTagName('cpf')[0]?.textContent || '',
    } : {},
    cliente: dest ? {
      nome: dest.getElementsByTagName('xNome')[0]?.textContent || dest.getElementsByTagName('xnome')[0]?.textContent || '',
      cnpj: dest.getElementsByTagName('CNPJ')[0]?.textContent || dest.getElementsByTagName('cnpj')[0]?.textContent || '',
      cpf: dest.getElementsByTagName('CPF')[0]?.textContent || dest.getElementsByTagName('cpf')[0]?.textContent || '',
    } : {},
    valorTotal: total ? (total.getElementsByTagName('vNF')[0]?.textContent || total.getElementsByTagName('vnf')[0]?.textContent || '0') : '0',
  };
}

/**
 * Extrai os produtos da nota fiscal
 */
function extractProdutos(xmlDoc) {
  const produtos = [];
  const detElements = xmlDoc.getElementsByTagName('det');
  
  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    
    if (!prod) continue;
    
    // Extrair dados do produto
    const codigo = prod.getElementsByTagName('cProd')[0]?.textContent?.trim() || 
                   prod.getElementsByTagName('cprod')[0]?.textContent?.trim() || '';
    
    const nome = prod.getElementsByTagName('xProd')[0]?.textContent?.trim() || 
                 prod.getElementsByTagName('xprod')[0]?.textContent?.trim() || '';
    
    const ncm = prod.getElementsByTagName('NCM')[0]?.textContent?.trim() || 
                prod.getElementsByTagName('ncm')[0]?.textContent?.trim() || '';
    
    const cfop = prod.getElementsByTagName('CFOP')[0]?.textContent?.trim() || 
                 prod.getElementsByTagName('cfop')[0]?.textContent?.trim() || '';
    
    const unidade = prod.getElementsByTagName('uCom')[0]?.textContent?.trim() || 
                    prod.getElementsByTagName('ucom')[0]?.textContent?.trim() || 'UN';
    
    const quantidade = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent?.replace(',', '.') || 
                                  prod.getElementsByTagName('qcom')[0]?.textContent?.replace(',', '.') || '0');
    
    const valorUnitario = parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent?.replace(',', '.') || 
                             prod.getElementsByTagName('vuncom')[0]?.textContent?.replace(',', '.') || '0');
    
    const valorTotal = parseFloat(prod.getElementsByTagName('vProd')[0]?.textContent?.replace(',', '.') || 
                          prod.getElementsByTagName('vprod')[0]?.textContent?.replace(',', '.') || '0');
    
    // Extrair informações de imposto (ICMS)
    const icms = det.getElementsByTagName('ICMS')[0] || det.getElementsByTagName('icms')[0];
    let cstIcms = '';
    let aliquotaIcms = 0;
    
    if (icms) {
      // Tentar diferentes situações tributárias
      const icms00 = icms.getElementsByTagName('ICMS00')[0];
      const icms10 = icms.getElementsByTagName('ICMS10')[0];
      const icms20 = icms.getElementsByTagName('ICMS20')[0];
      const icms40 = icms.getElementsByTagName('ICMS40')[0];
      const icms60 = icms.getElementsByTagName('ICMS60')[0];
      const icmsSn = icms.getElementsByTagName('ICMSSN101')[0];
      
      if (icms00) {
        cstIcms = '00';
        aliquotaIcms = parseFloat(icms00.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0');
      } else if (icms20) {
        cstIcms = '20';
        aliquotaIcms = parseFloat(icms20.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0');
      } else if (icms40) {
        cstIcms = '40';
      } else if (icms60) {
        cstIcms = '60';
      } else if (icmsSn) {
        cstIcms = 'SN';
        aliquotaIcms = parseFloat(icmsSn.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0');
      }
    }
    
    // Extrair IPI
    const imp = det.getElementsByTagName('imposto')[0];
    let aliquotaIpi = 0;
    if (imp) {
      const ipi = imp.getElementsByTagName('IPI')[0] || imp.getElementsByTagName('ipi')[0];
      if (ipi) {
        const ipiTrib = ipi.getElementsByTagName('pIPI')[0]?.textContent?.replace(',', '.');
        if (ipiTrib) {
          aliquotaIpi = parseFloat(ipiTrib);
        }
      }
    }
    
    // Se não encontrou nome do produto, pular
    if (!nome) continue;
    
    produtos.push({
      codigo,
      nome,
      ncm,
      cfop,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal,
      cstIcms,
      aliquotaIcms,
      aliquotaIpi,
      // Gerar descrição baseada nas informações disponíveis
      descricao: `${nome} - NCM: ${ncm} - CFOP: ${cfop}`
    });
  }
  
  return produtos;
}

/**
 * Processa os produtos da NFe para formato de estoque
 * @param {Array} produtosNFe - Produtos extraídos do XML
 * @param {object} notaFiscal - Dados da nota fiscal
 * @returns {Array} - Produtos formatados para importação
 */
export function processarProdutosNFe(produtosNFe, notaFiscal) {
  return produtosNFe.map((prod, index) => {
    // Calcular preço de venda (margem padrão de 30% se não especificado)
    const precoVenda = prod.valorUnitario * 1.30;
    
    return {
      nome: prod.nome,
      codigo: prod.codigo || `NFE-${notaFiscal.numero}-${index + 1}`,
      descricao: prod.descricao,
      ncm: prod.ncm,
      cfop: prod.cfop,
      categoria: 'Importado NF-e',
      quantidade: Math.round(prod.quantidade),
      unidade: prod.unidade,
      precoCompra: prod.valorUnitario,
      precoVenda: Math.round(precoVenda * 100) / 100,
      estoqueMinimo: 5,
      ativo: true,
      // Dados adicionais da importação
      importacao: {
        notaFiscal: notaFiscal.numero,
        serie: notaFiscal.serie,
        dataEmissao: notaFiscal.dataEmissao,
        fornecedor: notaFiscal.fornecedor?.nome,
        cnpjFornecedor: notaFiscal.fornecedor?.cnpj,
        dataImportacao: new Date().toISOString()
      }
    };
  });
}