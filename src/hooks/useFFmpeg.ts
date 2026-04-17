import { useState, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (loaded || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    
    try {
      const ffmpegInstance = new FFmpeg();
      
      // Log FFmpeg messages for debugging
      ffmpegInstance.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });
      
      // Track load progress (for loading the wasm engine)
      // Note: progress callback is usually for exec, but we can simulate or just handle the finish
      
      // Load from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setFfmpeg(ffmpegInstance);
      setLoaded(true);
    } catch (err) {
      console.error('FFmpeg load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load FFmpeg');
    } finally {
      setIsLoading(false);
      setLoadingProgress(100);
    }
  };
  
  // Auto-load on mount
  useEffect(() => {
    load();
  }, []);
  
  return { ffmpeg, loaded, isLoading, loadingProgress, error, load };
}
