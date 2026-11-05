import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: ['2xs', 'label', 'md', 'control'],
            radius: ['item', 'editor', 'card'],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
