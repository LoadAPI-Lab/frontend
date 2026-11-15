import { cn } from '@/lib/cn';
import { findPlaceholders } from '@/lib/placeholders';

export interface PlaceholderTextProps {
    text: string;
    known: ReadonlySet<string>;
    className?: string;
}

type Part = { start: number; text: string; tone: 'plain' | 'known' | 'unknown' };

function partsOf(text: string, known: ReadonlySet<string>): Part[] {
    const parts: Part[] = [];
    let last = 0;
    for (const placeholder of findPlaceholders(text)) {
        if (placeholder.start > last) {
            parts.push({ start: last, text: text.slice(last, placeholder.start), tone: 'plain' });
        }
        const ok =
            placeholder.kind === 'generator' ? placeholder.known : known.has(placeholder.name);
        parts.push({
            start: placeholder.start,
            text: text.slice(placeholder.start, placeholder.end),
            tone: ok ? 'known' : 'unknown',
        });
        last = placeholder.end;
    }
    if (last < text.length) {
        parts.push({ start: last, text: text.slice(last), tone: 'plain' });
    }
    return parts;
}

export function PlaceholderText({ text, known, className }: PlaceholderTextProps) {
    return (
        <span className={cn('font-mono', className)}>
            {partsOf(text, known).map((part) => (
                <span
                    key={part.start}
                    className={cn(
                        part.tone === 'known' && 'text-accent',
                        part.tone === 'unknown' &&
                            'text-danger decoration-danger/60 underline decoration-dotted underline-offset-2',
                    )}
                >
                    {part.text}
                </span>
            ))}
        </span>
    );
}
