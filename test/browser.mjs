import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const executablePath=process.env.SHADOW_CHROMIUM
const browser=await chromium.launch({executablePath})
const key='shadow-dungeon.v1'
const button=(page,name)=>page.getByRole('button',{name,exact:true})
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
const waitSave=(page,expression)=>page.waitForFunction(([key,expression])=>{
 const save=JSON.parse(localStorage.getItem(key))
 switch(expression){
  case 'move':return save?.quests.move===1
  case 'hunt':return (save?.stats.kill??0)>=1
  case 'loot':return save?.gold>195
  case 'tablet':return save?.zone===1
  default:return false
 }
},[key,expression],{timeout:27000})
const close=page=>button(page,'關閉視窗').click()
async function setup(options={}){
 const context=await browser.newContext(options)
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(base)
 await page.locator('#game canvas').waitFor({state:'visible'})
 return {context,page,errors}
}
async function create(page,name,job){
 await button(page,'開始冒險').click()
 await page.getByLabel('角色名稱').fill(name)
 await page.locator('[data-action="job:'+job+'"]').click()
 await button(page,'進入燼燈村').click()
 assert.equal(await page.locator('#player-name').textContent(),name)
}
async function forest(page){
 await button(page,'開啟區域地圖').click()
 await page.locator('[data-action="travel-to:1"]').click()
 assert.equal(await page.locator('#map-name').textContent(),'幽暗森林')
}
try{
 const desktop=await setup({viewport:{width:1440,height:900},acceptDownloads:true})
 const {page}=desktop
 await create(page,'燼燈測試',2)
 await page.keyboard.down('d')
 await page.waitForTimeout(320)
 await page.keyboard.up('d')
 await waitSave(page,'move')
 await button(page,'任務').click()
 await page.locator('[data-action="claim:move"]').click()
 assert.equal((await read(page)).claims.move,true)
 await close(page)
 await button(page,'背包').click()
 await page.locator('[data-action^="compare:"]').first().click()
 await page.getByRole('heading',{name:'比較主武器'}).waitFor()
 await page.locator('[data-action^="equip:"]').first().click()
 assert.equal((await read(page)).worn[0].job,2)
 await close(page)
 await button(page,'裝備').click()
 await page.locator('[data-action="forge"]').click()
 await page.locator('[data-action^="forge-select:"]').last().click()
 await button(page,'執行強化').click()
 assert.equal((await read(page)).worn[0].plus,1)
 await close(page)
 await button(page,'商店').click()
 await button(page,'藥水商人').click()
 await page.getByRole('spinbutton',{name:'生命藥水購買數量'}).fill('2')
 await page.locator('[data-action="buy:red"]').click()
 assert.equal((await read(page)).items.red,10)
 await button(page,'出售分頁').click()
 await page.getByRole('spinbutton',{name:'瞬間移動卷軸出售數量'}).fill('1')
 await page.locator('[data-action="sell-material:blink"]').click()
 await button(page,'確認出售').click()
 assert.equal((await read(page)).items.blink,1)
 await close(page)
 await forest(page)
 await button(page,'切換自動練功').click()
 await waitSave(page,'hunt')
 await waitSave(page,'loot')
 await button(page,'切換自動練功').click()
 await button(page,'設定').click()
 await page.getByLabel('畫質').selectOption('balanced')
 await page.getByLabel('地面點擊').selectOption('interact')
 await page.getByLabel('啟用爆擊震動').uncheck()
 assert.equal((await read(page)).preferences.detail,'balanced')
 assert.equal((await read(page)).preferences.click,'interact')
 assert.equal((await read(page)).preferences.shake,false)
 const [download]=await Promise.all([page.waitForEvent('download'),button(page,'匯出存檔').click()])
 assert.equal(download.suggestedFilename(),'shadow-dungeon-save.json')
 await page.reload()
 await button(page,'繼續冒險').click()
 assert.equal(await page.locator('#map-name').textContent(),'幽暗森林')
 assert.equal((await read(page)).worn[0].plus,1)
 assert.deepEqual(desktop.errors,[])
 if(process.env.SHADOW_TEST_OFFLINE==='1'){
  await page.evaluate(()=>navigator.serviceWorker.ready)
  await page.waitForFunction(()=>navigator.serviceWorker.controller)
  const manifest=await (await page.request.get(new URL('manifest.webmanifest',base).href)).json()
  assert.equal(manifest.start_url,'./')
  for(const image of manifest.icons)assert.ok((await page.request.get(new URL(image.src,base).href)).ok())
  await desktop.context.setOffline(true)
  await page.reload()
  await button(page,'繼續冒險').click()
  assert.equal(await page.locator('#map-name').textContent(),'幽暗森林')
  assert.deepEqual(desktop.errors,[])
  console.log('正式版：專案子路徑、離線重載、PWA 圖示')
 }
 const sample=await read(page)
 const {preferences,items:{blink,...items},...oldSave}=sample
 await desktop.context.close()
 const expedition=await browser.newContext({viewport:{width:1440,height:900}})
 await expedition.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save))},
  {key,save:{...oldSave,items,level:50,zone:0,x:805,y:552,skills:[5,5,5,5,5]}})
 const map=await expedition.newPage()
 await map.goto(base)
 await button(map,'繼續冒險').click()
 assert.equal((await read(map)).worn[0].plus,1)
 assert.equal((await read(map)).items.blink,0)
 assert.equal((await read(map)).preferences.detail,'high')
 await button(map,'任務').click()
 await map.locator('[data-action="quest-filter:exp"]').click()
 await map.locator('[data-action="accept:harbor"]').click()
 await close(map)
 await button(map,'導航至任務目標').click()
 await map.waitForFunction(()=>document.querySelector('#map-name')?.textContent==='灰港要塞',null,{timeout:15000})
 assert.equal(await map.locator('#map-name').textContent(),'灰港要塞')
 assert.equal((await read(map)).quests.harbor,1)
 await button(map,'開啟區域地圖').click()
 await map.locator('[data-action="travel-to:9"]').click()
 assert.equal(await map.locator('#map-name').textContent(),'沉星遺跡')
 await button(map,'暗影地下城首頁').click()
 await map.evaluate(key=>{
  const hero=JSON.parse(localStorage.getItem(key))
  hero.zone=12;hero.x=1110;hero.y=590;hero.hp=290;hero.mp=210
  localStorage.setItem(key,JSON.stringify(hero))
 },key)
 await map.reload()
 await button(map,'繼續冒險').click()
 await map.getByText('世界魔王・蝕月皇 · 等級 50',{exact:true}).first().waitFor({state:'visible'})
 await expedition.close()
 console.log('V2 遠征：V1 讀檔、任務導航、灰港、遺跡與世界魔王')
 console.log('桌面：角色、移動、任務領取、裝備強化、購物、自動戰鬥、掉寶、匯出、重新載入')
 for(const {label,shape,name,job,expected} of [
  {label:'手機橫式',shape:{...devices['iPhone 13 landscape']},name:'赤箭',job:1,expected:'妖精'},
  {label:'平板橫式',shape:{...devices['iPad Pro 11 landscape']},name:'誓衛',job:4,expected:'聖騎士'},
  {label:'手機直式',shape:{...devices['iPhone 13']},name:'夜刃',job:3,expected:'暗影刺客'}
 ]){
  const {defaultBrowserType,...options}=shape
  const session=await setup(options)
  await create(session.page,name,job)
  assert.equal(await session.page.locator('#player-job').textContent(),expected)
  await button(session.page,'背包').tap()
  await close(session.page)
  const portal=await session.context.newCDPSession(session.page)
  const stick=await session.page.locator('#joystick').boundingBox()
  const x=stick.x+stick.width*.8,y=stick.y+stick.height*.5
  await portal.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
  await session.page.waitForTimeout(420)
  await portal.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await waitSave(session.page,'move')
  const attack=await button(session.page,'普通攻擊').boundingBox()
  assert.ok(attack.x+attack.width<=(options.viewport?.width??0)+1)
  await forest(session.page)
  await waitSave(session.page,'tablet')
  await button(session.page,'切換自動練功').tap()
  await waitSave(session.page,'hunt')
  assert.deepEqual(session.errors,[])
  await session.context.close()
  console.log(label+'：觸控搖桿、快捷按鈕、傳送與戰鬥')
 }
}finally{await browser.close()}
