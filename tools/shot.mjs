// Chụp màn hình bằng Chrome không giao diện.
// node shot.mjs <url> <prefix> <w> <h> <waitMs> <stepsJSON>
// steps: {"click":"chữ","exact":true,"wait":600} | {"eval":"js"} | {"shot":"tên"} | {"wait":ms}
import puppeteer from 'puppeteer-core'
const [, , url, prefix, w = '1920', h = '1080', waitMs = '800', steps = '[]'] = process.argv
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files', '--no-sandbox'],
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.setViewport({ width: +w, height: +h })
await page.goto(url, { waitUntil: 'load' })
await new Promise((r) => setTimeout(r, +waitMs))
for (const s of JSON.parse(steps)) {
  if (s.click) {
    const ok = await page.evaluate((t, exact) => {
      const els = [...document.querySelectorAll('button,a,[role=button]')]
      const el = els.find((e) => { const x = e.textContent.trim().toLowerCase(); return exact ? x === t.toLowerCase() : x.includes(t.toLowerCase()) })
      if (el) { el.click(); return true }
      return false
    }, s.click, !!s.exact)
    if (!ok) errors.push('không thấy nút: ' + s.click)
  }
  if (s.eval) await page.evaluate(s.eval)
  await new Promise((r) => setTimeout(r, s.wait ?? 500))
  if (s.shot) await page.screenshot({ path: `${prefix}${s.shot}.png` })
}
if (errors.length) console.log(errors.join('\n'))
await browser.close()
