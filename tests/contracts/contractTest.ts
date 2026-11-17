import { it } from 'vitest';
import { ContractPending, type ContractId } from '../../engine/core/ContractPending';
import { CONTRACT_STATUS } from './status';

/**
 * 紅色驗收的包裝。契約還沒實作時，驗收停在空殼丟出的 ContractPending 算「待辦」（測試通過），
 * 其他任何錯誤照樣失敗——所以驗收在碰到空殼之前的每一行都已經用現有引擎跑過。
 * 狀態表改成 done 之後，ContractPending 不再被容忍。
 */
export function contractTest(contract: ContractId, name: string, fn: () => void | Promise<void>, timeout?: number): void {
    it(`[${contract}] ${name}`, async () => {
        let hit: ContractPending | null = null;
        try {
            await fn();
        } catch (e) {
            if (!(e instanceof ContractPending)) throw e;
            hit = e;
        }
        if (CONTRACT_STATUS[contract] === 'done') {
            if (hit) throw hit;
            return;
        }
        if (!hit) {
            throw new Error(`[契約 ${contract}] 這則驗收已經通過，但 tests/contracts/status.ts 還標 pending：開始實作這包時把狀態改成 done。`);
        }
        // 停在別包的空殼（依賴的包還沒做）可以；停在已標 done 的包＝那包沒做完
        if (CONTRACT_STATUS[hit.contract] === 'done') throw hit;
    }, timeout);
}

/** 靜態檢查類的驗收：條件成立＝還沒做到，當作待辦。 */
export function pendingIf(contract: ContractId, condition: boolean, what: string): void {
    if (condition) throw new ContractPending(contract, what);
}
