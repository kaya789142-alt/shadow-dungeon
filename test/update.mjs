import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep, join } from 'node:path'
import { chromium } from 'playwright'

const dirs=process.argv.slice(2).map(path=>resolve(path))
assert.equal(dirs.length,3,'Pass the legacy, current and candidate build directories')
const [legacy,first,next]=dirs
const release=async dir=>JSON.parse(await readFile(join(dir,'release.json'),'utf8'))
const current=await release(first), candidate=await release(next)
const legacyHasUpdater=await release(legacy).then(()=>true).catch(()=>false)
assert.notEqual(current.id,candidate.id)
const prefix='/shadow-dungeon/'
let directory=legacy, mixed=false
const content={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.m4a':'audio/mp4'}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'), relative=decodeURIComponent(url.pathname).slice(prefix.length)
  assert.ok(url.pathname.startsWith(prefix))
  const base=mixed&&relative==='index.html'?legacy:directory,path=resolve(base,relative||'index.html')
  assert.ok(path.startsWith(base+sep))
  const bytes=await readFile(path)
  res.writeHead(200,{'Content-Type':content[extname(path)]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store'})
  res.end(bytes)
 }catch{res.writeHead(404);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base=`http://127.0.0.1:${server.address().port}${prefix}`
const browser=await chromium.launch({executablePath:process.env.SHADOW_CHROMIUM})
const context=await browser.newContext()
let page=await context.newPage()
const key='shadow-dungeon.v1'
const button=(name)=>page.getByRole('button',{name,exact:true})
const update=()=>page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()})
const waitController=(id)=>page.waitForFunction(id=>new Promise(resolve=>{
 const owner=navigator.serviceWorker.controller
 if(!owner||owner.state!=='activated')return resolve(false)
 const channel=new MessageChannel()
 const timer=setTimeout(()=>{channel.port1.close();resolve(false)},200)
 channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data.id===id)}
 owner.postMessage('shadow-build',[channel.port2])
}),id)
const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
const meta=()=>page.locator('meta[name="shadow-build"]').getAttribute('content')
try{
 await page.goto(base)
 await button('開始冒險').click()
 await page.getByLabel('角色名稱').fill('保留存檔')
 await button('進入燼燈村').click()
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 const oldSave=await read()
 assert.equal(oldSave.name,'保留存檔')
 await page.evaluate(async()=>{await caches.open('projection-other-app')})
 directory=first
 await update()
 await waitController(current.id)
 if(legacyHasUpdater){
  await page.waitForFunction(id=>document.querySelector('meta[name="shadow-build"]')?.content===id,current.id)
 }else{
  // V2.1 has no listener for controllerchange.
  await page.close()
  page=await context.newPage()
  await page.goto(base,{waitUntil:'domcontentloaded'})
  const refresh=base+'?refresh='+encodeURIComponent(current.id)
  // A restored tab can receive the outgoing worker's shell during the handover.
  for(let attempt=0;attempt<3;attempt++){
   const shellBuild=await page.evaluate(()=>document.querySelector('meta[name="shadow-build"]')?.content)
   if(shellBuild===current.id)break
   await page.goto(refresh,{waitUntil:'domcontentloaded'})
  }
  await page.waitForFunction(id=>document.querySelector('meta[name="shadow-build"]')?.content===id,current.id)
 }
 await button('繼續冒險').click()
 assert.equal(await meta(),current.id)
 assert.equal((await read()).bag[0].uid,oldSave.bag[0].uid)
 console.log('舊版已切換至新建置並保留裝備')
 // A CDN serving older HTML during install must leave the current build in operation.
 directory=next
 mixed=true
 await update()
 await page.waitForFunction(async()=>{
  const reg=await navigator.serviceWorker.getRegistration()
  return reg&&!reg.installing&&!reg.waiting
 })
 await waitController(current.id)
 assert.equal(await meta(),current.id)
 console.log('混合的 CDN 內容已拒絕，維持可用建置')
 mixed=false
 await update()
 await page.waitForFunction(id=>document.querySelector('meta[name="shadow-build"]')?.content===id,candidate.id)
 await button('繼續冒險').click()
 assert.equal((await read()).bag[0].uid,oldSave.bag[0].uid)
 assert.ok(await page.evaluate(async()=>await caches.has('projection-other-app')))
 await page.context().setOffline(true)
 await page.reload()
 await button('繼續冒險').click()
 assert.equal(await meta(),candidate.id)
 assert.equal((await read()).name,oldSave.name)
 console.log('更新通過：舊版快取、CDN 混合建置、新建置自動切換、原始道具與玩家存檔、離線重載')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
