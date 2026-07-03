import { CheckCircle2, Edit2, Folder, Trash2, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { NavLink, useFetcher } from "react-router";
import { useUI } from "~/hooks/use-ui";

export const PRESET_COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

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
      <div className="mx-2 mb-1 space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
        <input
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitRename()}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-blue-500"
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
                    ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-800"
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
        to={`/pastas/${folder.id}`}
        prefetch="intent"
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            isActive
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      linkActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {folder._count?.operacoes}
                  </span>
                )}
                <div className="hidden group-hover/item:flex items-center gap-1.5">
                  <button onClick={startEditing} className="hover:text-white">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={handleDelete} className="hover:text-rose-400">
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
