"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rooms } from "@/data/rooms";
import type { RoomId } from "@/types/hotel";
import { apiErrorMessage } from "@/lib/http/clientError";

export const roomName = Object.fromEntries(rooms.map((room) => [room.id, room.name])) as Record<RoomId, string>;

export function dateLabel(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export type AdminResult<T> = { data?: T; error?: string; redirect?: string };

/** Fetch an admin API. A 401 means the session is gone: the caller is sent back to sign-in. */
export async function adminRequest<T>(url: string, init: RequestInit = {}, fallback = "The request failed."): Promise<AdminResult<T>> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      const ended = (payload as { error?: { code?: string } } | null)?.error?.code === "SESSION_ENDED";
      return { redirect: ended ? "/admin/login?reason=ended" : "/admin/login" };
    }
    if (!response.ok) return { error: apiErrorMessage(payload, fallback) };
    return { data: payload as T };
  } catch {
    return { error: fallback };
  }
}

export const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

/** Loads `url` (null = nothing), keeps the previous data while reloading, and exposes reload(). */
export function useAdminData<T>(url: string | null) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const key = url ? `${version}|${url}` : null;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string }>({ key: null, data: null, error: "" });

  useEffect(() => {
    if (!url || !key) return;
    const controller = new AbortController();
    void adminRequest<T>(url, { signal: controller.signal }, "Data could not be loaded.").then((result) => {
      if (controller.signal.aborted) return;
      if (result.redirect) {
        router.replace(result.redirect);
        return;
      }
      setState((current) => ({ key, data: result.data ?? current.data, error: result.error ?? "" }));
    });
    return () => controller.abort();
  }, [url, key, router]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { data: state.data, error: state.key === key ? state.error : "", loading: state.key !== key, reload };
}
