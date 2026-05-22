import { X } from "lucide-react";

interface StatusDetailModalProps {
  status: string;
  details: any[];
  onClose: () => void;
}

export function StatusDetailModal({ status, details, onClose }: StatusDetailModalProps) {
  return (
    <div 
      className="absolute inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">{status}</h2>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Visão Detalhada</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {details?.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent">
                <span className="font-bold text-slate-700 dark:text-slate-100 text-xs uppercase tracking-tight">{item.label}</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
