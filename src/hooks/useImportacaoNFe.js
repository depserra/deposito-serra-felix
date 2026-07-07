// filepath: src/hooks/useImportacaoNFe.js

/**
 * Hook de importação de NF-e com suporte a conversão De/Para por fornecedor.
 *
 * Fluxo:
 * 1. Parsear XML → lista de produtos brutos (sem conversão)
 * 2. Para cada produto:
 *    a. Tentar usar qTrib/uTrib se coincide com a unidade do produto interno
 *    b. Buscar em produto_fornecedor_conversao por [cnpj + cProd]
 *       - Se encontrou → aplicar fatorConversao
 *    c. Se não encontrou → emitir evento "precisaConversao" para que o modal
 *       peça ao usuário e salve a conversão antes de continuar
 * 3. Match com produto interno por: produtoId (da conversão) > GTIN > código > nome
 * 4. Escrever entrada no estoque sempre na unidade base
 */

import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { parseNFeXML, processarProdutosNFe } from '../utils/parseNFeXML';
import { calcularEntradaEstoque, calcularPrecoBaseEntrada } from '../utils/conversaoUnidades';
import { useSystem } from '../contexts/SystemContext';
import { dbDeposito } from '../services/firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifica se as unidades tributável e comercial são iguais e têm a mesma
 * quantidade → significa que o par tributável já está na unidade base.
 */
