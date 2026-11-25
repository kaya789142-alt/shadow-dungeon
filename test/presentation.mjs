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
   window.lastMedia=this
  }
 })
 const requests=[],art=[]
 page.on('request',request=>{if(request.url().includes('/score-v22/'))requests.push(request.url());if(request.url().includes('/art-v22/'))art.push(request.url())})
 await page.goto(base)
 await button(page,'開始冒險').waitFor()
 assert.equal(await page.locator('#app').getAttribute('data-font'),'noto-sans-tc')
 assert.ok(Number(await page.locator('#game').getAttribute('data-art'))>=40)
 assert.ok(art.some(url=>url.endsWith('/knight-motion.json')))
 assert.ok(art.some(url=>url.endsWith('/fountain.webp')))
 assert.deepEqual(requests,[],'initial load must not request music')
 assert.equal(await page.locator('#app').getAttribute('data-text-size'),'standard')
 assert.ok(await size(page)>1.4,'iPad backing buffer must exceed CSS resolution')
 await button(page,'開始冒險').tap()
 await musicReady(page,'title')
 await page.getByLabel('角色名稱').fill('畫質驗證')
 await button(page,'進入燼燈村').tap()
 await musicReady(page,'village')
 const resumes=await page.evaluate(()=>{
  window.lastMedia.pause()
  return window.played.filter(url=>url.endsWith('/village.m4a')).length
 })
 await button(page,'設定').tap()
 await page.waitForFunction(before=>window.played.filter(url=>url.endsWith('/village.m4a')).length>before,resumes)
 await button(page,'關閉視窗').tap()
 const visible=page.locator('#world-text .world-text').filter({hasText:/^藥水商人$/})
 assert.equal(await visible.evaluate(node=>getComputedStyle(node).fontSize),'13px')
 assert.equal(await page.locator('.player-title').evaluate(node=>getComputedStyle(node).fontSize),'15px')
 const perf=await page.evaluate(()=>new Promise(resolve=>{
  const start=performance.now()
  let frames=0
  function tick(time){
   frames++
   if(time-start<1700)requestAnimationFrame(tick)
   else resolve({hz:Math.round(frames*1000/(time-start)),ratio:document.querySelector('#game canvas').width/devicePixelRatio})
  }
  requestAnimationFrame(tick)
 }))
 assert.ok(perf.hz>=29,'headless iPad scene should reach at least 29 frames per second')
 console.log('iPad 解析度模擬靜止場景的 requestAnimationFrame 約 '+perf.hz+' FPS')

 await button(page,'設定').tap()
 await page.getByLabel('字體大小').selectOption('1.35')
 await page.getByLabel('畫質').selectOption('balanced')
 assert.equal(await size(page),1)
 await page.getByLabel('畫質').selectOption('ultra')
 assert.ok(await size(page)>1.4)
 assert.equal(await page.locator('#app').getAttribute('data-text-size'),'large')
 const title=await page.getByText('暗影地下城 V3.1',{exact:true}).last()
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
  assert.ok(Number(await page.locator('#game').getAttribute('data-maps'))<=2)
 }
 assert.deepEqual(errors,[])
 const failed=await browser.newContext({serviceWorkers:'block'})
 const existing=await page.evaluate(()=>localStorage.getItem('shadow-dungeon.v1'))
 await failed.addInitScript(save=>localStorage.setItem('shadow-dungeon.v1',save),existing)
 const failedPage=await failed.newPage()
 await failedPage.route('**/art-v22/knight.webp',route=>route.fulfill({status:404}))
 await failedPage.goto(base)
 await failedPage.getByRole('heading',{name:'資源載入失敗'}).waitFor()
 assert.equal(await failedPage.evaluate(()=>localStorage.getItem('shadow-dungeon.v1')),existing)
 await failed.close()

 console.log('iPad 模擬：Retina、大字體、全螢幕、NPC 觸控、首頁／村莊／森林／墓園／地下城／戰鬥／魔王配樂')
}finally{await browser.close()}
