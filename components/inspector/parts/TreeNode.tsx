
import React from 'react';
import { BTNode } from '../../../engine/behaviorTree';
import { NodeState } from '../../../types';

interface TreeNodeProps {
    node: BTNode;
    version: number;
    now: number;
}

const BT_LABEL_MAP: Record<string, string> = {
    'Root': '根節點 (Root)',
    'Dead Check': '陣亡判定',
    'Is Dead?': '已陣亡？',
    'Dead Wait': '陣亡待機',
    'CC Check': '控制判定',
    'Any CC?': '任何受控？',
    'Stunned?': '暈眩？',
    'Banished?': '放逐？',
    'Feared?': '恐懼？',
    'CC Wait': '受控硬直等待',
    'Survival': '求生策略',
    'Trigger?': '觸發避險？',
    'Urgent Danger?': '急迫危險？',
    'Already Evading?': '正在閃避？',
    'Survival Tactics': '求生手段',
    'Run!': '逃離危險！',
    'Last Stand': '背水一戰',
    'Has Push/Pull?': '有擊退技？',
    'Push Away!': '擊退敵方！',
    'Combat': '戰鬥主迴圈',
    'Scan Target': '鎖定目標',
    'Skill Priority': '技能優先級',
    'Try Ultimate': '嘗試奧義大絕',
    'Try Active': '嘗試戰術技能',
    'Try Basic': '嘗試基礎普攻',
    'Ready?': '冷卻就緒？',
    'Tactics': '戰術決策',
    'Smart Cast': '智慧施法',
    'Find Spot': '尋找落點',
    'Execute': '執行動作',
    'Cast Now': '立即釋放',
    'In Range?': '在射程內？',
    'Cast': '施放技能',
    'Move To Spot': '移至落點',
    'Chase': '追擊目標',
    'Gap Close': '縮短距離',
    'Stick To Target': '保持接敵',
    'Idle': '原地待命'
};

export const TreeNode: React.FC<TreeNodeProps> = ({ node, version, now }) => {
    // Logic for Visual Persistence
    const timeDiff = now - node.lastRunTime;
    let visualState: NodeState | null = node.status;
    let isFading = false;
    let opacity = 1.0;

    if (!visualState && node.lastResult) {
        if (timeDiff < 1000) { 
            visualState = node.lastResult;
            isFading = true;
            if (timeDiff > 200) opacity = 0.7;
            if (timeDiff > 500) opacity = 0.4;
        }
    }

    const statusStyle = (s: NodeState | null) => {
        switch (s) {
            case NodeState.RUNNING: return "border-amber-500/80 bg-amber-950/80 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-1 ring-amber-400 animate-pulse-glow z-10 scale-105";
            case NodeState.SUCCESS: return "border-emerald-500/50 bg-emerald-950/60 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
            case NodeState.FAILURE: return "border-red-800/50 bg-red-950/60 text-red-200 opacity-60";
            default: return "border-slate-700 bg-slate-800/80 text-slate-500 backdrop-blur-sm";
        }
    };

    const typeSymbol = (t: string) => {
        if(t === '?') return <span className="text-purple-400 font-bold mr-3 text-xl drop-shadow-md">?</span>;
        if(t === '->') return <span className="text-blue-400 font-bold mr-3 text-xl drop-shadow-md">➜</span>;
        if(t === 'COND') return <span className="text-pink-400 text-base mr-3 font-bold">◆</span>;
        if(t === 'ACT') return <span className="text-yellow-400 text-base mr-3 font-bold">⚡</span>;
        return null;
    }

    const displayName = BT_LABEL_MAP[node.n] || node.n;

    return (
        <div className="flex flex-col items-center">
            <div 
                className={`flex items-center px-6 py-4 rounded-2xl border transition-all duration-200 cursor-default select-none min-w-[160px] justify-center backdrop-blur-md ${statusStyle(visualState)}`}
                style={{ opacity: opacity }}
            >
                {typeSymbol(node.type)}
                <span className="whitespace-nowrap truncate max-w-[200px] font-bold text-sm tracking-wider font-mono">{displayName}</span>
            </div>
            {node.c && node.c.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className={`w-px h-8 ${isFading ? 'bg-slate-600/30' : 'bg-slate-600/60'}`}></div>
                    <div className="flex items-start gap-6">
                        {node.c.map((child, idx) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Connector Lines */}
                                <div className="absolute top-0 left-0 w-full h-8 -mt-8 pointer-events-none">
                                     {node.c.length > 1 && (
                                         <>
                                            {idx === 0 && <div className="absolute right-0 top-0 w-1/2 h-px bg-slate-600/60 translate-y-8"></div>}
                                            {idx === node.c.length - 1 && <div className="absolute left-0 top-0 w-1/2 h-px bg-slate-600/60 translate-y-8"></div>}
                                            {idx > 0 && idx < node.c.length - 1 && <div className="absolute left-0 top-0 w-full h-px bg-slate-600/60 translate-y-8"></div>}
                                         </>
                                     )}
                                     <div className="absolute left-1/2 top-0 w-px h-8 bg-slate-600/60 translate-y-8 -translate-x-1/2"></div>
                                </div>
                                
                                <div className="pt-8">
                                    <TreeNode node={child} version={version} now={now} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
