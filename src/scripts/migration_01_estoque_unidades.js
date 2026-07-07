#!/usr/bin/env node
/**
 * migration_01_estoque_unidades.js
 *
 * Script de migration AGRESSIVO para o novo modelo de unidades de estoque.
 * 
 * O que faz:
 * 1. Lê todos os produtos dos dois Firestores (deposito + racao)
 * 2. Adiciona os novos campos com defaults seguros:
 *    - permiteFragmentacao (herda de vendaFracionada)
 *    - incrementoMinimoVenda (0 = sem restrição)
 * 3. Para produtos de ração cujo nome contém peso (ex: "10kg"):
 *    - Preenche automaticamente fatorConversao baseado na regex
 *    - Marca vendaFracionada = true se ainda não estiver
 * 4. Gera CSV para revisão manual
 *
 * Como rodar:
 *   node src/scripts/migration_01_estoque_unidades.js
 *
 * Pré-requisitos:
 *   npm install firebase-admin  (apenas para este script)
 *   Definir GOOGLE_APPLICATION_CREDENTIALS ou serviceAccountKey.json
 *
 * FAÇA BACKUP ANTES DE RODAR:
 *   Console Firebase → Firestore → Exportar dados
 */

import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuração ─────────────────────────────────────────────────────────────

const PROJETOS = [
  { nome: 'deposito', projectId: 'deposito-serra-do-felix' },
  { nome: 'racao',    projectId: 'casa-de-racao-2f709'     },
];

// ─── Regex de peso (mesma do extrairPesoDoNome) ───────────────────────────────

function extrairPesoDoNome(nome) {
  if (!nome) return null;
  const match = nome.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|kilo|g)\b/i);
  if (!match) return null;
  let num = parseFloat(match[1].replace(',', '.'));
  const unitMatch = match[0].toLowerCase();
  if (unitMatch.includes('g') && !unitMatch.includes('kg')) {
    num = num / 1000; // gramas → kg
  }
  return num > 0 ? num : null;
}

// ─── Linha CSV ────────────────────────────────────────────────────────────────

