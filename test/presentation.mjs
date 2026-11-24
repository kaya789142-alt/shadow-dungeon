import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const button=(page,name)=>page.getByRole('button',{name,exact:true})
const musicReady=(page,clip)=>page.waitForFunction(clip=>window.played?.some(src=>src.endsWith('/'+clip+'.m4a')),clip,{timeout:15000})
const size=page=>page.locator('#game canvas').evaluate(canvas=>canvas.width/canvas.getBoundingClientRect().width)
try{
 const {defaultBrowserType,...options}=devices['iPad Pro 11 landscape']
 const page=await browser.newPage(options)
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(()=>{
  window.played=[]
  const play=HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play=async function(){
   await play.call(this)
   window.played.push(this.currentSrc)
  }
 })
 const requests=[]
 page.on('request',request=>{if(request.url().includes('/score/'))requests.push(request.url())})
 await page.goto(base)
 await button(page,'開始冒險').waitFor()
 assert.deepEqual(requests,[],'initial load must not request music')
 assert.ok(await size(page)>1.4,'iPad backing buffer must exceed CSS resolution')
 await button(page,'開始冒險').tap()
 await musicReady(page,'title')
 await page.getByLabel('角色名稱').fill('畫質驗證')
 await button(page,'進入燼燈村').tap()
 await musicReady(page,'village')
 await button(page,'設定').tap()
 await page.getByLabel('字體大小').selectOption('1.35')
 await page.getByLabel('畫質').selectOption('balanced')
 assert.equal(await size(page),1)
 await page.getByLabel('畫質').selectOption('ultra')
 assert.ok(await size(page)>1.4)
 assert.equal(await page.locator('#app').getAttribute('data-text-size'),'largest')
 const title=await page.getByText('暗影地下城 V2.1',{exact:true}).last()
 await title.scrollIntoViewIfNeeded()
 assert.ok(await title.isVisible())
 await button(page,'關閉視窗').tap()
 await button(page,'全螢幕').tap()
 await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('#app').classList.contains('immersive'))
 assert.ok(await size(page)>1)
 const npc=page.locator('#world-text .world-text').filter({hasText:/^藥水商人$/})
 const box=await npc.boundingBox()
 assert.ok(box&&await npc.evaluate(node=>getComputedStyle(node).visibility==='visible'))
 // Touch the shopkeeper's torso below the independent HTML name plate.
 await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height+38)
 await page.getByRole('heading',{name:'燼燈市集'}).waitFor({timeout:10000})
 await button(page,'關閉視窗').tap()
 await button(page,'開啟區域地圖').tap()
 await page.locator('[data-action="travel-to:1"]').tap()
 await musicReady(page,'forest')
 await button(page,'切換自動練功').tap()
 await musicReady(page,'battle')
 for(const [zone,x,y,clip] of [[3,177,540,'graveyard'],[6,177,540,'dungeon'],[12,1110,590,'boss']]){
  await button(page,'暗影地下城首頁').tap()
  await page.evaluate(({zone,x,y})=>{
   const key='shadow-dungeon.v1'
   const hero=JSON.parse(localStorage.getItem(key))
   Object.assign(hero,{zone,x,y,level:50,hp:450,mp:240})
   localStorage.setItem(key,JSON.stringify(hero))
  },{zone,x,y})
  await page.reload()
  await button(page,'繼續冒險').tap()
  await musicReady(page,clip)
 }
 assert.deepEqual(errors,[])
 console.log('iPad 模擬：Retina、特大字體、全螢幕、NPC 觸控、首頁／村莊／森林／墓園／地下城／戰鬥／魔王配樂')
}finally{await browser.close()}
