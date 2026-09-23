// Independently render the exported ink SVG; then check its topology and polarity.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const svg=await readFile(path.join(root,'assets/reverse-ink/sv/details/colorless-dark-network.svg'),'utf8');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
try {
  const page=await browser.newPage({viewport:{width:740,height:384},deviceScaleFactor:1});
  await page.setContent(`<style>html,body{margin:0;background:#eeeee5;color:#747970}svg{display:block;width:740px;height:384px}</style>${svg}`);
  await page.screenshot({path:path.join(root,'research/reverse-ink/review/patterns/dark-network-correction/svg-render.png')});
} finally {
  await browser.close();
}
execFileSync('python',['scripts/reverse_ink/trace_network_detail.py','--verify-svg-render'],{cwd:root,stdio:'inherit'});
