import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, File, X, CheckCircle2, AlertCircle, Download, Loader2, FileText, Zap } from 'lucide-react';
import { reconstructDocument, summarizeDocument } from '../../services/gemini';
import { saveConversion } from '../../utils/storage';
import { saveAs } from 'file-saver';

export default function DocumentConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'gemini' | 'ilovepdf'>('ilovepdf');
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const handleDocumentProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setSummary(null);
    setIsEditing(false);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      let conversionResult: any = null;
      let ilovePdfBlob: Blob | null = null;
      let docUrl = '';

      if (method === 'ilovepdf') {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/convert/ilovepdf-to-docx', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = 'iLovePDF conversion failed';
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

        ilovePdfBlob = await response.blob();
        docUrl = URL.createObjectURL(ilovePdfBlob);

        // Still get editable content for preview
        const reconstruction = await reconstructDocument(base64, file.type);
        conversionResult = {
          ...reconstruction,
          isILovePdf: true,
          docUrl,
          name: file.name.substring(0, file.name.lastIndexOf('.')) + '.docx'
        };
      } else {
        // Simple Gemini Markdown
        const reconstruction = await reconstructDocument(base64, file.type);
        conversionResult = reconstruction;
      }

      setResult(conversionResult);
      setEditableContent(conversionResult.content);

      // Always get a summary using Gemini
      const sum = await summarizeDocument(conversionResult.content);
      setSummary(sum);

      // Save to history locally
      const finalBlob = ilovePdfBlob || new Blob([conversionResult.content], { type: 'text/markdown' });
      saveConversion({
        type: 'document',
        input_format: file.name.split('.').pop() || '',
        output_format: method === 'ilovepdf' ? 'docx' : 'md',
        input_size: file.size,
        output_size: finalBlob.size,
        status: 'completed',
        file_name: conversionResult.name || (file.name.substring(0, file.name.lastIndexOf('.')) + (method === 'ilovepdf' ? '.docx' : '.md'))
      }, finalBlob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed. Ensure the file is clear and valid.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadModified = () => {
    const blob = new Blob([editableContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited_document.md';
    a.click();
  };

  const downloadOriginal = () => {
    if (!result) return;
    if (result.isILovePdf && result.docUrl) {
      const a = document.createElement('a');
      a.href = result.docUrl;
      a.download = result.name || 'document.docx';
      a.click();
      return;
    }
    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'original_reconstruction.md';
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
            {method === 'gemini' ? 'Gemini 2.5 Flash' : 'iLovePDF Pro'}
          </span>
        </div>
        <p className="text-text-dim text-sm">Advanced AI reconstruction of documents from images or PDFs. Preserves layout, tables, and formatting entirely client-side.</p>
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
                  <p className="text-lg font-medium">Upload a document or image</p>
                  <p className="text-sm text-text-dim">Supports PDF, PNG, JPG</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-surface border border-border rounded-[24px] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {result.isILovePdf ? 'Document Analysis' : 'AI Reconstruction'}
                  </h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsEditing(!isEditing)} 
                      className={cn(
                        "text-sm font-bold transition-colors",
                        isEditing ? "text-green-500" : "text-purple-400"
                      )}
                    >
                      {isEditing ? '✓ View Preview' : '✎ Edit Document'}
                    </button>
                    <div className="flex items-center gap-2">
                       <button onClick={downloadOriginal} className="flex items-center gap-2 text-sm font-bold text-text-dim hover:text-white transition-colors">
                        <Download className="w-4 h-4" /> {result.isILovePdf ? 'Get DOCX' : 'Get Markdown'}
                      </button>
                      {isEditing && (
                        <button onClick={downloadModified} className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                          <Download className="w-4 h-4" /> Save Edited
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  {isEditing ? (
                    <textarea
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      className="w-full h-[400px] bg-black/40 p-6 rounded-xl border border-purple-500/30 font-mono text-sm focus:outline-none focus:border-purple-500 resize-none"
                      placeholder="Edit document content..."
                    />
                  ) : (
                    <div className="prose prose-invert max-w-none bg-black/20 p-6 rounded-xl border border-border max-h-[400px] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                      {editableContent || result.content}
                    </div>
                  )}
                  {result.isILovePdf && !isEditing && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-green-500/20 text-green-400 rounded text-[10px] uppercase font-bold tracking-widest pointer-events-none">
                      {result.isILovePdf ? 'Professional PDF Conversion' : 'High-Fidelity Reconstruction'}
                    </div>
                  )}
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
            <h3 className="font-semibold text-lg">AI Actions</h3>
            
            <div className="space-y-3">
              <label className="text-xs text-text-dim font-bold uppercase tracking-widest">Processing Method</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setMethod('gemini')}
                  className={cn(
                    "p-3 rounded-xl text-left border transition-all",
                    method === 'gemini' ? "border-purple-500 bg-purple-500/5" : "border-border bg-white/5 text-text-dim"
                  )}
                >
                  <div className="font-bold text-sm">Gemini AI</div>
                  <div className="text-[10px] opacity-70">Best for layout reconstruction & summary</div>
                </button>
                <button
                  onClick={() => setMethod('ilovepdf')}
                  className={cn(
                    "p-3 rounded-xl text-left border transition-all",
                    method === 'ilovepdf' ? "border-purple-500 bg-purple-500/5" : "border-border bg-white/5 text-text-dim"
                  )}
                >
                  <div className="font-bold text-sm">iLovePDF (Pro)</div>
                  <div className="text-[10px] opacity-70">Best for complex layouts & images</div>
                </button>
              </div>
            </div>

            <p className="text-xs text-text-dim leading-relaxed">
              {method === 'gemini' 
                ? 'Gemini 2.5 Flash will analyze your document to extract text, tables, and maintain formatting.'
                : 'iLovePDF Pro will convert your document into a pixel-perfect Word file, preserving all images and tables.'}
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
                <>Start {method === 'gemini' ? 'AI Reconstruction' : 'iLovePDF Conversion'}</>
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

import { cn } from '../../lib/utils';
