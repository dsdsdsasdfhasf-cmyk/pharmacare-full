import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installDemoApi } from "./demo-api";

// Demo mode is ON by default so the app is usable without a backend.
// To use a real API instead, set VITE_DEMO_MODE=false (and VITE_API_BASE_URL if needed).
const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";
if (demoMode) {
  installDemoApi();
}

createRoot(document.getElementById("root")!).render(<App />);
