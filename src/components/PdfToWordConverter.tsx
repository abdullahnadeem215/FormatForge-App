
import React, { useState, useCallback } from 'react';
import { usePdfToWord } from '../hooks/usePdfToWord';

export function PdfToWordConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isConverting, progress, error, downloadUrl, convertPdfToWord, download, reset } = usePdfToWord();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setSelectedFile(file);
    else alert('Please drop a PDF file');
  }, []);

  const handleConvert = async () => {
    if (!selectedFile) return;
    await convertPdfToWord(selectedFile);
  };

  const handleDownload = () => {
    if (selectedFile && downloadUrl) {
      download(selectedFile.name.replace('.pdf', '.docx'));
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <h1 className="text-2xl font-bold text-white text-center">PDF to Word Converter</h1>
          <p className="text-purple-100 text-center mt-2">Preserves text, images, and tables • Powered by iLovePDF</p>
        </div>

        <div className="p-6">
          {!selectedFile && !isConverting && !downloadUrl && (
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('pdf-input')?.click()}
                 className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-gray-600">Drop PDF here or click to select</p>
              <p className="text-sm text-gray-400 mt-1">PDF only • Up to 50MB • Preserves all formatting</p>
              <input id="pdf-input" type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
            </div>
          )}

          {selectedFile && !isConverting && !downloadUrl && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div><p className="font-medium">{selectedFile.name}</p><p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                <div className="flex gap-2">
                  <button onClick={handleConvert} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">Convert to Word</button>
                  <button onClick={handleReset} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Remove</button>
                </div>
              </div>
            </div>
          )}

          {isConverting && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-1"><span>Converting...</span><span>{progress}%</span></div>
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden"><div className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-gray-400 text-center mt-2">Processing may take 15-30 seconds</p>
            </div>
          )}

          {downloadUrl && !isConverting && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-green-800">✅ Conversion Complete!</p><p className="text-sm text-green-600">Your Word document is ready</p></div>
                <div className="flex gap-2">
                  <button onClick={handleDownload} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Download DOCX</button>
                  <button onClick={handleReset} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Convert Another</button>
                </div>
              </div>
            </div>
          )}

          {error && <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">❌ {error}</div>}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t"><p className="text-xs text-gray-500 text-center">🔒 Powered by iLovePDF - Your file is processed securely</p></div>
      </div>
    </div>
  );
}
