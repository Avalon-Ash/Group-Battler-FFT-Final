import React, { useRef } from 'react';
import { ToolType, Role, HexLayout, BodyTypeId } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useCompactViewport } from '../../hooks/useCompactViewport';
import { Icons } from './icons';
import { UI_Z, UI_PIN } from '../../constants';
import { IconButton, NumberInput, Segmented, Select } from './primitives';
import { cn } from './primitives/cn';
import {
    ROLE_OPTIONS,
    SPAWN_MODE_OPTIONS,
    BODY_TYPE_OPTIONS,
    LAYOUT_OPTIONS,
    OBSTACLE_OPTIONS,
    SCENE_OPTIONS,
} from '../../data/ui/labels/l1';

interface MapEditorToolbarProps {
    tool: ToolType;
    setTool: (t: ToolType) => void;

    // Configs
    mapW: number;
    setMapW: (v: number) => void;
    mapH: number;
    setMapH: (v: number) => void;
    currentSceneId: string;
    onSetScene: (id: string) => void;

    // Spawn Settings
    spawnMode: 'RANDOM' | 'DRAFT';
    setSpawnMode: (m: 'RANDOM' | 'DRAFT') => void;
    draftRole: Role;
    setDraftRole: (r: Role) => void;
    draftBodyType?: BodyTypeId;
    setDraftBodyType: (b?: BodyTypeId) => void;
    hpInput: number;
    setHpInput: (v: number) => void;

    // Obstacle Settings
    selectedObstacle: string;
    setSelectedObstacle: (v: string) => void;

    // Layout Settings
    hexLayout: HexLayout;
    onSetLayout: (l: HexLayout) => void;
}

