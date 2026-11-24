import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const output=new URL('../dist/',import.meta.url)
const directory=fileURLToPath(output)
const entries=await readdir(directory,{recursive:true,withFileTypes:true})
const files=entries.filter(entry=>entry.isFile()&&entry.name!=='sw.js')
 .map(entry=>relative(directory,join(entry.parentPath,entry.name)).split('\\').join('/'))
 .sort()
const signature=createHash('sha256')
for(const file of files)signature.update(await readFile(new URL(file,output)))
const worker=`
const family='shadow-dungeon:'+self.registration.scope+':'
const cacheName=family+${JSON.stringify(signature.digest('hex').slice(0,16))}
const files=${JSON.stringify(files.filter(path=>!path.startsWith('score/')))}
const score=new URL('score/',self.registration.scope).href
const shell=new URL('index.html',self.registration.scope).href

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(files)))
})
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(family)&&key!==cacheName).map(key=>caches.delete(key))))]))
})
self.addEventListener('fetch',event=>{
 const {request}=event
 if(request.method!=='GET'||!request.url.startsWith(self.registration.scope)||request.url.startsWith(score))return
 if(request.mode==='navigate'){
  event.respondWith(caches.open(cacheName).then(cache=>cache.match(shell)).then(response=>response||fetch(request)))
 }else{
  event.respondWith(caches.open(cacheName).then(cache=>cache.match(request)).then(response=>response||fetch(request)))
 }
})
`
await writeFile(new URL('sw.js',output),worker)
