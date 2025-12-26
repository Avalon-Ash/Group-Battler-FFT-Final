
import React, { useState } from 'react';
import { VFX_LIBRARY, VFXEntry } from '../../../data/vfx_library';
import { Icons } from '../../ui/icons';

export const VFXMapTab: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<'GENERIC' | 'ULT_BLUE' | 'ULT_RED' | 'STATUS'>('GENERIC');

    const renderList = (list: VFXEntry[], themeColor: string) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((item, idx) => (
                <div key={idx} className="liquid-card p-4 !bg-white/[0.03] border border-white/5 hover:border-white/20 hover:!bg-white/[0.06] transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <h3 className={`font-bold text-sm ${themeColor} tracking-wide`}>{item.name}</h3>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{item.key}</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/10 ${themeColor} opacity-50 group-hover:opacity-100 transition-opacity`}>
                            <Icons.VFX className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-3 border-l-2 border-white/10 pl-2 leading-relaxed h-10 line-clamp-2">
                        {item.desc}
                    </p>

                    <div className="space-y-1.5">
                        {item.visuals.map((vis, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-2 text-[11px] text-slate-300 bg-black/20 px-2 py-1 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                {vis}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header Controls */}
            <div className="p-5 border-b border-white/5 shrink-0 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Visual Effects Matrix</div>
                    <div className="text-[10px] font-mono text-purple-400/80 bg-purple-950/30 px-2 py-1 rounded-md border border-purple-500/20">
                        SYSTEM REFERENCE
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/40 p-1 gap-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setActiveCategory('GENERIC')} 
                        className={`flex-1 py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'GENERIC' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Generic
                    </button>
                    <button 
                        onClick={() => setActiveCategory('ULT_BLUE')} 
                        className={`flex-1 py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'ULT_BLUE' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-blue-400'}`}
                    >
                        Imperial (Ult)
                    </button>
                    <button 
                        onClick={() => setActiveCategory('ULT_RED')} 
                        className={`flex-1 py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'ULT_RED' ? 'bg-red-600/30 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-red-400'}`}
                    >
                        Covenant (Ult)
                    </button>
                    <button 
                        onClick={() => setActiveCategory('STATUS')} 
                        className={`flex-1 py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'STATUS' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-amber-400'}`}
                    >
                        Status
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeCategory === 'GENERIC' && renderList(VFX_LIBRARY.GENERIC, 'text-slate-200')}
                {activeCategory === 'ULT_BLUE' && renderList(VFX_LIBRARY.ULT_BLUE, 'text-blue-400')}
                {activeCategory === 'ULT_RED' && renderList(VFX_LIBRARY.ULT_RED, 'text-red-400')}
                {activeCategory === 'STATUS' && renderList(VFX_LIBRARY.STATUS, 'text-amber-400')}
            </div>
        </div>
    );
};
