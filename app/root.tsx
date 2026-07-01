import {Links,Meta,Outlet,Scripts,ScrollRestoration,useLoaderData,useFetcher,NavLink,useNavigation,useLocation,Form} from "react-router";
import type { LinksFunction, ShouldRevalidateFunction, LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useState, useEffect, createContext, useContext, useMemo, useCallback } from "react";
import { Truck, Inbox, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, LayoutDashboard, Folder, X, Sun, Moon, CheckCircle2, AlertCircle, Info, AlertTriangle, LogOut, User as UserIcon} from "lucide-react";
import { getUser, createSupabaseServerClient } from "./services/auth.server";
import { PastaService } from "./services/pasta.server";
import { OperacaoService } from "./services/operacao.server";
import { StatusService } from "./services/status.server";
import { ConfigService } from "./services/config.server";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MESSAGES } from "./constants/messages";
import { useActionFeedback } from "./hooks/use-action-feedback";
import { UIContext, useUI } from "./hooks/use-ui";
import { buscarNomeUsuario } from "~/utils/formatters";
import "./styles/tailwind.css";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" },
];



export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);


  try {
    const [pastas, totalInbox, customStatuses, columnOrder, columnWidths] = await Promise.all([
      PastaService.listar().catch(() => []),
      OperacaoService.contarInbox().catch(() => 0),
      StatusService.listar().catch(() => []),
      ConfigService.get("columnOrder").catch(() => null),
      ConfigService.get("columnWidths").catch(() => null)
    ]);
    return { pastas, totalInbox, user, customStatuses, columnOrder, columnWidths };
  } catch (e) {
    return { pastas: [], totalInbox: 0, user: null, customStatuses: [], columnOrder: null, columnWidths: null };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase } = await createSupabaseServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updateNickname") {
    const nickname = formData.get("nickname") as string;
    const { error } = await supabase.auth.updateUser({
      data: { nickname }
    });
    if (error) return { error: error.message };
    return { success: true };
  }

  return null;
}

