"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  hideClose?: boolean;
}

export function Modal({ open, onClose, title, children, maxWidth = 520, hideClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth }} role="dialog" aria-modal="true">
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h3 className="text-[17px] font-bold text-balance">{title}</h3>
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="关闭"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
