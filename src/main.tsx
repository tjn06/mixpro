
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { applyStableViewportHeight } from "./app/layout/applyStableViewportHeight";
  import { applyWebThemeColors } from "./theme";
  import "./styles/index.css";

  applyWebThemeColors();
  applyStableViewportHeight();
  createRoot(document.getElementById("root")!).render(<App />);
  