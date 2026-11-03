import '@tanstack/react-query';

declare module '@tanstack/react-query' {
    interface Register {
        mutationMeta: {
            /** Set to false when the mutation shows its own error UI instead of the global toast. */
            toastOnError?: boolean;
        };
    }
}
