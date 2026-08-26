"use client";

import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { residentSchema, type ResidentInput } from "@/lib/validations/resident";
import { maskCpf, maskPhone, unmask } from "@/lib/helpers/masks";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useUnitOccupancy } from "@/modules/apartments/hooks/use-unit-occupancy";
import { useOccupiedUnits } from "@/modules/apartments/hooks/use-occupied-units";
import { ApartmentGrid } from "@/modules/apartments/components/apartment-grid";
import type { Resident, ResidentWriteInput } from "../types";
import styles from "./resident-form.module.css";

interface ResidentFormProps {
  defaultValues?: Resident;
  onSubmit: (data: ResidentWriteInput) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ResidentForm({ defaultValues, onSubmit, onCancel, submitLabel = "Salvar" }: ResidentFormProps) {
  const requestConfirm = useConfirm();
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

  // Checked live so this can't be submitted for a unit with no registered owner.
  const unitValue = useWatch({ control, name: "unit" });
  const debouncedUnit = useDebouncedValue(unitValue, 400);
  const { data: unitOccupancy } = useUnitOccupancy(debouncedUnit || null);
  const unitHasNoOwner = !!debouncedUnit && !!unitOccupancy && !unitOccupancy.owner;
  const { data: occupiedUnits } = useOccupiedUnits();

  // Only one resident may represent the unit's owner — hides the switch once one exists.
  const existingOwnerResident = unitOccupancy?.residents.find(
    (r) => r.isOwner && r.id !== defaultValues?.id,
  );
  // Editing an existing resident who *isn't* this unit's owner must not offer the
  // switch either: toggling it on would silently rewrite this record's name/cpf/email
  // into a completely different real person's (whoever owns the unit just picked) — a
  // brand-new record has no such identity to clobber, so it's exempt.
  const isThisUnitsOwner =
    !defaultValues || (!!unitOccupancy?.owner && defaultValues.ownerId === unitOccupancy.owner.id);
  // A unit must be selected and have a registered owner before anyone can claim to be it.
  const canBeOwner = !!debouncedUnit && !!unitOccupancy?.owner && !existingOwnerResident && isThisUnitsOwner;

  const isOwner = useWatch({ control, name: "isOwner" });
  const ownerId = useWatch({ control, name: "ownerId" });

  // Owner link always comes from the unit's own registered owner (never a free-text
  // search) — a resident can never be tagged as owner of an apartment they don't own.
  // Gated on canBeOwner, not just the raw isOwner flag: right after landing on a unit
  // this resident can't own, isOwner may still read true for one render before the
  // force-off effect below flips it — without this gate, this effect would race ahead
  // and link them to that other unit's owner first.
  useEffect(() => {
    if (isOwner && canBeOwner && unitOccupancy?.owner) {
      setValue("ownerId", unitOccupancy.owner.id, { shouldValidate: true });
      setValue("name", unitOccupancy.owner.name, { shouldValidate: true });
    }
  }, [isOwner, canBeOwner, unitOccupancy, setValue]);

  // Unit changed, lost its owner, or someone else already claims it — force the toggle
  // back off, remembering this was automatic (not the user unchecking it themselves).
  const autoForcedOffRef = useRef(false);
  useEffect(() => {
    if (!canBeOwner && isOwner) {
      autoForcedOffRef.current = true;
      setValue("isOwner", false);
    }
  }, [canBeOwner, isOwner, setValue]);

  // A detour back to the resident's own original unit restores the toggle it was
  // auto-forced off from — going 506 → 202 → 506 shouldn't leave it stuck off. Only
  // fires when this component forced it off; a deliberate manual uncheck stays off.
  useEffect(() => {
    if (
      autoForcedOffRef.current &&
      canBeOwner &&
      !isOwner &&
      defaultValues?.isOwner &&
      debouncedUnit === defaultValues.unit
    ) {
      autoForcedOffRef.current = false;
      setValue("isOwner", true);
    }
  }, [canBeOwner, isOwner, debouncedUnit, defaultValues, setValue]);

  // Leaving "É proprietário" clears the owner link and restores this resident's own
  // name/cpf/email (their real data when editing, blank when creating) — never leaves
  // a blank slate that invites typing someone else's identity in by mistake.
  const wasOwnerRef = useRef(isOwner);
  useEffect(() => {
    if (wasOwnerRef.current && !isOwner) {
      setValue("ownerId", undefined);
      setValue("name", defaultValues?.name ?? "");
      setValue("cpf", defaultValues?.cpf ?? undefined);
      setValue("email", defaultValues?.email ?? undefined);
    }
    wasOwnerRef.current = isOwner;
  }, [isOwner, setValue, defaultValues]);

  const submit = (data: ResidentInput) => {
    const write = {
      ...data,
      cpf: data.cpf ? unmask(data.cpf) : data.cpf,
      phones: data.phones.map((phone) => ({ ...phone, number: unmask(phone.number) })),
    };

    // Editing into a different unit is easy to click by accident — confirm before moving the resident.
    if (defaultValues && data.unit !== defaultValues.unit) {
      requestConfirm(() => onSubmit(write), {
        title: "Mudar apartamento",
        description: `Mover ${defaultValues.name} do apartamento ${defaultValues.unit} para o apartamento ${data.unit}?`,
        confirmLabel: "Mover",
      });
      return;
    }

    onSubmit(write);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-grid">
        <div className="form-field">
          <label>Apartamento</label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <ApartmentGrid selectedUnit={field.value ?? null} onSelect={field.onChange} occupiedUnits={occupiedUnits} />
            )}
          />
          {errors.unit && <span className="field-error">{errors.unit.message}</span>}
          {unitHasNoOwner && (
            <span className="field-error">
              Não há proprietário cadastrado para o apartamento {unitValue}. Cadastre o proprietário antes de continuar.
            </span>
          )}
        </div>
      </div>

      {debouncedUnit && !unitHasNoOwner && (canBeOwner ? (
        <label className={styles.toggle}>
          <input type="checkbox" className={styles.toggleInput} {...register("isOwner")} />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>É proprietário</span>
        </label>
      ) : existingOwnerResident ? (
        <p className="text-muted">
          {existingOwnerResident.name} já está cadastrado(a) como proprietário(a) deste apartamento.
        </p>
      ) : (
        !isThisUnitsOwner &&
        unitOccupancy?.owner && (
          <p className="text-muted">{unitOccupancy.owner.name} é o(a) proprietário(a) deste apartamento.</p>
        )
      ))}

      {isOwner ? (
        <p className="text-muted" key="owner-fields">
          Vinculado ao proprietário <strong>{unitOccupancy?.owner?.name}</strong>. Nome, CPF e e-mail vêm do cadastro dele.
          Clique em {submitLabel.toLowerCase()} para finalizar o cadastro dele também como morador.
          {errors.ownerId && <span className="field-error">{errors.ownerId.message}</span>}
        </p>
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

      {isOwner && ownerId ? (
        <p className="text-muted">Telefones e veículos poderão ser cadastrados ou editados na aba do proprietário vinculado.</p>
      ) : (
        <>
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
        </>
      )}

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
