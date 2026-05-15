import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ProfileProvider } from "@/context/ProfileContext";
import App from "@/App";
import { applyPwaDocumentHead } from "@/lib/pwaHead";
import "@/index.css";

applyPwaDocumentHead();

function routerBasename(): string | undefined {
  const url = import.meta.env.BASE_URL;
  if (!url || url === "/") return undefined;
  const b = url.replace(/\/$/, "");
  return b === "" ? undefined : b;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </BrowserRouter>
  </React.StrictMode>
);
