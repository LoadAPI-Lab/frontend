import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom theme scales (theme.css). Without this it reads
// `text-md` / `text-label` / `text-control` as colours and drops them next to `text-fg`.
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: ['2xs', 'label', 'md', 'control'],
            radius: ['editor', 'card'],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
