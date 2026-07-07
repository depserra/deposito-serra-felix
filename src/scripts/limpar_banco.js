import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

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

const appDeposito = initializeApp(firebaseConfigDeposito, "deposito_temp");
const appRacao = initializeApp(firebaseConfigRacao, "racao_temp");

const dbDeposito = getFirestore(appDeposito);
const dbRacao = getFirestore(appRacao);

const authDeposito = getAuth(appDeposito);

async function limparColecoes(db, nomeDb) {
  console.log(`\n🧹 Iniciando limpeza do banco: ${nomeDb}...`);
  const colecoes = [
    "produtos", 
    "movimentacoesEstoque", 
    "produto_fornecedor_conversao",
    "compras",
    "vendas",
    "contasReceber",
    "contasPagar",
    "fluxoCaixa"
  ];

  for (const nomeCol of colecoes) {
    try {
      const colRef = collection(db, nomeCol);
      const snapshot = await getDocs(colRef);
      console.log(`Encontrados ${snapshot.size} documentos na coleção '${nomeCol}'`);

      if (snapshot.size === 0) continue;

      const chunks = [];
      const tempDocs = [...snapshot.docs];
      while (tempDocs.length > 0) {
        chunks.push(tempDocs.splice(0, 500));
      }

      let deletados = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(d => {
          batch.delete(doc(db, nomeCol, d.id));
        });
        await batch.commit();
        deletados += chunk.length;
        console.log(`Deletados ${deletados}/${snapshot.size} de '${nomeCol}'...`);
      }
      console.log(`✅ Coleção '${nomeCol}' limpa com sucesso.`);
    } catch (error) {
      console.error(`❌ Erro ao limpar coleção '${nomeCol}':`, error.message);
    }
  }
}

async function executar() {
  let tempUser = null;
  try {
    console.log("🔑 Efetuando login no banco DEPÓSITO...");
    const userCredential = await signInWithEmailAndPassword(authDeposito, "admin@serrafelix.com", "Admin@2026");
    tempUser = userCredential.user;
    console.log("✅ Login efetuado com sucesso!");
  } catch (authError) {
    console.log("⚠️ Não foi possível logar. Tentando criar um usuário temporário no DEPÓSITO...");
    try {
      const userCredential = await createUserWithEmailAndPassword(authDeposito, "temp_admin@serrafelix.com", "TempAdmin@2026");
      tempUser = userCredential.user;
      console.log("✅ Usuário temporário criado e logado com sucesso!");
    } catch (createError) {
      console.warn("❌ Não foi possível criar usuário temporário:", createError.message);
    }
  }

  await limparColecoes(dbDeposito, "DEPÓSITO");

  if (tempUser && tempUser.email === "temp_admin@serrafelix.com") {
    try {
      console.log("🗑️ Deletando usuário temporário no DEPÓSITO...");
      await deleteUser(tempUser);
      console.log("✅ Usuário temporário removido.");
    } catch (deleteError) {
      console.error("❌ Falha ao deletar usuário temporário:", deleteError.message);
    }
  }

  await limparColecoes(dbRacao, "CASA DE RAÇÃO");
  console.log("\n🎉 Limpeza concluída para ambos os bancos!");
  process.exit(0);
}

executar().catch(err => {
  console.error("Erro geral:", err);
  process.exit(1);
});
