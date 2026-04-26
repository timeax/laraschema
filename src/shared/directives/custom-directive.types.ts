export type DirectiveStyle =
    | 'flag'
    | 'parens'
    | 'braces'
    | 'colon'
    | 'auto'
    | 'custom';

export type DirectiveTarget =
    | 'model'
    | 'field'
    | 'relation'
    | 'enum'
    | 'unknown';

export interface DirectiveResolveContext {
    name: string;
    style: DirectiveStyle;
    target: DirectiveTarget;
    raw: string;
    rawLine: string;
    docblock: string;
    body?: string;
}

export interface ParsedCustomDirective {
    name: string;
    style: DirectiveStyle;
    target: DirectiveTarget;
    raw: string;
    value: unknown;
}

export interface CustomDirectiveDefinition {
    style?: DirectiveStyle;
    targets?: DirectiveTarget[];
    resolve?: (
        ctx: DirectiveResolveContext,
    ) => ParsedCustomDirective | null | undefined;
}

export type CustomDirectiveRegistry = Record<
    string,
    CustomDirectiveDefinition
>;

export type ParsedCustomDirectiveMap = Record<
    string,
    ParsedCustomDirective[]
>;