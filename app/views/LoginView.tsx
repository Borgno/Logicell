import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Truck } from "lucide-react";
import { Form } from "react-router";

export function LoginView({ isSubmitting, error }: { isSubmitting: boolean, error?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090b0e] p-6 font-sans antialiased selection:bg-primary/30">
      
      {/* Background elements minimalistas para profundidade sem transparência */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-[22px] flex items-center justify-center shadow-[0_0_40px_rgba(0,102,255,0.3)] mb-6 ring-4 ring-primary/10">
            <Truck size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-[#f3f5f8] uppercase mb-2">Logicell</h1>
          <p className="text-[#8e99a7] font-medium text-center">Acesse a plataforma corporativa</p>
        </div>

        <div className="bg-[#0f1217] border border-[rgba(255,255,255,0.08)] p-10 rounded-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.1),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#556070] ml-4">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#556070] group-focus-within:text-primary transition-colors">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  className="w-full h-16 pl-14 pr-6 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)] rounded-3xl text-[#f3f5f8] font-inter outline-none focus:border-primary focus:bg-[rgba(0,0,0,0.5)] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.08)] transition-all placeholder:text-[#556070]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#556070] ml-4">Senha de Acesso</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#556070] group-focus-within:text-primary transition-colors">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <input
                  required
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full h-16 pl-14 pr-6 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)] rounded-3xl text-[#f3f5f8] font-inter outline-none focus:border-primary focus:bg-[rgba(0,0,0,0.5)] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.08)] transition-all placeholder:text-[#556070]"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-[#ff4a5a]/10 border border-[#ff4a5a]/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="text-[#ff4a5a] shrink-0" size={18} />
                <p className="text-xs font-bold text-[#ff4a5a] leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full h-16 bg-primary hover:brightness-110 disabled:bg-[rgba(255,255,255,0.05)] text-white rounded-3xl font-bold text-sm uppercase tracking-widest transition-all shadow-[0_0_16px_rgba(0,102,255,0.12)] active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative border-none"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} strokeWidth={3} />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                </>
              )}
            </button>
          </Form>

          <div className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.08)]">
            <p className="text-[10px] text-center font-bold text-[#556070] uppercase tracking-[0.1em] leading-relaxed">
              Sistema de Uso Restrito <br /> 
              Logicell Logística Integrada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
