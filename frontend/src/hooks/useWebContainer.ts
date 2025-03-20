import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer>();
    const [error, setError] = useState<string | null>(null);

    async function main() {
        try {
            console.log('Initializing WebContainer...');
            const webcontainerInstance = await WebContainer.boot();
            console.log('WebContainer initialized successfully');
            setWebcontainer(webcontainerInstance);
        } catch (err) {
            console.error('Failed to initialize WebContainer:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
        }
    }

    useEffect(() => {
        main();
    }, []);

    return { webcontainer, error };
}