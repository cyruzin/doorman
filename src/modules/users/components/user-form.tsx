"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema, type AppUser, type UserFormValues } from "../types";

interface UserFormProps {
  defaultValues?: AppUser;
  onSubmit: (data: UserFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export function UserForm({ defaultValues, onSubmit, onCancel, submitLabel = "Salvar" }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultValues
      ? { username: defaultValues.username, role: defaultValues.role, password: "" }
      : { role: "DOORMAN", password: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="username">Usuário</label>
          <input id="username" className="input" {...register("username")} />
          {errors.username && <span className="field-error">{errors.username.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="role">Perfil</label>
          <select id="role" className="input" disabled={defaultValues?.isSuperAdmin} {...register("role")}>
            <option value="DOORMAN">Porteiro</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {defaultValues?.isSuperAdmin && (
            <span className="text-muted">O super admin não pode deixar de ser administrador.</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="password">{defaultValues ? "Nova senha (opcional)" : "Senha"}</label>
          <input id="password" type="password" className="input" {...register("password")} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </div>
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
