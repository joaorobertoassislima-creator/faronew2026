import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@/lib/auth";
import { inicializarSupabase } from "@/lib/supabase";
import "./index.css";

/**
 * A configuracao do Supabase e resolvida antes de montar a aplicacao, para que
 * nenhuma tela tente usar o cliente antes das credenciais estarem disponiveis.
 */
async function iniciar() {
  try {
    await inicializarSupabase();
  } catch {
    /* sem configuracao: as telas exibem a mensagem amigavel */
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void iniciar();
