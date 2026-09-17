"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Modal } from "@/components/modal/modal";
import { PasswordInput } from "@/components/password-input/password-input";

interface ConfirmOptions {
  title?: string;
  description?: string;
  /** Side effect the user should see before confirming (e.g. units left empty). */
  warning?: string;
  /** Asks for the logged-in user's password and hands it to the action. */
  requirePassword?: boolean;
  confirmLabel?: string;
}

interface PendingConfirm {
  action: (password: string) => void;
  options: ConfirmOptions;
}

type RequestConfirm = (action: (password: string) => void, options?: ConfirmOptions) => void;

const ConfirmContext = createContext<RequestConfirm | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [password, setPassword] = useState("");

  const requestConfirm = useCallback<RequestConfirm>((action, options = {}) => {
    setPassword("");
    setPending({ action, options });
  }, []);

  const close = () => {
    setPending(null);
    setPassword("");
  };

  const handleConfirm = () => {
    pending?.action(password);
    close();
  };

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      {pending && (
        <Modal title={pending.options.title ?? "Confirmar ação"} onClose={close} role="alertdialog">
          <p>{pending.options.description ?? "Essa ação não pode ser desfeita."}</p>
          {pending.options.warning && <p className="modal-warning">{pending.options.warning}</p>}
          {pending.options.requirePassword && (
            <div className="form-field">
              <label htmlFor="confirm-password">Confirme sua senha</label>
              <PasswordInput
                id="confirm-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending.options.requirePassword && !password}
              onClick={handleConfirm}
            >
              {pending.options.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
