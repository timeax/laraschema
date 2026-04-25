import path from "path";

export const toPosixPath = (p: string) => p.replace(/\\\\/g, "/");
export const resolveFromCwd = (...parts: string[]) => path.resolve(process.cwd(), ...parts);
