import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { getRegisteredWindows } from './window/windowRegistry';
import { useWindowStore, useWindowActions } from '../../hooks/useWindowStore';
import { UI_Z } from '../../constants';
import { useCompactViewport } from '../../hooks/useCompactViewport';
import { Button, IconButton } from './primitives';
import { cn } from './primitives/cn';
import { MENU_DOT_CLASSES, MENU_SECTIONS } from '../../data/ui/labels/l1';

interface SystemMenuProps {
    onDownloadSpec: () => void;
    mode?: 'showcase' | 'manual';
}

export const SystemMenu: React.FC<SystemMenuProps> = ({
    onDownloadSpec,
    mode = 'manual',
}: SystemMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const isCompact = useCompactViewport();

    const windowStates = useWindowStore();
    const windowActions = useWindowActions();
    const registeredWindows = getRegisteredWindows(mode);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    return (
        <>
            {/* Backdrop to close dropdown on click outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 pointer-events-auto"
                    style={{ zIndex: UI_Z.MENU_BACKDROP }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={`absolute flex flex-col items-end gap-2 pointer-events-auto ${isCompact ? 'top-3 right-3' : 'top-6 right-6'}`}
                style={{ zIndex: UI_Z.MENU }}
            >
                <IconButton
                    data-testid="system-menu-button"
                    label={isOpen ? '關閉選單' : '開啟系統選單'}
                    variant={isOpen ? 'primary' : 'secondary'}
                    size="md"
                    className="rounded-ui-pill"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <Icons.Close className="h-5 w-5" /> : <Icons.Menu className="h-5 w-5" />}
                </IconButton>

                {isOpen && (
                    <div
                        className={cn(
                            'shell shell-popover mat-blur rounded-ui-card flex flex-col p-2 gap-2 animate-slide-left origin-top-right w-64 max-w-full',
                            isCompact && 'overflow-y-auto ui-scroll',
                        )}
                        style={isCompact ? { maxHeight: 'calc(100dvh - 5.5rem)' } : undefined}
                    >
                        {/* WINDOWS */}
                        <div className="flex flex-col gap-0.5">
                            <span className="ui-heading px-3 py-1 text-fg-muted">{MENU_SECTIONS.windows}</span>
                            {registeredWindows.map((win) => {
                                const isWinOpen = windowStates[win.id]?.isOpen ?? false;
                                return (
                                    <Button
                                        key={win.id}
                                        data-testid={`menu-item-${win.id}`}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between gap-2 px-3 text-fg-secondary hover:text-fg-primary rounded-ui-control"
                                        onClick={() => {
                                            windowActions.toggle(win.id);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-4 h-4 flex items-center justify-center text-fg-muted shrink-0">
                                                {win.icon}
                                            </span>
                                            <span className="ui-heading min-w-0 truncate">
                                                {win.title}
                                            </span>
                                        </div>
                                        <span className={cn('w-2 h-2 shrink-0', isWinOpen ? MENU_DOT_CLASSES.active : MENU_DOT_CLASSES.inactive)} />
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="h-px bg-line-subtle/15 my-0.5" />

                        {/* ACTIONS */}
                        <div className="flex flex-col gap-0.5">
                            <span className="ui-heading px-3 py-1 text-fg-muted">{MENU_SECTIONS.actions}</span>
                            <Button
                                data-testid="menu-item-reset-layout"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2.5 px-3 py-1.5 h-auto text-fg-secondary hover:text-fg-primary rounded-ui-control"
                                onClick={() => {
                                    windowActions.resetLayout();
                                    setIsOpen(false);
                                }}
                            >
                                <span className="w-4 h-4 flex items-center justify-center text-fg-muted shrink-0">
                                    <Icons.Restart className="w-4 h-4" />
                                </span>
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <span className="font-bold truncate">重設版面</span>
                                    <span className="font-mono text-ui-num text-fg-muted truncate">清除視窗位置記憶</span>
                                </div>
                            </Button>

                            <Button
                                data-testid="menu-item-spec"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2.5 px-3 py-1.5 h-auto text-fg-secondary hover:text-fg-primary rounded-ui-control"
                                onClick={() => {
                                    onDownloadSpec();
                                    setIsOpen(false);
                                }}
                            >
                                <span className="w-4 h-4 flex items-center justify-center text-fg-muted shrink-0">
                                    <Icons.Save className="w-4 h-4" />
                                </span>
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <span className="font-bold truncate">下載架構白皮書</span>
                                    <span className="font-mono text-ui-num text-fg-muted truncate">白皮書與座標規格</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
