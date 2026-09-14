"use client";

import { UiIcon } from "@/components/ui-icon";
import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({ open, onClose, titleId, children, className, dismissible = true }: {
  open: boolean; onClose: () => void; titleId: string; children: ReactNode; className?: string; dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog ref={ref} className={className} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (dismissible) onClose(); }} onClose={onClose}
      onClick={(event) => { if (dismissible && event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="dialog-content">
        <button className="dialog-close button-secondary" type="button" disabled={!dismissible} onClick={onClose} aria-label="Закрыть окно">Закрыть <UiIcon name="close" /></button>
        {children}
      </div>
    </dialog>
  );
}
