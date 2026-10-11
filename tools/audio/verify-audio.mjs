/**
 * Headless Audio Decoding & RMS Loudness Verification Harness
 * Run: node tools/audio/verify-audio.mjs
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const launchBrowser = async () => {
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true });
    }
    for (const channel of ['msedge', 'chrome']) {
        try {
            return await chromium.launch({ channel, headless: true });
        } catch {}
    }
    throw new Error('No Edge/Chrome browser found for playwright-core. Please install one or set E2E_BROWSER_PATH.');
};

async function main() {
    console.log('🚀 Starting Vite dev server for audio verification...');
    const server = await createServer({
        server: { port: 3198, strictPort: false, host: '127.0.0.1' },
        logLevel: 'error'
    });
    await server.listen();
    const serverUrl = server.resolvedUrls.local[0];
    const previewUrl = `${serverUrl}tools/audio/preview.html`;

    console.log(`🌐 Launching headless browser on ${previewUrl}...`);
    const browser = await launchBrowser();
    const page = await browser.newPage();

    const consoleLogs = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleLogs.push(msg.text());
        }
    });

    try {
        await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });

        // 等待音訊解碼完成旗標
        console.log('⏳ Waiting for audio assets decoding and RMS measurement...');
        await page.waitForFunction(() => window.__AUDIO_PREVIEW_READY__ === true, { timeout: 15000 });

        const results = await page.evaluate(() => window.__AUDIO_DECODE_RESULTS__);
        if (!results) {
            throw new Error('window.__AUDIO_DECODE_RESULTS__ is null or undefined!');
        }

        console.log('\n📊 Audio Asset Decoding & Loudness Report:');
        console.log('─'.repeat(80));
        console.log(
            'Cue ID'.padEnd(16) +
            'File Name'.padEnd(28) +
            'Dur (s)'.padEnd(10) +
            'Rate (Hz)'.padEnd(12) +
            'RMS (dB)'.padEnd(10) +
            'Status'
        );
        console.log('─'.repeat(80));

        const sortedFiles = Object.values(results.files).sort((a, b) => a.cueId.localeCompare(b.cueId));
        for (const f of sortedFiles) {
            const shortName = f.file.split('/').pop() || f.file;
            const durStr = f.duration ? f.duration.toFixed(2) : '--';
            const rateStr = f.sampleRate ? String(f.sampleRate) : '--';
            const rmsStr = f.rmsDb !== undefined && f.rmsDb !== -Infinity ? f.rmsDb.toFixed(1) : '--';
            const statusStr = f.success ? '✅ PASS' : '❌ FAIL';

            console.log(
                f.cueId.padEnd(16) +
                shortName.padEnd(28) +
                durStr.padEnd(10) +
                rateStr.padEnd(12) +
                rmsStr.padEnd(10) +
                statusStr
            );
        }
        console.log('─'.repeat(80));

        console.log(`\nTotal assets evaluated: ${results.total}`);
        console.log(`Successfully decoded:   ${results.passed} / ${results.total}`);
        console.log(`Failed assets:          ${results.failed.length}`);

        if (results.failed.length > 0) {
            console.error('\n❌ The following audio files failed decoding:');
            for (const f of results.failed) {
                console.error(`  - ${f}`);
            }
            process.exitCode = 1;
        } else {
            console.log('\n✨ All audio files decoded successfully with 0 errors!\n');
            process.exitCode = 0;
        }
    } catch (err) {
        console.error('❌ Verification failed with error:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
        await server.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
