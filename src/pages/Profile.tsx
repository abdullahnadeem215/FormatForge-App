import React from 'react';
import { motion } from 'motion/react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Zap, Shield, Mail, Calendar, Crown } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile({ user }: { user: SupabaseUser }) {
  const meta = user.user_metadata;
  const displayName = meta.full_name || user.email?.split('@')[0];
  const photoURL = meta.avatar_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-12"
    >
      <header className="text-center space-y-6">
        <div className="relative inline-block">
          {photoURL ? (
            <img 
              src={photoURL} 
              alt={displayName || 'User'} 
              className="w-32 h-32 rounded-full border-4 border-border p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-accent-grad flex items-center justify-center text-4xl font-bold">
              {displayName?.[0]}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 p-2 bg-accent-grad rounded-full shadow-lg">
            <Crown className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight">{displayName}</h1>
          <p className="text-text-dim">{user.email}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="p-8 bg-surface border border-border rounded-[24px] space-y-8">
          <h3 className="text-lg font-semibold border-b border-border pb-4">Account Details</h3>
          
          <div className="space-y-6">
            <DetailItem 
              icon={<Mail className="w-5 h-5 text-purple-400" />} 
              label="Email Address" 
              value={user.email || 'Not provided'} 
            />
            <DetailItem 
              icon={<Shield className="w-5 h-5 text-purple-400" />} 
              label="Account Status" 
              value="Verified" 
            />
            <DetailItem 
              icon={<Calendar className="w-5 h-5 text-purple-400" />} 
              label="Joined" 
              value={user.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'Recently'} 
            />
            <DetailItem 
              icon={<Zap className="w-5 h-5 text-purple-400" />} 
              label="Subscription" 
              value="Pro Plan (Beta Access)" 
            />
          </div>
        </div>

        <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[24px] text-center space-y-4">
          <h3 className="text-lg font-semibold">You're a Pro Member!</h3>
          <p className="text-text-dim text-sm">
            Enjoy unlimited AI document reconstructions and high-speed audio/video processing.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">{label}</p>
        <p className="text-base font-medium">{value}</p>
      </div>
    </div>
  );
}
