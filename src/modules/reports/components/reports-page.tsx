"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { CinemaIcon, GrillIcon, PartyHallIcon } from "@/modules/scheduling/components/room-icons";
import { REPORT_ROOMS, ROOM_LABELS, type ReportRoom } from "../types";
import { ReportsRoomPanel } from "./reports-room-panel";
import styles from "./reports-page.module.css";

const ROOM_ICONS: Record<ReportRoom, typeof PartyHallIcon> = {
  PARTY_HALL: PartyHallIcon,
  CINEMA: CinemaIcon,
  GRILL: GrillIcon,
};

export function ReportsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [room, setRoom] = useState<ReportRoom>("PARTY_HALL");

  const canView = !!role && can(role, "reports", "read");

  if (!canView) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar relatórios.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Relatórios</h1>
      <div className={styles.layout}>
        <nav className={`card ${styles.roomNav}`}>
          {REPORT_ROOMS.map((r) => {
            const Icon = ROOM_ICONS[r];
            return (
              <button
                key={r}
                type="button"
                className={r === room ? `${styles.roomLink} ${styles.roomLinkActive}` : styles.roomLink}
                onClick={() => setRoom(r)}
                aria-current={r === room}
              >
                <Icon className={styles.roomIcon} />
                {ROOM_LABELS[r]}
              </button>
            );
          })}
        </nav>
        <div className={styles.content}>
          <ReportsRoomPanel room={room} />
        </div>
      </div>
    </div>
  );
}
