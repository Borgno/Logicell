import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./AppRoutes";
import "./styles/tailwind.css";

//Um deploy pode apagar os chunks antigos enquanto uma aba aberta ainda os pede
//(rotas lazy). Recarrega a página para buscar os chunks novos, no máximo 1x/min.
window.addEventListener("vite:preloadError", () => {
  const chave = "logicell-last-reload";
  const agora = Date.now();
  const ultima = Number(sessionStorage.getItem(chave) || 0);
  if (agora - ultima > 60_000) {
    sessionStorage.setItem(chave, String(agora));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
