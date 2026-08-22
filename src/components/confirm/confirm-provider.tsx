"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
}

interface PendingConfirm {
  action: () => void;
  options: ConfirmOptions;
}

type RequestConfirm = (action: () => void, options?: ConfirmOptions) => void;

const ConfirmContext = createContext<RequestConfirm | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const requestConfirm = useCallback<RequestConfirm>((action, options = {}) => {
    setPending({ action, options });
  }, []);

  const handleConfirm = () => {
    pending?.action();
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      {pending && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPending(null)}>
          <div
            className="modal card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title">{pending.options.title ?? "Confirmar ação"}</h2>
            <p>{pending.options.description ?? "Essa ação não pode ser desfeita."}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirm}>
                {pending.options.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
