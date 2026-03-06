import { type ReactNode, useEffect, useRef } from "react";

type ModalProps = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Reusable branded modal shell with escape key and focus handoff support. */
export function Modal({ title, description, open, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'input,button,textarea,select,[tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div ref={panelRef} className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        {description ? <p className="modal-description">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
