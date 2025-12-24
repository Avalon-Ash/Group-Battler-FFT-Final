
import React from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { LogTab } from '../inspector/tabs/LogTab';
import { SkillDbTab } from '../inspector/tabs/SkillDbTab';
import { UnitDetailView } from '../ui/UnitDetailView';

interface ModalManagerProps {
    showLogs: boolean;
    showDB: boolean;
    showUnitDetail: boolean;
    selectedAgent: Agent | null;
    engine: GameEngine;
    onClose: () => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
    showLogs, showDB, showUnitDetail, selectedAgent, engine, onClose
}) => {
    
    // If no modal is active, render nothing
    if (!showLogs && !showDB && (!showUnitDetail || !selectedAgent)) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8 animate-fade-in" 
             onClick={onClose}>
            
            {/* Maximize modal size for better visibility */}
            <div className="liquid-glass w-full h-[95%] max-w-[95%] rounded-3xl overflow-hidden flex flex-col transition-all bg-black/40" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0 bg-black/20">
                    <h2 className="text-lg font-bold text-cyan-400 truncate pr-4 flex items-center gap-2">
                        {showLogs && <><span className="text-2xl">📜</span> 戰況紀錄</>}
                        {showDB && <><span className="text-2xl">📚</span> 技能資料庫</>}
                        {showUnitDetail && <><span className="text-2xl">🔍</span> 單位神經網路分析</>}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">✕</button>
                </div>
                
                {/* Modal Content */}
                <div className="flex-1 overflow-hidden relative min-h-0 bg-transparent">
                    {showLogs && <LogTab engine={engine} />}
                    {showDB && <SkillDbTab db={engine.skillDB} onUpdate={() => {}} />}
                    {showUnitDetail && selectedAgent && <UnitDetailView agent={selectedAgent} db={engine.skillDB} engine={engine} />}
                </div>
            </div>
        </div>
    );
};
