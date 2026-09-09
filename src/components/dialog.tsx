"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({ open, onClose, titleId, children }: {
  open: boolean; onClose: () => void; titleId: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-content">
        <button className="dialog-close button-secondary" type="button" onClick={onClose} aria-label="Закрыть окно">Закрыть <span aria-hidden="true">×</span></button>
        {children}
      </div>
    </dialog>
  );
}
