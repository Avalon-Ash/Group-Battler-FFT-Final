
import React, { useRef, useEffect } from 'react';
import { Agent } from '../../../engine/game';
import { Role, Skill, Team } from '../../../types';
import { ROLE_MAP, TAG_MAP } from '../InspectorConstants';
import { SkillIcon } from '../parts/SkillIcon';
import { Icons } from '../../ui/icons';

interface UnitStatusTabProps {
    agent: Agent;
    db: Skill[];
    onHoverSkill?: (skill: Skill | null) => void;
    onUpdate: () => void;
}

export const UnitStatusTab: React.FC<UnitStatusTabProps> = ({ agent, db, onHoverSkill, onUpdate }) => {
    
    const setSkill = (idx: number, id: string) => {
        agent.skillIds[idx] = id || null; 
        onUpdate();
    };

    // --- GRAB & DRAG SCROLL LOGIC ---
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);
    const dragState = useRef({
        isDown: false,
        startY: 0,
        scrollTop: 0,
        lastY: 0,
        velocity: 0,
        lastTime: 0
    });

    const stopMomentum = () => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        // Ignore drag if clicking interactive elements (selects)
        if ((e.target as HTMLElement).tagName === 'SELECT') return;

        dragState.current.isDown = true;
        dragState.current.startY = e.pageY;
        dragState.current.scrollTop = scrollRef.current.scrollTop;
        dragState.current.lastY = e.pageY;
        dragState.current.velocity = 0;
        dragState.current.lastTime = performance.now();
        
        stopMomentum();
        
        // Force cursor style during drag
        scrollRef.current.style.cursor = 'grabbing';
        scrollRef.current.style.userSelect = 'none';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState.current.isDown || !scrollRef.current) return;
        e.preventDefault();
        
        const now = performance.now();
        const y = e.pageY;
        const delta = y - dragState.current.startY;
        
        // Update Scroll
        scrollRef.current.scrollTop = dragState.current.scrollTop - delta;

        // Calculate Velocity (pixels per ms)
        const timeDelta = now - dragState.current.lastTime;
        if (timeDelta > 0) {
            const dist = y - dragState.current.lastY;
            // Smooth velocity slightly
            dragState.current.velocity = dist; 
            dragState.current.lastY = y;
            dragState.current.lastTime = now;
        }
    };

    const handleMouseUp = () => {
        if (!dragState.current.isDown) return;
        dragState.current.isDown = false;
        
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
            scrollRef.current.style.removeProperty('user-select');
        }
        
        startMomentum();
    };

    const startMomentum = () => {
        stopMomentum();
        
        const step = () => {
            if (!scrollRef.current) return;
            
            // Apply friction
            dragState.current.velocity *= 0.95; 
            
            if (Math.abs(dragState.current.velocity) > 0.5) {
                scrollRef.current.scrollTop -= dragState.current.velocity;
                rafRef.current = requestAnimationFrame(step);
            } else {
                dragState.current.velocity = 0;
            }
        };
        
        step();
    };

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => stopMomentum();
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
            
            {/* SKILL SLOTS (Scrollable Area with Grab & Drag) */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-4 py-4 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-3 sticky top-0 bg-slate-900/95 backdrop-blur z-10 py-2 border-b border-white/5 pointer-events-none">
                    <Icons.Database className="w-3 h-3" />
                    NEURAL LINKAGE
                </div>

                {/* Added pb-24 to ensure the bottom-most dropdown has space to open or be seen when scrolled */}
                <div className="space-y-3 pb-24">
                    {['ULT', 'ACTIVE', 'BASIC'].map((tag, i) => {
                        const currentSkillId = agent.skillIds[i];
                        const currentSkill = db.find(s => s.id === currentSkillId);
                        
                        const availableSkills = db.filter(s => s.tag === tag);
                        const skillsByRole: Record<string, Skill[]> = {};
                        availableSkills.forEach(s => {
                            if(!skillsByRole[s.role]) skillsByRole[s.role] = [];
                            skillsByRole[s.role].push(s);
                        });
                        const roleOrder = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

                        return (
                            <div key={i} className="liquid-card !bg-slate-900/40 border border-white/5 transition-all hover:border-white/20 group !rounded-xl overflow-visible" onMouseEnter={() => onHoverSkill && onHoverSkill(currentSkill || null)} onMouseLeave={() => onHoverSkill && onHoverSkill(null)}>
                                <div className="flex items-center gap-3 p-3 bg-white/[0.02]">
                                    <SkillIcon skill={currentSkill || null} className="w-10 h-10 !rounded-lg shadow-lg shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 rounded border ${tag === 'ULT' ? 'text-purple-300 border-purple-500/30 bg-purple-500/10' : (tag === 'ACTIVE' ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' : 'text-slate-300 border-slate-500/30 bg-slate-500/10')}`}>
                                                {TAG_MAP[tag].label} SLOT
                                            </span>
                                            {currentSkill && <span className="text-[9px] text-slate-600 font-mono">{currentSkill.id}</span>}
                                        </div>
                                        <div className="relative">
                                            <select 
                                                className={`liquid-input h-8 w-full text-xs font-bold appearance-none cursor-pointer uppercase tracking-wide !rounded-lg pr-8 ${!currentSkillId ? 'text-slate-500 !bg-black/30' : 'text-slate-200 !bg-black/50 hover:!bg-black/70'}`}
                                                value={agent.skillIds[i] || ""} 
                                                onChange={(e) => setSkill(i, e.target.value)}
                                                onMouseDown={(e) => e.stopPropagation()} // Stop drag when interacting with select
                                            >
                                                <option value="">-- NO LINKAGE --</option>
                                                {roleOrder.map(role => {
                                                    const skills = skillsByRole[role];
                                                    if (!skills || skills.length === 0) return null;
                                                    return (
                                                        <optgroup key={role} label={ROLE_MAP[role].label} className="bg-slate-900 text-slate-400">
                                                            {skills.map(s => (
                                                                <option key={s.id} value={s.id} className="text-white">
                                                                    {s.name} {s.team !== undefined ? (s.team === Team.BLUE ? '🔵' : '🔴') : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px]">▼</div>
                                        </div>
                                    </div>
                                </div>

                                {currentSkill && (
                                    <div className="px-3 py-2 text-xs bg-black/20 border-t border-white/5 pointer-events-none">
                                        <div className="text-slate-400 italic mb-2 leading-relaxed border-l-2 border-white/10 pl-2 text-[10px]">
                                            {currentSkill.desc}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-[9px] font-mono text-slate-400">
                                            <div className="bg-black/30 rounded px-1 py-0.5 text-center border border-white/5"><span className="text-slate-500 block text-[8px] uppercase">PWR</span> <span className="text-slate-200">{currentSkill.power}</span></div>
                                            <div className="bg-black/30 rounded px-1 py-0.5 text-center border border-white/5"><span className="text-slate-500 block text-[8px] uppercase">CD</span> <span className="text-slate-200">{currentSkill.cd}s</span></div>
                                            <div className="bg-black/30 rounded px-1 py-0.5 text-center border border-white/5"><span className="text-slate-500 block text-[8px] uppercase">MP</span> <span className="text-blue-300">{currentSkill.cost}</span></div>
                                            <div className="bg-black/30 rounded px-1 py-0.5 text-center border border-white/5"><span className="text-slate-500 block text-[8px] uppercase">RNG</span> <span className="text-slate-200">{currentSkill.range}</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
