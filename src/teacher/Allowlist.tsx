"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/data/supabase";

interface Row {
  email: string;
  role: "teacher" | "admin";
}

/** Admin only: who may sign in. The database refuses this to non admins anyway. */
export function Allowlist({ myEmail }: { myEmail: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Row["role"]>("teacher");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.from("allowed_emails").select("email, role").order("email");
    if (error) setMsg("Couldn't load the list.");
    else setRows(data as Row[]);
  }, []);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();
    if (!sb) return;
    void sb
      .from("allowed_emails")
      .select("email, role")
      .order("email")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setMsg("Couldn't load the list.");
        else setRows(data as Row[]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setMsg("That doesn't look like an email address.");
    const { error } = await getSupabase()!.from("allowed_emails").upsert({ email: clean, role });
    setMsg(error ? "Couldn't add that email." : `${clean} can now sign in.`);
    setEmail("");
    await load();
  };

  const remove = async (target: string) => {
    if (target === myEmail) return setMsg("You can't remove yourself.");
    if (!window.confirm(`Remove ${target}? They lose access right away.`)) return;
    const { error } = await getSupabase()!.from("allowed_emails").delete().eq("email", target);
    setMsg(error ? "Couldn't remove that email." : `${target} removed.`);
    await load();
  };

  return (
    <section className="t-card" aria-labelledby="allow-title">
      <h2 id="allow-title" className="slab">
        Who can sign in
      </h2>
      <p className="t-muted">
        Only these Google accounts can sign in. Admins can also manage this list and read every teacher&apos;s
        class results.
      </p>
      <ul className="t-allow">
        {rows.map((r) => (
          <li key={r.email}>
            <span>{r.email}</span>
            <span className="t-badge">{r.role}</span>
            <button className="btn" onClick={() => void remove(r.email)} disabled={r.email === myEmail}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="t-row" onSubmit={(e) => void add(e)}>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field t-narrow">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Row["role"])}>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="btn main" type="submit">
          Add
        </button>
      </form>
      {msg ? (
        <p className="t-muted" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