function unidadeTributavelConfiavel(prod) {
  if (!prod.unidadeTributavel) return false;
  if (prod.unidadeTributavel.toUpperCase() === prod.unidadeComercial.toUpperCase()) return false; // mesma coisa
  if (prod.quantidadeTributavel <= 0) return false;
  // Se a quantidade tributável for diferente da comercial, é confiável como unidade base
  return Math.abs(prod.quantidadeTributavel - prod.quantidadeComercial) > 1e-6;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImportacaoNFe() {
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [logImportacao, setLogImportacao] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  /**
   * Quando não-null, contém o item que aguarda a conversão do usuário.
   * { produtoNFe, cnpjFornecedor, onConfirmar(fator, unidadeBase, produtoId) }
   */
  const [pendenciaConversao, setPendenciaConversao] = useState(null);

  const { activeSystem } = useSystem();
  const db = activeSystem?.db ?? dbDeposito;
  const col    = (name)     => collection(db, name);
  const colDoc = (name, id) => doc(db, name, id);

  const adicionarLog = useCallback((mensagem, tipo = 'info') => {
    setLogImportacao(prev => [...prev, {
      timestamp: new Date().toISOString(),
      tipo,
      mensagem
    }]);
  }, []);

  // ─── Buscar conversão cadastrada ───────────────────────────────────────────

  const buscarConversaoFornecedor = useCallback(async (cnpj, codigoFornecedor, gtin) => {
    // 1. Tentar por CNPJ + cProd
    if (cnpj && codigoFornecedor) {
      const q = query(
        col('produto_fornecedor_conversao'),
        where('cnpjFornecedor', '==', cnpj),
        where('codigoFornecedor', '==', codigoFornecedor)
      );
      const snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    // 2. Tentar por GTIN (se for válido e não genérico)
    const gtinValido = gtin && gtin.trim() !== '' && !['sem gtin', 'semgtin', '0', 'null', 'undefined', 'n/a'].includes(gtin.trim().toLowerCase());
    if (gtinValido) {
      const q2 = query(col('produto_fornecedor_conversao'), where('gtin', '==', gtin.trim()));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) return { id: snap2.docs[0].id, ...snap2.docs[0].data() };
    }
    return null;
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Buscar produto interno por ID, GTIN, código ou nome ──────────────────

  const buscarProdutoInterno = useCallback(async (produtoId, gtin, codigoFornecedor, nome) => {
    // Por ID direto (vem da conversão)
    if (produtoId) {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(colDoc('produtos', produtoId));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
      } catch { /* ignorar */ }
    }
    // Por GTIN (se for válido e não genérico)
    const gtinValido = gtin && gtin.trim() !== '' && !['sem gtin', 'semgtin', '0', 'null', 'undefined', 'n/a'].includes(gtin.trim().toLowerCase());
    if (gtinValido) {
      const q = query(col('produtos'), where('gtin', '==', gtin.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    // Por código do fornecedor (pode estar cadastrado como 'codigo' no produto)
    if (codigoFornecedor) {
      const q = query(col('produtos'), where('codigo', '==', codigoFornecedor));
      const snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    // Por nome (case insensitive — Firestore não suporta, então busca tudo e filtra)
    if (nome) {
      const todos = await getDocs(col('produtos'));
      const nomeLower = nome.toLowerCase();
      const match = todos.docs.find(d => d.data().nome?.toLowerCase() === nomeLower);
      if (match) return { id: match.id, ...match.data() };
    }
    return null;
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Salvar conversão após o usuário informar ──────────────────────────────

  const salvarConversao = useCallback(async (dados) => {
    const payload = {
      produtoId:             dados.produtoId             || '',
      cnpjFornecedor:        dados.cnpjFornecedor        || '',
      codigoFornecedor:      dados.codigoFornecedor      || '',
      gtin:                  dados.gtin                  || '',
      unidadeCompra:         dados.unidadeCompra         || 'UN',
      fatorConversao:        Number(dados.fatorConversao) || 1,
      unidadeBase:           dados.unidadeBase           || 'un',
      nomeProdutoFornecedor: dados.nomeProdutoFornecedor || '',
      criadoEm:              serverTimestamp(),
      atualizadoEm:          serverTimestamp(),
    };
    await addDoc(col('produto_fornecedor_conversao'), payload);
    return payload;
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Importar XML principal ────────────────────────────────────────────────

  const importarXML = useCallback(async (file) => {
    setImportando(true);
    setProgresso(0);
    setLogImportacao([]);
    setUltimoResultado(null);

    try {
      // 1. Ler e parsear o XML
      adicionarLog('Iniciando leitura do arquivo XML...', 'info');
      const conteudo = await file.text();
      setProgresso(10);

      adicionarLog('Analisando estrutura do XML...', 'info');
      const { notaFiscal, produtos } = parseNFeXML(conteudo);
      setProgresso(20);

      adicionarLog(`Nota Fiscal: ${notaFiscal.numero} - Série: ${notaFiscal.serie}`, 'info');
      adicionarLog(`Fornecedor: ${notaFiscal.fornecedor?.nome || 'Não identificado'} (CNPJ: ${notaFiscal.fornecedor?.cnpj || '?'})`, 'info');
      adicionarLog(`Produtos encontrados no XML: ${produtos.length}`, 'success');

      if (produtos.length === 0) throw new Error('Nenhum produto encontrado no arquivo XML');

      const cnpjFornecedor = (notaFiscal.fornecedor?.cnpj || '').replace(/\D/g, '');
      const produtosParaProcessar = processarProdutosNFe(produtos, notaFiscal);
      setProgresso(30);

      // 2. Para cada produto, descobrir quantidade e conversão
      const itensResolvidos = [];
      const itensPendentes  = [];

      for (const prod of produtosParaProcessar) {
        // 2a. Verificar se qTrib/uTrib são confiáveis (já em unidade base)
        let entradaResolvida = null;

        if (unidadeTributavelConfiavel(prod)) {
          adicionarLog(
            `✓ ${prod.nome}: usando unidade tributável (${prod.quantidadeTributavel} ${prod.unidadeTributavel})`,
            'info'
          );
          const fat = prod.quantidadeComercial > 0 ? (prod.quantidadeTributavel / prod.quantidadeComercial) : 1;
          entradaResolvida = {
            prod,
            quantidadeEntrada: prod.quantidadeTributavel,
            unidadeEntrada:    prod.unidadeTributavel.toLowerCase(),
            precoCompraBase:   prod.valorUnitTributavel,
            fatorUsado:        'qTrib',
            conversaoId:       null,
            fator:             fat,
          };
        } else {
          // 2b. Buscar conversão cadastrada
          const conversao = await buscarConversaoFornecedor(cnpjFornecedor, prod.codigoFornecedor, prod.gtin);

          if (conversao) {
            const qtdEntrada   = calcularEntradaEstoque(prod.quantidadeComercial, conversao.fatorConversao);
            const precoEntrada = calcularPrecoBaseEntrada(prod.valorUnitComercial, conversao.fatorConversao);
            adicionarLog(
              `✓ ${prod.nome}: ${prod.quantidadeComercial} ${prod.unidadeComercial} × ${conversao.fatorConversao} = ${qtdEntrada} ${conversao.unidadeBase}`,
              'info'
            );
            entradaResolvida = {
              prod,
              quantidadeEntrada: qtdEntrada,
              unidadeEntrada:    conversao.unidadeBase,
              precoCompraBase:   precoEntrada,
              fatorUsado:        `conversao:${conversao.fatorConversao}`,
              conversaoId:       conversao.id,
              produtoIdSugerido: conversao.produtoId,
              fator:             conversao.fatorConversao,
            };
          } else {
            // 2c. Conversão não encontrada → pedir ao usuário
            adicionarLog(
              `⚠ ${prod.nome} (${prod.codigoFornecedor}): nenhuma conversão cadastrada para este fornecedor`,
              'warning'
            );
            itensPendentes.push({ prod, cnpjFornecedor });
          }
        }

        if (entradaResolvida) itensResolvidos.push(entradaResolvida);
      }

      setProgresso(50);

      // 3. Se houver itens sem conversão, pausar e aguardar o usuário
      if (itensPendentes.length > 0) {
        setImportando(false);
        // Sinaliza o primeiro pendente para o componente exibir o modal
        // O componente deve chamar 'confirmarConversao' para cada item e depois 'retomarImportacao'
        setPendenciaConversao({
          itens: itensPendentes,
          itensResolvidos,
          notaFiscal,
          cnpjFornecedor,
          totalProdutos: produtosParaProcessar.length,
        });
        adicionarLog(`${itensPendentes.length} produto(s) aguardam informação de conversão.`, 'warning');
        return { pendente: true, itensPendentes, itensResolvidos };
      }

      // 4. Todos resolvidos → gravar no Firestore
      const resultado = await _gravarEntradas(itensResolvidos, notaFiscal);
      setImportando(false);
      setUltimoResultado(resultado);
      return resultado;

    } catch (error) {
      console.error('Erro na importação:', error);
      adicionarLog(`Erro: ${error.message}`, 'error');
      setImportando(false);
      throw error;
    }
  }, [adicionarLog, buscarConversaoFornecedor, db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Confirmar conversão pelo usuário e retomar ────────────────────────────

  /**
   * Chamado pelo modal ModalConversaoFornecedor quando o usuário confirma.
   * @param {{ fatorConversao: number, unidadeBase: string, produtoId?: string }} dadosConversao
   */
   const confirmarPendenciaConversao = useCallback(async (respostas) => {
    if (!pendenciaConversao) return;

    const { itensResolvidos, notaFiscal, cnpjFornecedor } = pendenciaConversao;

    setImportando(true);
    adicionarLog('Processando conversões confirmadas...', 'info');

    const novosResolvidos = [...itensResolvidos];

    for (const resp of respostas) {
      const { item, fatorConversao, unidadeBase, produtoId, salvarParaFuturo } = resp;
      const { prod } = item;

      if (salvarParaFuturo) {
        // Salvar conversão para uso futuro
        await salvarConversao({
          produtoId:             produtoId || '',
          cnpjFornecedor,
          codigoFornecedor:      prod.codigoFornecedor,
          gtin:                  prod.gtin,
          unidadeCompra:         prod.unidadeComercial,
          fatorConversao,
          unidadeBase,
          nomeProdutoFornecedor: prod.nome,
        });
      }

      const qtdEntrada   = calcularEntradaEstoque(prod.quantidadeComercial, fatorConversao);
      const precoEntrada = calcularPrecoBaseEntrada(prod.valorUnitComercial, fatorConversao);

      adicionarLog(
        `✓ Conversão salva para ${prod.nome}: 1 ${prod.unidadeComercial} = ${fatorConversao} ${unidadeBase}. Entrada: ${qtdEntrada} ${unidadeBase}`,
        'success'
      );

      novosResolvidos.push({
        prod,
        quantidadeEntrada: qtdEntrada,
        unidadeEntrada:    unidadeBase,
        precoCompraBase:   precoEntrada,
        fatorUsado:        `usuario:${fatorConversao}`,
        produtoIdSugerido: produtoId || null,
        fator:             fatorConversao,
      });
    }

    setPendenciaConversao(null);
    setProgresso(70);

    const resultado = await _gravarEntradas(novosResolvidos, notaFiscal);
    setImportando(false);
    setUltimoResultado(resultado);
    return resultado;
  }, [pendenciaConversao, salvarConversao, adicionarLog]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Gravar entradas no Firestore ─────────────────────────────────────────

  const _gravarEntradas = useCallback(async (itensResolvidos, notaFiscal) => {
    adicionarLog('Verificando produtos no estoque...', 'info');

    const batch = writeBatch(db);
    let produtosNovos = 0, produtosAtualizados = 0;
    const compraItens = [];
    const codigoCompra = Math.floor(10000 + Math.random() * 90000).toString();
    const compraRef = doc(col('compras'));

    for (const item of itensResolvidos) {
      const { prod, quantidadeEntrada, unidadeEntrada, precoCompraBase, produtoIdSugerido, fator } = item;

      // Buscar produto interno
      const produtoExistente = await buscarProdutoInterno(
        produtoIdSugerido,
        prod.gtin,
        prod.codigoFornecedor,
        prod.nome
      );

      const precoVenda = Math.round(precoCompraBase * 1.30 * 100) / 100; // margem 30%
      const fatNum = Number(fator) || 1;
      const itemCategoria = produtoExistente?.categoria || 'Importado NF-e';

      // Adicionar item à lista da compra
      compraItens.push({
        nomeProduto: prod.nome,
        categoria: itemCategoria,
        unidadeCompra: prod.unidadeComercial || 'un',
        fatorConversao: fatNum,
        unidade: unidadeEntrada || 'un',
        quantidadeComprada: Number(prod.quantidadeComercial) || 0,
        unidadeComprada: prod.unidadeComercial || 'un',
        quantidade: quantidadeEntrada || 0,
        valorCompra: precoCompraBase || 0,
        valorVenda: precoVenda || 0
      });

      if (produtoExistente) {
        // Determinar o incremento correto dependendo de como o estoque é controlado
        const uEstoque = (produtoExistente.unidade || '').toUpperCase();
        const uComercial = (prod.unidadeComercial || '').toUpperCase();
        const uBase = (unidadeEntrada || '').toUpperCase();

        let qtdIncremento = quantidadeEntrada;
        if (uEstoque === uComercial) {
          // Estoque do produto já é controlado na unidade de compra (ex: SC)
          qtdIncremento = prod.quantidadeComercial;
        } else if (uEstoque === uBase) {
          // Estoque é na unidade base (ex: kg)
          qtdIncremento = quantidadeEntrada;
        }

        const saldoAntes = parseFloat(produtoExistente.quantidade) || 0;
        const saldoDepois = saldoAntes + qtdIncremento;

        const updates = {
          quantidade:  increment(qtdIncremento),
          precoCompra: precoCompraBase,
          // Não sobrescrevemos a unidade para não corromper o estoque existente
          atualizadoEm: serverTimestamp(),
          ultimaImportacao: prod.importacao,
        };

        // Se o produto existente não tiver fator de conversão configurado (ou for 1)
        // e o fator resolvido da importação for maior que 1, configurar automaticamente
        if (fatNum > 1 && (!produtoExistente.fatorConversao || produtoExistente.fatorConversao === 1)) {
          // Se a unidade de estoque do produto for igual à unidade de venda (ex: kg = kg), o fator deve ser 1.
          // Só aplicamos fator > 1 se a unidade de estoque for diferente da unidade de venda.
          if (uEstoque !== uBase) {
            updates.fatorConversao = fatNum;
            updates.vendaFracionada = true;
            updates.permiteFragmentacao = true;
            updates.unidadeVenda = unidadeEntrada; // Ex: 'kg'
            updates.precoVendaUnitario = Math.round((parseFloat(produtoExistente.precoVenda || precoVenda) / fatNum) * 100) / 100;
          }
        }

        batch.update(colDoc('produtos', produtoExistente.id), updates);

        // Log de movimentação (kardex)
        const movRef = doc(col('movimentacoesEstoque'));
        batch.set(movRef, {
          produtoId:   produtoExistente.id,
          tipo:        'entrada',
          quantidade:  qtdIncremento,
          saldoAntes,
          saldoDepois,
          motivo:      `NF-e ${prod.importacao.notaFiscal}/${prod.importacao.serie}`,
          documento:   prod.importacao.notaFiscal,
          fornecedor:  prod.importacao.fornecedor,
          compraId:    compraRef.id,
          codigoCompra,
          data:        new Date().toISOString(),
          criadoEm:    serverTimestamp(),
        });

        produtosAtualizados++;
        const unidadeExibicao = produtoExistente.unidade || unidadeEntrada;
        adicionarLog(
          `Atualizado: ${prod.nome} (+${qtdIncremento} ${unidadeExibicao}, saldo: ${saldoAntes} → ${saldoDepois})`,
          'warning'
        );
      } else {
        // Criar novo produto
        const novoProdRef = doc(col('produtos'));
        const fracionavel = fatNum > 1;

        // A pedido do usuário, o estoque é sempre controlado na unidade base (ex: kg)
        // para evitar frações de sacos/embalagens (ex: 0.8 sacos) no painel.
        const estoqueUnidade = unidadeEntrada;
        const estoqueQuantidade = quantidadeEntrada;

        batch.set(novoProdRef, {
          nome:         prod.nome,
          codigo:       prod.codigoFornecedor,
          gtin:         prod.gtin || '',
          descricao:    prod.descricao,
          ncm:          prod.ncm,
          cfop:         prod.cfop,
          categoria:    'Importado NF-e',
          unidade:      estoqueUnidade,
          quantidade:   estoqueQuantidade,
          estoqueMinimo: 0,
          precoCompra:  precoCompraBase, // Preço por unidade base (ex: kg)
          precoVenda:   precoVenda, // Preço por unidade base (ex: kg)
          vendaFracionada:     fracionavel,
          permiteFragmentacao: fracionavel,
          fatorConversao:      fatNum,
          unidadeVenda:        unidadeEntrada,
          precoVendaUnitario:  precoVenda,
          incrementoMinimoVenda: 0,
          ativo:         true,
          ultimaImportacao: prod.importacao,
          criadoEm:      serverTimestamp(),
          atualizadoEm:  serverTimestamp(),
        });

        // Log de movimentação (kardex)
        const movRef = doc(col('movimentacoesEstoque'));
        batch.set(movRef, {
          produtoId:  novoProdRef.id,
          tipo:       'entrada',
          quantidade: estoqueQuantidade,
          saldoAntes: 0,
          saldoDepois: estoqueQuantidade,
          motivo:     `NF-e ${prod.importacao.notaFiscal}/${prod.importacao.serie} (novo produto)`,
          documento:  prod.importacao.notaFiscal,
          fornecedor: prod.importacao.fornecedor,
          compraId:    compraRef.id,
          codigoCompra,
          data:       new Date().toISOString(),
          criadoEm:  serverTimestamp(),
        });

        produtosNovos++;
        adicionarLog(`Novo produto: ${prod.nome} (${estoqueQuantidade} ${estoqueUnidade})`, 'success');
      }
    }

    // Criar o documento de compra para registrar no financeiro/compras
    let dataCompraDate = new Date();
    if (notaFiscal.dataEmissao) {
      const d = new Date(notaFiscal.dataEmissao);
      if (!isNaN(d.getTime())) {
        dataCompraDate = d;
      }
    }

    const compraData = {
      codigoCompra,
      fornecedor: notaFiscal.fornecedor?.nome || 'Não identificado',
      cnpjFornecedor: (notaFiscal.fornecedor?.cnpj || '').replace(/\D/g, ''),
      dataCompra: dataCompraDate,
      formaPagamento: '',
      observacoes: `Importado automaticamente via NF-e nº ${notaFiscal.numero || ''} (Série ${notaFiscal.serie || ''})`,
      valorTotal: Number(notaFiscal.valorTotal) || 0,
      itens: compraItens,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    };
    batch.set(compraRef, compraData);

    setProgresso(90);
    adicionarLog('Salvando alterações no banco de dados...', 'info');
    await batch.commit();
    setProgresso(100);

    const resultado = {
      notaFiscal:         notaFiscal.numero,
      serie:              notaFiscal.serie,
      fornecedor:         notaFiscal.fornecedor?.nome,
      totalProdutos:      itensResolvidos.length,
      produtosNovos,
      produtosAtualizados,
      valorTotal:         notaFiscal.valorTotal,
      dataImportacao:     new Date().toISOString(),
    };

    adicionarLog('Importação concluída!', 'success');
    adicionarLog(`Novos: ${produtosNovos} | Atualizados: ${produtosAtualizados}`, 'success');
    return resultado;
  }, [adicionarLog, buscarProdutoInterno, db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Limpar estado ─────────────────────────────────────────────────────────

  const limparLog = useCallback(() => {
    setLogImportacao([]);
    setUltimoResultado(null);
    setProgresso(0);
    setPendenciaConversao(null);
  }, []);

  return {
    importarXML,
    confirmarPendenciaConversao,
    importando,
    progresso,
    logImportacao,
    ultimoResultado,
    pendenciaConversao,
    limparLog,
  };
}