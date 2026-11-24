# SisPatri – Instalação inicial

## 1. Cadastro do administrador

A rota pública `/cadastro-administrador` cria o **primeiro** usuário administrador do SisPatri.
Depois que existir um administrador, essa página passa a recusar novos cadastros e os demais
usuários devem ser criados pelo próprio administrador (tela Usuários, etapa seguinte).

**Código de instalação:** `SISPATRI-OURINHOS-2026`

O código é validado no servidor pela função `validar_codigo_instalacao` (hash bcrypt em
`public.configuracoes_sistema`) e a criação do usuário é feita pela Edge Function
`criar-administrador`, que usa a service role — o cadastro público do Supabase Auth
permanece **desativado** (`disable_signup = true`).

Campos do formulário: nome completo, e-mail institucional, matrícula, telefone, cargo, setor,
senha (mínimo de 8 caracteres) e confirmação de senha.

## 2. Configuração do ambiente

O cliente do Supabase (`src/lib/supabase.ts`) procura as credenciais nesta ordem:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`
- `window.__SUPABASE_URL__` / `window.__SUPABASE_ANON_KEY__` (injeção em tempo de execução)

O `vite.config.ts` usa `envPrefix: ["VITE_", "SUPABASE_"]`, portanto tanto as variáveis com
prefixo `VITE_` quanto as `SUPABASE_*` ficam expostas para o bundle.

Se a tela mostrar “Conexão com o Supabase não configurada”, revise o arquivo `.env` do projeto
(ele não é editável pelo Editor) e recrie o preview.

## 3. Perfis e papéis

Ao criar o usuário, o gatilho `trg_handle_novo_usuario` (em `auth.users`) monta o registro em
`public.profiles` e o papel em `public.user_roles`. O papel `administrador` garante acesso total
(as políticas RLS das demais tabelas usam `public.has_role`).
