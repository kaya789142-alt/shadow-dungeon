import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const base=new URL(process.argv[2])
const expected=process.argv[3]
const expectedVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version
const publicDir=new URL('../public/',import.meta.url)
const assetDirectories=['art-v22','art-v30','art-v31','art-sample','art-v40','art-motion','score-v22','fx-v22']
const assets=assetDirectories.flatMap(directory=>
 readdirSync(new URL(directory+'/',publicDir),{withFileTypes:true})
  .filter(entry=>entry.isFile()&&/\.(?:webp|json|m4a)$/.test(entry.name))
  .map(entry=>directory+'/'+entry.name)
)
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
  for(let offset=0;offset<assets.length;offset+=6){
   const batch=await Promise.allSettled(assets.slice(offset,offset+6).map(async file=>{
    const served=Buffer.from(await (await fetchFresh(file)).arrayBuffer())
    const committed=readFileSync(new URL(file,publicDir))
    assert.ok(served.equals(committed),'Published asset differs from checkout: '+file)
   }))
   const failed=batch.find(result=>result.status==='rejected')
   if(failed)throw failed.reason
  }
  console.log(release.version,release.commit,release.id,release.builtAt,assets.length+' verified assets')
  process.exit(0)
 }catch(error){
  lastError=error
  if(attempt<5)await new Promise(resolve=>setTimeout(resolve,5000))
 }
}
throw lastError
