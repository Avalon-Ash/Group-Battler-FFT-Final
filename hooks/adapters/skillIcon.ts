import { AssetManager } from '../../engine/assets';

export function getSkillIconDataUrl(visual: string, color?: string): string {
    return AssetManager.getSkillIcon(visual, color).toDataURL();
}
