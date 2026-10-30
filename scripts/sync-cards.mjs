// Copies shared/cards.js into each prototype so every directory deploys standalone.
import { copyFileSync } from "node:fs";
const targets = ["a-finder", "b-matchmaker", "c-explorer"];
for (const t of targets) {
  copyFileSync("shared/cards.js", `${t}/public/cards.js`);
  console.log(`synced → ${t}/public/cards.js`);
}
