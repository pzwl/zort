import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  files: Record<string, unknown>;
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const isMounted = useRef(true);

  useEffect(() => {
    async function main() {
      try {
        // Install dependencies
        const installProcess = await webContainer.spawn('npm', ['install']);
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log(data);
          }
        }));
        // Wait for the installation process to complete
        await installProcess.exit;
  
        // Start the dev server
        await webContainer.spawn('npm', ['run', 'dev']);
  
        // Register the event listener for server-ready
        const serverReadyHandler = (port: number, url: string) => {
          // Only update state if component is still mounted
          if (isMounted.current) {
            console.log('Server ready at', url, 'on port', port);
            setUrl(url);
          }
        };
        
        webContainer.on('server-ready', serverReadyHandler);
      } catch (error) {
        console.error('Error in PreviewFrame:', error);
      }
    }
    
    main();
  
    // Set mounted ref to false when unmounting
    return () => {
      isMounted.current = false;
      // Note: We cannot remove the event listener directly as WebContainer doesn't support it
      // The isMounted ref prevents state updates after unmount
    };
  }, [webContainer]);
  
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && (
        <div className="text-center">
          <p className="mb-2">Loading...</p>
        </div>
      )}
      {url && <iframe title="Preview" width="100%" height="100%" src={url} />}
    </div>
  );
}