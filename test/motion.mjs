import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const evidence=process.env.SHADOW_EVIDENCE_DIR
const key='shadow-dungeon.v1'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
try{
 const page=await browser.newPage(devices['iPad Pro 11 landscape'])
 const failures=[]
 page.on('pageerror',error=>failures.push(error.message))
 const button=name=>page.getByRole('button',{name,exact:true})
 const files=new Set()
 page.on('response',response=>{
  if(response.ok()&&response.url().includes('/art-motion/'))files.add(response.url().split('/').at(-1))
 })
 await page.goto(base)
 await button('開始冒險').tap()
 await page.getByLabel('角色名稱').fill('林地巡弓')
 await page.locator('[data-action="job:1"]').tap()
 await button('進入燼燈村').tap()
 assert.equal(files.size,16)
 if(evidence)await page.screenshot({path:evidence+'/village-work.png',scale:'css'})
 await button('暗影地下城首頁').tap()
 await page.evaluate(key=>{
  const hero=JSON.parse(localStorage.getItem(key))
  Object.assign(hero,{zone:1,x:210,y:535,level:5,gold:417,hp:170})
  hero.worn[0]=hero.bag.shift()
  localStorage.setItem(key,JSON.stringify(hero))
 },key)
 await page.reload()
 await button('繼續冒險').tap()
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).gold,key),417)
 await page.evaluate(()=>{
  window.timeline=[]
  const sample=time=>{
   const pose=document.querySelector('#game').dataset.pose
   const victim=[...document.querySelectorAll('.world-text.damage')].some(node=>{
    const color=node.style.color
    return color!=='rgb(255, 157, 148)'&&color!=='rgb(255, 229, 166)'
   })
   window.timeline.push({pose,victim,time})
   if(window.timeline.length<70)requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
 })
 await button('普通攻擊').tap()
 await page.waitForFunction(()=>window.timeline.some(row=>row.pose==='stage-archer:contact'))
 if(evidence)await page.screenshot({path:evidence+'/archer-release.png',scale:'css'})
 await page.waitForFunction(()=>window.timeline.some(row=>row.victim))
 const rows=await page.evaluate(()=>window.timeline)
 const contact=rows.find(r=>r.pose==='stage-archer:contact')
 const damage=rows.find(r=>r.victim)
 assert.ok(rows.some(r=>r.pose==='stage-archer:draw'))
 assert.ok(damage.time-contact.time>=180,{contact,damage})
 assert.deepEqual(failures,[])
 console.log('八套圖集已載入，舊角色金幣保留，放箭後 '+Math.round(damage.time-contact.time)+'ms 才顯示命中判定')
}finally{await browser.close()}
