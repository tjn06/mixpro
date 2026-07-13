
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { applyStableViewportHeight } from "./app/layout/applyStableViewportHeight";
import { applyThemeAppearance, readPersistedAppearance } from "./theme";
import "./styles/index.css";

applyThemeAppearance(document.documentElement, readPersistedAppearance());
applyStableViewportHeight();
createRoot(document.getElementById("root")!).render(<App />);
