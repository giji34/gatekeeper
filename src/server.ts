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

setInterval(() => {
  const current = monitor.current;
  for (const { server, status } of current) {
    if (status === Status.UNKNOWN) {
      continue;
    }
    if (server === "main") {
      if (status === Status.UP) {
        rcon.send("fill -218 68 -96 -216 63 -96 air");
        rcon.send("fill -218 68 -96 -216 68 -96 stone_bricks");
        rcon.send("fill -218 63 -96 -216 63 -96 stone_bricks");
        rcon.send("fill -218 67 -96 -216 64 -96 nether_portal");
        rcon.send("fill -218 66 -95 -216 65 -95 air");
      } else {
        rcon.send("fill -218 66 -95 -216 65 -95 barrier");
        rcon.send("fill -218 68 -96 -216 63 -96 air");
        rcon.send(
          "setblock -218 68 -96 stone_brick_stairs[waterlogged=true,facing=west,half=top]"
        );
        rcon.send(
          "setblock -216 68 -96 stone_brick_stairs[waterlogged=true,facing=east,half=top]"
        );
        rcon.send("setblock -217 68 -96 water");
      }
    } else if (server === "hololive_01") {
      if (status === Status.UP) {
        rcon.send("fill -216 67 -82 -218 63 -82 air");
        rcon.send("fill -216 68 -82 -218 68 -82 stone_bricks");
        rcon.send("fill -216 63 -82 -218 63 -82 stone_bricks");
        rcon.send("fill -216 67 -82 -218 64 -82 nether_portal");
        rcon.send("fill -216 66 -83 -218 65 -83 air");
      } else {
        rcon.send("fill -216 66 -83 -218 65 -83 barrier");
        rcon.send("fill -216 67 -82 -218 63 -82 air");
        rcon.send(
          "setblock -216 68 -82 stone_brick_stairs[waterlogged=true,facing=east,half=top]"
        );
        rcon.send(
          "setblock -218 68 -82 stone_brick_stairs[waterlogged=true,facing=west,half=top]"
        );
        rcon.send("setblock -217 68 -82 water");
      }
    }
  }
}, 10000);

const port = 8091;
const app = express();
app.get("/health_check", (req, res) => {
  res.status(200);
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`started at port ${port}`);
});
