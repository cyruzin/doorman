"use client";

import { useState } from "react";
import { Modal } from "@/components/modal/modal";
import { PasswordInput } from "@/components/password-input/password-input";
import { freedUnitsMessage, keptResidentsMessage } from "@/modules/apartments/freed-units";
import { useOccupiedUnits } from "@/modules/apartments/hooks/use-occupied-units";
import { useUnitsFreedBy } from "@/modules/apartments/hooks/use-units-freed-by";
import { sortUnits } from "@/lib/building";
import type { Owner } from "../types";
import styles from "./unlink-units-modal.module.css";

interface UnlinkUnitsModalProps {
  owner: Owner;
  onClose: () => void;
  /** Rejects on failure (wrong password, server error) so the modal can keep the selection. */
  onConfirm: (units: string[], password: string) => Promise<void>;
}

export function UnlinkUnitsModal({ owner, onClose, onConfirm }: UnlinkUnitsModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The owner's own resident record only exists for the unit they live in, so releasing that
  // unit releases the record with it.
  const affectedResidents = owner.residents.filter((r) => r.active && selected.includes(r.unit));
  const losesEveryUnit = selected.length > 0 && selected.length === owner.units.length;
  // Deactivating cascades to every linked resident, not just the ones in the released units.
  const deactivatedResidents = losesEveryUnit ? owner.residents.filter((r) => r.active) : affectedResidents;
  const { data: freedUnits } = useUnitsFreedBy(deactivatedResidents.map((r) => r.id));
  const { data: occupiedUnits } = useOccupiedUnits();
  // Released units that still have somebody living there — valid (a sale with the tenant in
  // place), but the apartment is left with no owner until a new one is registered.
  const keptUnits = selected.filter((unit) => (occupiedUnits ?? []).includes(unit) && !(freedUnits ?? []).includes(unit));

  const warning =
    [
      losesEveryUnit && `${owner.name} ficará sem nenhum apartamento e será desativado.`,
      deactivatedResidents.length > 0 &&
        `O cadastro de morador de ${deactivatedResidents.map((r) => `${r.name} (apto ${r.unit})`).join(", ")} também será desativado.`,
      freedUnitsMessage(freedUnits ?? []),
      keptResidentsMessage(keptUnits),
    ]
      .filter(Boolean)
      .join(" ") || null;

  const toggle = (unit: string) =>
    setSelected((current) => (current.includes(unit) ? current.filter((u) => u !== unit) : [...current, unit]));

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(selected, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desvincular");
      setBusy(false);
    }
  };

  return (
    <Modal title="Desvincular apartamento(s)" onClose={onClose}>
      <p>{`Selecione os apartamentos que ${owner.name} deixou de ser proprietário. Os demais continuam no cadastro.`}</p>

      <div className={styles.units}>
        {sortUnits(owner.units).map((unit) => (
          <label key={unit} className={styles.unitOption}>
            <input type="checkbox" checked={selected.includes(unit)} onChange={() => toggle(unit)} />
            {unit}
          </label>
        ))}
      </div>

      {warning && <p className="modal-warning">{warning}</p>}

      <div className="form-field">
        <label htmlFor="unlink-password">Confirme sua senha</label>
        <PasswordInput
          id="unlink-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <span className="field-error">{error}</span>}

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={selected.length === 0 || !password || busy}
          onClick={handleConfirm}
        >
          Desvincular
        </button>
      </div>
    </Modal>
  );
}
