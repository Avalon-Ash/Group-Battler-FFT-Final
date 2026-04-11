
import React, { useState } from 'react';
import { VFX_LIBRARY, VFXEntry } from '../../../data/vfx/vfx_library';
import { Icons } from '../../ui/icons';

export const VFXMapTab: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<keyof typeof VFX_LIBRARY>('PROCEDURAL_GEOMETRY');

    const renderList = (list: VFXEntry[], themeColor: string) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((item, idx) => (
                <div key={idx} className="liquid-card p-4 !bg-white/[0.03] border border-white/5 hover:border-white/20 hover:!bg-white/[0.06] transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <h3 className={`font-bold text-sm ${themeColor} tracking-wide truncate pr-2`}>{item.name}</h3>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 select-all">{item.key}</span>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/10 ${themeColor} opacity-50 group-hover:opacity-100 transition-opacity shrink-0`}>
                            <Icons.VFX className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-3 border-l-2 border-white/10 pl-2 leading-relaxed h-10 line-clamp-2">
                        {item.desc}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                        {item.visuals.map((vis, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
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
                    <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Visual Effects Matrix</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">Registry v9.3 Compatible</div>
                    </div>
                    <div className="text-[10px] font-mono text-purple-400/80 bg-purple-950/30 px-2 py-1 rounded-md border border-purple-500/20">
                        SYSTEM REFERENCE
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap bg-black/40 p-1 gap-1 rounded-xl border border-white/5">
                    <button onClick={() => setActiveCategory('PROCEDURAL_GEOMETRY')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'PROCEDURAL_GEOMETRY' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Geometry</button>
                    <button onClick={() => setActiveCategory('CORE_SEQUENCES')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'CORE_SEQUENCES' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Sequences</button>
                    <button onClick={() => setActiveCategory('ACTION_VERBS')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'ACTION_VERBS' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Verbs</button>
                    <button onClick={() => setActiveCategory('IMPERIAL_FLAVOR')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'IMPERIAL_FLAVOR' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-blue-400'}`}>Imperial</button>
                    <button onClick={() => setActiveCategory('COVENANT_FLAVOR')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'COVENANT_FLAVOR' ? 'bg-red-600/30 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-red-400'}`}>Covenant</button>
                    <button onClick={() => setActiveCategory('STATUS_EFFECTS')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'STATUS_EFFECTS' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-amber-400'}`}>Status</button>
                    <button onClick={() => setActiveCategory('BATTLE_ROYALE')} className={`flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all uppercase tracking-wider ${activeCategory === 'BATTLE_ROYALE' ? 'bg-orange-600/30 text-orange-300 border border-orange-500/30' : 'text-slate-500 hover:text-orange-400'}`}>Survival</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {renderList(VFX_LIBRARY[activeCategory], 
                    activeCategory.includes('IMPERIAL') ? 'text-blue-400' : 
                    activeCategory.includes('COVENANT') ? 'text-red-400' : 
                    activeCategory === 'STATUS_EFFECTS' ? 'text-amber-400' :
                    activeCategory === 'BATTLE_ROYALE' ? 'text-orange-400' :
                    activeCategory === 'PROCEDURAL_GEOMETRY' ? 'text-emerald-400' : 'text-slate-200'
                )}
            </div>
        </div>
    );
};
