import { chromium } from 'playwright';
const b = await chromium.launch();
const BASE = 'http://localhost:4000';
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[autocomplete="username"]');
await p.fill('input[autocomplete="username"]', 'manager');
await p.fill('input[autocomplete="current-password"]', '1234');
await Promise.all([ p.waitForNavigation({waitUntil:'domcontentloaded'}).catch(()=>{}), p.click('button[type="submit"]') ]);
await new Promise(r=>setTimeout(r,1500));
const url = p.url();
console.log('현재 URL:', url);
const info = await p.evaluate(() => {
  const inputs = [...document.querySelectorAll('input.amount-input')];
  return {
    inputCount: inputs.length,
    inputDisabled: inputs.every(i => i.readOnly || i.disabled),
    sampleReadOnly: inputs[0] ? inputs[0].readOnly : null,
    topText: (document.querySelector('main')||{}).innerText ? document.querySelector('main').innerText.slice(0,120) : '',
  };
});
console.log('입력칸 수:', info.inputCount, '| 전체 비활성:', info.inputDisabled, '| 첫칸 readOnly:', info.sampleReadOnly);
console.log('화면 상단:', info.topText.replace(/\n/g,' | '));
await p.screenshot({ path: 'shots/m_manager_diag.png', fullPage: true });
await b.close();
console.log('OK m_manager_diag.png');
