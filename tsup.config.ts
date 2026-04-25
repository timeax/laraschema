import {defineConfig} from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",

        "bin/cli": "src/bin/cli.ts",
        "bin/prisma-migrations": "src/bin/prisma-migrations.ts",
        "bin/prisma-models": "src/bin/prisma-models.ts",
        "bin/prisma-types": "src/bin/prisma-types.ts",
    },

    outDir: "dist",

    format: ["esm"],
    platform: "node",
    target: "es2022",

    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,

    dts: true,
});