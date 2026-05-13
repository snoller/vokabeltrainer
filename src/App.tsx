import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Learn from "@/pages/Learn";
import Library from "@/pages/Library";
import ProfilePage from "@/pages/ProfilePage";
import Scan from "@/pages/Scan";

import ProfileUnlockGate from "@/components/ProfileUnlockGate";
import ProfileHeaderSelect from "@/components/ProfileHeaderSelect";

function Layout() {
  const loc = useLocation();
  const nav = [
    { to: "/", label: "Start" },
    { to: "/lernen", label: "Lernen" },
    { to: "/bibliothek", label: "Bibliothek" },
    { to: "/scan", label: "Foto-Scan" },
    { to: "/profil", label: "Profil" },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid rgba(232, 234, 239, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          <Link
            to="/"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            Vokabeltrainer
          </Link>
          <ProfileHeaderSelect />
        </div>
        <nav style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
          {nav.map(({ to, label }) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: 999,
                  background: active ? "rgba(201, 162, 39, 0.2)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-muted)",
                  textDecoration: "none",
                  fontWeight: active ? 600 : 400,
                  fontSize: "0.95rem",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ flex: 1, padding: "1.25rem clamp(1rem, 4vw, 2.5rem) 2.5rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <Outlet />
      </main>
      <ProfileUnlockGate />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="lernen" element={<Learn />} />
        <Route path="bibliothek" element={<Library />} />
        <Route path="scan" element={<Scan />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
