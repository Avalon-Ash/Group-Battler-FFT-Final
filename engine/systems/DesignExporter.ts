import { BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {
    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "Architecture_Spec.md";
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        let s = "# TACTICAL.OS - System Architecture\n\n";
        s += "Generated: " + new Date().toLocaleString() + "\n";
        s += "Status: PRODUCTION_READY\n\n";
        s += "## 1. Infrastructure\n\n";
        s += "- EventBus: Set-based storage.\n";
        s += "- SpatialProvider: Abstracted interface.\n\n";
        s += "## 2. Visual Projections\n\n";
        s += "- ISO_SCALE_Y: " + ISO_SCALE_Y + "\n";
        s += "- BLOCK_HEIGHT: " + BLOCK_HEIGHT + "\n";
        s += "- UNIT_BODY_OFFSET: " + UNIT_BODY_OFFSET + "\n";
        s += "- HORIZON_BIAS: " + VisualMath.HORIZON_Y_PCT + "%\n\n";
        s += "---\n> END OF SPECIFICATION\n";
        return s;
    }
}
