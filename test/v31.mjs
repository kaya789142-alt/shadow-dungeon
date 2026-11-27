import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const {defaultBrowserType,...tablet}=devices['iPad Pro 11 landscape']
const key='shadow-dungeon.v1'
const jobs=['knight','archer','mage','assassin','paladin']
try{
 const page=await browser.newPage(tablet)
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('dialog',dialog=>dialog.accept())
 const button=(name)=>page.getByRole('button',{name,exact:true})
 const save=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
 await page.goto(base)
 async function enter(job){
  await button(job?'新的冒險':'開始冒險').click()
  await page.getByLabel('角色名稱').fill('稽核旅人')
  await page.locator('[data-action="job:'+job+'"]').click()
  await button('進入燼燈村').click()
 }
 await enter(0)
 const coverage=()=>page.evaluate(()=>{
  const stage=document.querySelector('.stage').getBoundingClientRect()
  const panels=Array.from(document.querySelectorAll('.player-card,.map-card,.world-side,.joystick,.log,.log-toggle,.combat,.boss-bar,.dock-panel .dialog'))
  const rectangles=panels.flatMap(node=>{
   const style=getComputedStyle(node),box=node.getBoundingClientRect()
   if(style.visibility==='hidden'||style.display==='none'||!box.width||!box.height)return []
   return [{x:Math.max(stage.left,box.left),y:Math.max(stage.top,box.top),right:Math.min(stage.right,box.right),bottom:Math.min(stage.bottom,box.bottom)}]
  }).filter(r=>r.x<r.right&&r.y<r.bottom)
  let covered=0
  const x=[...new Set(rectangles.flatMap(r=>[r.x,r.right]))].sort((a,b)=>a-b)
  for(let i=1;i<x.length;i++){
   const active=rectangles.filter(r=>r.x<x[i]&&r.right>x[i-1]).sort((a,b)=>a.y-b.y)
   let height=0,end=-Infinity
   for(const r of active){
    height+=Math.max(0,r.bottom-Math.max(end,r.y))
    end=Math.max(end,r.bottom)
   }
   covered+=(x[i]-x[i-1])*height
  }
  return (1-covered/(stage.width*stage.height))*100
 })
 await button('全螢幕').tap()
 await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('#app').classList.contains('immersive'))
 const free=[await coverage()]
 for(const panel of ['背包','裝備','技能','任務','商店','角色資訊']){
  await button(panel).tap()
  await page.locator('.dock-panel.open .panel-body').waitFor()
  free.push(await coverage())
  await button('收合視窗').tap()
  assert.equal(await page.locator('.panel-body').count(),0)
  await button('展開視窗').tap()
  await button('縮小視窗').tap()
  assert.equal(await page.locator('.panel-body').count(),0)
  await button('還原視窗').tap()
  await button('關閉視窗').tap()
 }
 assert.ok(Math.min(...free)>=80,free.join(', '))
 console.log('iPad 1194×834，全螢幕：預設及六面板未遮蔽範圍',free.map(value=>value.toFixed(1)+'%').join(' / '))
 const headings=[['d'],['d','s'],['s'],['a','s'],['a'],['a','w'],['w'],['d','w']]
 for(const [direction,keys] of headings.entries()){
  for(const k of keys)await page.keyboard.down(k)
  await page.waitForFunction(value=>document.querySelector('#game').dataset.facing===String(value),direction)
  for(const k of keys)await page.keyboard.up(k)
 }
 for(let job=0;job<jobs.length;job++){
  if(job){await button('暗影地下城首頁').tap();await enter(job)}
  await page.keyboard.down('d')
  await page.waitForFunction(name=>name==='knight'?document.querySelector('#game').dataset.pose?.match(/^sample-directions:(stride|pass)-/):document.querySelector('#game').dataset.pose?.startsWith('motion-'+name+':stride'),jobs[job])
  await page.keyboard.up('d')
  await button('普通攻擊').tap()
  await page.waitForFunction(name=>name==='knight'?document.querySelector('#game').dataset.pose?.startsWith('sample-directions:attack-'):document.querySelector('#game').dataset.pose==='motion-'+name+':strike',jobs[job])
 }
 console.log('八方向輸入與五職業專用步行／攻擊圖格通過')
 await button('暗影地下城首頁').tap()
 await page.evaluate(key=>{
  const hero=JSON.parse(localStorage.getItem(key))
  Object.assign(hero,{level:50,zone:0,x:805,y:552,skills:[5,5,5,5,5]})
  localStorage.setItem(key,JSON.stringify(hero))
 },key)
 await page.reload()
 await button('繼續冒險').click()
 await page.keyboard.press('d',{delay:65})
 await page.keyboard.press('2')
 await page.waitForFunction(()=>document.querySelector('#game').dataset.pose==='motion-paladin:channel')
 await page.evaluate(()=>window.initialPlayCanvas=document.querySelector('#game canvas'))
 const travel=async(zone)=>{
  await button('開啟區域地圖').click()
  await page.locator('[data-action="road-to:'+zone+'"]').click()
  await page.waitForFunction(([id,zone])=>JSON.parse(localStorage.getItem(id)).zone===zone,[key,zone],{timeout:30000})
 }
 await travel(8)
 assert.ok((await save()).y>950)
 await travel(1)
 assert.ok(await page.evaluate(()=>window.initialPlayCanvas===document.querySelector('#game canvas')))
 assert.ok(Number(await page.locator('#game').getAttribute('data-maps'))<=2)
 console.log('燼燈村步行至灰港，再跨區進幽暗森林，持續使用原 Canvas')
 assert.deepEqual(errors,[])
}finally{await browser.close()}
