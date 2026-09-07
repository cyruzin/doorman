import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { signOut } from "next-auth/react";
import { api } from "@/lib/axios";
import { useShiftAutoLogout } from "@/modules/auth/hooks/use-shift-auto-logout";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  api: { post: vi.fn() },
}));

describe("useShiftAutoLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(signOut).mockClear();
    vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when there is no loginAt", async () => {
    renderHook(() => useShiftAutoLogout(undefined));
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(signOut).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("registers the shift logout on the mural before signing out", async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 17, 59, 0, 0));
    const loginAt = new Date(2026, 0, 15, 8, 0, 0, 0).getTime();

    renderHook(() => useShiftAutoLogout(loginAt));
    expect(signOut).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60 * 1000 + 1);

    expect(api.post).toHaveBeenCalledWith("/notices/shift-logout");
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("still signs out if the mural registration fails (best-effort)", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("network down"));
    vi.setSystemTime(new Date(2026, 0, 15, 17, 59, 0, 0));
    const loginAt = new Date(2026, 0, 15, 8, 0, 0, 0).getTime();

    renderHook(() => useShiftAutoLogout(loginAt));
    await vi.advanceTimersByTimeAsync(60 * 1000 + 1);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("signs out via the safety-net recheck if the boundary timer is missed, only once", async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 17, 59, 0, 0));
    const loginAt = new Date(2026, 0, 15, 8, 0, 0, 0).getTime();

    renderHook(() => useShiftAutoLogout(loginAt));

    // Simula o sistema "acordando" bem depois do horário de corte, sem que
    // o setTimeout exato tenha disparado (ex.: aba suspensa).
    vi.setSystemTime(new Date(2026, 0, 15, 19, 0, 0, 0));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("does not sign out before the boundary is reached", async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 8, 0, 0, 0));
    const loginAt = new Date(2026, 0, 15, 8, 0, 0, 0).getTime();

    renderHook(() => useShiftAutoLogout(loginAt));
    await vi.advanceTimersByTimeAsync(5 * 60 * 60 * 1000); // avança até 13h, ainda no mesmo turno

    expect(signOut).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
