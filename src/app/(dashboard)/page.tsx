import { auth } from "@/lib/auth";
import styles from "./page.module.css";

export default async function DashboardHomePage() {
  const session = await auth();

  return (
    <div className="page">
      <h1 className={styles.title}>Bem-vindo, {session?.user?.name}</h1>
      <p className={styles.subtitle}>
        Use o menu acima para gerenciar inquilinos, proprietários, usuários e backups.
      </p>
    </div>
  );
}
