/** Generators the worker resolves (backend apps/worker/internal/template/resolver.go). */
export const GENERATORS = ['uuid', 'randomInt', 'randomEmail', 'timestamp'] as const;
export type Generator = (typeof GENERATORS)[number];

export type Placeholder =
    | { kind: 'generator'; name: string; known: boolean; start: number; end: number }
    | { kind: 'variable'; name: string; start: number; end: number };

const placeholderRe = /\{\{(\$?)(\w+)\}\}/g;

export function findPlaceholders(text: string): Placeholder[] {
    return [...text.matchAll(placeholderRe)].map((match) => {
        const [raw, dollar, name = ''] = match;
        const start = match.index;
        const end = start + raw.length;
        return dollar
            ? {
                  kind: 'generator',
                  name,
                  known: (GENERATORS as readonly string[]).includes(name),
                  start,
                  end,
              }
            : { kind: 'variable', name, start, end };
    });
}

/** Generators the worker would leave unresolved; show these as editor errors. */
export function unknownGenerators(text: string): string[] {
    return findPlaceholders(text)
        .filter((p) => p.kind === 'generator' && !p.known)
        .map((p) => p.name);
}

export const generatorToken = (name: Generator) => `{{$${name}}}`;
