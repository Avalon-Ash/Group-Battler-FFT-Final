import type { ContractId } from '../../engine/core/ContractPending';

/**
 * 每一包契約的狀態。這是實作者唯一可以改的契約檔：
 *  - pending：還沒開始。這包的每一則紅色驗收都必須停在 ContractPending（空殼）；
 *             有一則「已經通過」就會失敗，提醒把狀態改成 done。
 *  - done：開始實作就改成 done。之後這包的驗收不再容忍 ContractPending，必須真的通過。
 * 其他契約檔（*.contract.test.ts、contractTest.ts、simState.ts）受保護，雜湊記在 MANIFEST.json；
 * 覺得驗收本身寫錯了就回報，不自己改。
 */
export const CONTRACT_STATUS: Record<ContractId, 'pending' | 'done'> = {
    S2: 'done',
    S3: 'done',
    G2: 'done',
    G3: 'done',
    G4: 'done',
    R1: 'done',
    R2: 'done',
    R3: 'done',
    U1: 'done',
    P1: 'pending',
    P2: 'done',
    P5: 'pending',
};