export const MapEditorToolbar: React.FC<MapEditorToolbarProps> = (props) => {
    const {
        tool,
        setTool,
        currentSceneId,
        onSetScene,
        spawnMode,
        setSpawnMode,
        draftRole,
        setDraftRole,
        draftBodyType,
        setDraftBodyType,
        hpInput,
        setHpInput,
        selectedObstacle,
        setSelectedObstacle,
        hexLayout,
        onSetLayout,
    } = props;

    const isCompact = useCompactViewport();

    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'top-center',
        margin: isCompact ? UI_PIN.TOOLBAR_MARGIN_COMPACT : UI_PIN.TOOLBAR_MARGIN,
        storageKey: UI_PIN.STORAGE_KEYS.mapEditor,
    });

    const isUnitTool = tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED;
    const isObstacleTool = tool === ToolType.OBSTACLE;

    return (
        <div
            ref={ref}
            className="flex flex-col items-center gap-2"
            style={{ ...style, zIndex: UI_Z.HUD }}
            {...dragHandlers}
        >
            {/* MAIN TOOLBAR */}
            <div
                className={`shell shell-hud mat-blur rounded-ui-pill p-2 flex items-center select-none cursor-grab active:cursor-grabbing ${
                    isCompact ? 'gap-1' : 'gap-1.5'
                } ${isDragging ? 'cursor-grabbing scale-105' : ''}`}
            >
                {/* Drag Handle */}
                <div
                    className={`w-5 ${isCompact ? 'hidden' : 'flex'} items-center justify-center opacity-40 hover:opacity-80 transition-opacity pr-1 text-fg-muted border-r border-line-subtle/20`}
                    onPointerDown={dragHandlers.onPointerDown}
                >
                    <Icons.Menu className="h-4 w-4" />
                </div>

                {/* 1. SELECT */}
                <IconButton
                    label="選取 / 移動"
                    variant={tool === ToolType.SELECT ? 'primary' : 'ghost'}
                    size="sm"
                    className="rounded-ui-pill"
                    onClick={() => setTool(ToolType.SELECT)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Select className="h-4 w-4" />
                </IconButton>

                <div className={`w-px h-5 bg-line-subtle/20 ${isCompact ? '' : 'mx-1'}`} />

                {/* 2. BLUE TEAM */}
                <IconButton
                    label="部署藍軍 (帝國)"
                    variant={tool === ToolType.ADD_BLUE ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                        'rounded-ui-pill text-team-blue-primary',
                        tool === ToolType.ADD_BLUE && 'border-team-blue-primary/60 bg-team-blue-primary/25',
                    )}
                    onClick={() => setTool(ToolType.ADD_BLUE)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Deploy className="h-4 w-4" />
                </IconButton>

                {/* 3. RED TEAM */}
                <IconButton
                    label="部署紅軍 (誓約)"
                    variant={tool === ToolType.ADD_RED ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                        'rounded-ui-pill text-team-red-primary',
                        tool === ToolType.ADD_RED && 'border-team-red-primary/60 bg-team-red-primary/25',
                    )}
                    onClick={() => setTool(ToolType.ADD_RED)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Deploy className="h-4 w-4" />
                </IconButton>

                <div className={`w-px h-5 bg-line-subtle/20 ${isCompact ? '' : 'mx-1'}`} />

                {/* 4. OBSTACLE */}
                <IconButton
                    label="地形編輯"
                    variant={tool === ToolType.OBSTACLE ? 'primary' : 'ghost'}
                    size="sm"
                    className="rounded-ui-pill"
                    onClick={() => setTool(ToolType.OBSTACLE)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Obstacle className="h-4 w-4" />
                </IconButton>

                {/* 5. DELETE */}
                <IconButton
                    label="移除單位或障礙"
                    variant={tool === ToolType.DELETE ? 'danger' : 'ghost'}
                    size="sm"
                    className="rounded-ui-pill"
                    onClick={() => setTool(ToolType.DELETE)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Delete className="h-4 w-4" />
                </IconButton>
            </div>

            {/* SUB MENU: UNIT SETTINGS */}
            {isUnitTool && (
                <div
                    className="shell shell-hud mat-blur rounded-ui-card p-2 flex flex-wrap justify-center items-center gap-3 animate-slide-left origin-top"
                    style={{ maxWidth: 'calc(100vw - 1.5rem)' }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1.5 px-2 py-1" title="初始生命值">
                        <span className="text-ui-num font-bold text-fg-muted">HP</span>
                        <NumberInput
                            ariaLabel="初始生命值"
                            value={hpInput}
                            onCommit={(v) => setHpInput(Math.max(1, v))}
                            min={1}
                            className="w-16"
                        />
                    </div>

                    <Segmented
                        ariaLabel="職業配置模式"
                        value={spawnMode}
                        onValueChange={(val) => setSpawnMode(val as 'RANDOM' | 'DRAFT')}
                        options={SPAWN_MODE_OPTIONS}
                    />

                    {spawnMode === 'DRAFT' && (
                        <Select
                            ariaLabel="固定職業"
                            data-testid="toolbar-draft-role"
                            value={draftRole}
                            onValueChange={(r) => setDraftRole(r as Role)}
                            options={ROLE_OPTIONS}
                            size="sm"
                            className="w-36"
                        />
                    )}

                    <Segmented
                        ariaLabel="單位體型"
                        value={draftBodyType ?? 'RANDOM'}
                        onValueChange={(val) => setDraftBodyType(val === 'RANDOM' ? undefined : (val as BodyTypeId))}
                        options={BODY_TYPE_OPTIONS}
                    />
                </div>
            )}

            {/* SUB MENU: OBSTACLE & LAYOUT SETTINGS */}
            {isObstacleTool && (
                <div
                    className="shell shell-hud mat-blur rounded-ui-card p-2 flex flex-wrap justify-center items-center gap-3 animate-slide-left origin-top"
                    style={{ maxWidth: 'calc(100vw - 1.5rem)' }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Segmented
                        ariaLabel="六邊形佈局"
                        value={hexLayout}
                        onValueChange={(val) => onSetLayout(val as HexLayout)}
                        options={LAYOUT_OPTIONS}
                    />

                    <div className="h-5 w-px bg-line-subtle/20" />

                    <Select
                        ariaLabel="障礙物種類"
                        value={selectedObstacle}
                        onValueChange={setSelectedObstacle}
                        options={OBSTACLE_OPTIONS}
                        size="sm"
                        className="w-32"
                    />

                    <Select
                        ariaLabel="戰場場景"
                        value={currentSceneId}
                        onValueChange={onSetScene}
                        options={SCENE_OPTIONS}
                        size="sm"
                        className="w-28"
                    />
                </div>
            )}
        </div>
    );
};
