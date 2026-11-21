"use client";
import { useEffect } from "react";
import { readStored, usePersisted, writeStored } from "@/lib/storage";
import { DEFAULT_SETTINGS, cleanSettings, type Settings } from "@/board/settings";
import { ensureIds, removeAttempts, type AttemptRecord } from "./attempts";
import { getSupabase } from "./supabase";

/**
 * Saves the board's results to the signed in teacher's account, and keeps teacher settings
 * the same on the board and the laptop. Safe to call any time: does nothing offline or signed out.
 */
export type SyncState = "not-set-up" | "signed-out" | "offline" | "saved" | "error";
export interface SyncStatus {
  state: SyncState;
  at: number;
  waiting: number;
}
const NO_STATUS: SyncStatus = { state: "signed-out", at: 0, waiting: 0 };
const CHUNK = 500;

interface Account {
  teacherId: string;
  classroomId: string;
}

export async function myClassroom(teacherId: string): Promise<string | null> {
  const cached = readStored<Account | null>("account", null);
  if (cached?.teacherId === teacherId) return cached.classroomId;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("classrooms")
    .select("id")
    .eq("teacher_id", teacherId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  writeStored<Account>("account", { teacherId, classroomId: data.id as string });
  return data.id as string;
}

async function syncSettings(classroomId: string) {
  const sb = getSupabase()!;
  const local = readStored<Settings>("settings", DEFAULT_SETTINGS);
  const { data, error } = await sb
    .from("classrooms")
    .select("settings, settings_updated_at")
    .eq("id", classroomId)
    .single();
  if (error) throw error;
  const serverAt = data.settings_updated_at ? Date.parse(data.settings_updated_at as string) : 0;
  if (serverAt > (local.updatedAt ?? 0)) {
    writeStored("settings", cleanSettings(data.settings, serverAt));
  } else if ((local.updatedAt ?? 0) > serverAt) {
    const { updatedAt, ...settings } = local;
    const { error: upErr } = await sb
      .from("classrooms")
      .update({ settings, settings_updated_at: new Date(updatedAt).toISOString() })
      .eq("id", classroomId);
    if (upErr) throw upErr;
  }
}

export function sessionRows(list: AttemptRecord[], classroomId: string, teacherId: string) {
  const sessions = new Map<
    string,
    { id: string; game: string; mode: string; play: string; started_at: string }
  >();
  for (const a of list) {
    const s = sessions.get(a.session);
    if (!s)
      sessions.set(a.session, { id: a.session, game: a.game, mode: a.mode, play: a.play, started_at: a.at });
    else if (a.at < s.started_at) s.started_at = a.at;
  }
  return [...sessions.values()].map((s) => ({ ...s, classroom_id: classroomId, teacher_id: teacherId }));
}

export function attemptRows(list: AttemptRecord[], classroomId: string, teacherId: string) {
  return list.map((a) => ({
    id: a.id!,
    session_id: a.session,
    classroom_id: classroomId,
    teacher_id: teacherId,
    item_key: a.itemKey,
    skill: a.skill,
    correct: a.correct,
    mistake: a.mistake ?? null,
    team: a.team ?? null,
    at: a.at,
  }));
}

async function syncAttempts(classroomId: string, teacherId: string) {
  const sb = getSupabase()!;
  const all = ensureIds();
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK);
    const s = await sb
      .from("sessions")
      .upsert(sessionRows(chunk, classroomId, teacherId), { onConflict: "id", ignoreDuplicates: true });
    if (s.error) throw s.error;
    const a = await sb
      .from("item_attempts")
      .upsert(attemptRows(chunk, classroomId, teacherId), { onConflict: "id", ignoreDuplicates: true });
    if (a.error) throw a.error;
    removeAttempts(new Set(chunk.map((r) => r.id!)));
  }
}

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  const waiting = () => ensureIds().length;
  const status = (state: SyncState) =>
    writeStored<SyncStatus>("sync", { state, at: Date.now(), waiting: waiting() });
  const sb = getSupabase();
  if (!sb) return status("not-set-up");
  if (!navigator.onLine) return status("offline");
  try {
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return status("signed-out");
    const classroomId = await myClassroom(user.id);
    if (!classroomId) return status("error");
    await syncSettings(classroomId);
    await syncAttempts(classroomId, user.id);
    status("saved");
  } catch {
    status("error");
  }
}

/** Board: sync on load, when the internet comes back, and every minute. */
export function useBoardSync(): void {
  useEffect(() => {
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);
    const t = setInterval(() => void syncNow(), 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, []);
}

export const useSyncStatus = () => usePersisted<SyncStatus>("sync", NO_STATUS)[0];
