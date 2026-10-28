// ╔══════════════════════════════════════════════════════════╗
// ║ DesignExporter — Markdown 白皮書與座標規格下載           ║
// ║ 職責：載入文件、解析常數點路徑、列出未解析項並下載。     ║
// ║ 上游：useGameApp actions；下游：Markdown / RenderSpec。  ║
// ║ [ARCH] 不改引擎狀態；座標規格仍由 RenderSpec 產生。       ║
// ╚══════════════════════════════════════════════════════════╝
import * as constants from '../../constants';
import { DESIGN_EXPORT } from '../../data/ui/designExport';
import whitepaper from '../../docs/ARCHITECTURE_WHITEPAPER.md?raw';
import { RenderSpec } from '../renderers/RenderSpec';

export class DesignExporter {
    static downloadArchitectureSpec() {
        const blob = new Blob([DesignExporter.generateSpec()], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Tactical_OS_Architecture_Whitepaper.md';
        anchor.click();
        URL.revokeObjectURL(url);
    }

    static downloadAll() {
        DesignExporter.downloadSpec();
        setTimeout(() => RenderSpec.downloadSpec(), DESIGN_EXPORT.COORDINATE_DELAY_MS);
    }

    static downloadSpec() {
        DesignExporter.downloadArchitectureSpec();
    }

    static generateSpec(template: string = whitepaper): string {
        const unresolved = new Set<string>();
        const body = template.replace(/\{\{([^{}]*)\}\}/g, (placeholder: string, path: string) => {
            let value: unknown = constants;
            if (!/^[A-Za-z_$][\w$]*(?:\.(?:[A-Za-z_$][\w$]*|\d+))*$/.test(path)) {
                unresolved.add(placeholder);
                return placeholder;
            }
            for (const key of path.split('.')) {
                if (value === null || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) {
                    value = undefined;
                    break;
                }
                value = (value as Record<string, unknown>)[key];
            }
            if (value === undefined || typeof value === 'function') {
                unresolved.add(placeholder);
                return placeholder;
            }
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
        });
        const diagnostics = unresolved.size ? `\n\n## 未解析\n\n${[...unresolved].map(item => `- ${item}`).join('\n')}\n` : '';
        return `<!-- 產生時間：${new Date().toISOString()}；版本：現行程式快照 -->\n\n${body}${diagnostics}`;
    }
}
