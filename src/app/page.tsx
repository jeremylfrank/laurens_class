export default function Home() {
  return (
    <main
      style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}
    >
      <div className="sign" style={{ padding: "24px 56px" }}>
        <h1 className="slab" style={{ margin: 0, fontSize: "clamp(38px, 6vw, 82px)", lineHeight: 1.05 }}>
          Trail Games
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 800 }}>
          The trail is being built. Games arrive in the next step.
        </p>
      </div>
    </main>
  );
}
