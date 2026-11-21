"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { removeStored, useMounted } from "@/lib/storage";
import { getSupabase, supabaseConfigured } from "@/data/supabase";
import { syncNow } from "@/data/sync";
import { useAuth } from "./useAuth";
import { WeekReport } from "./WeekReport";
import { Allowlist } from "./Allowlist";

interface Teacher {
  id: string;
  email: string;
  is_admin: boolean;
}

export function TeacherApp() {
  const mounted = useMounted();
  if (!mounted) return null;
  if (!supabaseConfigured()) {
    return (
      <Shell>
        <section className="t-card">
          <h2 className="slab">Accounts aren&apos;t set up yet</h2>
          <p>
            The board works without an account and keeps results on the board. To save results and see this
            page, connect Supabase (see the README).
          </p>
        </section>
      </Shell>
    );
  }
  return <Signed />;
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="t-page">
      <header className="t-head">
        <h1 className="slab">Teacher</h1>
        <div className="t-row">
          <Link className="btn" href="/">
            Open the board
          </Link>
          {right}
        </div>
      </header>
      {children}
    </div>
  );
}

function urlError(): string | null {
  const p = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const desc = p.get("error_description") ?? h.get("error_description");
  if (!desc) return null;
  return /not approved|saving new user/i.test(desc)
    ? "That Google account isn't approved for Classcade. Ask the admin to add it."
    : "Sign in didn't work. Please try again.";
}

function Signed() {
  const auth = useAuth();
  const [error] = useState(urlError);

  if (auth.status === "loading") {
    return (
      <Shell>
        <p className="t-muted">Loading…</p>
      </Shell>
    );
  }

  if (auth.status === "signed-out") {
    const signIn = () =>
      void getSupabase()!.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/teacher` },
      });
    return (
      <Shell>
        <section className="t-card t-center">
          <h2 className="slab">Sign in</h2>
          <p>Sign in with your approved Google account to see how the class is doing.</p>
          {error ? <p className="t-error">{error}</p> : null}
          <button className="big go slab" onClick={signIn}>
            Sign in with Google
          </button>
          <p className="t-muted">
            Sign in on the board&apos;s computer too, so the board saves its results to your account.
          </p>
        </section>
      </Shell>
    );
  }

  return <Dashboard userId={auth.session.user.id} email={auth.session.user.email ?? ""} />;
}

function Dashboard({ userId, email }: { userId: string; email: string }) {
  const [me, setMe] = useState<Teacher | null | "none">(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [viewing, setViewing] = useState(userId);

  useEffect(() => {
    void syncNow();
    const sb = getSupabase()!;
    let alive = true;
    void sb
      .from("teachers")
      .select("id, email, is_admin")
      .order("created_at")
      .then(({ data }) => {
        if (!alive) return;
        const list = (data ?? []) as Teacher[];
        setMe(list.find((t) => t.id === userId) ?? "none");
        setTeachers(list);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const signOut = async () => {
    await getSupabase()!.auth.signOut();
    removeStored("account");
  };
  const signOutBtn = (
    <button className="btn" onClick={() => void signOut()}>
      Sign out
    </button>
  );

  if (me === null) {
    return (
      <Shell right={signOutBtn}>
        <p className="t-muted">Loading…</p>
      </Shell>
    );
  }
  if (me === "none") {
    return (
      <Shell right={signOutBtn}>
        <section className="t-card">
          <h2 className="slab">No access</h2>
          <p>{email} isn&apos;t approved for Classcade right now. Ask the admin to add it.</p>
        </section>
      </Shell>
    );
  }

  const viewingOther = viewing !== userId;
  return (
    <Shell right={signOutBtn}>
      <p className="t-muted">Signed in as {email}</p>
      {me.is_admin && teachers.length > 1 ? (
        <section className="t-card">
          <label className="field">
            Viewing results for
            <select value={viewing} onChange={(e) => setViewing(e.target.value)}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id === userId ? `${t.email} (you)` : t.email}
                </option>
              ))}
            </select>
          </label>
          {viewingOther ? (
            <p className="t-muted">Read only. You can see this class&apos;s results but not change them.</p>
          ) : null}
        </section>
      ) : null}
      <WeekReport teacherId={viewing} />
      {!viewingOther ? <ClassCard teacherId={userId} /> : null}
      {me.is_admin ? <Allowlist myEmail={me.email} /> : null}
      {!viewingOther ? <DangerZone teacherId={userId} onGone={() => void signOut()} /> : null}
    </Shell>
  );
}

function ClassCard({ teacherId }: { teacherId: string }) {
  const [cls, setCls] = useState<{ id: string; name: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getSupabase()!
      .from("classrooms")
      .select("id, name")
      .eq("teacher_id", teacherId)
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => alive && data && setCls(data as { id: string; name: string }));
    return () => {
      alive = false;
    };
  }, [teacherId]);

  if (!cls) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await getSupabase()!
      .from("classrooms")
      .update({ name: cls.name.trim() || "My class" })
      .eq("id", cls.id);
    setMsg(error ? "Couldn't save." : "Saved.");
  };
  return (
    <section className="t-card" aria-labelledby="class-title">
      <h2 id="class-title" className="slab">
        Your class
      </h2>
      <form className="t-row" onSubmit={(e) => void save(e)}>
        <label className="field">
          Class name
          <input value={cls.name} maxLength={60} onChange={(e) => setCls({ ...cls, name: e.target.value })} />
        </label>
        <button className="btn main" type="submit">
          Save
        </button>
      </form>
      {msg ? (
        <p className="t-muted" role="status">
          {msg}
        </p>
      ) : null}
      <p className="t-muted">
        Board settings (title, sound, team names) are changed on the board under Teacher, and are kept the
        same on every signed in computer.
      </p>
    </section>
  );
}

function DangerZone({ teacherId, onGone }: { teacherId: string; onGone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const confirmTyped = (what: string) =>
    window.prompt(`Type DELETE to ${what}. This can't be undone.`) === "DELETE";

  const deleteResults = async () => {
    if (!confirmTyped("delete all class results")) return;
    const { error } = await getSupabase()!.from("sessions").delete().eq("teacher_id", teacherId);
    setMsg(error ? "Couldn't delete. Try again." : "All class results deleted.");
  };
  const deleteAccount = async () => {
    if (!confirmTyped("delete your account and everything in it")) return;
    const { error } = await getSupabase()!.rpc("delete_my_account");
    if (error) return setMsg("Couldn't delete. Try again.");
    removeStored("account");
    onGone();
  };

  return (
    <section className="t-card t-danger" aria-labelledby="data-title">
      <h2 id="data-title" className="slab">
        Your data
      </h2>
      <p className="t-muted">
        Results older than 13 months are deleted automatically. You can also delete everything now. See the
        privacy page in the project for every field that is stored.
      </p>
      <div className="t-row">
        <button className="btn" onClick={() => void deleteResults()}>
          Delete all class results
        </button>
        <button className="btn" onClick={() => void deleteAccount()}>
          Delete my account
        </button>
      </div>
      {msg ? <p role="status">{msg}</p> : null}
    </section>
  );
}
