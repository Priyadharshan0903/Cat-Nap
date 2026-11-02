import { createRoot } from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import Game from "../app/Game";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(<Game />);
