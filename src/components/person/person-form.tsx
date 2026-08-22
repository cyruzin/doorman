"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tenantSchema } from "@/lib/validations/person";
import type { Person, PersonWriteInput } from "@/lib/person-client";
import styles from "./person-form.module.css";

export interface OwnerOption {
  value: string;
  label: string;
}

interface PersonFormProps {
  defaultValues?: Person;
  onSubmit: (data: PersonWriteInput) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
  /** When provided, renders a "Proprietário" select — used only for the Tenant form. */
  ownerOptions?: OwnerOption[];
}

export function PersonForm({ defaultValues, onSubmit, onCancel, submitLabel = "Salvar", ownerOptions }: PersonFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonWriteInput>({
    // tenantSchema is a superset of the Owner shape (adds an optional ownerId) —
    // the server re-validates with the model-specific schema, so sharing this
    // resolver client-side is safe and avoids passing schemas as props.
    resolver: zodResolver(tenantSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          cpf: defaultValues.cpf ?? undefined,
          email: defaultValues.email ?? undefined,
          unit: defaultValues.unit,
          active: defaultValues.active,
          phones: defaultValues.phones.map((p) => ({ number: p.number, isWhatsapp: p.isWhatsapp })),
          vehicles: defaultValues.vehicles.map((v) => ({ plate: v.plate ?? undefined, model: v.model ?? undefined })),
          ownerId: defaultValues.owner?.id ?? "",
        }
      : { active: true, phones: [], vehicles: [] },
  });

  const phoneFields = useFieldArray({ control, name: "phones" });
  const vehicleFields = useFieldArray({ control, name: "vehicles" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Nome</label>
          <input id="name" className="input" {...register("name")} />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="unit">Apartamento</label>
          <input id="unit" className="input" {...register("unit")} />
          {errors.unit && <span className="field-error">{errors.unit.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" className="input" {...register("cpf")} />
        </div>

        <div className="form-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" {...register("email")} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </div>

        {ownerOptions && (
          <div className="form-field">
            <label htmlFor="ownerId">Proprietário (locador)</label>
            <select id="ownerId" className="input" {...register("ownerId")}>
              <option value="">Nenhum</option>
              {ownerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Telefones</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => phoneFields.append({ number: "", isWhatsapp: false })}
          >
            + Adicionar telefone
          </button>
        </div>

        {phoneFields.fields.length === 0 && <p className="text-muted">Nenhum telefone adicionado.</p>}

        {phoneFields.fields.map((field, index) => (
          <div key={field.id} className={styles.repeatingRow}>
            <div className="form-field">
              <label htmlFor={`phones.${index}.number`}>Telefone</label>
              <input id={`phones.${index}.number`} className="input" {...register(`phones.${index}.number` as const)} />
              {errors.phones?.[index]?.number && (
                <span className="field-error">{errors.phones[index]?.number?.message}</span>
              )}
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                {...register(`phones.${index}.isWhatsapp` as const)}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>É WhatsApp</span>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => phoneFields.remove(index)}
              aria-label="Remover telefone"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Veículos</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => vehicleFields.append({ plate: "", model: "" })}
          >
            + Adicionar veículo
          </button>
        </div>

        {vehicleFields.fields.length === 0 && <p className="text-muted">Nenhum veículo adicionado.</p>}

        {vehicleFields.fields.map((field, index) => (
          <div key={field.id} className={styles.repeatingRow}>
            <div className="form-field">
              <label htmlFor={`vehicles.${index}.plate`}>Placa</label>
              <input id={`vehicles.${index}.plate`} className="input" {...register(`vehicles.${index}.plate` as const)} />
            </div>
            <div className="form-field">
              <label htmlFor={`vehicles.${index}.model`}>Modelo</label>
              <input id={`vehicles.${index}.model`} className="input" {...register(`vehicles.${index}.model` as const)} />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => vehicleFields.remove(index)}
              aria-label="Remover veículo"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
