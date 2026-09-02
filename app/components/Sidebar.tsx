import { CheckCircle2, Inbox, Moon, Plus, Search, ShieldCheck, Sun, Truck, User as UserIcon, X, Zap, Loader2, Menu } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { NavLink, useFetcher, useNavigation } from "react-router";
import { buscarNomeUsuario } from "~/utils/formatters";
import { COLOR_NAMES, PRESET_COLORS, SidebarFolderItem } from "./SidebarFolderItem";

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

  const fetcher = useFetcher({ key: "sidebar-create-folder" });
  const navigation = useNavigation();

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(PRESET_COLORS[0]);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState("");

  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredPastas = useMemo(() => {
    const query = normalize(searchQuery.trim());
    return pastas.filter((p) => {
      if (filterColor && p.cor !== filterColor) return false;
      if (!query) return true;
      return normalize(p.nome).includes(query);
    });
  }, [pastas, searchQuery, filterColor]);

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
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-[240px]'} bg-card-bg dark:bg-bg border-r border-glass-border transition-all duration-300 flex flex-col relative z-20`}>
      <div className="h-[64px] flex items-center px-4 border-b border-glass-border shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-1.5 bg-primary rounded-lg text-white shrink-0 shadow-primary-glow">
            {navigation.state !== 'idle' ? (
              <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Truck size={18} strokeWidth={2.5} />
            )}
          </div>
          {!isCollapsed && <h1 className="text-lg font-bold uppercase tracking-tighter text-text">Logicell</h1>}
        </div>
      </div>

      <div className="p-2 mb-2 border-b border-glass-border shrink-0">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text-dim hover:text-primary hover:bg-primary/5 transition-all">
          <Menu size={18} />
          {!isCollapsed && <span>Recolher</span>}
        </button>
      </div>

      <nav className="flex-1 px-2.5 overflow-y-auto custom-scrollbar space-y-4">
        <div>
          <p className={`${isCollapsed ? 'hidden' : 'px-3'} text-[9px] font-bold text-text-muted uppercase tracking-[0.1em] mb-3`}>Principal</p>
          <div className="space-y-0.5">
            <NavLink to="/caixa-de-entrada" prefetch="none" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${isActive ? 'text-primary bg-primary/10 dark:bg-transparent before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r' : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <Inbox size={18} className="shrink-0" />
                    {!isCollapsed && <span>Caixa de Entrada</span>}
                  </div>
                  {!isCollapsed && totalInbox > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-lg ${isActive ? "bg-primary/20 text-primary" : "bg-surface text-text-muted"}`}>
                      {totalInbox}
                    </span>
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="/automacoes" prefetch="none" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${isActive ? 'text-primary bg-primary/10 dark:bg-transparent before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r' : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
              {() => (
                <div className="flex items-center gap-2.5">
                  <Zap size={18} className="shrink-0" />
                  {!isCollapsed && <span>Automações</span>}
                </div>
              )}
            </NavLink>

            {user?.app_metadata?.role === "admin" && (
              <NavLink to="/admin/usuarios" prefetch="none" className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${isActive ? 'text-primary bg-primary/10 dark:bg-transparent before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r' : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
                {() => (
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className="shrink-0" />
                    {!isCollapsed && <span>Gestão de Usuários</span>}
                  </div>
                )}
              </NavLink>
            )}
          </div>
        </div>

        <div>
          <div className={`${isCollapsed ? 'justify-center' : 'px-3 justify-between'} flex items-center mb-3`}>
            {!isCollapsed && <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.1em]">Pastas</p>}
            {!isCollapsed && <button onClick={() => setIsAddingFolder(true)} className="text-primary hover:text-primary/80 transition-colors"><Plus size={14} strokeWidth={3} /></button>}
          </div>

          {!isCollapsed && (
            <div className="px-2.5 mb-2">
              <div className="bg-surface rounded-xl p-2 border border-glass-border space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar pastas..."
                    className="w-full bg-card-bg dark:bg-bg rounded-lg pl-7 pr-7 py-1.5 text-xs font-bold outline-none border border-[rgba(0,0,0,0.12)] dark:border-glass-border focus:border-primary text-text placeholder:text-text-dim transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors" title="Limpar busca">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-center">
                    <div className="flex gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFilterColor(filterColor === c ? "" : c)}
                          title={COLOR_NAMES[c]}
                          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${filterColor === c ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-110 hover:ring-2 hover:ring-text/10 hover:ring-offset-2 hover:ring-offset-surface'}`}
                          style={{ backgroundColor: c, boxShadow: filterColor === c ? `0 0 10px ${c}55` : undefined }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-text-muted leading-none">
                    {filterColor ? COLOR_NAMES[filterColor] : "Filtrar por cor"}
                  </p>
                </div>

                {(searchQuery || filterColor) && (
                  <div className="flex items-center justify-between px-0.5 pt-0.5 border-t border-glass-border/60">
                    <span className="text-[10px] font-bold text-text-muted">{filteredPastas.length} de {pastas.length}</span>
                    <button
                      onClick={() => { setSearchQuery(""); setFilterColor(""); }}
                      className="text-[10px] font-bold text-text-muted hover:text-primary transition-colors"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {isAddingFolder && !isCollapsed && (
              <form onSubmit={handleCreateFolder} className="px-3 mb-2 space-y-2 bg-surface rounded-xl p-2 border border-glass-border">
                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." className="w-full bg-card-bg dark:bg-bg rounded-lg px-2 py-1 text-xs font-bold outline-none border border-[rgba(0,0,0,0.12)] dark:border-glass-border focus:border-primary text-text placeholder:text-text-dim" />
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

            {filteredPastas.map((p: any) => (
              <SidebarFolderItem key={p.id} folder={p} isCollapsed={isCollapsed} />
            ))}

            {!isCollapsed && pastas.length > 0 && filteredPastas.length === 0 && (
              <div className="mx-1 border border-dashed border-glass-border rounded-xl px-3 py-3 text-center">
                <p className="text-[11px] font-bold text-text-muted">Nenhuma pasta encontrada</p>
                <button
                  onClick={() => { setSearchQuery(""); setFilterColor(""); }}
                  className="mt-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="p-2 border-t border-glass-border space-y-1 shrink-0">
        <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text hover:bg-surface-light transition-all">
          {isDark ? <Sun size={18} className="text-warning shrink-0" /> : <Moon size={18} className="text-primary shrink-0" />}
          {!isCollapsed && <span>Modo {isDark ? 'Claro' : 'Escuro'}</span>}
        </button>

        {!isCollapsed && user && (
          <NavLink to="/perfil" prefetch="intent" className={({ isActive }) => `block px-3 py-2 rounded-xl mb-1 group/user relative border transition-all ${isActive ? 'bg-primary/10 border-primary/30' : 'bg-surface border-glass-border hover:border-primary/50 hover:bg-surface-light'} shadow-sm`}>
            {({ isActive }) => (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className={`p-1.5 rounded-lg border transition-colors ${isActive ? 'bg-primary text-white border-primary shadow-primary-glow' : 'bg-surface-light text-text-muted border-glass-border group-hover/user:text-primary group-hover/user:border-primary/30'}`}>
                  <UserIcon size={14} />
                </div>
                <div className="overflow-hidden">
                  <p className={`text-[9px] font-bold uppercase tracking-[0.1em] leading-none mb-1 transition-colors ${isActive ? 'text-primary' : 'text-text-muted'}`}>Usuário</p>
                  <p className="text-[11px] font-bold truncate text-text">
                    {buscarNomeUsuario(user.email || "", user.user_metadata?.nickname || user.user_metadata?.nome)}
                  </p>
                </div>
              </div>
            )}
          </NavLink>
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