function linhaCSV(...campos) {
  return campos.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let admin;
  try {
    const mod = await import('firebase-admin');
    admin = mod.default;
  } catch {
    console.error('❌ firebase-admin não encontrado. Instale com: npm install firebase-admin');
    process.exit(1);
  }

  // Inicializar Firebase Admin (usa GOOGLE_APPLICATION_CREDENTIALS ou arquivo local)
  if (admin.apps.length === 0) {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      // Tentar usar serviceAccountKey.json local (não commitado)
      const serviceAccount = require(join(__dirname, '../../serviceAccountKey.json'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch {
      // Usar credenciais do ambiente (GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp();
    }
  }

  const csvPath = join(__dirname, '../../produtos_para_revisar.csv');
  const csvStream = createWriteStream(csvPath, { encoding: 'utf-8' });
  csvStream.write('\uFEFF'); // BOM para Excel
  csvStream.write(linhaCSV(
    'sistema', 'id', 'nome', 'unidade', 'quantidade',
    'vendaFracionada_antes', 'fatorConversao_antes',
    'pesoExtraidoDoNome', 'acao', 'observacao'
  ) + '\n');

  let totalProdutos = 0;
  let totalAtualizados = 0;
  let totalParaRevisar = 0;

  for (const projeto of PROJETOS) {
    console.log(`\n=== Processando sistema: ${projeto.nome} (${projeto.projectId}) ===`);

    // Inicializar app separado para cada projeto
    const appName = projeto.nome;
    let app;
    try {
      app = admin.app(appName);
    } catch {
      app = admin.initializeApp({ projectId: projeto.projectId }, appName);
    }
    const db = admin.firestore(app);

    const snapshot = await db.collection('produtos').get();
    console.log(`  Produtos encontrados: ${snapshot.size}`);

    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH = 400; // Firestore: max 500 por batch

    for (const docSnap of snapshot.docs) {
      const prod = docSnap.data();
      const update = {};
      let acao = '';
      let observacao = '';

      // 1. Adicionar permiteFragmentacao e incrementoMinimoVenda com defaults
      if (prod.permiteFragmentacao === undefined) {
        update.permiteFragmentacao = prod.vendaFracionada || false;
      }
      if (prod.incrementoMinimoVenda === undefined) {
        update.incrementoMinimoVenda = 0;
      }

      // 2. Corrigir quantidades que podem estar como inteiros (parseInt legado)
      if (typeof prod.quantidade === 'number' && Number.isInteger(prod.quantidade)) {
        // Não alterar — inteiros podem estar corretos
        // Mas logar se a unidade for kg/l/m (suspeita de truncamento)
        const unidadeMedida = ['kg', 'g', 'l', 'ml', 'm', 'm2', 'm3'];
        if (unidadeMedida.includes(prod.unidade?.toLowerCase()) && prod.quantidade > 0) {
          observacao = `Quantidade ${prod.quantidade} ${prod.unidade} — verificar se foi truncada pelo parseInt`;
          totalParaRevisar++;
        }
      }

      // 3. Verificar se produto tem peso no nome mas não tem fatorConversao explícito
      const pesoNoNome = extrairPesoDoNome(prod.nome);

      if (pesoNoNome !== null) {
        if (!prod.vendaFracionada && !prod.permiteFragmentacao) {
          // AÇÃO AGRESSIVA: preencher automaticamente com base na regex
          update.vendaFracionada = true;
          update.permiteFragmentacao = true;
          update.fatorConversao = pesoNoNome;
          update.unidadeVenda = 'kg';
          if (!prod.precoVendaUnitario && prod.precoVenda) {
            update.precoVendaUnitario = Number((prod.precoVenda / pesoNoNome).toFixed(4));
          }
          acao = 'PREENCHIDO_AUTOMATICAMENTE';
          observacao = `Peso ${pesoNoNome}kg extraído do nome. Revise!`;
          totalParaRevisar++;
        } else if (prod.fatorConversao !== pesoNoNome) {
          acao = 'DIVERGENCIA_FATOR_X_NOME';
          observacao = `fatorConversao=${prod.fatorConversao} mas nome sugere ${pesoNoNome}kg`;
          totalParaRevisar++;
        }
      }

      // Verificar produtos com fatorConversao > 1 mas sem unidadeVenda
      if ((prod.vendaFracionada || prod.permiteFragmentacao) && !prod.unidadeVenda) {
        if (!update.unidadeVenda) {
          observacao = (observacao ? observacao + '. ' : '') + 'Sem unidadeVenda definida!';
          totalParaRevisar++;
        }
      }

      // Adicionar timestamp de migration
      update.atualizadoEm = admin.firestore.FieldValue.serverTimestamp();
      update._migrationV1 = true;

      // Gravar linha CSV
      csvStream.write(linhaCSV(
        projeto.nome,
        docSnap.id,
        prod.nome || '',
        prod.unidade || '',
        prod.quantidade ?? '',
        prod.vendaFracionada ?? false,
        prod.fatorConversao ?? 1,
        pesoNoNome ?? '',
        acao || (Object.keys(update).length > 2 ? 'CAMPOS_ADICIONADOS' : 'SEM_ALTERACAO'),
        observacao
      ) + '\n');

      // Só atualiza se tem mudanças além do timestamp
      if (Object.keys(update).length > 2) {
        batch.update(docSnap.ref, update);
        batchCount++;
        totalAtualizados++;

        if (batchCount >= MAX_BATCH) {
          console.log(`  Commitando batch de ${batchCount} documentos...`);
          await batch._commit(); // Reset interno do batch não é público, usar novo batch
          batchCount = 0;
        }
      }

      totalProdutos++;
    }

    // Commit final
    if (batchCount > 0) {
      console.log(`  Commitando batch final de ${batchCount} documentos...`);
      await batch.commit();
    }

    console.log(`  ✓ ${totalAtualizados} produtos atualizados`);
  }

  csvStream.end();
  console.log('\n=== MIGRATION CONCLUÍDA ===');
  console.log(`Total de produtos processados: ${totalProdutos}`);
  console.log(`Total de produtos atualizados: ${totalAtualizados}`);
  console.log(`Total para revisar manualmente: ${totalParaRevisar}`);
  console.log(`CSV de revisão gerado em: ${csvPath}`);
  console.log('\n⚠️  Abra o arquivo produtos_para_revisar.csv e revise as linhas com:');
  console.log('   - PREENCHIDO_AUTOMATICAMENTE (fator extraído do nome — confirme o valor)');
  console.log('   - DIVERGENCIA_FATOR_X_NOME (o cadastro difere do nome do produto)');
  console.log('   - Observações sobre quantidade suspeita de truncamento');
}

main().catch(err => {
  console.error('Erro fatal na migration:', err);
  process.exit(1);
});
