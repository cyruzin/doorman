"use client";

import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { residentSchema, type ResidentInput } from "@/lib/validations/resident";
import { maskCpf, maskPhone, unmask } from "@/lib/helpers/masks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useUnitOccupancy } from "@/modules/apartments/hooks/use-unit-occupancy";
import { ApartmentGrid } from "@/modules/apartments/components/apartment-grid";
import { useOwners } from "@/modules/owners/hooks/use-owners";
import type { Resident, ResidentWriteInput } from "../types";
import styles from "./resident-form.module.css";

interface ResidentFormProps {
  defaultValues?: Resident;
  onSubmit: (data: ResidentWriteInput) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ResidentForm({ defaultValues, onSubmit, onCancel, submitLabel = "Salvar" }: ResidentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResidentInput>({
    resolver: zodResolver(residentSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          cpf: defaultValues.cpf ?? undefined,
          email: defaultValues.email ?? undefined,
          unit: defaultValues.unit,
          active: defaultValues.active,
          isOwner: defaultValues.isOwner,
          ownerId: defaultValues.ownerId ?? undefined,
          phones: defaultValues.phones.map((p) => ({ number: p.number, isWhatsapp: p.isWhatsapp })),
          vehicles: defaultValues.vehicles.map((v) => ({ plate: v.plate ?? undefined, model: v.model ?? undefined })),
        }
      : { active: true, isOwner: false, phones: [], vehicles: [] },
  });

  const phoneFields = useFieldArray({ control, name: "phones" });
  const vehicleFields = useFieldArray({ control, name: "vehicles" });

  // A resident always lives at a unit that already has an owner registered —
  // check live as the unit is typed so this can't be submitted for an
  // apartment with nobody registered as its owner.
  const unitValue = useWatch({ control, name: "unit" });
  const debouncedUnit = useDebouncedValue(unitValue, 400);
  const { data: unitOccupancy } = useUnitOccupancy(debouncedUnit || null);
  const unitHasNoOwner = !!debouncedUnit && !!unitOccupancy && !unitOccupancy.owner;

  // Only one resident can represent the unit's owner — once one exists,
  // hide the switch for everyone else registering there (editing that same
  // resident doesn't count as "another" one).
  const existingOwnerResident = unitOccupancy?.residents.find(
    (r) => r.isOwner && r.id !== defaultValues?.id,
  );
  const canBeOwner = !existingOwnerResident;

  // "É proprietário" (item 2.1): searching and picking the unit's owner
  // avoids re-typing their name/cpf/email as a near-duplicate record — the
  // API re-derives those three fields from the linked Owner regardless, this
  // search is just so the doorman doesn't have to retype them by hand.
  // A single text field doubles as the picker: typing searches, and once
  // ownerId is set the input just displays the picked name — no separate
  // <select> alongside it.
  const isOwner = useWatch({ control, name: "isOwner" });
  const ownerId = useWatch({ control, name: "ownerId" });
  const [ownerQuery, setOwnerQuery] = useState(defaultValues?.owner?.name ?? "");
  const debouncedOwnerQuery = useDebouncedValue(ownerQuery, 300);
  const { data: ownerResults } = useOwners({
    enabled: isOwner && !ownerId && debouncedOwnerQuery.trim().length > 0,
    q: debouncedOwnerQuery,
    pageSize: 5,
    status: "active",
  });
  const ownerOptions = ownerResults?.items ?? [];

  const handleOwnerQueryChange = (value: string) => {
    setOwnerQuery(value);
    // Typing again after a pick means they're changing their mind — clear
    // the stale link until a new one is actually picked from the list.
    if (ownerId) setValue("ownerId", undefined);
  };

  const handleOwnerPick = (owner: (typeof ownerOptions)[number]) => {
    setValue("ownerId", owner.id, { shouldValidate: true });
    setValue("name", owner.name);
    setValue("cpf", owner.cpf ?? undefined);
    setValue("email", owner.email ?? undefined);
    setOwnerQuery(owner.name);
  };

  // Switching the toggle off clears the link — the name/cpf/email fields
  // become editable again instead of staying locked to a stale owner.
  useEffect(() => {
    if (!isOwner) setValue("ownerId", undefined);
  }, [isOwner, setValue]);

  // The unit changed (or its occupancy loaded) and it turns out someone else
  // already represents the owner there — force the toggle back off instead
  // of leaving a now-invalid isOwner:true sitting in the form.
  useEffect(() => {
    if (!canBeOwner && isOwner) setValue("isOwner", false);
  }, [canBeOwner, isOwner, setValue]);

  const submit = (data: ResidentInput) =>
    onSubmit({
      ...data,
      cpf: data.cpf ? unmask(data.cpf) : data.cpf,
      phones: data.phones.map((phone) => ({ ...phone, number: unmask(phone.number) })),
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-grid">
        <div className="form-field">
          <label>Apartamento</label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => <ApartmentGrid selectedUnit={field.value ?? null} onSelect={field.onChange} />}
          />
          {errors.unit && <span className="field-error">{errors.unit.message}</span>}
          {unitHasNoOwner && (
            <span className="field-error">
              Não há proprietário cadastrado para o apartamento {unitValue}. Cadastre o proprietário antes de continuar.
            </span>
          )}
        </div>
      </div>

      {canBeOwner ? (
        <label className={styles.toggle}>
          <input type="checkbox" className={styles.toggleInput} {...register("isOwner")} />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>É proprietário</span>
        </label>
      ) : (
        <p className="text-muted">
          {existingOwnerResident?.name} já está cadastrado(a) como proprietário(a) deste apartamento.
        </p>
      )}

      {isOwner ? (
        <div className="form-grid" key="owner-fields">
          <div className="form-field">
            <label htmlFor="ownerQuery">Buscar proprietário por nome</label>
            <input
              id="ownerQuery"
              type="search"
              className="input"
              autoComplete="off"
              value={ownerQuery}
              onChange={(e) => handleOwnerQueryChange(e.target.value)}
              placeholder="Digite o nome do proprietário..."
            />
            {ownerId ? (
              <span className={styles.ownerSelected}>
                <span className="badge badge-success">Selecionado</span>
              </span>
            ) : (
              <>
                {ownerOptions.length > 0 && (
                  <div className={styles.ownerResults} role="listbox">
                    {ownerOptions.map((owner) => (
                      <button
                        key={owner.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={styles.ownerResultButton}
                        onClick={() => handleOwnerPick(owner)}
                      >
                        {owner.name}
                      </button>
                    ))}
                  </div>
                )}
                {debouncedOwnerQuery.trim() !== "" && ownerOptions.length === 0 && (
                  <p className="text-muted">Nenhum proprietário encontrado.</p>
                )}
              </>
            )}
            {errors.ownerId && <span className="field-error">{errors.ownerId.message}</span>}
          </div>
        </div>
      ) : (
        <div className="form-grid" key="plain-fields">
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
          </div>

          <div className="form-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" {...register("email")} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
        </div>
      )}

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
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || unitHasNoOwner || (isOwner && !ownerId)}>
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
