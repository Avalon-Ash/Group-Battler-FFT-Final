import React from 'react';
import { UI_Z } from '../../../constants';

export interface WindowLayerProps {
    children?: React.ReactNode;
    showcaseMode?: boolean;
    className?: string;
}

/**
 * Top-level layer hosting floating ToolWindows.
 * Container is pointer-events-none so touches/clicks penetrate to canvas,
 * while individual ToolWindows enable pointer-events-auto.
 */
export const WindowLayer: React.FC<WindowLayerProps> = ({
    children,
    showcaseMode = false,
    className = '',
}) => {
    return (
        <div
            id="window-layer"
            style={{ zIndex: UI_Z.WINDOW_BASE }}
            className={`fixed inset-0 pointer-events-none overflow-hidden select-none ${
                showcaseMode ? 'hidden' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
};
