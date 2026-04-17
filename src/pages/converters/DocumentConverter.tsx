import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import { File, X, CheckCircle2, AlertCircle, Download, Loader2, FileText, Zap } from 'lucide-react';
import { summarizePdf } from '../../services/gemini';
import { saveConversion } from '../../utils/storage';
import { cn } from '../../lib/utils';

export default function DocumentConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const handleDocumentProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setSummary(null);

    try {
      // 1. Convert via Adobe PDF Services
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert/adobe-to-docx', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Adobe conversion failed';
        try {
          const contentType = response.headers.get('content-type');
          const text = await response.text();
          
          if (contentType && contentType.includes('application/json') && text.trim()) {
            const errData = JSON.parse(text);
            errorMessage = errData.error || errorMessage;
          } else if (text.trim()) {
            errorMessage = text;
          }
        } catch (e) {
          console.error('Error parsing server response:', e);
        }
        throw new Error(errorMessage);
      }

      const adobeBlob = await response.blob();
      const docUrl = URL.createObjectURL(adobeBlob);

      // 2. Get Summary via Gemini
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      
      const sum = await summarizePdf(base64); 

      const conversionResult = {
        isAdobe: true,
        docUrl,
        name: file.name.substring(0, file.name.lastIndexOf('.')) + '.docx'
      };

      setResult(conversionResult);
      setSummary(sum);

      // Save to history locally
      saveConversion({
        type: 'document',
        input_format: 'pdf',
        output_format: 'docx',
        input_size: file.size,
        output_size: adobeBlob.size,
        status: 'completed',
        file_name: conversionResult.name
      }, adobeBlob);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed. Ensure the file is valid.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result?.docUrl) return;
    const a = document.createElement('a');
    a.href = result.docUrl;
    a.download = result.name || 'document.docx';
    a.click();
  };

  return (
    <motion.div
      id="document-converter-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-light tracking-tight">Document Pro</h2>
          <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Adobe PDF Services
          </span>
        </div>
        <p className="text-text-dim text-sm">Professional PDF to Word conversion powered by Adobe ®, featuring Gemini AI intelligent summaries.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <div 
              id="document-drop-zone"
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-[24px] p-12 text-center transition-all cursor-pointer",
                isDragActive ? "border-purple-500 bg-purple-500/5" : "border-border hover:border-white/20 bg-surface"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <FileText className="w-8 h-8 text-text-dim" />
                </div>
                <div>
                  <p className="text-lg font-medium">Upload a PDF document</p>
                  <p className="text-sm text-text-dim">Supports Professional DOCX Output</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-surface border border-border rounded-[24px] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Document Ready</h3>
                  <button onClick={downloadResult} className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                    <Download className="w-4 h-4" /> Download DOCX
                  </button>
                </div>

                <div className="bg-black/20 p-12 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center gap-4">
                   <div className="p-4 bg-green-500/10 rounded-full">
                     <CheckCircle2 className="w-12 h-12 text-green-500" />
                   </div>
                   <div>
                     <p className="text-lg font-medium text-white">Conversion Successful</p>
                     <p className="text-sm text-text-dim">Your high-fidelity Word document is ready.</p>
                   </div>
                </div>
              </div>

              {summary && (
                <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[24px] space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Gemini AI Summary
                  </h3>
                  <div className="text-text-dim leading-relaxed text-sm whitespace-pre-line">
                    {summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-surface border border-border rounded-[24px] space-y-6">
            <h3 className="font-semibold text-lg">AI Pro Actions</h3>
            
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">Adobe PDF Services</div>
                <div className="text-[10px] opacity-70">Official high-fidelity DOCX conversion</div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-white/5 opacity-50">
                <div className="font-bold text-sm">Gemini Analysis</div>
                <div className="text-[10px] opacity-70">Provides intelligent document summary</div>
              </div>
            </div>

            <p className="text-xs text-text-dim leading-relaxed">
              Adobe PDF Services will convert your PDF into a native Word file, preserving all formatting, images and tables perfectly. Gemini AI provides a high-level summary.
            </p>

            <button
              id="process-document-btn"
              disabled={!file || processing || !!result}
              onClick={handleDocumentProcess}
              className="w-full py-3 bg-accent-grad text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Start Pro Conversion</>
              )}
            </button>

            {result && (
              <button
                onClick={() => {setResult(null); setFile(null);}}
                className="w-full py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
              >
                Start New
              </button>
            )}

            {error && (
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
