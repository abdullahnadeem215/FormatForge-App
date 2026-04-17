
import { useState, useCallback } from 'react';

export function usePdfToWord() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const convertPdfToWord = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return null;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB');
      return null;
    }

    setIsConverting(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      const response = await fetch('/api/ilovepdf-to-word', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        let errorMessage = 'Conversion failed';
        try {
          const contentType = response.headers.get('content-type');
          const text = await response.text();
          
          if (contentType && contentType.includes('application/json') && text.trim()) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } else if (text.trim()) {
            errorMessage = text;
          }
        } catch (e) {
          console.error('Error parsing server response:', e);
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      return { blob, url };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      return null;
    } finally {
      setIsConverting(false);
    }
  }, []);

  const download = useCallback((filename: string) => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.click();
    }
  }, [downloadUrl]);

  const reset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setIsConverting(false);
    setProgress(0);
    setError(null);
    setDownloadUrl(null);
  }, [downloadUrl]);

  return { isConverting, progress, error, downloadUrl, convertPdfToWord, download, reset };
}
