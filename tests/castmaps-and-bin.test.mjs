import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distIndexPath = path.join(repoRoot, "dist", "index.js");
const distIndexUrl = pathToFileURL(distIndexPath).href;
const cliPath = path.join(repoRoot, "dist", "bin", "cli.js");

function scalarField(name, type, { isList = false, documentation = null } = {}) {
  return {
    kind: "scalar",
    name,
    dbName: null,
    type,
    documentation,
    isList,
    isRequired: true,
    isUnique: false,
    isId: name === "id",
    isReadOnly: false,
    hasDefaultValue: false,
    relationName: null,
    relationFromFields: [],
    relationToFields: [],
  };
}

function buildDmmf() {
  return {
    datamodel: {
      enums: [],
      models: [
        {
          name: "Sample",
          dbName: "samples",
          documentation: null,
          fields: [
            scalarField("id", "Int"),
            scalarField("payload", "Json"),
            scalarField("big_count", "BigInt"),
            scalarField("big_items", "BigInt", { isList: true }),
            scalarField("created_at", "DateTime"),
            scalarField("forced", "String", {
              documentation: "@cast{encrypted:array}",
            }),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
      ],
      types: [],
      indexes: [],
    },
    schema: {
      enumTypes: { prisma: [], model: [] },
      inputObjectTypes: { prisma: [] },
      outputObjectTypes: { prisma: [], model: [] },
      fieldRefTypes: { prisma: [] },
    },
    mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
  };
}

function buildExtendDmmf() {
  return {
    datamodel: {
      enums: [],
      models: [
        {
          name: "Account",
          dbName: "accounts",
          documentation:
            "@extend:Illuminate\\Foundation\\Auth\\User as Authenticatable",
          fields: [
            scalarField("id", "Int"),
            scalarField("email", "String"),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
      ],
      types: [],
      indexes: [],
    },
    schema: {
      enumTypes: { prisma: [], model: [] },
      inputObjectTypes: { prisma: [] },
      outputObjectTypes: { prisma: [], model: [] },
      fieldRefTypes: { prisma: [] },
    },
    mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
  };
}

function buildInheritedDmmf() {
  return {
    datamodel: {
      enums: [],
      models: [
        {
          name: "BaseRecord",
          dbName: "base_records",
          documentation: "@abstract",
          fields: [
            scalarField("id", "Int", { documentation: "@fillable" }),
            scalarField("created_at", "DateTime"),
            scalarField("updated_at", "DateTime"),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
        {
          name: "Customer",
          dbName: "customers",
          documentation: "@inherits(BaseRecord)",
          fields: [
            scalarField("email", "String", { documentation: "@fillable" }),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
        {
          name: "OverrideCustomer",
          dbName: "override_customers",
          documentation: "@inherits(BaseRecord)",
          fields: [
            scalarField("id", "String"),
            scalarField("email", "String"),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
      ],
      types: [],
      indexes: [],
    },
    schema: {
      enumTypes: { prisma: [], model: [] },
      inputObjectTypes: { prisma: [] },
      outputObjectTypes: { prisma: [], model: [] },
      fieldRefTypes: { prisma: [] },
    },
    mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
  };
}

function relationField(name, type, relationName, extra = {}) {
  return {
    kind: "object",
    name,
    dbName: null,
    type,
    documentation: null,
    isList: false,
    isRequired: true,
    isUnique: false,
    isId: false,
    isReadOnly: false,
    hasDefaultValue: false,
    relationName,
    relationFromFields: [],
    relationToFields: [],
    ...extra,
  };
}

function buildRelatedDmmf() {
  return {
    datamodel: {
      enums: [],
      models: [
        {
          name: "User",
          dbName: "users",
          documentation: null,
          fields: [
            scalarField("id", "Int"),
            relationField("posts", "Post", "PostToUser", {
              isList: true,
              isRequired: false,
            }),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
        {
          name: "Post",
          dbName: "posts",
          documentation: null,
          fields: [
            scalarField("id", "Int"),
            scalarField("user_id", "Int"),
            relationField("user", "User", "PostToUser", {
              relationFromFields: ["user_id"],
              relationToFields: ["id"],
            }),
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
        },
      ],
      types: [],
    },
    schema: {
      enumTypes: { prisma: [], model: [] },
      inputObjectTypes: { prisma: [] },
      outputObjectTypes: { prisma: [], model: [] },
      fieldRefTypes: { prisma: [] },
    },
    mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
  };
}

test("model castMaps overrides built-ins and preserves @cast directives", async () => {
  const { generateLaravelModels, buildModelContent } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-castmaps-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(
      configPath,
      `module.exports = {
  modeler: {
    modelStubPath: "stubs/model.stub",
    enumStubPath: "stubs/enum.stub",
    castMaps: {
      Json: "'array'",
      BigInt: ({ isList, ignore }) =>
        isList
          ? "Illuminate\\\\Database\\\\Eloquent\\\\Casts\\\\AsCollection::class"
          : ignore?.includes("BigInt")
            ? "'string'"
            : "'int'",
      DateTime: ({ prismaType }) => (prismaType === "DateTime" ? "'datetime'" : "'string'"),
    },
  },
};`,
      "utf8",
    );

    const result = await generateLaravelModels({
      dmmf: buildDmmf(),
      generator: {
        config: {
          noEmit: true,
          outputDir: "app/Models",
          outputEnumDir: "app/Enums",
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const model = result.models.find((m) => m.className === "Sample");
    assert.ok(model, "Expected generated Sample model definition");

    const payload = model.properties.find((p) => p.name === "payload");
    const bigCount = model.properties.find((p) => p.name === "big_count");
    const bigItems = model.properties.find((p) => p.name === "big_items");
    const createdAt = model.properties.find((p) => p.name === "created_at");
    const forced = model.properties.find((p) => p.name === "forced");

    assert.equal(payload?.phpType, "'array'");
    assert.equal(bigCount?.phpType, "'string'");
    assert.equal(bigItems?.phpType, "AsCollection::class");
    assert.equal(createdAt?.phpType, "'datetime'");
    assert.equal(forced?.cast, "encrypted:array");

    const content = buildModelContent(model);
    assert.match(content, /'payload' => 'array'/);
    assert.match(content, /'big_count' => 'string'/);
    assert.match(content, /'big_items' => AsCollection::class/);
    assert.match(content, /'created_at' => 'datetime'/);
    assert.match(content, /'forced' => 'encrypted:array'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("model @extend renders the aliased PHP parent class", async () => {
  const { generateLaravelModels } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-extend-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(
      configPath,
      `module.exports = {
  rootDir: ${JSON.stringify(root)},
};`,
      "utf8",
    );

    const result = await generateLaravelModels({
      dmmf: buildExtendDmmf(),
      generator: {
        config: {
          outputDir: "app/Models",
          outputEnumDir: "app/Enums",
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const account = result.models.find((m) => m.className === "Account");
    assert.ok(account, "Expected generated Account model definition");
    assert.equal(account.extends, "Authenticatable");
    assert.ok(
      account.imports?.includes(
        "use Illuminate\\Foundation\\Auth\\User as Authenticatable;",
      ),
      "Expected parent class import with alias",
    );

    const modelPhp = await readFile(
      path.join(root, "app", "Models", "Account.php"),
      "utf8",
    );

    assert.match(
      modelPhp,
      /use Illuminate\\Foundation\\Auth\\User as Authenticatable;/,
    );
    assert.match(modelPhp, /class Account extends Authenticatable/);
    assert.doesNotMatch(modelPhp, /use Illuminate\\Database\\Eloquent\\Model;/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("@abstract models are Laravel-silent bases and @inherits copies scalar fields", async () => {
  const { generateLaravelModels, generateLaravelSchema, generateTypesFromPrisma } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-inherits-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");
  const dmmf = buildInheritedDmmf();

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(
      configPath,
      `module.exports = {
  rootDir: ${JSON.stringify(root)},
};`,
      "utf8",
    );

    const generatorBase = {
      sourceFilePath: schemaPath,
      config: {},
    };

    const modelResult = await generateLaravelModels({
      dmmf,
      generator: {
        ...generatorBase,
        config: {
          outputDir: "app/Models",
          outputEnumDir: "app/Enums",
        },
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const migrationResult = await generateLaravelSchema({
      dmmf,
      generator: {
        ...generatorBase,
        config: {
          outputDir: "database/migrations",
        },
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const typeResult = await generateTypesFromPrisma({
      dmmf,
      generator: {
        ...generatorBase,
        config: {
          outputDir: "resources/js/types",
          noEmit: true,
        },
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    assert.equal(modelResult.models.some((model) => model.className === "BaseRecord"), false);
    assert.equal(migrationResult.some((migration) => migration.tableName === "base_records"), false);

    const customer = modelResult.models.find((model) => model.className === "Customer");
    assert.ok(customer, "Expected Customer model");
    assert.deepEqual(
      customer.properties.map((property) => property.name),
      ["id", "created_at", "updated_at", "email"],
    );
    assert.equal(customer.properties.find((property) => property.name === "id")?.fillable, true);

    const overrideCustomer = modelResult.models.find((model) => model.className === "OverrideCustomer");
    assert.equal(overrideCustomer?.properties.find((property) => property.name === "id")?.type, "String");

    const customerMigration = migrationResult.find((migration) => migration.tableName === "customers");
    assert.ok(customerMigration, "Expected Customer migration");
    assert.ok(customerMigration.definitions.some((definition) => definition.name === "created_at"));
    assert.ok(customerMigration.definitions.some((definition) => definition.name === "updated_at"));

    const baseType = typeResult.models.find((model) => model.name === "BaseRecord");
    const customerType = typeResult.models.find((model) => model.name === "Customer");
    assert.ok(baseType, "Expected abstract base to remain in TypeScript output");
    assert.ok(customerType?.fields.some((field) => field.name === "created_at"));

    await assert.rejects(readFile(path.join(root, "app", "Models", "BaseRecord.php"), "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("model namePrefix and nameSuffix decorate PHP model classes and relation targets", async () => {
  const { generateLaravelModels } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-model-prefix-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(configPath, "module.exports = {};", "utf8");

    const result = await generateLaravelModels({
      dmmf: buildRelatedDmmf(),
      generator: {
        config: {
          noEmit: true,
          namePrefix: "Ls",
          nameSuffix: "Record",
          outputDir: "app/Models",
          outputEnumDir: "app/Enums",
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const user = result.models.find((m) => m.tableName === "users");
    const post = result.models.find((m) => m.tableName === "posts");

    assert.equal(user?.className, "LsUserRecord");
    assert.equal(post?.className, "LsPostRecord");
    assert.equal(user?.relations.find((r) => r.name === "posts")?.modelClass, "LsPostRecord::class");
    assert.equal(post?.relations.find((r) => r.name === "user")?.modelClass, "LsUserRecord::class");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("typescript namePrefix and nameSuffix decorate model names and relation field types", async () => {
  const { generateTypesFromPrisma } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-ts-prefix-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(configPath, "module.exports = {};", "utf8");

    const result = await generateTypesFromPrisma({
      dmmf: buildRelatedDmmf(),
      generator: {
        config: {
          noEmit: true,
          namePrefix: "Ls",
          nameSuffix: "Record",
          outputDir: path.join(root, "types"),
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const user = result.models.find((m) => m.sourceName === "User");
    const post = result.models.find((m) => m.sourceName === "Post");

    assert.equal(user?.name, "LsUserRecord");
    assert.equal(post?.name, "LsPostRecord");
    assert.equal(user?.fields.find((f) => f.name === "posts")?.type, "LsPostRecord[]");
    assert.equal(post?.fields.find((f) => f.name === "user")?.type, "LsUserRecord");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("modeler namePrefix and nameSuffix do not decorate TypeScript output", async () => {
  const { generateTypesFromPrisma } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-model-prefix-ts-isolated-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(
      configPath,
      `module.exports = {
  modeler: {
    namePrefix: "Ls",
    nameSuffix: "Record",
  },
};`,
      "utf8",
    );

    const result = await generateTypesFromPrisma({
      dmmf: buildRelatedDmmf(),
      generator: {
        config: {
          noEmit: true,
          outputDir: path.join(root, "types"),
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const user = result.models.find((m) => m.sourceName === "User");
    const post = result.models.find((m) => m.sourceName === "Post");

    assert.equal(user?.name, "User");
    assert.equal(post?.name, "Post");
    assert.equal(user?.fields.find((f) => f.name === "posts")?.type, "Post[]");
    assert.equal(post?.fields.find((f) => f.name === "user")?.type, "User");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("modeler hooks receive generated definitions and active config", async () => {
  const { generateLaravelModels } = await import(distIndexUrl);
  const root = await mkdtemp(path.join(tmpdir(), "laraschema-hooks-"));
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const configPath = path.join(prismaDir, "laraschema.config.js");
  const hookPath = path.join(prismaDir, "modeler-hook.cjs");
  const hookOutput = path.join(root, "hook-output.json");

  try {
    await mkdir(prismaDir, { recursive: true });
    await writeFile(schemaPath, "// test schema\n", "utf8");
    await writeFile(
      hookPath,
      `module.exports = async function hook(ctx) {
  await ctx.writeJson(${JSON.stringify(hookOutput)}, {
    models: ctx.models.map((model) => model.className),
    enums: ctx.enums.map((item) => item.name),
    noEmit: ctx.config.noEmit,
    rootDir: ctx.config.rootDir,
  });
};`,
      "utf8",
    );
    await writeFile(
      configPath,
      `module.exports = {
  rootDir: ${JSON.stringify(root)},
  modeler: {
    hooks: [${JSON.stringify(hookPath)}],
  },
};`,
      "utf8",
    );

    await generateLaravelModels({
      dmmf: buildDmmf(),
      generator: {
        config: {
          noEmit: true,
          outputDir: "app/Models",
          outputEnumDir: "app/Enums",
        },
        sourceFilePath: schemaPath,
      },
      otherGenerators: [],
      schemaPath,
      datasources: [],
      datamodel: "",
      version: "",
    });

    const hookPayload = JSON.parse(await readFile(hookOutput, "utf8"));

    assert.deepEqual(hookPayload.models, ["Sample"]);
    assert.deepEqual(hookPayload.enums, []);
    assert.equal(hookPayload.noEmit, true);
    assert.equal(hookPayload.rootDir, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cli bin help lists expected commands", () => {
  const run = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr || "Expected zero exit code");

  const output = `${run.stdout}\n${run.stderr}`;
  assert.match(output, /\binit\b/);
  assert.match(output, /\bcustomize\b/);
  assert.match(output, /\bgen\b/);
  assert.match(output, /\blist\b/);
  assert.match(output, /\bclean\b/);
});
