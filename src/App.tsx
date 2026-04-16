import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  Navigate 
} from 'react-router-dom';
import { 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Video, 
  History, 
  User, 
  LogOut, 
  Menu, 
  X,
  Zap,
  ChevronRight
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './lib/firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Home from './pages/Home';
import HistoryPage from './pages/History';
import Profile from './pages/Profile';
import ImageConverter from './pages/converters/ImageConverter';
import AudioConverter from './pages/converters/AudioConverter';
import VideoToAudio from './pages/converters/VideoToAudio';
import DocumentConverter from './pages/converters/DocumentConverter';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Zap className="w-12 h-12 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center p-4 text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-accent-grad rounded-2xl shadow-2xl shadow-purple-500/20">
              <Zap className="w-16 h-16 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-accent-grad">
              FormatForge Pro
            </h1>
            <p className="text-text-dim text-lg">
              The ultimate AI-powered file conversion suite.
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group"
          >
            Get Started with Google
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-xs text-white/20">
            Made by MAAHHHA-GROUP
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-bg-deep text-white flex">
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 bg-bg-deep border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-full flex flex-col p-10">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-xl font-extrabold tracking-tighter bg-accent-grad bg-clip-text text-transparent">FORMATFORGE PRO</span>
            </div>

            <nav className="flex-1 space-y-1">
              <SidebarLink to="/" icon={<ImageIcon className="w-4 h-4" />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/history" icon={<History className="w-4 h-4" />} label="History" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/profile" icon={<User className="w-4 h-4" />} label="Profile" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="pt-6 border-t border-border">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full p-3 text-text-dim hover:text-white transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
              <div className="mt-4 text-[10px] text-white/20 text-center">Made by MAAHHHA-GROUP</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto">
          <div className="max-w-5xl mx-auto p-10">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<Profile user={user} />} />
                <Route path="/convert/image" element={<ImageConverter />} />
                <Route path="/convert/audio" element={<AudioConverter />} />
                <Route path="/convert/video-to-audio" element={<VideoToAudio />} />
                <Route path="/convert/document" element={<DocumentConverter />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </div>
          
          <footer className="p-12 text-center text-gray-600 text-sm">
            Made by MAAHHHA-GROUP
          </footer>
        </main>
      </div>
    </Router>
  );
}

function SidebarLink({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 py-3 transition-all duration-200 text-sm",
        isActive 
          ? "text-white font-semibold" 
          : "text-text-dim hover:text-white"
      )}
    >
      {isActive && <div className="w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] mr-1" />}
      {icon}
      <span>{label}</span>
    </Link>
  );
}
