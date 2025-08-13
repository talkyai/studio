import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { ColorModeProvider } from "./ColorModeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </React.StrictMode>,
);
