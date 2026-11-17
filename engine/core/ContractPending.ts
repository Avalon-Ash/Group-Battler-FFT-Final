// ╔══════════════════════════════════════════════════════════╗
// ║  ContractPending — 架構契約的「尚未實作」訊號              ║
// ║  職責：契約先定義型別與函式簽章，實作還沒補上的空殼一律丟  ║
// ║        ContractPending。紅色驗收（tests/contracts）看到它  ║
// ║        算「待辦」，看到其他錯誤照樣失敗。                  ║
// ║  [ARCH] 一包實作完成＝該包不再有任何地方丟 ContractPending，║
// ║  並把 tests/contracts/status.ts 的狀態改成 done。全部契約  ║
// ║  完成後刪除本檔。正式遊玩路徑不得呼叫還是空殼的函式。      ║
// ╚══════════════════════════════════════════════════════════╝

/** 契約包代號，對應 docs/plans/optimization-2026-11.md 的拆包表 */
export type ContractId = 'S2' | 'S3' | 'G2' | 'G3' | 'G4' | 'R1' | 'R2' | 'R3' | 'U1';

export class ContractPending extends Error {
    constructor(public readonly contract: ContractId, what: string) {
        super(`[契約 ${contract}] 尚未實作：${what}`);
        this.name = 'ContractPending';
    }
}

/** 空殼的函式本體：`return pending('S2', 'captureMatch')` */
export function pending(contract: ContractId, what: string): never {
    throw new ContractPending(contract, what);
}
