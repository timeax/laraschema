import {
    CustomDirectiveRegistry,
    DirectiveResolveContext,
    DirectiveStyle,
    DirectiveTarget,
    ParsedCustomDirective,
    ParsedCustomDirectiveMap,
} from './custom-directive.types';

type MatchResult = {
    raw: string;
    body?: string;
    style: Exclude<DirectiveStyle, 'auto' | 'custom'>;
    line: string;
};

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanDocLine(line: string): string {
    return line.replace(/^\s*\/\/\/\s?/, '').trim();
}

function splitArgs(body: string | undefined): string[] {
    if (!body) return [];

    return body
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}

function defaultValueFor(
    style: Exclude<DirectiveStyle, 'auto' | 'custom'>,
    body?: string,
): unknown {
    if (style === 'flag') return true;
    if (style === 'colon') return body?.trim() ?? '';
    return splitArgs(body);
}

function findDirectiveMatches(
    name: string,
    docblock: string,
    style: DirectiveStyle,
): MatchResult[] {
    const escaped = escapeRegex(name);
    const lines = docblock.split(/\r?\n/);
    const matches: MatchResult[] = [];

    const wantedStyles =
        style === 'auto' || style === 'custom'
            ? (['parens', 'braces', 'colon', 'flag'] as const)
            : ([style] as const);

    for (const rawLine of lines) {
        const line = cleanDocLine(rawLine);

        for (const wanted of wantedStyles) {
            if (wanted === 'parens') {
                const regex = new RegExp(`@${escaped}\\s*\\(([^)]*)\\)`, 'g');
                let match: RegExpExecArray | null;

                while ((match = regex.exec(line))) {
                    matches.push({
                        raw: match[0],
                        body: match[1],
                        style: wanted,
                        line: rawLine,
                    });
                }
            }

            if (wanted === 'braces') {
                const regex = new RegExp(`@${escaped}\\s*\\{([^}]*)\\}`, 'g');
                let match: RegExpExecArray | null;

                while ((match = regex.exec(line))) {
                    matches.push({
                        raw: match[0],
                        body: match[1],
                        style: wanted,
                        line: rawLine,
                    });
                }
            }

            if (wanted === 'colon') {
                const regex = new RegExp(`@${escaped}\\s*:\\s*([^@\\r\\n]+)`, 'g');
                let match: RegExpExecArray | null;

                while ((match = regex.exec(line))) {
                    matches.push({
                        raw: match[0],
                        body: match[1]?.trim(),
                        style: wanted,
                        line: rawLine,
                    });
                }
            }

            if (wanted === 'flag') {
                const regex = new RegExp(
                    `@${escaped}(?![\\w-])(?!(\\s*[({:]))`,
                    'g',
                );
                let match: RegExpExecArray | null;

                while ((match = regex.exec(line))) {
                    matches.push({
                        raw: match[0],
                        style: wanted,
                        line: rawLine,
                    });
                }
            }
        }
    }

    return matches;
}

function defaultResolve(
    name: string,
    target: DirectiveTarget,
    match: MatchResult,
): ParsedCustomDirective {
    return {
        name,
        target,
        raw: match.raw,
        style: match.style,
        value: defaultValueFor(match.style, match.body),
    };
}

export function parseCustomDirectives(
    docblock: string | undefined | null,
    registry: CustomDirectiveRegistry | undefined,
    target: DirectiveTarget = 'unknown',
): ParsedCustomDirectiveMap {
    if (!docblock || !registry) return {};

    const parsed: ParsedCustomDirectiveMap = {};

    for (const [name, definition] of Object.entries(registry as CustomDirectiveRegistry)) {
        const style = definition.style ?? 'auto';

        if (definition.targets?.length && !definition.targets.includes(target)) {
            continue;
        }

        const matches = findDirectiveMatches(name, docblock, style);

        for (const match of matches) {
            const ctx: DirectiveResolveContext = {
                name,
                style,
                target,
                raw: match.raw,
                rawLine: match.line,
                docblock,
                body: match.body,
            };

            const resolved =
                style === 'custom' && definition.resolve
                    ? definition.resolve(ctx)
                    : definition.resolve?.(ctx) ?? defaultResolve(name, target, match);

            if (!resolved) continue;

            parsed[name] ??= [];
            parsed[name].push(resolved);
        }
    }

    return parsed;
}