import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const baseline=process.env.SHADOW_BASELINE_URL
const evidence=process.env.SHADOW_EVIDENCE_DIR
const key='shadow-dungeon.v1'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const dirs=[['d'],['d','s'],['s'],['a','s'],['a'],['a','w'],['w'],['d','w']]
try{
 for(const [version,url] of [...(baseline?[['before',baseline]]:[]),['after',base]]){
  const redesigned=version==='after'
  const page=await browser.newPage(devices['iPad Pro 11 landscape'])
  const errors=[],images=new Set()
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',response=>{if(response.ok()&&response.url().includes('/art-sample/'))images.add(response.url().split('/').at(-1))})
  const button=name=>page.getByRole('button',{name,exact:true})
  const action=name=>page.locator(`[data-action="${name}"]`)
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
  const shot=async name=>{
   if(evidence)await page.screenshot({path:`${evidence}/${version}-${name}.png`,scale:'css'})
  }
  const scene=async(zone,x,y)=>{
   await button('暗影地下城首頁').tap()
   await page.evaluate(({key,zone,x,y})=>{
    const hero=JSON.parse(localStorage.getItem(key))
    Object.assign(hero,{zone,x,y,level:4,gold:534,hp:320,mp:90})
    if(!hero.worn[0]){
     hero.worn[0]=hero.bag.shift()
     for(const slot of [1,2,3,4,5,6,7,8,9]){
      hero.worn[slot]={uid:'sample-slot-'+slot,slot,grade:1,tier:2,plus:1,roll:2,identified:true}
     }
    }
    hero.worn[0].roll=2
    localStorage.setItem(key,JSON.stringify(hero))
   },{key,zone,x,y})
   await page.reload()
   await button('繼續冒險').tap()
  }
  await page.goto(url)
  await button('開始冒險').tap()
  await page.getByLabel('角色名稱').fill('燼燈守衛')
  await button('進入燼燈村').tap()
  await scene(0,805,552)
  await page.waitForFunction(()=>!!document.querySelector('#game').dataset.pose)
  assert.equal((await read()).gold,534)
  await shot('village')
  await button('裝備').tap()
  await shot('paper')
  if(redesigned){
   assert.equal(await page.locator('.photo-equipped').count(),10)
   const oldStats=await page.locator('.doll-stats').textContent()
   await action('doll-slot:1').tap()
   await action('unequip:1').tap()
   assert.equal(await page.locator('[data-worn-layer="1"]').count(),0)
   assert.notEqual(oldStats,await page.locator('.doll-stats').textContent())
   await button('關閉視窗').tap()
   await page.waitForFunction(()=>!document.querySelector('#game').dataset.kit.split(',').includes('1'))
   await button('裝備').tap()
   await action('equip:sample-slot-1').tap()
   assert.equal(await page.locator('[data-worn-layer="1"]').count(),1)
   assert.equal(await page.locator('.doll-stats').textContent(),oldStats)
   await page.waitForFunction(()=>document.querySelector('#game').dataset.kit.split(',').includes('1'))
  }
  await button('關閉視窗').tap()
  if(redesigned){
   assert.ok(images.has('sample-fountain.webp')&&images.has('sample-smith.webp')&&images.has('sample-wolf.webp')&&images.has('equipment.webp'))
   for(const [dir,keys] of dirs.entries()){
    await scene(0,675,555)
    await page.waitForFunction(()=>!!document.querySelector('#game').dataset.pose)
    for(const k of keys)await page.keyboard.down(k)
    await page.waitForFunction(value=>document.querySelector('#game').dataset.facing===String(value),dir)
    await page.waitForFunction(value=>document.querySelector('#game').dataset.pose==='sample-directions:pass-'+value,dir)
    await page.waitForFunction(value=>document.querySelector('#game').dataset.pose==='sample-directions:stride-'+value,dir)
    if(evidence)await shot('direction-'+dir)
    await button('普通攻擊').tap()
    await page.waitForFunction(value=>document.querySelector('#game').dataset.pose==='sample-directions:attack-'+value,dir)
    if(evidence)await shot('strike-'+dir)
    for(const k of keys)await page.keyboard.up(k)
    await page.waitForFunction(()=>!document.querySelector('#game').dataset.pose.includes(':attack-'))
    await page.waitForTimeout(130)
   }
  }
  await scene(1,340,558)
  await button('切換自動練功').tap()
  await page.waitForFunction(()=>/:(strike|attack-\d)$/.test(document.querySelector('#game').dataset.pose))
  await shot('combat')
  await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).stats.kill,key)
  assert.deepEqual(errors,[])
  const metrics=await page.locator('#game canvas').evaluate(el=>({backing:[el.width,el.height],css:[el.clientWidth,el.clientHeight]}))
  console.log(version+': '+JSON.stringify(metrics)+'；同場景實拍與戰鬥驗證，素材 '+images.size+' 份')
  await page.close()
 }
}finally{await browser.close()}
