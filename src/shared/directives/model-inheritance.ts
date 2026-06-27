import type { DMMF } from "@prisma/generator-helper";
import { listFrom } from "./parse-directives";

export function isAbstractModel(model: DMMF.Model): boolean {
    return /@abstract(?![\w])/i.test(model.documentation ?? "");
}

export function getInheritedModelName(model: DMMF.Model): string | undefined {
    return listFrom(model.documentation ?? "", "inherits")[0]?.trim() || undefined;
}

function stripInheritanceControlDirectives(doc?: string): string | undefined {
    if (!doc) return undefined;

    const cleaned = doc
        .replace(/\s*@abstract(?![\w])/gi, "")
        .replace(/\s*@inherits\s*\([^)]*\)/gi, "")
        .replace(/\s*@inherits\s*\{[^}]*\}/gi, "")
        .replace(/\s*@inherits\s*:\s*[^@\r\n]+/gi, "")
        .trim();

    return cleaned || undefined;
}

function mergeDocumentation(baseDoc?: string, childDoc?: string): string | undefined {
    const parts = [
        stripInheritanceControlDirectives(baseDoc),
        childDoc,
    ].filter(Boolean);

    return parts.length ? parts.join("\n") : undefined;
}

function inheritedFields(base: DMMF.Model, child: DMMF.Model): DMMF.Field[] {
    const childFieldNames = new Set(child.fields.map((field) => field.name));

    return base.fields
        .filter((field) => field.kind === "scalar" || field.kind === "enum")
        .filter((field) => !childFieldNames.has(field.name));
}

export function applyModelInheritance(dmmf: DMMF.Document): DMMF.Document {
    const sourceModels = dmmf.datamodel.models;
    const sourceByName = new Map(sourceModels.map((model) => [model.name, model]));
    const resolved = new Map<string, DMMF.Model>();
    const resolving = new Set<string>();

    const resolveModel = (model: DMMF.Model): DMMF.Model => {
        const existing = resolved.get(model.name);
        if (existing) return existing;

        if (resolving.has(model.name)) {
            throw new Error(`Cycle detected in @inherits chain for model "${model.name}"`);
        }

        resolving.add(model.name);

        const parentName = getInheritedModelName(model);
        const parent = parentName ? sourceByName.get(parentName) : undefined;

        if (parentName && !parent) {
            throw new Error(`Model "${model.name}" inherits unknown model "${parentName}"`);
        }

        const effectiveParent = parent ? resolveModel(parent) : undefined;
        const effective: DMMF.Model = effectiveParent
            ? {
                ...model,
                documentation: mergeDocumentation(effectiveParent.documentation, model.documentation),
                fields: [
                    ...inheritedFields(effectiveParent, model),
                    ...model.fields,
                ],
            }
            : { ...model };

        resolving.delete(model.name);
        resolved.set(model.name, effective);
        return effective;
    };

    return {
        ...dmmf,
        datamodel: {
            ...dmmf.datamodel,
            models: sourceModels.map(resolveModel),
        },
    };
}
