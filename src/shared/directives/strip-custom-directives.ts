import type {
    CustomDirectiveRegistry,
    DirectiveStyle,
} from "./custom-directive.types";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternsForDirective(name: string, style: DirectiveStyle): RegExp[] {
    const escaped = escapeRegex(name);

    if (style === "flag") {
        return [new RegExp(`\\s*@${escaped}(?![\\w-])(?!(\\s*[({:]))`, "g")];
    }

    if (style === "parens") {
        return [new RegExp(`\\s*@${escaped}\\s*\\([^)]*\\)`, "g")];
    }

    if (style === "braces") {
        return [new RegExp(`\\s*@${escaped}\\s*\\{[^}]*\\}`, "g")];
    }

    if (style === "colon") {
        return [new RegExp(`\\s*@${escaped}\\s*:\\s*[^@\\r\\n]+`, "g")];
    }

    return [
        new RegExp(`\\s*@${escaped}\\s*\\([^)]*\\)`, "g"),
        new RegExp(`\\s*@${escaped}\\s*\\{[^}]*\\}`, "g"),
        new RegExp(`\\s*@${escaped}\\s*:\\s*[^@\\r\\n]+`, "g"),
        new RegExp(`\\s*@${escaped}(?![\\w-])(?!(\\s*[({:]))`, "g"),
    ];
}

export function stripCustomDirectives(
    doc: string | undefined | null,
    registry: CustomDirectiveRegistry | undefined,
): string {
    if (!doc) return "";
    if (!registry) return doc;

    let cleaned = doc;

    for (const [name, definition] of Object.entries(registry)) {
        const style = definition.style ?? "auto";

        for (const pattern of patternsForDirective(name, style)) {
            cleaned = cleaned.replace(pattern, "");
        }
    }

    return cleaned;
}