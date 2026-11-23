// ╔══════════════════════════════════════════════════════════╗
// ║  ContractPending — 架構契約的「尚未實作」訊號              ║
// ║  職責：契約先定義型別與函式簽章，實作還沒補上的空殼一律丟  ║
// ║        ContractPending。紅色驗收（tests/contracts）看到它  ║
// ║        算「待辦」，看到其他錯誤照樣失敗。                  ║
// ║  [ARCH] 一包實作完成＝該包不再有任何地方丟 ContractPending，║
// ║  並把 tests/contracts/status.ts 的狀態改成 done。目前全部  ║
// ║  契約包都已 done；機制留給之後的契約包（受保護的驗收與     ║
// ║  contractTest.ts 依賴本檔）。正式遊玩路徑不得呼叫空殼。    ║
// ╚══════════════════════════════════════════════════════════╝

/** 契約包代號：S、G、R、U 開頭對應 docs/plans/optimization-2026-11.md，P 開頭對應 docs/plans/play-mode.md 的拆包表 */
export type ContractId = 'S2' | 'S3' | 'G2' | 'G3' | 'G4' | 'R1' | 'R2' | 'R3' | 'U1' | 'P1' | 'P2' | 'P5';

export class ContractPending extends Error {
    constructor(public readonly contract: ContractId, what: string) {
        super(`[契約 ${contract}] 尚未實作：${what}`);
        this.name = 'ContractPending';
    }
}
