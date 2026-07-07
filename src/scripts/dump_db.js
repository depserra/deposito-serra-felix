import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfigDeposito = {
  apiKey: "AIzaSyCbH1440LSYJqZJSkkutT_o5q6u22lK2QY",
  authDomain: "deposito-serra-do-felix.firebaseapp.com",
  projectId: "deposito-serra-do-felix",
  storageBucket: "deposito-serra-do-felix.firebasestorage.app",
  messagingSenderId: "412648694325",
  appId: "1:412648694325:web:a3749d6e8274e84047477c",
};

const firebaseConfigRacao = {
  apiKey: "AIzaSyDcfcxAZ21z2wy9FRDv2YyyZ71Gp53hag0",
  authDomain: "casa-de-racao-2f709.firebaseapp.com",
  projectId: "casa-de-racao-2f709",
  storageBucket: "casa-de-racao-2f709.firebasestorage.app",
  messagingSenderId: "791716625966",
  appId: "1:791716625966:web:ac32b6f75d87df9a2a29bf"
};

const appDeposito = initializeApp(firebaseConfigDeposito, "deposito_dump");
const appRacao = initializeApp(firebaseConfigRacao, "racao_dump");

const dbDeposito = getFirestore(appDeposito);
const dbRacao = getFirestore(appRacao);

async function dump(db, name) {
  console.log(`=== DUMP ${name} ===`);
  
  const prodSnap = await getDocs(collection(db, "produtos"));
  console.log(`\nProdutos (${prodSnap.size}):`);
  prodSnap.forEach(d => {
    const p = d.data();
    console.log(`- ID: ${d.id} | Nome: ${p.nome} | Código: ${p.codigo} | Quantidade: ${p.quantidade} ${p.unidade} | Fator: ${p.fatorConversao}`);
  });

  const convSnap = await getDocs(collection(db, "produto_fornecedor_conversao"));
  console.log(`\nConversões (${convSnap.size}):`);
  convSnap.forEach(d => {
    const c = d.data();
    console.log(`- ID: ${d.id} | ProdID: ${c.produtoId} | FornCod: ${c.codigoFornecedor} | Fator: ${c.fatorConversao} | UnBase: ${c.unidadeBase}`);
  });
}

async function run() {
  try {
    await dump(dbDeposito, "DEPÓSITO");
  } catch (err) {
    console.error("Erro ao dar dump no Depósito:", err.message);
  }
  
  try {
    await dump(dbRacao, "CASA DE RAÇÃO");
  } catch (err) {
    console.error("Erro ao dar dump na Ração:", err.message);
  }
  process.exit(0);
}

run();
