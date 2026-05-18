import React, { useState } from 'react';
import { Search, Plus, FileText, Image as ImageIcon, Video, Mic, File, Folder, MoreHorizontal, Home, Clock, Settings, Cloud } from 'lucide-react';

const cx = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function App() {
  const [activeTab, setActiveTab] = useState('canvas');

  const files = [
    {
      id: 1,
      type: 'image',
      title: 'Voyage_Paris_01.jpg',
      subtitle: 'Image • 2.4 MB',
      image: '/__mockup/images/photo1.jpg',
      date: 'Aujourd\'hui',
    },
    {
      id: 2,
      type: 'note',
      title: 'Idées de projet.md',
      subtitle: 'Note • 12 KB',
      preview: 'Voici quelques réflexions sur la nouvelle architecture du produit...',
      date: 'Hier',
    },
    {
      id: 3,
      type: 'video',
      title: 'Demo_UI.mp4',
      subtitle: 'Vidéo • 45 MB',
      image: '/__mockup/images/video-thumb.jpg',
      date: 'Mercredi',
    },
    {
      id: 4,
      type: 'audio',
      title: 'Réunion_Client.m4a',
      subtitle: 'Audio • 15:23',
      date: 'Lundi',
    },
    {
      id: 5,
      type: 'pdf',
      title: 'Contrat_Freelance.pdf',
      subtitle: 'Fichier • 1.2 MB',
      date: 'Il y a 1 sem',
    }
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans text-white p-4">
      <div 
        style={{ width: 390, height: 844, overflow: 'hidden' }}
        className="relative bg-[#000000] rounded-[40px] border-[8px] border-[#1a1a1a] shadow-2xl flex flex-col ring-1 ring-white/10"
      >
        {/* iOS Status Bar Area */}
        <div className="h-12 w-full flex justify-between items-end px-6 pb-2 z-50">
          <span className="text-[15px] font-medium tracking-tight">9:41</span>
          <div className="flex gap-1.5 items-center mb-0.5">
            <div className="w-4 h-3 bg-white rounded-[2px]" />
            <div className="w-3.5 h-3 bg-white rounded-[2px]" />
            <div className="w-6 h-3 bg-white rounded-[2px]" />
          </div>
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between z-10 sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white/90">MyCloud</h1>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-sm">
            <img src="/__mockup/images/avatar.jpg" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar px-5">
          {/* Search */}
          <div className="mt-4 mb-6">
            <div className="bg-[#1c1c1e] flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner">
              <Search className="w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="bg-transparent border-none outline-none text-[17px] text-white placeholder:text-white/40 w-full"
              />
              <Mic className="w-5 h-5 text-white/40" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar pb-1">
            {['Tout', 'Images', 'Notes', 'Fichiers'].map((filter, i) => (
              <div 
                key={filter} 
                className={cx(
                  "px-4 py-1.5 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors",
                  i === 0 ? "bg-white text-black" : "bg-[#1c1c1e] text-white/70 border border-white/5"
                )}
              >
                {filter}
              </div>
            ))}
          </div>

          {/* Grid/Feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-white/90 mt-2">Récent</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Image Card - Large */}
              <div className="col-span-2 bg-[#1c1c1e] rounded-[24px] overflow-hidden border border-white/5 shadow-sm group">
                <div className="h-48 w-full relative">
                  <img src={files[0].image} alt="Photo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full">
                    <MoreHorizontal className="w-4 h-4 text-white/80" />
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-base font-semibold text-white drop-shadow-md">{files[0].title}</h3>
                    <p className="text-[13px] text-white/70 drop-shadow-sm">{files[0].subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Note Card */}
              <div className="col-span-1 bg-[#1c1c1e] rounded-[24px] p-4 border border-white/5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-white/40" />
                </div>
                <h3 className="text-[15px] font-medium text-white/90 leading-tight mb-1">{files[1].title}</h3>
                <p className="text-[13px] text-white/50 mb-3 line-clamp-2">{files[1].preview}</p>
                <div className="mt-auto">
                  <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{files[1].date}</span>
                </div>
              </div>

              {/* Video Card */}
              <div className="col-span-1 bg-[#1c1c1e] rounded-[24px] overflow-hidden border border-white/5 relative">
                <div className="h-full w-full absolute inset-0">
                  <img src={files[2].image} alt="Video" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative h-full flex flex-col p-4">
                  <div className="flex justify-between items-start mb-auto">
                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-20">
                    <h3 className="text-[15px] font-medium text-white leading-tight mb-0.5 drop-shadow-md">{files[2].title}</h3>
                    <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider drop-shadow-sm">{files[2].date}</span>
                  </div>
                </div>
              </div>

              {/* Audio Card */}
              <div className="col-span-2 bg-[#1c1c1e] rounded-[20px] p-4 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-medium text-white/90">{files[3].title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] text-white/50">{files[3].subtitle}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[13px] text-white/50">{files[3].date}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1" />
                </div>
              </div>

              {/* PDF Card */}
              <div className="col-span-2 bg-[#1c1c1e] rounded-[20px] p-4 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-medium text-white/90">{files[4].title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] text-white/50">{files[4].subtitle}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[13px] text-white/50">{files[4].date}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="absolute bottom-[92px] right-6 z-40">
          <button className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-white/20 hover:scale-105 transition-transform">
            <Plus className="w-7 h-7 text-black" />
          </button>
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-[#000000]/80 backdrop-blur-2xl border-t border-white/10 z-50 px-6 pb-6 pt-3 flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('canvas')}
            className={cx("flex flex-col items-center gap-1", activeTab === 'canvas' ? "text-white" : "text-white/40")}
          >
            <Folder className="w-6 h-6" fill={activeTab === 'canvas' ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Canvas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('recent')}
            className={cx("flex flex-col items-center gap-1", activeTab === 'recent' ? "text-white" : "text-white/40")}
          >
            <Clock className="w-6 h-6" fill={activeTab === 'recent' ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Récent</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={cx("flex flex-col items-center gap-1", activeTab === 'settings' ? "text-white" : "text-white/40")}
          >
            <Settings className="w-6 h-6" fill={activeTab === 'settings' ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Réglages</span>
          </button>
        </div>

        {/* iOS Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-1.5 bg-white rounded-full z-50" />
      </div>
    </div>
  );
}
