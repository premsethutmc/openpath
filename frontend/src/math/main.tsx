import { createRoot } from "react-dom/client";
import "./math.css";
import { App } from "./App";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
