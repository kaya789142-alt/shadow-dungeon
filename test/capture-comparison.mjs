import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const base=process.env.SHADOW_TEST_URL??'http://localhost:5173/'
const directory=process.env.SHADOW_SCREENSHOTS??'screenshots'
const prefix=process.argv[2]??'v22'
await mkdir(directory,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const {defaultBrowserType,...device}=devices['iPad Pro 11 landscape']
const button=(page,name)=>page.getByRole('button',{name,exact:true})
const shot=(page,key,clip)=>page.screenshot({path:join(directory,`${prefix}-${key}.png`),scale:'css',clip})
async function enter(job){
 const page=await browser.newPage(device)
 await page.goto(base)
 await button(page,'開始冒險').click()
 await page.getByLabel('角色名稱').fill('燼燈旅人')
 await page.locator(`[data-action="job:${job}"]`).click()
 await button(page,'進入燼燈村').click()
 await page.locator('#world-text .world-text').filter({hasText:/藥水商人/}).waitFor()
 await page.evaluate(()=>document.fonts.ready)
 await page.waitForTimeout(300)
 return page
}
async function jobShot(page,job){
 await page.keyboard.down('d')
 await page.waitForTimeout(820)
 await page.keyboard.up('d')
 await page.keyboard.down('w')
 await page.waitForTimeout(190)
 await page.keyboard.up('w')
 await page.keyboard.press('ArrowDown',{delay:44})
 await page.waitForTimeout(380)
 await shot(page,`job-${job}`,{x:528,y:334,width:150,height:153})
}
try{
 for(let job=0;job<5;job++){
  const page=await enter(job)
  if(job!==0||process.env.SHADOW_ONLY_JOBS==='1'){await jobShot(page,job);await page.close();continue}
  await shot(page,'village')
  await shot(page,'npc',{x:275,y:172,width:565,height:170})
  await button(page,'背包').click()
  await shot(page,'inventory')
  await button(page,'關閉視窗').click()
  await button(page,'裝備').click()
  await shot(page,'equipment')
  await button(page,'關閉視窗').click()
  await button(page,'任務').click()
  await shot(page,'text')
  await button(page,'關閉視窗').click()
  await button(page,'全螢幕').click()
  await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('#app').classList.contains('immersive'))
  await page.waitForTimeout(320)
  await shot(page,'ipad-fullscreen')
  await button(page,'開啟區域地圖').click()
  await page.locator('[data-action="travel-to:1"]').click()
  await button(page,'切換自動練功').click()
  await page.locator('#world-text .focus').waitFor()
  await page.locator('#world-text .damage').first().waitFor()
  await shot(page,'battle')
  await page.close()
  const portrait=await enter(0);await jobShot(portrait,0);await portrait.close()
 }
}finally{await browser.close()}
