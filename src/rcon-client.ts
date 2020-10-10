import * as Rcon from "rcon";

export class RconClient {
  private readonly conn: Rcon;

  constructor(host: string, port: number, password: string) {
    this.conn = new Rcon(host, port, password, { tcp: true, challenge: false });
    this.conn.on("auth", () => {
      this.onAuth?.();
    });
  }

  onAuth?: () => void;

  send(command: string): Promise<void> {
    const msPerTick = 1000 / 20;
    const weight = 1 * msPerTick;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.conn.removeListener("response", onResponse);
        this.conn.removeListener("end", onEnd);
      };
      const onResponse = (res: string) => {
        console.log(`[rcon] response for command "${command}": ${res}`);
        cleanup();
        setTimeout(resolve, weight);
      };
      const onEnd = () => {
        cleanup();
        setTimeout(reject, weight);
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
