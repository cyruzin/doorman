"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { NoticesIcon } from "@/components/nav/nav-icons";
import { CinemaIcon, GrillIcon, PartyHallIcon } from "@/modules/scheduling/components/room-icons";
import { ROOM_LABELS, type SchedulingEntry, type SchedulingRoom } from "@/modules/scheduling/types";
import type { Notice } from "@/modules/notices/types";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import type { OccupancySummary, SchedulingSummary } from "../types";
import styles from "./home-page.module.css";

const ROOM_ICONS: Record<SchedulingRoom, typeof PartyHallIcon> = {
  PARTY_HALL: PartyHallIcon,
  CINEMA: CinemaIcon,
  GRILL: GrillIcon,
};

function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date.toLocaleDateString("pt-BR")} às ${time}`;
}

interface HomePageProps {
  userName?: string | null;
}

export function HomePage({ userName }: HomePageProps) {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div className="page">
      <h1 className={styles.title}>Bem-vindo, {userName}</h1>
      <p className={styles.subtitle}>
        Use o menu acima para gerenciar inquilinos, proprietários, usuários e backups.
      </p>

      {isLoading ? (
        <p>Carregando...</p>
      ) : data ? (
        <>
          {data.notices && data.notices.length > 0 && <NoticesCard notices={data.notices} />}
          <div className={styles.grid}>
            <OccupancyCard occupancy={data.occupancy} />
            {data.scheduling && <CapacityCard scheduling={data.scheduling} />}
            {data.scheduling && data.scheduling.upcoming.length > 0 && (
              <UpcomingCard entries={data.scheduling.upcoming} />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function NoticesCard({ notices }: { notices: Notice[] }) {
  return (
    <div className={`card ${styles.card}`}>
      <h2 className={styles.cardTitle}>Recados</h2>
      <div className={styles.upcomingList}>
        {notices.map((notice) => (
          <Link key={notice.id} href="/notices" className={styles.upcomingItem}>
            <NoticesIcon className={styles.upcomingIcon} />
            <div className={styles.upcomingInfo}>
              <span className={styles.noticeMessage}>{notice.message}</span>
              <span className={styles.upcomingMeta}>
                {notice.authorUsername} · {formatEventDateTime(notice.createdAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {notices.length > 1 && (
        <Link href="/notices" className={styles.viewAllLink}>
          Visualizar mais recados
        </Link>
      )}
    </div>
  );
}

function OccupancyCard({ occupancy }: { occupancy: OccupancySummary }) {
  const percent = occupancy.totalUnits === 0 ? 0 : Math.round((occupancy.occupiedUnits / occupancy.totalUnits) * 100);

  return (
    <div className={`card ${styles.card}`}>
      <h2 className={styles.cardTitle}>Ocupação do prédio</h2>
      <div className={styles.ringRow}>
        <div className={styles.ring} style={{ "--percent": percent } as CSSProperties}>
          <span className={styles.ringValue}>{percent}%</span>
        </div>
        <div>
          <p className={styles.statLine}>
            <strong>{occupancy.occupiedUnits}</strong> de {occupancy.totalUnits} apartamentos ocupados
          </p>
          <p className={styles.statLine}>
            <strong>{occupancy.totalResidents}</strong> moradores ativos cadastrados
          </p>
        </div>
      </div>
    </div>
  );
}

function CapacityCard({ scheduling }: { scheduling: SchedulingSummary }) {
  const rooms = Object.entries(scheduling.capacityByRoom) as [SchedulingRoom, number][];
  const [monthName] = useState(() => new Date().toLocaleDateString("pt-BR", { month: "long" }));

  return (
    <div className={`card ${styles.card}`}>
      <h2 className={styles.cardTitle}>Capacidade de agendamento de {monthName}</h2>
      <div className={styles.bars}>
        {rooms.map(([room, percent]) => {
          const Icon = ROOM_ICONS[room];
          return (
            <Link key={room} href={`/scheduling?room=${room}`} className={styles.barRow}>
              <span className={styles.barLabel}>
                <Icon className={styles.barIcon} />
                {ROOM_LABELS[room]}
              </span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${percent}%` }} />
              </div>
              <span className={styles.barPercent}>{percent}%</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingCard({ entries }: { entries: SchedulingEntry[] }) {
  return (
    <div className={`card ${styles.card}`}>
      <h2 className={styles.cardTitle}>Próximos eventos</h2>
      <div className={styles.upcomingList}>
        {entries.map((entry) => {
          const Icon = ROOM_ICONS[entry.room];
          return (
            <Link key={entry.id} href={`/scheduling?room=${entry.room}`} className={styles.upcomingItem}>
              <Icon className={styles.upcomingIcon} />
              <div className={styles.upcomingInfo}>
                <span className={styles.upcomingResident}>
                  {entry.requesterName} — apto {entry.unit}
                </span>
                <span className={styles.upcomingMeta}>
                  {ROOM_LABELS[entry.room]} · {formatEventDateTime(entry.eventAt)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
