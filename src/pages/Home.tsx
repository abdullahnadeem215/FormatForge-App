import React from 'react';
import { motion } from 'motion/react';
import { 
  Image as ImageIcon, 
  Music, 
  Video, 
  FileText, 
  ArrowRight,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const converters = [
  {
    id: 'image',
    title: 'Image Converter',
    description: 'Convert between JPEG, PNG, WebP. Offline processing.',
    icon: <ImageIcon className="w-8 h-8" />,
    color: 'from-blue-500 to-cyan-500',
    path: '/convert/image'
  },
  {
    id: 'audio',
    title: 'Audio Pro',
    description: 'Convert between MP3, WAV, AAC, OGG, FLAC, M4A. Bitrate control.',
    icon: <Music className="w-8 h-8" />,
    color: 'from-purple-500 to-indigo-500',
    path: '/convert/audio'
  },
  {
    id: 'video-to-audio',
    title: 'Video Rip',
    description: 'Extract master-quality audio strings from any video file.',
    icon: <Video className="w-8 h-8" />,
    color: 'from-pink-500 to-rose-500',
    path: '/convert/video-to-audio'
  },
  {
    id: 'document',
    title: 'Document Pro',
    description: 'AI-powered PDF to Word with layout preservation.',
    icon: <FileText className="w-8 h-8" />,
    color: 'from-orange-500 to-amber-500',
    isAI: true,
    path: '/convert/document'
  }
];

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight">
            What are we <span className="text-white">forging</span> today?
          </h1>
          <p className="text-text-dim text-sm mt-2">
            Select a tool below to start converting your files.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-surface border border-border rounded-full text-xs">
          <div className="w-6 h-6 rounded-full bg-accent-grad" />
          <span>Pro Member</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {converters.map((converter, idx) => (
          <Link key={converter.id} to={converter.path}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative p-8 bg-surface border border-border rounded-[24px] overflow-hidden cursor-pointer hover:border-purple-500/40 transition-colors"
            >
              {converter.isAI ? (
                <span className="absolute top-6 right-6 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Gemini 2.5 Flash
                </span>
              ) : (
                <span className="absolute top-6 right-6 px-2.5 py-1 bg-text-dim/5 border border-text-dim/20 rounded-md text-[10px] font-bold text-text-dim uppercase tracking-wider">
                  Offline
                </span>
              )}
              
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-2xl">
                  {converter.icon}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{converter.title}</h3>
                  <p className="text-text-dim text-xs leading-relaxed">
                    {converter.description}
                  </p>
                </div>

                <button className="w-full py-2.5 bg-accent-grad border-none rounded-lg text-white font-semibold text-sm cursor-pointer">
                  {converter.isAI ? 'Start AI Conversion' : 'Open Converter'}
                </button>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

import { cn } from '../lib/utils';
