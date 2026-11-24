import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const {defaultBrowserType,...tablet}=devices['iPad Pro 11 landscape']
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
try{
 const page=await browser.newPage(tablet)
 const session=await page.context().newCDPSession(page)
 await session.send('Performance.enable')
 await session.send('HeapProfiler.enable')
 const button=(name)=>page.getByRole('button',{name,exact:true})
 await page.goto(base)
 await button('開始冒險').click()
 await page.getByLabel('角色名稱').fill('地圖記憶體')
 await button('進入燼燈村').click()
 await button('暗影地下城首頁').click()
 await page.evaluate(()=>{
  const id='shadow-dungeon.v1'
  const hero=JSON.parse(localStorage.getItem(id))
  hero.level=50
  hero.items.warp=30
  localStorage.setItem(id,JSON.stringify(hero))
 })
 await page.reload()
 await button('繼續冒險').click()
 const heap=async()=>{
  await session.send('HeapProfiler.collectGarbage')
  const {metrics}=await session.send('Performance.getMetrics')
  return metrics.find(metric=>metric.name==='JSHeapUsedSize').value
 }
 const before=await heap()
 let peak=before
 for(const zone of [1,3,4,6,9,10,0,1,3,0]){
  await button('開啟區域地圖').click()
  await page.locator(`[data-action="travel-to:${zone}"]`).click()
  await page.waitForFunction(zone=>JSON.parse(localStorage.getItem('shadow-dungeon.v1')).zone===zone,zone)
  assert.equal(await page.locator('#game').getAttribute('data-maps'),'1')
  peak=Math.max(peak,await heap())
 }
 const after=await heap()
 assert.ok(after-before<8*1024*1024,'JavaScript heap should stabilize after travelling')
 console.log('十次傳送後 JS heap／起始／峰值（MiB）',...[after,before,Math.max(peak,after)].map(n=>(n/1024/1024).toFixed(2)))
 console.log('每次傳送皆最多留存 1 張地圖紋理。這是瀏覽器 JS heap 取樣。')
}finally{await browser.close()}
