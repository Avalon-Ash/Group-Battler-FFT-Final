
export type LayoutPreset = 'CENTER' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';
export type StreamDirection = 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';

export interface MatrixConfig {
    // Physics
    direction: StreamDirection;
    speed: number;        // Global Speed Multiplier
    fontSize: number;     // Base Size of the characters (px)
    spacing: number;      // Extra space between columns/rows (px)
    trailLength: number;  // Length of the fade trail
    
    // Depth (New)
    depthVariance: number; // 0.0 - 1.0 (0 = Flat, 1 = Deep Parallax)
    
    // Density/Frequency (New)
    streamGap: number;    // 0 = Head-to-Tail connected, >0 = Gaps between streams
    
    // Logic
    volatility: number;   // 0.0 - 1.0 (Glitchiness)
    
    // Content
    charSet: string;
    
    // Visuals
    textColor: string;    // Body color
    headColor: string;    // Leading char color
    bgColor: string;      // Background overlay color
    
    // Opacity
    bgOpacity: number;    
    textOpacity: number;  
}
