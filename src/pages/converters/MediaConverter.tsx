import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { 
  Music, 
  Video, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Loader2, 
  Settings2,
  Zap
} from 'lucide-react';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { 
  SUPPORTED_AUDIO_FORMATS, 
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_OUTPUT_AUDIO_FORMATS,
  buildAudioConversionCommand,
  buildVideoToAudioCommand,
} from '../../utils/ffmpegCommands';
import { saveConversion } from '../../utils/storage';
import { cn } from '../../lib/utils';
import { fetchFile } from '@ffmpeg/util';

type ConversionType = 'audio-to-audio' | 'video-to-audio';

export default function MediaConverter() {
  const location = useLocation();
  const { ffmpeg, loaded, isLoading: engineLoading, loadingProgress, error: ffmpegError } = useFFmpeg();
  
  const [conversionType, setConversionType] = useState<ConversionType>(
    location.pathname.includes('video') ? 'video-to-audio' : 'audio-to-audio'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('192k');
  const [sampleRate, setSampleRate] = useState('44100');
  const [channels, setChannels] = useState('2');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string, url: string, blob: Blob } | null>(null);
  
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };
  
  const handleConvert = async () => {
    if (!selectedFile || !ffmpeg || !loaded) return;
    
    setIsConverting(true);
    setConversionProgress(0);
    setError(null);
    
    try {
      ffmpeg.on('progress', ({ progress }) => {
        setConversionProgress(Math.round(progress * 100));
      });
      
      const inputExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      const inputFileName = `input${inputExt}`;
      const outputFileName = `output.${outputFormat}`;
      
      // Write file to FFmpeg's virtual file system
      await ffmpeg.writeFile(inputFileName, await fetchFile(selectedFile));
      
      let args: string[];
      if (conversionType === 'audio-to-audio') {
        args = buildAudioConversionCommand(inputFileName, outputFileName, {
          outputFormat,
          bitrate,
          sampleRate,
          channels: parseInt(channels),
        });
      } else {
        args = buildVideoToAudioCommand(inputFileName, outputFileName, {
          outputFormat,
          bitrate,
          sampleRate,
          channels: parseInt(channels),
        });
      }
      
      await ffmpeg.exec(args);
      
      const data = await ffmpeg.readFile(outputFileName);
      const mime = SUPPORTED_OUTPUT_AUDIO_FORMATS.find(f => f.value === outputFormat)?.mime || 'audio/mpeg';
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const name = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) + '.' + outputFormat;
      
      setResult({ name, url, blob });
      
      // Save history locally
      saveConversion({
        type: conversionType === 'audio-to-audio' ? 'audio' : 'video',
        input_format: inputExt.substring(1),
        output_format: outputFormat,
        input_size: selectedFile.size,
        output_size: blob.size,
        status: 'completed',
        file_name: name
      });
      
      // Cleanup
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
      
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err instanceof Error ? err.message : 'Media conversion failed');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
      ffmpeg.on('progress', () => {});
    }
  };

  const currentOutputFormat = SUPPORTED_OUTPUT_AUDIO_FORMATS.find(f => f.value === outputFormat);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-2">
          <Zap className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">WASM Powered</span>
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight">Media Master</h2>
        <p className="text-text-dim text-sm max-w-lg mx-auto">
          High-performance, 100% offline audio & video conversion. Your files never leave your device.
        </p>
      </header>

      {!loaded && !ffmpegError && (
        <div className="p-8 bg-surface border border-border rounded-[32px] text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
            <div 
              className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" 
              style={{ animationDuration: '0.8s' }}
            />
          </div>
          <div>
            <h4 className="font-bold">Igniting the Engine</h4>
            <p className="text-xs text-text-dim">Loading WebAssembly modules... {loadingProgress}%</p>
          </div>
        </div>
      )}

      {ffmpegError && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[24px] flex items-center gap-4 text-red-500">
          <AlertCircle className="w-6 h-6" />
          <div className="text-left">
            <p className="font-bold">Engine Failure</p>
            <p className="text-xs opacity-80">{ffmpegError}</p>
          </div>
        </div>
      )}

      {loaded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Conversion Type Selector */}
            <div className="flex p-1 bg-surface border border-border rounded-2xl">
              <button
                onClick={() => {setConversionType('audio-to-audio'); setResult(null); setSelectedFile(null);}}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  conversionType === 'audio-to-audio' ? "bg-accent-grad text-white shadow-lg" : "text-text-dim hover:text-white"
                )}
              >
                <Music className="w-4 h-4" />
                Audio Pro
              </button>
              <button
                onClick={() => {setConversionType('video-to-audio'); setResult(null); setSelectedFile(null);}}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  conversionType === 'video-to-audio' ? "bg-accent-grad text-white shadow-lg" : "text-text-dim hover:text-white"
                )}
              >
                <Video className="w-4 h-4" />
                Video Rip
              </button>
            </div>

            {/* Drop Zone */}
            {!selectedFile ? (
              <label 
                className="block border-2 border-dashed border-border rounded-[32px] p-16 text-center hover:border-purple-500 transition-all bg-surface cursor-pointer group"
              >
                <input type="file" onChange={onFileSelect} className="hidden" 
                  accept={conversionType === 'audio-to-audio' ? 'audio/*' : 'video/*'} 
                />
                <div className="flex flex-col items-center gap-6">
                  <div className="p-6 bg-white/5 rounded-3xl group-hover:scale-110 transition-transform">
                    {conversionType === 'audio-to-audio' ? (
                      <Music className="w-12 h-12 text-purple-400" />
                    ) : (
                      <Video className="w-12 h-12 text-pink-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Select {conversionType === 'audio-to-audio' ? 'Audio' : 'Video'} source</h3>
                    <p className="text-sm text-text-dim mt-2">
                       {conversionType === 'audio-to-audio' 
                        ? 'MP3, WAV, OGG, AAC, FLAC, M4A up to 50MB'
                        : 'MP4, WebM, MKV, AVI, MOV up to 200MB'}
                    </p>
                  </div>
                </div>
              </label>
            ) : (
              <div className="space-y-6">
                {/* Selected File Card */}
                <div className="p-6 bg-surface border border-border rounded-[24px] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl">
                      {conversionType === 'audio-to-audio' ? <Music className="w-6 h-6 text-purple-400" /> : <Video className="w-6 h-6 text-pink-400" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm truncate max-w-[200px]">{selectedFile.name}</h4>
                      <p className="text-[10px] text-text-dim uppercase tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • READY</p>
                    </div>
                  </div>
                  {!isConverting && !result && (
                    <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-text-dim" />
                    </button>
                  )}
                </div>

                {/* Status or Result */}
                <AnimatePresence>
                  {isConverting && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[24px] space-y-6 text-center"
                    >
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" 
                            className="text-purple-500 transition-all duration-300"
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={2 * Math.PI * 36 * (1 - conversionProgress / 100)}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold">
                          {conversionProgress}%
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm font-bold animate-pulse">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Processing Bits & Bytes...
                      </div>
                    </motion.div>
                  )}

                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 bg-green-500/5 border border-green-500/20 rounded-[24px] space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <h4 className="font-bold text-lg">Mission Complete</h4>
                        </div>
                        <button onClick={() => {setResult(null); setSelectedFile(null);}} className="text-xs font-bold text-text-dim hover:text-white uppercase tracking-widest transition-colors">
                           Start New
                        </button>
                      </div>
                      
                      <div className="bg-black/20 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{result.name}</span>
                          <span className="text-xs text-text-dim">{(result.blob.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <audio src={result.url} controls className="w-full h-10 filter invert opacity-80" />
                        <button 
                          onClick={() => {
                            const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click();
                          }}
                          className="w-full py-4 bg-green-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                        >
                          <Download className="w-5 h-5" /> Download Master
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Sidebar Settings */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-surface border border-border rounded-[24px] space-y-6 sticky top-8">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-400" />
                Output Config
              </h3>

              <div className="space-y-6">
                {/* Format Radio Grid */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-3 block">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_OUTPUT_AUDIO_FORMATS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setOutputFormat(f.value)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold transition-all border",
                          outputFormat === f.value 
                            ? "border-purple-500 bg-purple-500/10 text-white" 
                            : "border-border bg-white/5 text-text-dim hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bitrate Control */}
                {['mp3', 'aac', 'ogg', 'm4a'].includes(outputFormat) && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-3 block">Bitrate: {bitrate}</label>
                    <input 
                      type="range" min="64" max="320" step="64" value={parseInt(bitrate)}
                      onChange={(e) => setBitrate(`${e.target.value}k`)}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[8px] text-text-dim font-bold mt-2">
                      <span>LOW-RES</span>
                      <span>HIGH-FIDELITY</span>
                    </div>
                  </div>
                )}

                {/* Advanced Selects */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-2 block">Sample</label>
                     <select 
                      value={sampleRate} onChange={(e) => setSampleRate(e.target.value)}
                      className="w-full bg-white/5 border border-border rounded-xl p-3 text-[10px] font-bold appearance-none hover:bg-white/10 transition-colors focus:ring-1 focus:ring-purple-500 outline-none"
                     >
                        <option value="44100">44.1 kHz</option>
                        <option value="48000">48.0 kHz</option>
                        <option value="96000">96.0 kHz</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-2 block">Channels</label>
                     <select 
                      value={channels} onChange={(e) => setChannels(e.target.value)}
                      className="w-full bg-white/5 border border-border rounded-xl p-3 text-[10px] font-bold appearance-none hover:bg-white/10 transition-colors focus:ring-1 focus:ring-purple-500 outline-none"
                     >
                        <option value="1">Mono</option>
                        <option value="2">Stereo</option>
                     </select>
                  </div>
                </div>
              </div>

              <button
                disabled={!selectedFile || isConverting || !!result}
                onClick={handleConvert}
                className="w-full py-4 bg-accent-grad text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isConverting ? 'Synthesizing...' : 'Process Audio'}
              </button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
