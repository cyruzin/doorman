"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/modules/auth/types";
import styles from "./login-form.module.css";

function EyeIcon({ crossedOut }: { crossedOut: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossedOut && <path d="m4 4 16 16" />}
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
      <div className={styles.header}>
        <Image
          src="/logo.png"
          alt="St. Tropez Residence"
          width={260}
          height={156}
          className={styles.logo}
          loading="eager"
          fetchPriority="high"
        />
        <p className={styles.subtitle}>Acesse com seu usuário da portaria.</p>
      </div>

      <div className="form-field">
        <label htmlFor="username">Usuário</label>
        <input id="username" className="input" autoComplete="username" {...register("username")} />
        {errors.username && <span className="field-error">{errors.username.message}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="password">Senha</label>
        <div className={styles.passwordWrap}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className={`input ${styles.passwordInput}`}
            autoComplete="current-password"
            {...register("password")}
          />
          <button
            type="button"
            className={`icon-btn ${styles.passwordToggle}`}
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            <EyeIcon crossedOut={showPassword} />
          </button>
        </div>
        {errors.password && <span className="field-error">{errors.password.message}</span>}
      </div>

      {formError && <span className="field-error">{formError}</span>}

      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
