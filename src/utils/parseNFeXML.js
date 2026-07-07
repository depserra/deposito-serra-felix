// filepath: src/utils/parseNFeXML.js

/**
 * Parser para arquivos XML de Nota Fiscal Eletrônica (NFe)
 * Suporta as versões 3.10 e 4.00 da NFe
 *
 * IMPORTANTE: Este módulo realiza APENAS o parse do XML.
 * A conversão de unidades (ex: saco → kg) NÃO ocorre aqui.
 * Ela é responsabilidade do hook useImportacaoNFe, que consulta
 * a coleção 'produto_fornecedor_conversao' antes de gravar no estoque.
 */

/**
 * Parse do XML da NFe e extração dos produtos
 * @param {string} xmlContent - Conteúdo do arquivo XML
 * @returns {{ notaFiscal: object, produtos: object[] }}
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
  
  const notaFiscal = extractNotaFiscalInfo(xmlDoc);
  const produtos   = extractProdutos(xmlDoc);
  
  return { notaFiscal, produtos };
}

/**
 * Extrai informações gerais da nota fiscal
 */
function extractNotaFiscalInfo(xmlDoc) {
  const ide   = xmlDoc.getElementsByTagName('ide')[0]  || xmlDoc.getElementsByTagName('infNFe')[0];
  const emit  = xmlDoc.getElementsByTagName('emit')[0];
  const dest  = xmlDoc.getElementsByTagName('dest')[0];
  const total = xmlDoc.getElementsByTagName('total')[0];

  return {
    numero:      ide ? (ide.getElementsByTagName('nNF')[0]?.textContent   || ide.getElementsByTagName('nnf')[0]?.textContent)   : '',
    serie:       ide ? (ide.getElementsByTagName('serie')[0]?.textContent) : '',
    dataEmissao: ide ? (ide.getElementsByTagName('dhEmi')[0]?.textContent  || ide.getElementsByTagName('dEmi')[0]?.textContent)  : '',
    modelo:      ide ? (ide.getElementsByTagName('mod')[0]?.textContent)   : '',
    fornecedor: emit ? {
      nome: emit.getElementsByTagName('xNome')[0]?.textContent || emit.getElementsByTagName('xnome')[0]?.textContent || '',
      cnpj: emit.getElementsByTagName('CNPJ')[0]?.textContent  || emit.getElementsByTagName('cnpj')[0]?.textContent  || '',
      cpf:  emit.getElementsByTagName('CPF')[0]?.textContent   || emit.getElementsByTagName('cpf')[0]?.textContent   || '',
    } : {},
    cliente: dest ? {
      nome: dest.getElementsByTagName('xNome')[0]?.textContent || dest.getElementsByTagName('xnome')[0]?.textContent || '',
      cnpj: dest.getElementsByTagName('CNPJ')[0]?.textContent  || dest.getElementsByTagName('cnpj')[0]?.textContent  || '',
      cpf:  dest.getElementsByTagName('CPF')[0]?.textContent   || dest.getElementsByTagName('cpf')[0]?.textContent   || '',
    } : {},
    valorTotal: total ? (total.getElementsByTagName('vNF')[0]?.textContent  || total.getElementsByTagName('vnf')[0]?.textContent  || '0') : '0',
  };
}

/**
 * Extrai os produtos da nota fiscal.
 *
 * Para cada item retorna:
 *  - codigo / nome / ncm / cfop
 *  - unidadeComercial (uCom) — unidade na qual o fornecedor vendeu
 *  - quantidadeComercial (qCom) — quantidade comprada nessa unidade
 *  - valorUnitarioComercial (vUnCom) — preço por unidade comercial
 *  - unidadeTributavel (uTrib) — unidade tributável (pode ser a unidade base real)
 *  - quantidadeTributavel (qTrib) — quantidade tributável (muitas vezes já em unidade base)
 *  - gtin — código EAN/GTIN do produto (quando disponível)
 *
 * A decisão de qual par usar para dar entrada no estoque é responsabilidade
 * do hook useImportacaoNFe (consulta produto_fornecedor_conversao).
 */
