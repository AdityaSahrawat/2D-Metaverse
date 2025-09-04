// src/index.ts
import path from "path";
import fs from "fs";

export function getMapPath(mapId: string) {
  return path.join(__dirname, "maps", `map_${mapId}.tmj`);
}

export function getMapData(mapId: string) {
  const filePath = getMapPath(mapId);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}
