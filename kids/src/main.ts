import "./player/styles.css";
import appleTree from "../episodes/chintoo-apple-tree.json";
import type { Episode } from "./engine/types.ts";
import { startApp } from "./player/app.ts";

startApp(document.getElementById("app")!, appleTree as unknown as Episode);
