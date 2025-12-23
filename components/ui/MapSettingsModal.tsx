
import React from 'react';

interface MapSettingsModalProps {
    width: number;
    height: number;
    onChangeW: (v: number) => void;
    onChangeH: (v: number) => void;
    onRebuild: () => void;
    onClear: () => void;
    onClose: () => void;
}

export const MapSettingsModal: React.FC<MapSettingsModalProps> = ({ 
    width, height, onChangeW, onChangeH, onRebuild, onClear, onClose 
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl w-full max-w-sm space-y-4 mb-32 sm:mb-0 pointer-events-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-slate-300">地圖設定</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase">寬度</label>
                        <input type="number" className="tactical-input w-full text-center h-10 text-lg" value={width} onChange={e=>onChangeW(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase">高度</label>
                        <input type="number" className="tactical-input w-full text-center h-10 text-lg" value={height} onChange={e=>onChangeH(Number(e.target.value))} />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onRebuild} className="flex-1 tactical-btn py-3 border-slate-600 hover:bg-slate-800">重建地圖</button>
                    <button onClick={onClear} className="flex-1 tactical-btn py-3 text-red-400 border-red-900 hover:bg-red-950">清空單位</button>
                </div>
            </div>
        </div>
    );
};
