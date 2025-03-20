import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef } from 'react';
import type { FileSystemTree } from '@webcontainer/api';

interface PreviewFrameProps {
  files: FileSystemTree;
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer, files }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const isMounted = useRef(true);

  useEffect(() => {
    async function main() {
      try {
        console.log('Starting preview initialization...');
        setLoadingStatus("Setting up files...");
        
        // First, mount the essential files
        await webContainer.mount({
          'index.html': {
            file: {
              contents: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
            }
          },
          'vite.config.ts': {
            file: {
              contents: `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173
    }
  }
});`
            }
          },
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: "vite-react-typescript-starter",
                private: true,
                version: "0.0.0",
                type: "module",
                scripts: {
                  "dev": "vite --host",
                  "build": "vite build",
                  "preview": "vite preview"
                },
                dependencies: {
                  "react": "^18.2.0",
                  "react-dom": "^18.2.0"
                },
                devDependencies: {
                  "@types/react": "^18.2.0",
                  "@types/react-dom": "^18.2.0",
                  "@vitejs/plugin-react": "^4.0.0",
                  "typescript": "^5.0.2",
                  "vite": "^4.3.9"
                }
              }, null, 2)
            }
          },
          'tsconfig.json': {
            file: {
              contents: JSON.stringify({
                compilerOptions: {
                  target: "ES2020",
                  useDefineForClassFields: true,
                  lib: ["ES2020", "DOM", "DOM.Iterable"],
                  module: "ESNext",
                  skipLibCheck: true,
                  moduleResolution: "bundler",
                  allowImportingTsExtensions: true,
                  resolveJsonModule: true,
                  isolatedModules: true,
                  noEmit: true,
                  jsx: "react-jsx",
                  strict: true,
                  noUnusedLocals: true,
                  noUnusedParameters: true,
                  noFallthroughCasesInSwitch: true
                },
                include: ["src"],
                references: [{ path: "./tsconfig.node.json" }]
              }, null, 2)
            }
          },
          'tsconfig.node.json': {
            file: {
              contents: JSON.stringify({
                compilerOptions: {
                  composite: true,
                  skipLibCheck: true,
                  module: "ESNext",
                  moduleResolution: "bundler",
                  allowSyntheticDefaultImports: true
                },
                include: ["vite.config.ts"]
              }, null, 2)
            }
          }
        });

        // Then mount the rest of the files
        console.log('Mounting project files...');
        setLoadingStatus("Mounting project files...");
        await webContainer.mount(files);
        
        // Install dependencies
        console.log('Installing dependencies...');
        setLoadingStatus("Installing dependencies...");
        const installProcess = await webContainer.spawn('npm', ['install']);
        
        const installOutput: string[] = [];
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('npm install:', data);
            installOutput.push(data);
          }
        }));
        
        const installExitCode = await installProcess.exit;
        console.log('npm install completed with exit code:', installExitCode);
        
        if (installExitCode !== 0) {
          throw new Error(`npm install failed with exit code ${installExitCode}\n${installOutput.join('\n')}`);
        }

        // Start the dev server
        console.log('Starting dev server...');
        setLoadingStatus("Starting development server...");
        
        // Set up server-ready listener before starting the server
        const serverReadyPromise = new Promise<string>((resolve) => {
          webContainer.on('server-ready', (port: number, url: string) => {
            console.log('Server ready event received:', { port, url });
            resolve(url);
          });
        });

        const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
        
        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('dev server:', data);
            if (data.includes('VITE v') || data.includes('ready in')) {
              setLoadingStatus("Server starting...");
            }
          }
        }));

        // Wait for the server to be ready with a timeout
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('Server startup timeout')), 30000);
        });

        try {
          const serverUrl = await Promise.race([serverReadyPromise, timeoutPromise]);
          if (isMounted.current) {
            const previewUrl = serverUrl.replace('0.0.0.0', 'localhost');
            console.log('Setting preview URL to:', previewUrl);
            setUrl(previewUrl);
            setError(null);
            setIsLoading(false);
          }
        } catch (error) {
          throw new Error('Failed to start development server: ' + (error instanceof Error ? error.message : String(error)));
        }
      } catch (error) {
        console.error('Error in PreviewFrame:', error);
        if (isMounted.current) {
          setError(error instanceof Error ? error.message : 'Failed to start preview');
          setIsLoading(false);
        }
      }
    }
    
    setIsLoading(true);
    main();
  
    return () => {
      isMounted.current = false;
    };
  }, [webContainer, files]);
  
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="mb-2">Error: {error}</p>
          <p className="text-sm">Check the console for more details</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {isLoading && (
        <div className="text-center">
          <p className="mb-2">Loading preview...</p>
          <p className="text-sm">{loadingStatus}</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
      {!isLoading && url && (
        <iframe 
          title="Preview" 
          width="100%" 
          height="100%" 
          src={url}
          className="bg-white rounded-lg"
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation"
        />
      )}
    </div>
  );
}