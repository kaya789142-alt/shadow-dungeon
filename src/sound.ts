export type Theme='title'|'village'|'forest'|'graveyard'|'dungeon'|'battle'|'boss'
type Deck={audio:HTMLAudioElement;gain:GainNode;theme?:Theme}
const scoreUrl=(track:string)=>import.meta.env.BASE_URL+'score-v22/'+track+'.m4a'
let context:AudioContext|undefined
let musicBus:GainNode|undefined
let output:GainNode|undefined
let master=1
let decks:Deck[]=[]
let theme:Theme='title'
let active=-1
let transition=0
let retry=false
let fadeTimer=0
let music=.3
let effects=.65
let ambience=.35
let lastTheme:Theme|undefined
let ambienceTimer=0
let ambienceStep=0
let cueBuffer:AudioBuffer|undefined
let cueLoading=false
let foleyLoading=false
const effectBuffers=new Map<string,AudioBuffer>()
const startTimes=new Map<string,number>()
let lastCue=-100
const fadeSeconds=1.35

export function volume(m:number,s:number,a=ambience,overall=master){
 music=m;effects=s;ambience=a;master=overall
 if(context&&output)output.gain.setTargetAtTime(master,context.currentTime,.12)
 if(context&&musicBus)musicBus.gain.setTargetAtTime(music*.72,context.currentTime,.16)
}
function deck(ctx:AudioContext,bus:GainNode):Deck {
 const audio=new Audio()
 audio.loop=true;audio.preload='none'
 const gain=ctx.createGain()
 gain.gain.value=0
 ctx.createMediaElementSource(audio).connect(gain).connect(bus)
 return {audio,gain}
}
export function unlock(){
 const Ctx=window.AudioContext??(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext
 if(!Ctx)return
 if(!context){
  context=new Ctx()
  output=context.createGain()
  output.gain.value=master
  output.connect(context.destination)
  musicBus=context.createGain()
  musicBus.gain.value=music*.72
  musicBus.connect(output)
  decks=[deck(context,musicBus),deck(context,musicBus)]
  // Safari keeps gesture approval on the individual media element across source changes.
  // Prime the silent spare deck with the current track during the same trusted gesture.
  const reserve=decks[1], initial=theme
  reserve.theme=initial
  reserve.audio.src=scoreUrl(initial)
  void reserve.audio.play().then(()=>{
   if(active!==1&&reserve.theme===initial)reserve.audio.pause()
  }).catch(()=>{})
 }
 if(context.state!=='running')void context.resume().catch(()=>{})
 if(active<0||retry)selectTheme(theme)
 else if(decks[active].theme===theme&&decks[active].audio.paused){
  // Safari can pause the media element independently of the Web Audio graph.
  void decks[active].audio.play().catch(()=>{retry=true})
 }
 if(context)void prepareFoley(context)
 if(!cueLoading&&context){
  cueLoading=true
  fetch(scoreUrl('victory')).then(response=>{
   if(!response.ok)throw Error('Victory score unavailable')
   return response.arrayBuffer()
  }).then(bytes=>context!.decodeAudioData(bytes)).then(buffer=>{cueBuffer=buffer}).catch(()=>{cueLoading=false})
 }
}
function selectTheme(next:Theme){
 if(!context||!decks.length)return
 if(active>=0&&decks[active].theme===next&&!retry)return
 const incoming=active===0?1:0, old=active, candidate=decks[incoming]
 if(candidate.theme===next&&!retry&&!candidate.audio.paused)return
 const change=++transition
 retry=false
 if(candidate.theme!==next){
  candidate.audio.pause()
  candidate.audio.src=scoreUrl(next)
  candidate.theme=next
 }
 void candidate.audio.play().then(()=>{
  if(change!==transition||theme!==next){if(active!==incoming)candidate.audio.pause();return}
  active=incoming
  const now=context!.currentTime
  const ramp=(track:Deck,target:number)=>{
   const gain=track.gain.gain
   gain.cancelScheduledValues(now)
   gain.setValueAtTime(gain.value,now)
   gain.linearRampToValueAtTime(target,now+fadeSeconds)
  }
  ramp(candidate,1)
  window.clearTimeout(fadeTimer)
  if(old>=0){
   const outgoing=decks[old]
   ramp(outgoing,0)
   fadeTimer=window.setTimeout(()=>{if(active!==old)outgoing.audio.pause()},fadeSeconds*1000+80)
  }
 }).catch(()=>{
  if(change===transition)retry=true
 })
}
const foley=['hit','arrow','magic','death','loot','forge','fail','heal','wind','brook','cavern']
async function prepareFoley(ctx:AudioContext){
 if(foleyLoading)return
 foleyLoading=true
 const results=await Promise.allSettled(foley.map(async name=>{
  if(effectBuffers.has(name))return
  const response=await fetch(import.meta.env.BASE_URL+'fx-v22/'+name+'.m4a')
  if(!response.ok)throw Error('Audio unavailable')
  effectBuffers.set(name,await ctx.decodeAudioData(await response.arrayBuffer()))
 }))
 if(results.some(result=>result.status==='rejected'))foleyLoading=false
}
function playSample(name:string,level:number){
 const buffer=effectBuffers.get(name)
 if(!context||!output||context.state!=='running'||!level||!buffer)return
 const now=context.currentTime
 if(now-(startTimes.get(name)??-1)<.06)return
 startTimes.set(name,now)
 const clip=context.createBufferSource(), gain=context.createGain()
 clip.buffer=buffer;gain.gain.value=level
 clip.connect(gain).connect(output)
 clip.start()
}
export function sound(kind:string){playSample(kind,effects*.62)}
export function victory(){
 if(!context||!output||!cueBuffer||!musicBus||context.currentTime-lastCue<2.8)return
 const now=context.currentTime
 lastCue=now
 const cue=context.createBufferSource(), gain=context.createGain()
 cue.buffer=cueBuffer;gain.gain.value=.67
 cue.connect(gain).connect(output)
 gain.gain.value*=music
 const bus=musicBus.gain
 bus.cancelScheduledValues(now);bus.setTargetAtTime(music*.28,now,.2);bus.setTargetAtTime(music*.72,now+3,.4)
 cue.start()
}
function playAmbience(mode:Theme){
 if(ambienceTimer)window.clearInterval(ambienceTimer)
 ambienceTimer=window.setInterval(()=>{
  if(document.hidden)return
  const step=ambienceStep++
  if(mode==='forest')playSample(step%3===0?'brook':'wind',ambience*.34)
  else if(mode==='village')playSample('brook',ambience*.28)
  else if(mode==='graveyard'||mode==='dungeon')playSample('cavern',ambience*.30)

 },mode==='dungeon'||mode==='graveyard'?5100:3900)
}
export function soundtrack(next:Theme){
 theme=next
 if(lastTheme===next)return
 lastTheme=next
 selectTheme(next)
 playAmbience(next)
}

const footsteps=new Map<boolean,AudioBuffer>()
export function footstep(stone:boolean){
 if(!context||!output||context.state!=='running'||!effects)return
 let buffer=footsteps.get(stone)
 if(!buffer){
  const rate=context.sampleRate
  buffer=context.createBuffer(1,Math.round(rate*.085),rate)
  const pcm=buffer.getChannelData(0)
  let filtered=0
  for(let i=0;i<pcm.length;i++){
   const t=i/rate
   const noise=Math.random()*2-1
   filtered+=(noise-filtered)*(stone?.53:.16)
   pcm[i]=(filtered*.55+Math.sin(t*(stone?920:540))*.21)*Math.exp(-t*(stone?49:37))
  }
  footsteps.set(stone,buffer)
 }
 const source=context.createBufferSource(),gain=context.createGain()
 source.buffer=buffer;gain.gain.value=effects*.23
 source.connect(gain).connect(output)
 source.start()
}
