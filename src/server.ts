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

class RconClient {
  private readonly conn: Rcon;

  constructor(host: string, port: number, password: string) {
    this.conn = new Rcon(host, port, password, { tcp: true, challenge: false });
    this.conn.on("auth", () => {
      this.onAuth?.();
    });
  }

  onAuth?: () => void;

  async send(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.conn.removeListener("response", onResponse);
        this.conn.removeListener("end", onEnd);
      };
      const onResponse = (res: string) => {
        console.log(`[rcon] response: ${res}`);
        resolve();
        cleanup();
      };
      const onEnd = () => {
        reject();
        cleanup();
      };
      this.conn.addListener("response", onResponse);
      this.conn.addListener("end", onEnd);
      this.conn.send(command);
    });
  }

  connect() {
    this.conn.connect();
  }
}

const rcon = new RconClient(
  settings.lobby.address,
  settings.lobby.rconPort,
  settings.lobby.rconPassword
);

monitor.onStatusChanged = async (
  name: string,
  status: Status,
  prev: Status
) => {
  if (status === Status.UNKNOWN) {
    return;
  }
  if (name === "main") {
    if (status === Status.UP) {
      await rcon.send("fill -218 68 -96 -216 63 -96 air");
      await rcon.send("fill -218 68 -96 -216 68 -96 stone_bricks");
      await rcon.send("fill -218 63 -96 -216 63 -96 stone_bricks");
      await rcon.send("fill -218 67 -96 -216 64 -96 nether_portal");
      await rcon.send("fill -218 66 -95 -216 65 -95 air");
    } else {
      await rcon.send("fill -218 66 -95 -216 65 -95 barrier");
      await rcon.send("fill -218 68 -96 -216 63 -96 air");
      await rcon.send(
        "setblock -218 68 -96 stone_brick_stairs[waterlogged=true,facing=west,half=top]"
      );
      await rcon.send(
        "setblock -216 68 -96 stone_brick_stairs[waterlogged=true,facing=east,half=top]"
      );
      await rcon.send("setblock -217 68 -96 water");
    }
  } else if (name === "hololive_01") {
    if (status === Status.UP) {
      await rcon.send("fill -216 67 -82 -218 63 -82 air");
      await rcon.send("fill -216 68 -82 -218 68 -82 stone_bricks");
      await rcon.send("fill -216 63 -82 -218 63 -82 stone_bricks");
      await rcon.send("fill -216 67 -82 -218 64 -82 nether_portal");
      await rcon.send("fill -216 66 -83 -218 65 -83 air");
    } else {
      await rcon.send("fill -216 66 -83 -218 65 -83 barrier");
      await rcon.send("fill -216 67 -82 -218 63 -82 air");
      await rcon.send(
        "setblock -216 68 -82 stone_brick_stairs[waterlogged=true,facing=east,half=top]"
      );
      await rcon.send(
        "setblock -218 68 -82 stone_brick_stairs[waterlogged=true,facing=west,half=top]"
      );
      await rcon.send("setblock -217 68 -82 water");
    }
  }
};

rcon.onAuth = () => {
  monitor.start();
};

rcon.connect();

const port = 8091;
const app = express();
app.get("/health_check", (req, res) => {
  res.status(200);
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`started at port ${port}`);
});