function extractProdutos(xmlDoc) {
  const produtos    = [];
  const detElements = xmlDoc.getElementsByTagName('det');

  for (let i = 0; i < detElements.length; i++) {
    const det  = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    if (!prod) continue;

    const g = (tag) => prod.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

    const codigo = g('cProd') || g('cprod');
    const nome   = g('xProd') || g('xprod');
    if (!nome) continue;

    const ncm  = g('NCM')  || g('ncm');
    const cfop = g('CFOP') || g('cfop');
    const gtin = g('cEANTrib') || g('cEAN') || g('cean') || '';

    // Unidade comercial (como o fornecedor faturou)
    const unidadeComercial    = g('uCom')   || g('ucom')   || 'UN';
    const quantidadeComercial = parseFloat((g('qCom')   || g('qcom')   || '0').replace(',', '.'));
    const valorUnitComercial  = parseFloat((g('vUnCom') || g('vuncom') || '0').replace(',', '.'));
    const valorTotalComercial = parseFloat((g('vProd')  || g('vprod')  || '0').replace(',', '.'));

    // Unidade tributável (frequentemente é a unidade base real — ex: KG para sacos)
    const unidadeTributavel    = g('uTrib')   || g('utrib')   || '';
    const quantidadeTributavel = parseFloat((g('qTrib')   || g('qtrib')  || '0').replace(',', '.'));
    const valorUnitTributavel  = parseFloat((g('vUnTrib') || g('vuntrib')|| '0').replace(',', '.'));

    // ICMS
    const icms = det.getElementsByTagName('ICMS')[0] || det.getElementsByTagName('icms')[0];
    let cstIcms = '', aliquotaIcms = 0;
    if (icms) {
      const icms00 = icms.getElementsByTagName('ICMS00')[0];
      const icms20 = icms.getElementsByTagName('ICMS20')[0];
      const icms40 = icms.getElementsByTagName('ICMS40')[0];
      const icms60 = icms.getElementsByTagName('ICMS60')[0];
      const icmsSn = icms.getElementsByTagName('ICMSSN101')[0];
      if      (icms00) { cstIcms = '00'; aliquotaIcms = parseFloat(icms00.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0'); }
      else if (icms20) { cstIcms = '20'; aliquotaIcms = parseFloat(icms20.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0'); }
      else if (icms40) { cstIcms = '40'; }
      else if (icms60) { cstIcms = '60'; }
      else if (icmsSn) { cstIcms = 'SN'; aliquotaIcms = parseFloat(icmsSn.getElementsByTagName('pICMS')[0]?.textContent?.replace(',', '.') || '0'); }
    }

    // IPI
    const imp = det.getElementsByTagName('imposto')[0];
    let aliquotaIpi = 0;
    if (imp) {
      const ipi = imp.getElementsByTagName('IPI')[0] || imp.getElementsByTagName('ipi')[0];
      if (ipi) {
        const ipiTrib = ipi.getElementsByTagName('pIPI')[0]?.textContent?.replace(',', '.');
        if (ipiTrib) aliquotaIpi = parseFloat(ipiTrib);
      }
    }

    produtos.push({
      codigo,
      nome,
      gtin,
      ncm,
      cfop,
      unidadeComercial,
      quantidadeComercial,
      valorUnitComercial,
      valorTotalComercial,
      unidadeTributavel,
      quantidadeTributavel,
      valorUnitTributavel,
      cstIcms,
      aliquotaIcms,
      aliquotaIpi,
      descricao: `${nome} - NCM: ${ncm} - CFOP: ${cfop}`
    });
  }

  return produtos;
}

/**
 * Prepara os dados brutos do XML para o fluxo de importação.
 * NÃO realiza conversão de unidades — isso é feito em useImportacaoNFe
 * após consultar produto_fornecedor_conversao.
 *
 * @param {object[]} produtosNFe - array retornado por parseNFeXML
 * @param {object}   notaFiscal  - cabeçalho retornado por parseNFeXML
 * @returns {object[]}
 */
export function processarProdutosNFe(produtosNFe, notaFiscal) {
  return produtosNFe.map((prod) => ({
    codigoFornecedor: prod.codigo,
    gtin:             prod.gtin,
    nome:             prod.nome,
    descricao:        prod.descricao,
    ncm:              prod.ncm,
    cfop:             prod.cfop,
    unidadeComercial:     prod.unidadeComercial,
    quantidadeComercial:  prod.quantidadeComercial,
    valorUnitComercial:   prod.valorUnitComercial,
    valorTotalComercial:  prod.valorTotalComercial,
    unidadeTributavel:    prod.unidadeTributavel,
    quantidadeTributavel: prod.quantidadeTributavel,
    valorUnitTributavel:  prod.valorUnitTributavel,
    cstIcms:      prod.cstIcms,
    aliquotaIcms: prod.aliquotaIcms,
    aliquotaIpi:  prod.aliquotaIpi,
    importacao: {
      notaFiscal:     notaFiscal.numero,
      serie:          notaFiscal.serie,
      dataEmissao:    notaFiscal.dataEmissao,
      fornecedor:     notaFiscal.fornecedor?.nome  || '',
      cnpjFornecedor: notaFiscal.fornecedor?.cnpj  || '',
      dataImportacao: new Date().toISOString(),
    }
  }));
}