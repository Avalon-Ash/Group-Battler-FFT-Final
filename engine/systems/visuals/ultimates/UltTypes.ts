
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import { GridSystem } from "../../grid";
import { CameraSystem } from "../../CameraSystem";

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface UltContext {
    engine: GameEngine;
    vfx: VFXSystem;
    grid: GridSystem;
    camera: CameraSystem;
    target: Point3D;
    sourceId?: string;
    sourcePos?: Point3D; // Derived helper
}

export type UltScriptFn = (ctx: UltContext) => void;
