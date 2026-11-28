import assert from 'node:assert/strict'
import { chromium,devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const baseline=process.env.SHADOW_BASELINE_URL
const evidence=process.env.SHADOW_EVIDENCE_DIR
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const key='shadow-dungeon.v1'

try{
 for(const [side,url] of [...(baseline?[['before',baseline]]:[]),['after',base]]){
  const page=await browser.newPage(devices['iPad Pro 11 landscape'])
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const button=name=>page.getByRole('button',{name,exact:true})
  const action=name=>page.locator(`[data-action="${name}"]`)
  const screenshot=async name=>{
   if(evidence)await page.screenshot({path:`${evidence}/${side}-${name}.png`,scale:'css'})
  }
  const close=()=>button('關閉視窗').tap()
  const change=async(zone,x=805,y=552)=>{
   await button('暗影地下城首頁').tap()
   await page.evaluate(({key,zone,x,y})=>{
    const hero=JSON.parse(localStorage.getItem(key))
    Object.assign(hero,{zone,x,y,level:50,hp:1600,mp:830,gold:700,tracking:'hunt0'})
    hero.quests.hunt0??=0
    if(!hero.worn[0])hero.worn[0]=hero.bag.shift()
    localStorage.setItem(key,JSON.stringify(hero))
   },{key,zone,x,y})
   await page.reload()
   await button('繼續冒險').tap()
   await page.waitForFunction(()=>!!document.querySelector('#game').dataset.pose)
  }
  await page.goto(url)
  await button('開始冒險').tap()
  await page.getByLabel('角色名稱').fill('暮光旅人')
  await action('job:2').tap()
  await button('進入燼燈村').tap()
  await change(0)
  await screenshot('village')
  await button('裝備').tap()
  await screenshot('doll')
  await close()
  await button('背包').tap()
  await action('bag-tab:scrolls').tap()
  await screenshot('bag')
  await close()
  await button('商店').tap()
  await button('出售分頁').tap()
  if(side==='after'){
   await button('開啟整備與交易').tap()
   for(const name of ['出售區域','人物紙娃娃','背包及道具'])assert.ok(await page.getByRole('region',{name}).isVisible())
   await screenshot('trade')
   await page.locator('.trade-sell [data-action^="sell:"]').first().tap()
   assert.match(await page.locator('.trade-sell [role="status"]').textContent(),/1 件/)
   const gold=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).gold,key)
   await button('確認出售').tap()
   assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).gold,key),gold+13)
  }
  if(side==='before')await screenshot('trade')
  await close()
  await button('技能').tap()
  await screenshot('skills')
  if(side==='after'){
   assert.equal(await page.locator('.tree-node').count(),5)
   await action('learn:1').tap()
   assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).skills[1],key),1)
   await page.locator('.panel-body').evaluate(panel=>{panel.scrollTop=0})
  }
  await close()
  await button('開啟區域地圖').tap()
  if(side==='after'){
   assert.equal(await page.locator('.realm-marker').count(),16)
   assert.match(await action('map-zone:1').getAttribute('aria-label'),/任務目標/)
   await action('map-zone:1').tap()
   assert.equal(await action('map-zone:1').getAttribute('aria-pressed'),'true')
   assert.ok(await action('road-to:1').isVisible())
  }
  await screenshot('map')
  await close()
  await button('設定').tap()
  if(side==='after'){
   await page.getByLabel('主音量',{exact:true}).evaluate(input=>{
    input.value='.55'
    input.dispatchEvent(new Event('input',{bubbles:true}))
   })
   await page.getByLabel('傷害浮動文字').uncheck()
   assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).preferences.master,key),.55)
   assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).preferences.damageText,key),false)
   await page.getByLabel('傷害浮動文字').check()
   await page.locator('.panel-body').evaluate(panel=>{panel.scrollTop=0})
  }
  await screenshot('settings')
  await close()
  await change(1)
  await screenshot('forest')
  await change(6,670,543)
  await button('切換自動練功').tap()
  await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)).bestiary).some(count=>count>0),key)
  await page.waitForFunction(()=>['strike','channel'].some(pose=>document.querySelector('#game').dataset.pose?.endsWith(':'+pose)))
  await screenshot('dungeon')
  await button('暗影地下城首頁').tap()
  if(side==='after'){
   await button('新的冒險').tap()
   await page.getByLabel('角色名稱').fill('晨星旅人')
   await action('job:4').tap()
   await button('進入燼燈村').tap()
   await button('暗影地下城首頁').tap()
   await button('選擇角色').tap()
   assert.equal(await page.locator('.roster-character').count(),2)
   await screenshot('roster')
   const original=page.locator('.roster-character').filter({hasText:'暮光旅人'})
   await original.getByRole('button',{name:'進入冒險'}).tap()
   const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
   assert.equal(current.name,'暮光旅人')
   assert.equal(current.zone,6)
   assert.equal(current.skills[1],1)
   await button('暗影地下城首頁').tap()
   await button('選擇角色').tap()
   const backup=page.locator('.roster-character').filter({hasText:'晨星旅人'})
   let prompts=0,deleteAllowed=false
   page.on('dialog',dialog=>{prompts++;return deleteAllowed||prompts===1?dialog.accept():dialog.dismiss()})
   await backup.getByRole('button',{name:'刪除角色'}).tap()
   assert.equal(prompts,2)
   assert.equal(await page.locator('.roster-character').count(),2)
   deleteAllowed=true
   await backup.getByRole('button',{name:'刪除角色'}).tap()
   assert.equal(prompts,4)
   assert.equal(await page.locator('.roster-character').count(),1)
  }else{
   await button('新的冒險').tap()
   await screenshot('roster')
  }
  assert.deepEqual(errors,[])
  console.log(side+'：同解析度遊戲畫面已驗證')
  await page.close()
 }
 const phone=await browser.newPage(devices['iPhone 13'])
 const tap=name=>phone.getByRole('button',{name,exact:true}).tap()
 await phone.goto(base)
 await tap('開始冒險')
 await phone.getByLabel('角色名稱').fill('手機驗收')
 await tap('進入燼燈村')
 await tap('商店')
 await tap('出售分頁')
 await tap('開啟整備與交易')
 assert.ok(await phone.getByRole('region',{name:'出售區域'}).isVisible())
 assert.ok(!await phone.getByRole('region',{name:'人物紙娃娃'}).isVisible())
 await tap('人物')
 assert.ok(await phone.getByRole('region',{name:'人物紙娃娃'}).isVisible())
 await phone.getByRole('dialog',{name:'整備與交易'}).getByRole('button',{name:'背包',exact:true}).tap()
 assert.ok(await phone.getByRole('region',{name:'背包及道具'}).isVisible())
 console.log('iPhone 13 模擬：整備分頁與適應窄螢幕通過')

}finally{await browser.close()}
