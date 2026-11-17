import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import manifest from './MANIFEST.json';

/**
 * 契約檔防竄改：受保護的契約檔（紅色驗收與它們的共用工具）內容雜湊記在 MANIFEST.json。
 * 改了任何一個而沒更新清單，這則就失敗——所以「改驗收」一定會出現在 diff 裡，審查時看得到。
 * 實作者不改這些檔（只改 status.ts）；驗收本身寫錯時回報，由終審者修並更新清單。
 * 雜湊前把行尾統一成 LF（git 在 Windows 會換成 CRLF）。
 */
const DIR = __dirname;
const PROTECTED = fs.readdirSync(DIR).filter((f) => /\.contract\.test\.ts$/.test(f) || f === 'contractTest.ts' || f === 'simState.ts').sort();
const hashOf = (file: string) =>
    createHash('sha256').update(fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

describe('contracts/MANIFEST', () => {
    it('受保護的契約檔和清單一致', () => {
        const actual = Object.fromEntries(PROTECTED.map((f) => [f, hashOf(f)]));
        expect(actual).toEqual(manifest.files);
    });
});
