import assert from 'node:assert/strict'
import {chromium,devices} from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const duration=Number(process.env.SHADOW_SOAK_SECONDS??90)
const key='shadow-dungeon.v1'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
try{
 const page=await browser.newPage(devices['iPad Pro 11 landscape'])
 page.on('pageerror',error=>errors.push(error.message))
 const errors=[], button=(name)=>page.getByRole('button',{name,exact:true})
 await page.goto(base)
 await button('開始冒險').click()
 await page.getByLabel('角色名稱').fill('穩定性取樣')
 await page.locator('[data-action="job:2"]').click()
 await button('進入燼燈村').click()
 await button('暗影地下城首頁').click()
 await page.evaluate(key=>{
  const hero=JSON.parse(localStorage.getItem(key))
  Object.assign(hero,{level:50,zone:1,x:190,y:535,hp:450,mp:220})
  localStorage.setItem(key,JSON.stringify(hero))
 },key)
 await page.reload()
 await button('繼續冒險').click()
 await button('切換自動練功').click()
 const frames=await page.evaluate(duration=>new Promise(resolve=>{
  const start=performance.now()
  let count=0,slow=0,last=start
  function tick(now){
   if(now-last>34)slow++
   count++;last=now
   if(now-start>=duration*1000)resolve({average:Math.round(count*1000/(now-start)),slow})
   else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
 }),duration)
 const hero=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
 const kills=Object.values(hero.bestiary).reduce((total,n)=>total+n,0)
 assert.ok(kills>=3)
 assert.ok(hero.gold>180)
 assert.equal(new Set(hero.bag.map(item=>item.uid)).size,hero.bag.length)
 assert.ok(Number(await page.locator('#game').getAttribute('data-maps'))<=2)
 assert.deepEqual(errors,[])
 console.log(duration+' 秒自動練功，擊殺 '+kills+'，金幣 '+hero.gold+'，平均 rAF 約 '+frames.average+' FPS，超過 34ms 間隔 '+frames.slow+' 次')
}finally{await browser.close()}
