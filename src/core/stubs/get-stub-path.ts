import path from "node:path";
import {fileURLToPath} from "node:url";

const FOLDER = "laraschema";

export function getStubPath(pathString: string, folder?: string) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const __file = folder ?? FOLDER;
    const normalised = pathString.replace(/\\/g, "/");

    const dir = __dirname.replace(/\\/g, "/");
    const idx = dir.lastIndexOf(__file);

    if (idx === -1) {
        if (!folder) return getStubPath(pathString, FOLDER);
        return path.resolve(process.cwd(), normalised);
    }

    const baseDir = dir.slice(0, idx + __file.length);
    return path.join(baseDir, 'stubs', normalised);
}
