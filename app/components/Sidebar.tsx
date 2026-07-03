import { CheckCircle2, ChevronLeft, ChevronRight, Inbox, LogOut, Moon, Plus, Sun, Truck, User as UserIcon, X, Zap } from "lucide-react";
import React, { useCallback, useState } from "react";
import { NavLink, useFetcher } from "react-router";
import { useAuth } from "~/context/AuthContext";
import { buscarNomeUsuario } from "~/utils/formatters";
import { PRESET_COLORS, SidebarFolderItem } from "./SidebarFolderItem";

interface SidebarProps {
  pastas: any[];
  totalInbox: number;
  user: any;
  isDark: boolean;
  toggleTheme: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export const Sidebar = React.memo(({
  pastas,
  totalInbox,
  user,
  isDark,
  toggleTheme,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) => {
  const { signOut } = useAuth();
  const fetcher = useFetcher({ key: "sidebar-create-folder" });

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(PRESET_COLORS[0]);
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const handleCreateFolder = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    fetcher.submit(
      { intent: "createFolder", nome: newFolderName, cor: newFolderColor },
      { method: "post", action: "/api/operacoes" }
    );
    setNewFolderName("");
    setNewFolderColor(PRESET_COLORS[0]);
    setIsAddingFolder(false);
  }, [newFolderName, newFolderColor, fetcher]);

  return (
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
            <NavLink to="/caixa-de-entrada" prefetch="intent" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
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

            <NavLink to="/automacoes" prefetch="intent" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {() => (
                <div className="flex items-center gap-2.5">
                  <Zap size={18} className="shrink-0" />
                  {!isCollapsed && <span>Automações</span>}
                </div>
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
                    <button type="submit" disabled={fetcher.state !== 'idle'} className="p-1 hover:text-emerald-500 disabled:opacity-50"><CheckCircle2 size={14}/></button>
                  </div>
                </div>
              </form>
            )}

            {pastas.map((p: any) => (
              <SidebarFolderItem key={p.id} folder={p} isCollapsed={isCollapsed} />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-2 border-t border-slate-100 dark:border-slate-800/50 space-y-1 shrink-0">
        <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          {isDark ? <Sun size={18} className="text-amber-400 shrink-0" /> : <Moon size={18} className="text-blue-600 shrink-0" />}
          {!isCollapsed && <span>Modo {isDark ? 'Claro' : 'Escuro'}</span>}
        </button>

        {!isCollapsed && user && (
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-1 group/user relative">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500">
                <UserIcon size={14} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuário</p>
                <p className="text-[11px] font-bold truncate">
                  {buscarNomeUsuario(user.email || "", user.user_metadata?.nickname || user.user_metadata?.nome)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-500 transition-all">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span>Recolher Menu</span>}
        </button>

        {user && (
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
  );
});

Sidebar.displayName = "Sidebar";
