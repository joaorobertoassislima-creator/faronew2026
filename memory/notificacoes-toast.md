---
name: notificacoes-toast
description: Regra do usuário — toda mensagem de ação do sistema deve aparecer como Toast Notification no canto direito da tela
metadata:
  type: feedback
---

Toda alteração, exclusão ou ação confirmada no SisPatri deve ser comunicada por **Toast Notification no canto direito da tela**, nunca apenas por mensagem embutida na página.

**Why:** pedido explícito do usuário ("a partir de agora"), para que o retorno de qualquer ação seja sempre visível, independente de onde o usuário esteja na tela.

**How to apply:**
- Usar o componente `src/components/ui/toast.tsx` (`ToastProvider` + hook `useToast`), que já está montado no `src/App.tsx` envolvendo todas as rotas.
- API: `toast(mensagem, tipo?)` com tipos `sucesso` (padrão), `erro` e `info`; os toasts somem sozinhos após ~4,5 s e podem ser fechados manualmente.
- Ao criar/editar/excluir registros: chamar `toast(...)` com o texto de sucesso e, nos erros do Supabase, `toast(mensagem, "erro")` (mantendo, se fizer sentido, o erro de validação de campo dentro do formulário).
- Evitar banners de sucesso fixos no corpo da página; foram removidos das telas de login, redefinição de senha e cadastro de administrador.
- Mensagens de erro de carregamento de listagem também podem ir para toast do tipo `erro`.
