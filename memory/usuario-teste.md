---
name: usuario-teste
description: Usuário de teste do SisPatri criado para validar telas autenticadas na prévia
metadata.type: project
---

Usuário de teste para login nas telas protegidas (contratos, aditivos, etc.):

- E-mail: `teste@sispatri.app`
- Senha: `Teste@2026`
- Papel: `administrador` (em `public.user_roles`), perfil ativo em `public.profiles`
- ID: `c834966a-f044-4aa2-9419-36bd79fed132`

**Why:** o usuário pediu que exista um usuário de teste próprio, guardado na memória, para que eu possa conferir funcionalidades logado sempre que ele pedir.

**How to apply:** em testes na prévia (verificação visual e de uso), fazer login com essas credenciais em `/login` em vez de pedir um usuário real ao usuário. Não expor estas credenciais em telas ou respostas que não sejam do ambiente de teste.
