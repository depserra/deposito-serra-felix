import { useState } from 'react';
import { db } from '../../services/firebase';

export default function TesteFirebase() {
  const [erro, setErro] = useState(null);

  // Verifica se temos as credenciais do Firebase
  const temCredenciais = db?.app?.options?.apiKey && 
    db?.app?.options?.projectId;

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Status do Firebase</h3>
      
      <div className="space-y-4">
        <div>
          <strong>Status de Configuração:</strong>{' '}
          {temCredenciais ? (
            <span className="text-green-600">Credenciais encontradas</span>
          ) : (
            <span className="text-red-600">Credenciais não configuradas</span>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p>Verifique no arquivo <code>src/services/firebase.js</code>:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>API Key: {db?.app?.options?.apiKey ? '✅' : '❌'}</li>
            <li>Project ID: {db?.app?.options?.projectId ? '✅' : '❌'}</li>
            <li>Auth Domain: {db?.app?.options?.authDomain ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}