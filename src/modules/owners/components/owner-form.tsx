"use client";

import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ownerSchema, type OwnerInput as OwnerFormValues } from "@/lib/validations/owner";
import { maskCpf, maskPhone, unmask } from "@/lib/helpers/masks";
import { useOccupiedUnits } from "@/modules/apartments/hooks/use-occupied-units";
import { useClaimedUnits } from "../hooks/use-owners";
import type { Owner, OwnerInput } from "../types";
import { OwnerUnitGrid } from "./owner-unit-grid";
import styles from "./owner-form.module.css";

interface OwnerFormProps {
  defaultValues?: Owner;
  onSubmit: (data: OwnerInput) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export function OwnerForm({ defaultValues, onSubmit, onCancel, submitLabel = "Salvar" }: OwnerFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          cpf: defaultValues.cpf ?? "",
          email: defaultValues.email ?? undefined,
          active: defaultValues.active,
          units: defaultValues.units,
          phones: defaultValues.phones.map((p) => ({ number: p.number, isWhatsapp: p.isWhatsapp })),
          vehicles: defaultValues.vehicles.map((v) => ({ plate: v.plate ?? undefined, model: v.model ?? undefined })),
        }
      : { active: true, units: [], phones: [], vehicles: [] },
  });

  const phoneFields = useFieldArray({ control, name: "phones" });
  const vehicleFields = useFieldArray({ control, name: "vehicles" });

  const units = useWatch({ control, name: "units" }) ?? [];
  const sortedUnits = [...units].sort();
  const { data: claimedUnits = {} } = useClaimedUnits(defaultValues?.id);
  const { data: occupiedUnits } = useOccupiedUnits();

  const toggleUnit = (unit: string) => {
    const next = units.includes(unit) ? units.filter((u) => u !== unit) : [...units, unit];
    setValue("units", next, { shouldValidate: true });
  };

  const submit = (data: OwnerFormValues) =>
    onSubmit({
      ...data,
      cpf: data.cpf ? unmask(data.cpf) : data.cpf,
      phones: data.phones.map((phone) => ({ ...phone, number: unmask(phone.number) })),
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Nome</label>
          <input id="name" className="input" {...register("name")} />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="cpf">CPF</label>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <input
                id="cpf"
                className="input"
                inputMode="numeric"
                value={maskCpf(field.value ?? "")}
                onChange={(e) => field.onChange(maskCpf(e.target.value))}
                onBlur={field.onBlur}
              />
            )}
          />
          {errors.cpf && <span className="field-error">{errors.cpf.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" {...register("email")} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Apartamentos</span>
        </div>
        <p className={sortedUnits.length > 0 ? styles.unitsSummary : "text-muted"}>
          {sortedUnits.length > 0 ? `Apartamentos: ${sortedUnits.join(", ")}` : "Nenhum apartamento selecionado."}
        </p>
        <OwnerUnitGrid selectedUnits={units} onToggle={toggleUnit} claimedUnits={claimedUnits} occupiedUnits={occupiedUnits} />
        {errors.units?.message && <span className="field-error">{errors.units.message}</span>}
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
              <Controller
                name={`phones.${index}.number` as const}
                control={control}
                render={({ field }) => (
                  <input
                    id={`phones.${index}.number`}
                    className="input"
                    inputMode="numeric"
                    value={maskPhone(field.value ?? "")}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />
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
