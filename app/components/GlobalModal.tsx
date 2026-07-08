import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ModalVariant = 'primary' | 'success' | 'error' | 'danger';

interface GlobalModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant: ModalVariant;
  isAlert?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

const variantStyles: Record<ModalVariant, { icon: React.ElementType, iconBg: string, buttonBg: string }> = {
  primary: {
    icon: Info,
    iconBg: "bg-primary/10 text-primary",
    buttonBg: "bg-primary hover:shadow-primary-glow hover:brightness-110",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-success/10 text-success",
    buttonBg: "bg-success hover:shadow-[0_0_16px_rgba(0,208,132,0.15)] hover:brightness-110",
  },
  error: {
    icon: AlertTriangle,
    iconBg: "bg-error/10 text-error",
    buttonBg: "bg-error hover:shadow-[0_0_16px_rgba(255,74,90,0.15)] hover:brightness-110",
  },
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-error/10 text-error",
    buttonBg: "bg-error hover:shadow-[0_0_16px_rgba(255,74,90,0.15)] hover:brightness-110",
  },
};

export function GlobalModal({ isOpen, title, message, variant, isAlert, onConfirm, onClose }: GlobalModalProps) {
  if (!isOpen) return null;

  const style = variantStyles[variant] || variantStyles.primary;
  const Icon = style.icon;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md backdrop-saturate-150 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card-bg w-full max-w-md rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-glass-border animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center ${style.iconBg}`}>
          <Icon size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-text flex items-center gap-3 tracking-tight">{title}</h2>
        <p className="text-text-muted text-sm font-inter leading-relaxed mb-8 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          {!isAlert && (
            <button 
              onClick={onClose} 
              className="flex-1 py-3 px-6 bg-surface border border-glass-border text-text rounded-xl font-bold text-sm transition-all hover:bg-surface-light"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={handleConfirm} 
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all border-none ${style.buttonBg}`}
          >
            {isAlert ? "Entendido" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
