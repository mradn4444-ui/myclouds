import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Settings, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  MoreHorizontal, 
  Maximize2, 
  Play, 
  Cloud,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function Desktop() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Background style for the dot grid
  const gridStyle = {
    backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    backgroundColor: '#09090b', // zinc-950
  };

  return (
    <div className="h-screen w-full flex flex-col text-zinc-100 overflow-hidden font-sans selection:bg-white/10" style={gridStyle}>
      {/* Top App Bar */}
      <header className="flex-none h-14 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/10 shadow-sm">
            <Cloud className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">MyCloud</span>
            <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-semibold">Mode Local</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="h-9 w-64 bg-zinc-900/50 border border-white/5 rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-full">
            <Plus className="w-5 h-5" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1"></div>
          <Avatar className="w-8 h-8 border border-white/10">
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400">MC</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* Floating Toolbar (Bottom Center) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-1 pr-2 border-r border-white/10">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/10">
              <FileText className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/10">
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/10">
              <FolderOpen className="w-5 h-5" />
            </Button>
          </div>
          <div className="pl-2 px-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Dépose tes fichiers ici</span>
          </div>
        </div>

        {/* --- Canvas Elements --- */}
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing">

          {/* Note Card */}
          <div 
            className={cn(
              "absolute top-[15%] left-[20%] w-[320px] rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-xl transition-all duration-200 cursor-default flex flex-col group",
              activeCard === 'note' ? "ring-1 ring-white/20 shadow-2xl shadow-black z-40" : "z-10 hover:border-white/20"
            )}
            onClick={(e) => { e.stopPropagation(); setActiveCard('note'); }}
          >
            <div className="h-10 flex items-center justify-between px-3 border-b border-white/5 cursor-move">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">Idées de projet</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-zinc-200 mb-2">Refonte Architecture</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Il faut revoir la façon dont nous gérons l'état du canvas. Peut-être passer sur Zustand pour éviter les re-renders inutiles sur les gros boards.
                <br /><br />
                Aussi, penser à l'intégration du mode offline-first.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border border-white/5 font-normal text-[10px] px-2 py-0.5">dev</Badge>
                <Badge variant="secondary" className="bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border border-white/5 font-normal text-[10px] px-2 py-0.5">urgent</Badge>
              </div>
            </div>
            {/* Minimal resize handle */}
            <div className="absolute bottom-1 right-1 w-3 h-3 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 12 12" className="w-full h-full text-zinc-600" fill="none" stroke="currentColor"><path d="M10 2v8H2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Image Card */}
          <div 
            className={cn(
              "absolute top-[25%] left-[55%] w-[400px] rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-xl transition-all duration-200 cursor-default flex flex-col overflow-hidden group",
              activeCard === 'image' ? "ring-1 ring-white/20 shadow-2xl shadow-black z-40" : "z-20 hover:border-white/20"
            )}
            onClick={(e) => { e.stopPropagation(); setActiveCard('image'); }}
          >
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/40 backdrop-blur-md rounded-md px-2 py-1 flex items-center gap-1.5 border border-white/10 cursor-move">
                <ImageIcon className="w-3 h-3 text-zinc-300" />
                <span className="text-[10px] font-medium text-zinc-200">reference_ui.png</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-black/40 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <div className="aspect-[4/3] w-full bg-zinc-800 relative group-hover:after:absolute group-hover:after:inset-0 group-hover:after:bg-black/10 transition-colors">
              <img 
                src="/__mockup/images/reference_ui.jpg" 
                alt="Minimalist workspace"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Audio Player Card */}
          <div 
            className={cn(
              "absolute top-[65%] left-[35%] w-[280px] rounded-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-200 cursor-default flex items-center p-2 group",
              activeCard === 'audio' ? "ring-1 ring-white/20 shadow-2xl shadow-black z-40" : "z-30 hover:border-white/20"
            )}
            onClick={(e) => { e.stopPropagation(); setActiveCard('audio'); }}
          >
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-white text-black hover:bg-zinc-200 shrink-0 shadow-sm">
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            </Button>
            <div className="flex-1 min-w-0 px-3 cursor-move">
              <p className="text-sm font-medium text-zinc-200 truncate">Vocal_004.m4a</p>
              <p className="text-[10px] text-zinc-500">1:14 • Hier à 14:30</p>
            </div>
            
            {/* Mini waveform visualization */}
            <div className="flex items-center gap-[2px] pr-4 h-5">
              {[4, 8, 12, 16, 10, 6, 14, 18, 12, 8].map((h, i) => (
                <div key={i} className="w-1 bg-zinc-600 rounded-full" style={{ height: `${h}px` }}></div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default Desktop;