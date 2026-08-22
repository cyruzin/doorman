"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/modules/auth/types";
import styles from "./login-form.module.css";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setFormError(null);
    const result = await signIn("credentials", { ...data, redirect: false });

    if (result?.error) {
      setFormError("Usuário ou senha inválidos");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`card form-stack ${styles.panel}`}>
      <div>
        <div className={styles.badge} aria-hidden="true">
          🏢
        </div>
        <h1 className={styles.title}>St. Tropez</h1>
        <p className={styles.subtitle}>Acesse com seu usuário da portaria.</p>
      </div>

      <div className="form-field">
        <label htmlFor="username">Usuário</label>
        <input id="username" className="input" autoComplete="username" {...register("username")} />
        {errors.username && <span className="field-error">{errors.username.message}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="password">Senha</label>
        <input id="password" type="password" className="input" autoComplete="current-password" {...register("password")} />
        {errors.password && <span className="field-error">{errors.password.message}</span>}
      </div>

      {formError && <span className="field-error">{formError}</span>}

      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
