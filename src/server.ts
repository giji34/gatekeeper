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
    this.conn.connect();
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
  const command = `fill ${range} ${block}`;
  await rcon.send(command);
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
