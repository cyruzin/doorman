"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { can, type Resource } from "@/lib/permissions";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { ApartmentsIcon, BackupsIcon, HomeIcon, PreferencesIcon, ResidentsIcon, UsersIcon } from "./nav-icons";
import { NavClock } from "./nav-clock";

const links = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/apartments", label: "Apartamentos", resources: ["tenants", "owners"] as Resource[], Icon: ApartmentsIcon },
  { href: "/residents", label: "Moradores", resources: ["tenants", "owners"] as Resource[], Icon: ResidentsIcon },
  { href: "/users", label: "Usuários", resources: ["users"] as Resource[], Icon: UsersIcon },
  { href: "/backups", label: "Backups", resources: ["backups"] as Resource[], Icon: BackupsIcon },
  { href: "/preferences", label: "Preferências", Icon: PreferencesIcon },
];

export function MainNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const role = session?.user?.role;
  const username = session?.user?.name ?? "";

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="main-nav">
      <div className="main-nav-bar">
        <Link href="/" className="main-nav-brand" onClick={closeMenu}>
          St. Tropez
        </Link>
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
            .filter((link) => !link.resources || (role && link.resources.some((r) => can(role, r, "read"))))
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
        <NavClock />
        <div className="main-nav-actions">
          <ThemeToggleButton />

          {session?.user && (
            <div className="main-nav-user-chip">
              <span className="main-nav-user-avatar" aria-hidden="true">
                {username.charAt(0).toUpperCase()}
              </span>
              <span className="main-nav-user">{username}</span>
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
