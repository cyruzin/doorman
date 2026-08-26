"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { Resource } from "@/lib/permissions";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import {
  ApartmentsIcon,
  BackupsIcon,
  HomeIcon,
  MezaninoIcon,
  NoticesIcon,
  ReportsIcon,
  ResidentsIcon,
  SchedulingIcon,
  UsersIcon,
} from "./nav-icons";
import { NavClock } from "./nav-clock";

const links = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/notices", label: "Recados", resources: ["notices"] as Resource[], Icon: NoticesIcon },
  { href: "/apartments", label: "Apartamentos", resources: ["residents", "owners"] as Resource[], Icon: ApartmentsIcon },
  { href: "/mezanino", label: "Mezanino", resources: ["mezanino"] as Resource[], Icon: MezaninoIcon },
  { href: "/scheduling", label: "Agendamentos", resources: ["scheduling"] as Resource[], Icon: SchedulingIcon },
  { href: "/residents", label: "Moradores", resources: ["residents", "owners"] as Resource[], Icon: ResidentsIcon },
  { href: "/users", label: "Usuários", resources: ["users"] as Resource[], Icon: UsersIcon },
  { href: "/reports", label: "Relatórios", resources: ["reports"] as Resource[], Icon: ReportsIcon },
  { href: "/backups", label: "Backups", resources: ["backups"] as Resource[], Icon: BackupsIcon },
];

export function MainNav() {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const name = session?.user?.name ?? "";
  // The header chip only has room for a first name.
  const displayName = name.trim().split(/\s+/)[0] ?? name;

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="main-nav">
      <div className="main-nav-bar">
        <Link href="/" className="main-nav-brand" onClick={closeMenu}>
          St. Tropez
        </Link>
        <NavClock />
        <button
          type="button"
          className="icon-btn main-nav-hamburger"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className={isOpen ? "main-nav-panel open" : "main-nav-panel"}>
        <nav className="main-nav-links">
          {links
            .filter((link) => !link.resources || link.resources.some((r) => can(r, "read")))
            .map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={pathname === href ? "main-nav-link active" : "main-nav-link"}
              >
                <Icon className="main-nav-link-icon" />
                {label}
              </Link>
            ))}
        </nav>
        <div className="main-nav-actions">
          <ThemeToggleButton />

          {session?.user && (
            <div className="main-nav-user-chip">
              <span className="main-nav-user-avatar" aria-hidden="true">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="main-nav-user">{displayName}</span>
            </div>
          )}

          <button type="button" className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
