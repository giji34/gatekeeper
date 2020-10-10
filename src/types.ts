export type Server = {
  name: string;
  address: string;
  queryPort: number;
};

export type Settings = {
  lobby: {
    address: string;
    queryPort: number;
    rconPort: number;
    rconPassword: string;
  };
  servers: Server[];
};

export enum Status {
  UNKNOWN,
  UP,
  DOWN,
}

export type ServerStatus = {
  server: string;
  status: Status;
};
