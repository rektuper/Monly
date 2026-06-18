import "./index.css";
import "./styles/layout/AppShell.css";
import "./styles/layout/PagePanel.css";
import "./styles/layout/DashboardPerf.css";
import "./styles/shared/ModalOverlay.css";
import "./styles/shared/Surface.css";
import "./styles/shared/FeaturedCard.css";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import AuthProvider from "./context/AuthContext";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);