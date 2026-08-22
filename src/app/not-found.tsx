import Link from "next/link";
import styles from "@/components/status-panel.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <div className={`card ${styles.panel}`}>
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.message}>O endereço acessado não existe.</p>
        <Link href="/" className="btn btn-primary">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
