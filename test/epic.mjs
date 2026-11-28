import assert from 'node:assert/strict'
import {chromium,devices} from 'playwright'

const key='shadow-dungeon.v1'
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
try{
 const page=await browser.newPage(devices['iPad Pro 11 landscape'])
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
 const evidence=process.env.SHADOW_EVIDENCE_DIR
 const button=name=>page.getByRole('button',{name,exact:true})
 const action=name=>page.locator(`[data-action="${name}"]`)
 const save=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
 const capture=name=>evidence?page.screenshot({path:`${evidence}/${name}.png`,scale:'css'}):undefined
 const zone=id=>page.waitForFunction(([key,id])=>JSON.parse(localStorage.getItem(key)).zone===id,[key,id],{timeout:25000})
 await page.goto(base)
 await button('開始冒險').tap()
 await page.getByLabel('角色名稱').fill('燼燈巡守')
 await button('進入燼燈村').tap()
 await button('暗影地下城首頁').tap()
 await page.evaluate(key=>{
  const hero=JSON.parse(localStorage.getItem(key))
  Object.assign(hero,{level:50,gold:640,hp:1800,mp:620})
  hero.skills[2]=1
  for(let i=0;i<5;i++)hero.worn[i]={uid:'epic-'+i,slot:i,grade:4,tier:40,plus:8,roll:4,identified:true,...(i===0?{job:0}:{})}
  localStorage.setItem(key,JSON.stringify(hero))
 },key)
 await page.reload()
 await button('繼續冒險').tap()
 assert.equal((await save()).gold,640)
 assert.equal((await save()).worn[1].uid,'epic-1')
 assert.match(await page.locator('#top-zone').textContent(),/白晝／晴朗/)
 await capture('village')
 await page.keyboard.press('3')
 await page.waitForFunction(()=>document.querySelector('#game').dataset.pose==='epic-knight:cast-release')
 await capture('cast')
 await button('裝備').tap()
 assert.match(await page.getByRole('heading',{name:'套裝效果'}).locator('..').textContent(),/5 件.*防禦 \+4.*魔攻 \+5/)
 await capture('equipment')
 await button('關閉視窗').tap()
 await button('開啟區域地圖').tap()
 await action('travel-to:13').tap()
 await zone(13)
 assert.match(await page.locator('#top-zone').textContent(),/亡靈地監・一層/)
 await capture('crypt')
 await button('開啟區域地圖').tap()
 await action('road-to:14').tap()
 await zone(14)
 await button('開啟區域地圖').tap()
 await action('road-to:15').tap()
 await zone(15)
 await button('切換自動練功').tap()
 const start=(await save()).stats.kill??0
 await page.waitForFunction(([key,start])=>(JSON.parse(localStorage.getItem(key)).stats.kill??0)>start,[key,start],{timeout:25000})
 assert.match(await page.locator('#top-zone').textContent(),/魔龍古堡/)
 await capture('castle')
 assert.deepEqual(errors,[])
 console.log('舊角色、五件套裝、白晝、亡靈地監跨層、步行到魔龍古堡及實際擊殺通過')
}finally{await browser.close()}
