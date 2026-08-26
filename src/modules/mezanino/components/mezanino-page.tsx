"use client";

import { useState } from "react";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { MEZANINO_ROOMS, ROOM_LABELS, type MezaninoRoom } from "../types";
import { GameRoomIcon, GymIcon, KidsIcon } from "./room-icons";
import { MezaninoRoomPanel } from "./mezanino-room-panel";
import styles from "./mezanino-page.module.css";

const ROOM_ICONS: Record<MezaninoRoom, typeof GameRoomIcon> = {
  GAME_ROOM: GameRoomIcon,
  GYM: GymIcon,
  KIDS_SPACE: KidsIcon,
};

export function MezaninoPage() {
  const { can } = usePermissions();
  const [room, setRoom] = useState<MezaninoRoom>("GAME_ROOM");

  const canView = can("mezanino", "read");

  if (!canView) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar o mezanino.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Mezanino</h1>
      <div className={styles.layout}>
        <nav className={`card ${styles.roomNav}`}>
          {MEZANINO_ROOMS.map((r) => {
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
          <MezaninoRoomPanel room={room} />
        </div>
      </div>
    </div>
  );
}