export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl, formMethod, formData, defaultShouldRevalidate }) => {
  // Sempre revalida em ações de mutação pesada (upload, move, delete)
  if (formMethod && formMethod !== "GET") {
    const intent = formData?.get("intent");
    // Se for apenas um 'update' de campo (ex: observação), não precisamos revalidar o painel lateral todo
    if (intent === "update") return false;
    return true;
  }
  
  // Evita revalidar o Root (barra lateral e caches) se a mudança for apenas SEARCH PARAMS na mesma página
  // Isse impede o 'piscar' e a lentidão ao paginar ou filtrar
  if (currentUrl.pathname === nextUrl.pathname) return false;
  
  return defaultShouldRevalidate;
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  
  // UI State moved to Layout for global availability (including ErrorBoundaries)
  const [toasts, setToasts] = useState<{id: number, msg: string, type: string}[]>([]);
  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm?: () => void, variant: string, isAlert?: boolean} | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgressWidth(10);
      interval = setInterval(() => {
        setProgressWidth(prev => prev < 90 ? prev + (Math.random() * 10) : prev);
      }, 300);
    } else {
      setProgressWidth(100);
      setTimeout(() => setProgressWidth(0), 400);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const confirmAction = useCallback(({ title, message, onConfirm, variant = 'primary' }: any) => {
    setModal({ isOpen: true, title, message, onConfirm, variant, isAlert: false });
  }, []);

  const showAlert = useCallback(({ title, message, variant = 'success' }: any) => {
    setModal({ isOpen: true, title, message, variant, isAlert: true });
  }, []);

  const uiContextValue = useMemo(() => ({ showToast, confirm: confirmAction, alert: showAlert }), [showToast, confirmAction, showAlert]);

  return (
    <html lang="pt-BR" className="h-full dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased overflow-hidden w-screen font-sans">
        <UIContext.Provider value={uiContextValue}>
          <AuthProvider initialSession={data?.user ?? null}>
            {/* Progress Bar Superior */}
            <div 
              className="fixed top-0 left-0 h-[3px] bg-blue-600 z-[10001] transition-all duration-300 ease-out shadow-[0_0_10px_#2563eb]"
              style={{ width: `${progressWidth}%`, opacity: progressWidth > 0 && progressWidth < 100 ? 1 : 0 }}
            />
            
            {children}
            
            {/* Overlay UI components (Global) */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
              {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300">
                  <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border ${
                    t.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 
                    t.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : 
                    'bg-blue-600 border-blue-500 text-white'
                  }`}>
                    {t.type === 'success' ? <CheckCircle2 size={20} /> : t.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
                    <p className="text-sm font-bold tracking-tight">{t.msg}</p>
                    <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-2 hover:opacity-70"><X size={16} strokeWidth={3} /></button>
                  </div>
                </div>
              ))}
            </div>

            {modal?.isOpen && (
              <div 
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setModal(null)}
              >
                <div 
                  className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`w-16 h-16 rounded-3xl mb-6 flex items-center justify-center ${
                    modal.variant === 'danger' || modal.variant === 'error' ? 'bg-rose-100 text-rose-600' : 
                    modal.variant === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {modal.variant === 'danger' || modal.variant === 'error' ? <AlertTriangle size={32} /> : 
                    modal.variant === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
                  </div>
                  <h2 className="text-xl font-black mb-2 text-slate-800 dark:text-white uppercase tracking-tight">{modal.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8 whitespace-pre-line">{modal.message}</p>
                  <div className="flex gap-3">
                    {!modal.isAlert && (
                      <button onClick={() => setModal(null)} className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                    )}
                    <button 
                      onClick={() => { if(modal.onConfirm) modal.onConfirm(); setModal(null); }} 
                      className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all ${
                        modal.variant === 'danger' || modal.variant === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 
                        modal.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {modal.isAlert ? "Entendido" : "Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AuthProvider>
        </UIContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const location = useLocation();
  const { signOut } = useAuth();
  const pastas = data?.pastas || [];
  const totalInbox = data?.totalInbox || 0;
  const fetcher = useFetcher();
  const { showToast, confirm: confirmAction } = useUI();
  
  const isLoginPage = location.pathname === "/login";

  const PRESET_COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const [isDark, setIsDark] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingFolderColor, setEditingFolderColor] = useState(PRESET_COLORS[0]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(PRESET_COLORS[0]);
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Sincronização modular de notificações das pastas
  useActionFeedback(fetcher, { showToast });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    fetcher.submit({ intent: "createFolder", nome: newFolderName, cor: newFolderColor }, { method: "post", action: "/api/operacoes" });
    setNewFolderName("");
    setNewFolderColor(PRESET_COLORS[0]);
    setIsAddingFolder(false);
  };

  const submitRename = (id: number) => {
    if (!editingValue.trim()) return;
    fetcher.submit({ intent: "renameFolder", id: String(id), nome: editingValue, cor: editingFolderColor }, { method: "post", action: "/api/operacoes" });
    setEditingFolderId(null);
  };

  if (isLoginPage) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-slate-950">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden transition-colors duration-500">
      <aside className={`${isCollapsed ? 'w-[70px]' : 'w-[250px]'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col relative`}>
        <div className="h-[64px] flex items-center px-4 mb-2 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white shrink-0 shadow-lg shadow-blue-500/20">
              <Truck size={18} strokeWidth={2.5} />
            </div>
            {!isCollapsed && <h1 className="text-lg font-black uppercase tracking-tighter">Logicell</h1>}
          </div>
        </div>

        <nav className="flex-1 px-2.5 overflow-y-auto custom-scrollbar space-y-4">
          <div>
            <p className={`${isCollapsed ? 'hidden' : 'px-3'} text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3`}>Principal</p>
            <div className="space-y-0.5">
              <NavLink to="/" prefetch="none" end className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <LayoutDashboard size={18} className="shrink-0" />
                {!isCollapsed && <span>Painel Geral</span>}
              </NavLink>

              <NavLink to="/caixa-de-entrada" prefetch="none" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {({ isActive: linkActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Inbox size={18} className="shrink-0" />
                      {!isCollapsed && <span>Caixa de Entrada</span>}
                    </div>
                    {!isCollapsed && totalInbox > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-lg bg-blue-100 text-blue-600`}>{totalInbox}</span>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          <div>
            <div className={`${isCollapsed ? 'justify-center' : 'px-3 justify-between'} flex items-center mb-3`}>
              {!isCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pastas</p>}
              {!isCollapsed && <button onClick={() => setIsAddingFolder(true)} className="text-blue-500"><Plus size={14} strokeWidth={3} /></button>}
            </div>

            <div className="space-y-1">
              {isAddingFolder && !isCollapsed && (
                <form onSubmit={handleCreateFolder} className="px-3 mb-2 space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                  <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." className="w-full bg-white dark:bg-slate-900 rounded-lg px-2 py-1 text-xs font-bold outline-none border border-slate-300 dark:border-slate-600 focus:border-blue-500" />
                  <div className="flex justify-between items-center px-1">
                    <div className="flex gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={(e) => { e.preventDefault(); setNewFolderColor(c); }} className={`w-3.5 h-3.5 rounded-full ${newFolderColor === c ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-800' : ''}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setIsAddingFolder(false)} className="p-1 hover:text-rose-500"><X size={14}/></button>
                      <button type="submit" className="p-1 hover:text-emerald-500"><CheckCircle2 size={14}/></button>
                    </div>
                  </div>
                </form>
              )}

              {pastas.map((p: any) => (
                <div key={p.id} className="relative group/item">
                  {editingFolderId === p.id ? (
                    <div className="mx-2 mb-1 space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                      <input autoFocus value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitRename(p.id)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-blue-500" />
                      <div className="flex justify-between items-center px-1">
                        <div className="flex gap-1.5">
                          {PRESET_COLORS.map(c => (
                            <button key={c} type="button" onClick={(e) => { e.preventDefault(); setEditingFolderColor(c); }} className={`w-3.5 h-3.5 rounded-full ${editingFolderColor === c ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-800' : ''}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingFolderId(null)} className="p-1 hover:text-rose-500"><X size={14}/></button>
                          <button onClick={() => submitRename(p.id)} className="p-1 hover:text-emerald-500"><CheckCircle2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <NavLink to={`/pastas/${p.id}`} prefetch="none" className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      {({ isActive: linkActive }) => (
                        <>
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <Folder size={18} className="shrink-0" style={p.cor && !linkActive ? { color: p.cor } : undefined} />
                            {!isCollapsed && <span className="truncate">{p.nome}</span>}
                          </div>
                          {!isCollapsed && (
                            <div className="flex items-center gap-2">
                              {p._count?.operacoes > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-lg ${linkActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{p._count.operacoes}</span>}
                              <div className="hidden group-hover/item:flex items-center gap-1.5">
                                <button onClick={(e) => { e.preventDefault(); setEditingFolderId(p.id); setEditingValue(p.nome); setEditingFolderColor(p.cor || PRESET_COLORS[0]); }} className="hover:text-white"><Edit2 size={12} /></button>
                                <button onClick={(e) => { 
                                  e.preventDefault(); 
                                  confirmAction({
                                    ...MESSAGES.alerts.deleteFolderConfirm(p.nome),
                                    onConfirm: () => {
                                      fetcher.submit({ intent: "deleteFolder", id: String(p.id) }, { method: "post", action: "/api/operacoes" });
                                    }
                                  });
                                }} className="hover:text-rose-400"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-2 border-t border-slate-100 dark:border-slate-800/50 space-y-1 shrink-0">
          <button onClick={() => setIsDark(!isDark)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {isDark ? <Sun size={18} className="text-amber-400 shrink-0" /> : <Moon size={18} className="text-blue-600 shrink-0" />}
            {!isCollapsed && <span>Modo {isDark ? 'Claro' : 'Escuro'}</span>}
          </button>

          {!isCollapsed && data?.user && (
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-1 group/user relative">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500">
                  <UserIcon size={14} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuário</p>
                  <p className="text-[11px] font-bold truncate">
                    {buscarNomeUsuario(data.user.email || "", data.user.user_metadata?.nickname || data.user.user_metadata?.nome)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-500 transition-all">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span>Recolher Menu</span>}
          </button>

          {data?.user && (
            <button 
              onClick={() => signOut()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all group"
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden h-full">
        <Outlet />
      </main>
    </div>
  );
}