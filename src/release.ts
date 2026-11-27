type Release={version:string;builtAt:string;commit:string;id:string}
declare const __SHADOW_RELEASE__:Release

export const release=__SHADOW_RELEASE__
export const versionLabel='V'+release.version.replace(/\.0$/,'')
export const releaseDate=new Intl.DateTimeFormat('zh-TW',{
 timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
}).format(new Date(release.builtAt))

export function trackRelease(commitSave:()=>boolean,onChanged:()=>void){
 if(!import.meta.env.PROD||!('serviceWorker' in navigator))return
 const currentUrl=new URL(location.href)
 if(currentUrl.searchParams.get('build-ready')===release.id){
  currentUrl.searchParams.delete('build-ready')
  history.replaceState(history.state,'',currentUrl)
 }
 const sw=navigator.serviceWorker
 let reloading=false
 let lastCheck=0
 const inspect=()=>{
  const controller=sw.controller
  if(!controller||reloading)return
  if(controller.state!=='activated'){
   controller.addEventListener('statechange',inspect,{once:true})
   return
  }
  const channel=new MessageChannel()
  const close=window.setTimeout(()=>channel.port1.close(),2500)
  channel.port1.onmessage=(event:MessageEvent<Release>)=>{
   clearTimeout(close);channel.port1.close()
   if(!event.data?.id||event.data.id===release.id||reloading)return
   if(!commitSave()){onChanged();return}
   reloading=true
   const fresh=new URL(location.href)
   fresh.searchParams.set('build-ready',event.data.id)
   window.location.replace(fresh)

  }
  controller.postMessage('shadow-build',[channel.port2])
 }
 sw.addEventListener('controllerchange',inspect)
 void sw.register(new URL('sw.js',document.baseURI),{updateViaCache:'none'}).then(registration=>{
  const check=()=>{
   if(document.hidden||Date.now()-lastCheck<2500)return
   lastCheck=Date.now()
   void registration.update().then(inspect).catch(()=>{})
  }
  document.addEventListener('visibilitychange',check)
  window.addEventListener('online',check)
  window.addEventListener('pageshow',check)
  window.addEventListener('focus',check)
  window.setInterval(check,60_000)
  check()
 }).catch(()=>{})
}
