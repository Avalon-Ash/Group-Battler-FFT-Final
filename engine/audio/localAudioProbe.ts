import { CUE_TABLE, CueId, CueExclusiveGroup } from '../../data/audio/cues';

/** 某互斥群組的所有 Cue（例：ANNOUNCER＝擊殺播報） */
export function cuesInExclusiveGroup(group: CueExclusiveGroup): CueId[] {
    return (Object.keys(CUE_TABLE) as CueId[]).filter(id => CUE_TABLE[id].exclusive?.group === group);
}

/**
 * 這些 Cue 的檔案是否全部存在（給只放本機的版權音檔判斷要不要顯示設定）。
 * dev server 對不存在的檔案會回 index.html（200），所以要看 content-type 是不是音訊。
 */
export async function hasCueFiles(cueIds: CueId[]): Promise<boolean> {
    const files = cueIds.flatMap(id => CUE_TABLE[id].files);
    if (files.length === 0 || typeof fetch !== 'function') return false;
    try {
        const results = await Promise.all(files.map(async f => {
            const resp = await fetch(f, { method: 'HEAD' });
            return resp.ok && (resp.headers.get('content-type') ?? '').startsWith('audio/');
        }));
        return results.every(Boolean);
    } catch {
        return false;
    }
}
