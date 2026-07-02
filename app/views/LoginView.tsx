import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Truck } from "lucide-react";
import { Form } from "react-router";

export function LoginView({ isSubmitting, error }: { isSubmitting: boolean, error?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6 font-sans antialiased selection:bg-blue-500/30">
      
      {/* Background elements minimalistas para profundidade sem transparência */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] mb-6 ring-4 ring-blue-600/10">
            <Truck size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase mb-2">Logicell</h1>
          <p className="text-slate-400 font-medium text-center">Acesse a plataforma corporativa</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[40px] shadow-2xl backdrop-blur-md">
          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  className="w-full h-16 pl-14 pr-6 bg-slate-950 border-2 border-slate-800 rounded-3xl text-white font-bold outline-none ring-0 focus:border-blue-600 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Senha de Acesso</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <input
                  required
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full h-16 pl-14 pr-6 bg-slate-950 border-2 border-slate-800 rounded-3xl text-white font-bold outline-none ring-0 focus:border-blue-600 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
                <p className="text-xs font-bold text-rose-500 leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative"
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

          <div className="mt-10 pt-8 border-t border-slate-800">
            <p className="text-[10px] text-center font-black text-slate-600 uppercase tracking-widest leading-relaxed">
              Sistema de Uso Restrito <br /> 
              Logicell Logística Integrada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
