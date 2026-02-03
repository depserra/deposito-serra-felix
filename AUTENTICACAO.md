# Como Criar Usuários no Firebase Authentication

## Passo 1: Acessar o Console do Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: **deposito-serra-felix**

## Passo 2: Habilitar Authentication

1. No menu lateral, clique em **Authentication**
2. Clique na aba **Sign-in method**
3. Habilite o método **Email/Password**
4. Clique em **Salvar**

## Passo 3: Criar Usuários

1. Clique na aba **Users**
2. Clique em **Add user**
3. Preencha:
   - **Email**: exemplo@email.com
   - **Password**: sua-senha-segura
4. Clique em **Add user**

## Exemplo de Credenciais

```
Email: admin@serrafelix.com
Senha: Admin@2026
```

## Como Usar

1. Acesse o sistema: http://localhost:3000
2. Você será redirecionado para a tela de login
3. Digite o email e senha cadastrados no Firebase
4. Clique em **Entrar**

## Funcionalidades Implementadas

✅ **Tela de Login** com validação
✅ **Proteção de rotas** - usuários não autenticados são redirecionados para login
✅ **Botão de Logout** no header
✅ **Persistência de sessão** - usuário permanece logado mesmo após fechar o navegador
✅ **Mensagens de erro** amigáveis para problemas de login
✅ **Loading states** durante autenticação
✅ **Email do usuário** exibido no header (desktop)

## Segurança

⚠️ **IMPORTANTE**: Configure as regras do Firestore para exigir autenticação:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Permitir apenas usuários autenticados
      allow read, write: if request.auth != null;
    }
  }
}
```

Para aplicar as regras:
1. No console do Firebase, vá em **Firestore Database**
2. Clique na aba **Rules**
3. Cole as regras acima
4. Clique em **Publish**
