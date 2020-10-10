import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import { Settings, Status } from "./types";
import { Monitor } from "./monitor";
import * as Rcon from "rcon";

const settings: Settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "settings.json")).toString("utf-8")
);

const monitor = new Monitor({
  servers: [{ name: "lobby", ...settings.lobby }, ...settings.servers],
  interval: 10000,
});

const rcon = new Rcon(
  settings.lobby.address,
  settings.lobby.rconPort,
  settings.lobby.rconPassword,
  { tcp: true, challenge: false }
);
rcon.on("auth", () => {
  console.log(`[rcon] auth`);
  monitor.start();
});
rcon.on("response", (res) => {
  console.log(`[rcon] response: ${res}`);
});
rcon.on("end", () => {
  console.log(`[rcon] end`);
});
rcon.connect();

monitor.onStatusChanged = (name: string, status: Status, prev: Status) => {
  let range: string;
  if (name === "main") {
    range = "-218 67 -96 -216 64 -96";
  } else if (name === "hololive_01") {
    range = "-216 67 -82 -218 64 -82";
  } else {
    return;
  }
  if (status === Status.UNKNOWN) {
    return;
  }
  let block: string;
  if (status === Status.UP) {
    block = "minecraft:nether_portal";
  } else {
    block = "minecraft:barrier";
  }
  const command = `/fill ${range} ${block}`;
  rcon.send(command);
};

const port = 8091;
const app = express();
app.get("/health_check", (req, res) => {
  res.status(200);
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`started at port ${port}`);
});
