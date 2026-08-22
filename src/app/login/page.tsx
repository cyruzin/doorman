import { LoginForm } from "@/modules/auth/components/login-form";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <div className={styles.wrapper}>
      <ThemeToggleButton className={`icon-btn ${styles.themeToggle}`} />
      <LoginForm />
    </div>
  );
}
