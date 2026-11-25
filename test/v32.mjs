import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const evidence=process.env.SHADOW_EVIDENCE_DIR
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const key='shadow-dungeon.v1'
try{
 for(const device of ['iPad Pro 11 landscape','iPhone 13']){
  const page=await browser.newPage(devices[device])
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const action=name=>page.locator(`[data-action="${name}"]`)
  const button=name=>page.getByRole('button',{name,exact:true})
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
  const shot=async name=>{
   if(evidence&&device.startsWith('iPad'))await page.screenshot({path:`${evidence}/${name}.png`,scale:'css'})
  }
  await page.goto(base)
  await button('開始冒險').tap()
  await page.getByLabel('角色名稱').fill('星燈旅人')
  await button('進入燼燈村').tap()
  await button('暗影地下城首頁').tap()
  await page.evaluate(key=>{
   const save=JSON.parse(localStorage.getItem(key))
   const gear=(uid,slot,grade,tier,job)=>({uid,slot,grade,tier,job,plus:0,roll:1,identified:true})
   const sword=gear('v32-sword',0,0,2,0)
   save.worn[0]=sword
   save.bag=[
    gear('v32-belt',9,1,6),gear('v32-mail',3,1,4),
    gear('v32-ring',8,2,6),gear('v32-locked',7,2,3),
    gear('v32-helm',2,0,5),gear('v32-bow',0,0,3,1)
   ]
   save.items.shard=4
   save.locks=['v32-locked']
   save.drops[0]=[{x:805,y:552,gold:0,gear:gear('v32-loot',8,0,1),material:'warp'}]
   delete save.itemAcquiredAt
   localStorage.setItem(key,JSON.stringify(save))
  },key)
  await page.reload()
  await button('繼續冒險').tap()
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).bag.some(g=>g.uid==='v32-loot'),key)
  assert.equal((await read()).items.warp,2)
  await button('裝備').tap()
  assert.equal(await page.locator('.doll-slot').count(),10)
  assert.equal(await page.locator('[data-worn-layer="0"]').count(),1)
  await action('doll-slot:9').tap()
  await action('compare:v32-belt').tap()
  assert.ok(await page.getByText('戰力指標',{exact:true}).isVisible())
  const before=await page.locator('.doll-stats').textContent()
  await action('equip:v32-belt').tap()
  assert.equal((await read()).worn[9].uid,'v32-belt')
  assert.equal(await page.locator('[data-worn-layer="9"]').count(),1)
  assert.notEqual(await page.locator('.doll-stats').textContent(),before)
  await page.locator('.panel-body').evaluate(panel=>{panel.scrollTop=0})
  await shot('paper-doll')
  await action('unequip:9').tap()
  assert.equal(await page.locator('[data-worn-layer="9"]').count(),0)
  await action('doll-slot:0').tap()
  assert.equal(await action('equip:v32-bow').count(),0)
  await button('關閉視窗').tap()

  await button('背包').tap()
  await action('bag-tab:accessories').tap()
  assert.equal(await action('compare:v32-loot').count(),1)
  assert.equal(await action('compare:v32-belt').count(),0)
  await page.getByLabel('排序方式').selectOption('recent')
  assert.equal(await page.locator('[data-action^="compare:"]').first().getAttribute('data-action'),'compare:v32-loot')
  await page.getByLabel('排序方式').selectOption('quality')
  assert.equal(await page.locator('[data-action^="compare:"]').first().getAttribute('data-action'),'compare:v32-ring')
  await action('bag-tab:scrolls').tap()
  assert.ok(await page.getByText('傳送卷軸',{exact:true}).isVisible())
  await action('bag-tab:quest').tap()
  assert.ok(await page.getByText('影晶碎片',{exact:true}).isVisible())
  await shot('bag')
  await button('關閉視窗').tap()

  await button('商店').tap()
  await button('出售分頁').tap()
  assert.equal(await action('sell:v32-sword').count(),0)
  assert.equal(await action('sell:v32-locked').count(),0)
  assert.equal(await action('sell-material:shard').count(),0)
  const gold=(await read()).gold
  for(const id of ['v32-mail','v32-helm'])await page.locator(`[data-sale-id="${id}"]`).check()
  await button('出售所選').tap()
  assert.match(await page.locator('.panel-body [role="status"]').textContent(),/2 件.*55 金幣/)
  await shot('sale-preview')
  await button('確認出售').tap()
  assert.equal((await read()).gold,gold+55)
  await page.getByLabel('整批品質').selectOption('2')
  await button('出售此品質').tap()
  await button('確認出售').tap()
  assert.equal((await read()).gold,gold+55)
  assert.ok(await button('再次確認出售').isVisible())
  await shot('rare-confirmation')
  await button('再次確認出售').tap()
  assert.equal((await read()).gold,gold+117)
  const save=await read()
  assert.deepEqual(save.bag.map(g=>g.uid).sort(),['v32-belt','v32-bow','v32-locked','v32-loot'])
  assert.equal(save.items.shard,4)
  assert.deepEqual(errors,[])
  console.log(device+': 紙娃娃、舊欄位、職業限制、拾取分類、排序及兩種批次出售通過')
  await page.close()
 }
}finally{await browser.close()}
