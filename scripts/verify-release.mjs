import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const base=new URL(process.argv[2])
const expected=process.argv[3]
const expectedVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version
const fetchFresh=async file=>{
 const url=new URL(file,base)
 url.searchParams.set('verify',expected??Date.now().toString(36))
 const response=await fetch(url,{signal:AbortSignal.timeout(12_000),cache:'no-store'})
 assert.ok(response.ok,url+' returned '+response.status)
 return response
}
let lastError
for(let attempt=0;attempt<6;attempt++){
 try{
  const release=await (await fetchFresh('release.json')).json()
  if(expected)assert.equal(release.commit,expected)
  assert.equal(release.version,expectedVersion)
  assert.ok((await (await fetchFresh('index.html')).text()).includes('content="'+release.id+'"'))
  assert.ok((await (await fetchFresh('sw.js')).text()).includes(release.id))
  for(const file of ['art-v22/knight.webp','art-v22/knight-motion.json','art-v30/items.webp','score-v22/village.m4a']){
   const response=await fetchFresh(file)
   assert.ok((await response.arrayBuffer()).byteLength>0)
  }
  console.log(release.version,release.commit,release.id,release.builtAt)
  process.exit(0)
 }catch(error){
  lastError=error
  if(attempt<5)await new Promise(resolve=>setTimeout(resolve,5000))
 }
}
throw lastError
