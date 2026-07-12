
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { applyWebThemeColors } from "./theme";
  import "./styles/index.css";

  applyWebThemeColors();
  createRoot(document.getElementById("root")!).render(<App />);
  