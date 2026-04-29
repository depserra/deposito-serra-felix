// filepath: src/hooks/useImportacaoNFe.js

import { useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { parseNFeXML, processarProdutosNFe } from '../utils/parseNFeXML';

export function useImportacaoNFe() {
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [logImportacao, setLogImportacao] = useState([]);
  const [ultimoResultado, setUltimoResultado] = useState(null);

  // Adicionar mensagem ao log
  const adicionarLog = useCallback((mensagem, tipo = 'info') => {
    setLogImportacao(prev => [...prev, {
      timestamp: new Date().toISOString(),
      tipo,
      mensagem
    }]);
  }, []);

  // Importar arquivo XML
  const importarXML = useCallback(async (file) => {
    setImportando(true);
    setProgresso(0);
    setLogImportacao([]);
    setUltimoResultado(null);

    try {
      // Ler arquivo XML
      adicionarLog('Iniciando leitura do arquivo XML...', 'info');
      const conteudo = await file.text();
      
      setProgresso(10);
      adicionarLog('Arquivo lido com sucesso', 'success');

      // Parse do XML
      adicionarLog('Analisando estrutura do XML...', 'info');
      const { notaFiscal, produtos } = parseNFeXML(conteudo);
      
      setProgresso(30);
      adicionarLog(`Nota Fiscal: ${notaFiscal.numero} - Série: ${notaFiscal.serie}`, 'info');
      adicionarLog(`Fornecedor: ${notaFiscal.fornecedor?.nome || 'Não identificado'}`, 'info');
      adicionarLog(`Produtos encontrados: ${produtos.length}`, 'success');

      if (produtos.length === 0) {
        throw new Error('Nenhum produto encontrado no arquivo XML');
      }

      // Processar produtos para formato de estoque
      const produtosProcessados = processarProdutosNFe(produtos, notaFiscal);
      
      setProgresso(50);
      adicionarLog('Produtos processados, verificando duplicados...', 'info');

      // Otimização: Buscar produtos por código primeiro (mais eficiente)
      const codigosParaBuscar = produtosProcessados
        .filter(p => p.codigo)
        .map(p => p.codigo);
      
      let produtosExistentes = [];
      
      // Se houver códigos para buscar, fazer query filtrada
      if (codigosParaBuscar.length > 0) {
        // Busca por códigos em lotes de 10 (limite do Firestore para "in")
        const codigosUnicos = [...new Set(codigosParaBuscar)];
        const batchCodigos = codigosUnicos.slice(0, 10);
        
        const q = query(
          collection(db, 'produtos'),
          where('codigo', 'in', batchCodigos)
        );
        const snapshot = await getDocs(q);
        produtosExistentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        adicionarLog(`Verificados ${produtosExistentes.length} produtos por código`, 'info');
      }
      
      setProgresso(70);

      // Criar batch para operações
      const batch = writeBatch(db);
      let produtosNovos = 0;
      let produtosAtualizados = 0;
      let produtosIgnorados = 0;

      for (let i = 0; i < produtosProcessados.length; i++) {
        const prod = produtosProcessados[i];
        
        // Buscar produto existente por código OU nome
        let produtoExistente = null;
        
        // Primeiro tenta encontrar por código
        if (prod.codigo) {
          produtoExistente = produtosExistentes.find(p => p.codigo === prod.codigo);
        }
        
        // Se não encontrou por código, tenta por nome
        if (!produtoExistente) {
          produtoExistente = produtosExistentes.find(p => 
            p.nome && p.nome.toLowerCase() === prod.nome.toLowerCase()
          );
        }

        if (produtoExistente) {
          // Atualizar quantidade (somar)
          const novaQuantidade = produtoExistente.quantidade + prod.quantidade;
          
          batch.update(doc(db, 'produtos', produtoExistente.id), {
            ...prod,
            quantidade: novaQuantidade,
            atualizadoEm: serverTimestamp(),
            ultimaImportacao: prod.importacao
          });
          
          produtosAtualizados++;
          adicionarLog(`Atualizado: ${prod.nome} (quantidade: ${produtoExistente.quantidade} → ${novaQuantidade})`, 'warning');
        } else {
          // Criar novo produto
          const novoProdRef = doc(collection(db, 'produtos'));
          batch.set(novoProdRef, {
            ...prod,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          });
          
          produtosNovos++;
          adicionarLog(`Novo produto: ${prod.nome}`, 'success');
        }
      }

      setProgresso(90);
      adicionarLog('Salvando alterações no banco de dados...', 'info');

      // Executar batch
      await batch.commit();

      setProgresso(100);
      
      const resultado = {
        notaFiscal: notaFiscal.numero,
        serie: notaFiscal.serie,
        fornecedor: notaFiscal.fornecedor?.nome,
        totalProdutos: produtosProcessados.length,
        produtosNovos,
        produtosAtualizados,
        produtosIgnorados,
        valorTotal: notaFiscal.valorTotal,
        dataImportacao: new Date().toISOString()
      };

      setUltimoResultado(resultado);
      adicionarLog(`Importação concluída!`, 'success');
      adicionarLog(`Novos: ${produtosNovos} | Atualizados: ${produtosAtualizados}`, 'success');

      setImportando(false);
      return resultado;

    } catch (error) {
      console.error('Erro na importação:', error);
      adicionarLog(`Erro: ${error.message}`, 'error');
      setImportando(false);
      throw error;
    }
  }, [adicionarLog]);

  // Limpar log
  const limparLog = useCallback(() => {
    setLogImportacao([]);
    setUltimoResultado(null);
    setProgresso(0);
  }, []);

  return {
    importarXML,
    importando,
    progresso,
    logImportacao,
    ultimoResultado,
    limparLog
  };
}