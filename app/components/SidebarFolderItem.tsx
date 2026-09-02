import { CheckCircle2, Edit2, Folder, Trash2, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { NavLink, useFetcher } from "react-router";
import { useUI } from "~/hooks/use-ui";

export const PRESET_COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const COLOR_NAMES: Record<string, string> = {
  "#64748b": "Cinza",
  "#3b82f6": "Azul",
  "#10b981": "Verde",
  "#f59e0b": "Âmbar",
  "#ef4444": "Vermelho",
  "#8b5cf6": "Roxo",
  "#ec4899": "Rosa",
};

interface FolderType {
  id: number;
  nome: string;
  cor?: string;
  _count?: { operacoes: number };
}

interface SidebarFolderItemProps {
  folder: FolderType;
  isCollapsed: boolean;
}

export const SidebarFolderItem = React.memo(({ folder, isCollapsed }: SidebarFolderItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(folder.nome);
  const [editingColor, setEditingColor] = useState(folder.cor || PRESET_COLORS[0]);
  const fetcher = useFetcher({ key: `folder-${folder.id}` });
  const { confirm: confirmAction } = useUI();

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
    setEditingValue(folder.nome);
    setEditingColor(folder.cor || PRESET_COLORS[0]);
  }, [folder]);

  const submitRename = useCallback(() => {
    if (!editingValue.trim() || fetcher.state !== "idle") return;
    fetcher.submit(
      { intent: "renameFolder", id: String(folder.id), nome: editingValue, cor: editingColor },
      { method: "post", action: "/api/operacoes" }
    );
    setIsEditing(false);
  }, [editingValue, editingColor, fetcher, folder.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    confirmAction({
      title: "Excluir Pasta?",
      message: `Tem certeza que deseja excluir "${folder.nome}"?\nTodos os itens dentro desta pasta também serão permanentemente apagados.`,
      variant: "danger",
      onConfirm: () => {
        fetcher.submit({ intent: "deleteFolder", id: folder.id }, { method: "post", action: "/api/operacoes" });
      }
    });
  }, [confirmAction, fetcher, folder]);

  const cancelEdit = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsEditing(false);
  }, []);

  if (isEditing) {
    return (
      <div className="mx-2 mb-1 space-y-2 bg-surface rounded-xl p-2 border border-glass-border">
        <input
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitRename()}
          className="w-full bg-card-bg dark:bg-bg border border-[rgba(0,0,0,0.12)] dark:border-glass-border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-primary text-text placeholder:text-text-dim"
        />
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setEditingColor(c);
                }}
                className={`w-3.5 h-3.5 rounded-full ${
                  editingColor === c
                    ? "ring-2 ring-offset-1 ring-primary dark:ring-offset-bg"
                    : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={cancelEdit} className="p-1 hover:text-rose-500">
              <X size={14} />
            </button>
            <button onClick={submitRename} disabled={fetcher.state !== "idle"} className="p-1 hover:text-emerald-500 disabled:opacity-50">
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = fetcher.state !== "idle";

  return (
    <div className={`relative group/item ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <NavLink
        to={`/pastas/${encodeURIComponent(folder.nome)}`}
        prefetch="none"
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            isActive
              ? "text-primary bg-primary/10 dark:bg-transparent before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r"
              : "text-text-muted hover:text-text hover:bg-surface-light"
          }`
        }
      >
        {({ isActive: linkActive }) => (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Folder size={18} className="shrink-0" style={folder.cor && !linkActive ? { color: folder.cor } : undefined} />
              {!isCollapsed && <span className="truncate">{folder.nome}</span>}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                {(folder._count?.operacoes ?? 0) > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-lg ${
                      linkActive ? "bg-primary/20 text-primary" : "bg-surface text-text-muted"
                    }`}
                  >
                    {folder._count?.operacoes}
                  </span>
                )}
                <div className="hidden group-hover/item:flex items-center gap-1.5">
                  <button onClick={startEditing} className="hover:text-primary transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={handleDelete} className="hover:text-error transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </NavLink>
    </div>
  );
});

SidebarFolderItem.displayName = "SidebarFolderItem";
