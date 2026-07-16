import { User, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { buscarNomeUsuario } from "~/utils/formatters";

interface ProfileCardProps {
  user: any;
  onSignOut: () => void;
}

export function ProfileCard({ user, onSignOut }: ProfileCardProps) {
  const fetcher = useFetcher();
  
  const nomeCompleto = buscarNomeUsuario(user.email || "", user.user_metadata?.nickname || user.user_metadata?.nome);
  const [nome, setNome] = useState(nomeCompleto);

  useEffect(() => {
    setNome(nomeCompleto);
  }, [nomeCompleto]);

  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.data?.success;

  return (
    <div className="bg-card-bg border border-glass-border rounded-3xl shadow-card-elevated p-5 flex flex-col md:flex-row gap-5 backdrop-blur-sm">
      <div className="w-20 h-20 rounded-2xl border bg-primary text-white border-primary shadow-primary-glow flex items-center justify-center shrink-0 relative overflow-hidden">
        <User size={32} strokeWidth={1.5} />
      </div>
      
      <div className="flex-1 w-full h-20 flex flex-col justify-between py-0.5">
        <div className="flex justify-between items-start">
          <h1 className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Seu Perfil</h1>
          <button 
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-[10px] font-bold text-error hover:text-error/80 transition-colors leading-none"
          >
            <LogOut size={12} strokeWidth={2.5} />
            Sair
          </button>
        </div>
        
        <fetcher.Form method="post" className="w-full">
          <input type="hidden" name="intent" value="updateName" />
          <div className="relative flex items-center">
            <input 
              type="text" 
              name="nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onBlur={e => {
                if (e.target.value.trim() !== nomeCompleto) {
                  fetcher.submit(e.target.form, { method: "post" });
                }
              }}
              placeholder="Seu Nome"
              className="w-full bg-surface border border-glass-border rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-1 focus:ring-primary focus:border-primary text-text transition-all outline-none pr-8"
            />
            {isLoading && <Loader2 size={14} className="absolute right-3 animate-spin text-primary" />}
            {isSuccess && !isLoading && <CheckCircle2 size={14} className="absolute right-3 text-primary" />}
          </div>
        </fetcher.Form>

        <p className="text-[11px] font-medium text-text-muted leading-none">{user.email}</p>
      </div>
    </div>
  );
}
