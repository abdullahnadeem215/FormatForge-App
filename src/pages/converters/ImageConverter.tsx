import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, File, X, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import { convertImage } from '../../services/converters/image';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';

const FORMATS = ['png', 'jpg', 'webp'];

export default function ImageConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [converting, setConverting] = useState(false);
  const [outputFormat, setOutputFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [results, setResults] = useState<{ name: string, blob: Blob, url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'] }
  } as any);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageConvert = async () => {
    if (files.length === 0) return;
    setConverting(true);
    setError(null);
    const newResults: typeof results = [];

    try {
      for (const file of files) {
        const blob = await convertImage(file, outputFormat, quality / 100);
        const url = URL.createObjectURL(blob);
        const name = file.name.substring(0, file.name.lastIndexOf('.')) + '.' + outputFormat;
        newResults.push({ name, blob, url });

        // Save to history
        if (auth.currentUser) {
          try {
            await addDoc(collection(db, 'conversions'), {
              uid: auth.currentUser.uid,
              type: 'image',
              inputFormat: file.name.split('.').pop(),
              outputFormat,
              inputSize: file.size,
              outputSize: blob.size,
              createdAt: serverTimestamp(),
              status: 'completed',
              fileName: name
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'conversions');
          }
        }
      }
      setResults(newResults);
      setFiles([]);
    } catch (err) {
      setError('Conversion failed. Please try again.');
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  const downloadAll = () => {
    results.forEach(res => {
      const a = document.createElement('a');
      a.href = res.url;
      a.download = res.name;
      a.click();
    });
  };

  return (
    <motion.div
      id="image-converter-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="space-y-2">
        <h2 className="text-3xl font-light tracking-tight">Image Converter</h2>
        <p className="text-text-dim text-sm">Convert your images to PNG, JPG, or WebP with adjustable quality.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Dropzone */}
          <div 
            id="image-drop-zone"
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-[24px] p-12 text-center transition-all cursor-pointer",
              isDragActive ? "border-purple-500 bg-purple-500/5" : "border-border hover:border-white/20 bg-surface"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl">
                <Upload className="w-8 h-8 text-text-dim" />
              </div>
              <div>
                <p className="text-lg font-medium">Click or drag images here</p>
                <p className="text-sm text-text-dim">Supports PNG, JPG, WebP, HEIC</p>
              </div>
            </div>
          </div>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Converted Files
                </h3>
                <button onClick={downloadAll} className="text-sm font-bold text-pink-500 hover:text-pink-400">
                  Download All
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((res, idx) => (
                  <div key={idx} className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{res.name}</span>
                    <a href={res.url} download={res.name} className="p-2 hover:bg-green-500/10 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-green-500" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="p-6 bg-surface border border-border rounded-[24px] space-y-6">
            <h3 className="font-semibold text-lg">Settings</h3>
            
            <div className="space-y-3">
              <label className="text-sm text-text-dim font-medium">Output Format</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setOutputFormat(f)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-bold transition-all",
                      outputFormat === f ? "bg-accent-grad text-white" : "bg-white/5 text-text-dim hover:bg-white/10"
                    )}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="text-text-dim font-medium">Quality</label>
                <span className="text-white font-bold">{quality}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <button
              id="convert-image-btn"
              disabled={files.length === 0 || converting}
              onClick={handleImageConvert}
              className="w-full py-3 bg-accent-grad text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>Convert Now</>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import { cn } from '../../lib/utils';
