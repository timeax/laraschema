import { StubGroupConfig } from "../config/laravel-config.types";

export interface StubConfig {
   stubDir: string;
   groups?: StubGroupConfig[];
   tablePrefix?: string;
   tableSuffix?: string;
}
