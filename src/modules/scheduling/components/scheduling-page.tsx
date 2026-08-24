"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { SCHEDULING_ROOMS, ROOM_LABELS, type SchedulingRoom } from "../types";
import { CinemaIcon, GrillIcon, PartyHallIcon } from "./room-icons";
import { SchedulingRoomPanel } from "./scheduling-room-panel";
import styles from "./scheduling-page.module.css";

const ROOM_ICONS: Record<SchedulingRoom, typeof PartyHallIcon> = {
  PARTY_HALL: PartyHallIcon,
  CINEMA: CinemaIcon,
  GRILL: GrillIcon,
};

export function SchedulingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [room, setRoom] = useState<SchedulingRoom>("PARTY_HALL");

  const canView = !!role && can(role, "scheduling", "read");

  if (!canView) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar agendamentos.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Agendamentos</h1>
      <div className={styles.layout}>
        <nav className={`card ${styles.roomNav}`}>
          {SCHEDULING_ROOMS.map((r) => {
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
          <SchedulingRoomPanel room={room} />
        </div>
      </div>
    </div>
  );
}
