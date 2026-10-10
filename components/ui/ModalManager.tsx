
import React from 'react';
import { GameEngine } from '../../engine/game';
import { SkillDbTab } from '../inspector/tabs/SkillDbTab';
import { VFXMapTab } from '../inspector/tabs/VFXMapTab';
import { Icons } from './icons';

interface ModalManagerProps {
    showDB: boolean;
    showVFXMap?: boolean; // Added optional prop
    engine: GameEngine;
    onClose: () => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
    showDB, showVFXMap, engine, onClose
}) => {
    
    if (!showDB && !showVFXMap) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8 animate-fade-in" 
             onClick={onClose}>
            
            {/* Main Modal Container */}
            <div className="liquid-card w-full h-[90%] max-w-6xl overflow-hidden flex flex-col animate-bounce-in bg-black/80" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0 bg-white/5">
                    <h2 className="text-lg font-bold text-white tracking-widest flex items-center gap-3">
                        {showDB && <><Icons.Database className="w-6 h-6 text-amber-400" /> 技能資料庫 (SKILL DATABASE)</>}
                        {showVFXMap && <><Icons.VFX className="w-6 h-6 text-purple-400" /> 特效圖鑑 (VFX MAP)</>}
                    </h2>
                    <button onClick={onClose} title="關閉視窗" className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10">
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-hidden relative min-h-0">
                    {showDB && <SkillDbTab db={engine.skillDB} onUpdate={() => {}} />}
                    {showVFXMap && <VFXMapTab />}
                </div>
            </div>
        </div>
    );
};
