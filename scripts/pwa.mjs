import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const output=new URL('../dist/',import.meta.url)
const directory=fileURLToPath(output)
const release=JSON.parse(await readFile(new URL('release.json',output),'utf8'))
const files=(await readdir(directory,{recursive:true,withFileTypes:true}))
 .filter(entry=>entry.isFile())
 .map(entry=>relative(directory,join(entry.parentPath,entry.name)).split('\\').join('/'))
 .filter(path=>!(/^(?:sw\.js|release\.json|art\/|score(?:-v22)?\/)/).test(path))
 .sort()

const worker=`
const release=${JSON.stringify(release)}
const scope=self.registration.scope
const family='shadow-dungeon:'+scope+':'
const current=family+release.id
const shell=new URL('index.html',scope).href
const files=${JSON.stringify(files)}
const precached=new Set(files.map(file=>new URL(file,scope).href))
const older=async()=>(await caches.keys()).filter(key=>key.startsWith(family)&&key!==current)

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(current)
  try{
   const html=await fetch(shell,{cache:'reload'})
   if(!html.ok||!(await html.clone().text()).includes('content="'+release.id+'"'))throw Error('Mismatched release shell')
   await cache.put(shell,html)
   // Commit only after all required assets are available. Keep concurrency low on mobile.
   const resources=files.filter(url=>url!=='index.html')
   for(let i=0;i<resources.length;i+=12){
    await cache.addAll(resources.slice(i,i+12).map(url=>new Request(new URL(url,scope),{cache:'reload'})))
   }
  }catch(error){
   await caches.delete(current)
   throw error
  }
  await self.skipWaiting()
 })())
})

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const prior=await older()
  // An outgoing controller may get a final navigation while a tab is being restored.
  // Give that controller the new verified entry document while keeping its old hashed files.
  const installed=await (await caches.open(current)).match(shell)
  const previous=prior.at(-1)
  if(previous&&installed)await (await caches.open(previous)).put(shell,installed)
  await Promise.all(prior.slice(0,-1).map(key=>caches.delete(key)))
  await self.clients.claim()
 })())
})

self.addEventListener('message',event=>{
 if(event.data==='shadow-build')event.ports[0]?.postMessage(release)
})

async function navigation(request){
 const cache=await caches.open(current)
 const local=await cache.match(shell)
 const abort=new AbortController()
 const timer=setTimeout(()=>abort.abort(),1800)
 try{
  const remote=await fetch(request.url,{cache:'no-store',signal:abort.signal})
  // CDN propagation can temporarily mix versions. Keep the internally consistent installed shell.
  if(remote.ok&&(await remote.clone().text()).includes('content="'+release.id+'"'))return remote
 }catch{}finally{clearTimeout(timer)}
 return local||Response.error()
}

self.addEventListener('fetch',event=>{
 const {request}=event
 if(request.method!=='GET'||!request.url.startsWith(scope))return
 const url=new URL(request.url)
 if(url.pathname===new URL('release.json',scope).pathname)return
 if(request.mode==='navigate'){
  event.respondWith(navigation(request))
  return
 }
 if(request.headers.has('range'))return
 if(precached.has(request.url)){
  event.respondWith(caches.open(current).then(cache=>cache.match(request)).then(response=>response||fetch(request)))
  return
 }
 // A tab left open during an upgrade can still request its previous hashed modules.
 if(url.pathname.startsWith(new URL('assets/',scope).pathname)){
  event.respondWith((async()=>{
   const [last]=(await older()).slice(-1)
   return last&&(await (await caches.open(last)).match(request))||fetch(request)
  })())
 }
})
`
await writeFile(new URL('sw.js',output),worker)
