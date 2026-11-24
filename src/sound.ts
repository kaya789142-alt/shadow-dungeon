export type Theme='title'|'village'|'forest'|'graveyard'|'dungeon'|'battle'|'boss'
type Deck={audio:HTMLAudioElement;gain:GainNode;theme?:Theme}
const scoreUrl=(track:string)=>import.meta.env.BASE_URL+'score/'+track+'.m4a'
let context:AudioContext|undefined
let musicBus:GainNode|undefined
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
let lastCue=-100
const fadeSeconds=1.35

export function volume(m:number,s:number,a=ambience){
 music=m;effects=s;ambience=a
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
  musicBus=context.createGain()
  musicBus.gain.value=music*.72
  musicBus.connect(context.destination)
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
function tone(frequency:number,duration:number,level:number,type:OscillatorType,start=0,shift=1){
 if(!context||context.state!=='running'||!level)return
 const at=context.currentTime+start
 const osc=context.createOscillator(), gain=context.createGain()
 osc.type=type
 osc.frequency.setValueAtTime(frequency,at)
 osc.frequency.exponentialRampToValueAtTime(frequency*shift,at+duration)
 gain.gain.setValueAtTime(.0001,at)
 gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.015)
 gain.gain.exponentialRampToValueAtTime(.0001,at+duration)
 osc.connect(gain).connect(context.destination)
 osc.start(at);osc.stop(at+duration+.03)
}
const effectsMap:Record<string,number[]>={hit:[155,90],arrow:[520,219,118],magic:[335,512,710],death:[116,72],loot:[523,659,784],forge:[176,262,523],fail:[180,110],heal:[329,440],walk:[65]}
export function sound(kind:string){
 effectsMap[kind]?.forEach((note,i)=>tone(note,.18,effects*.095,i?'triangle':'square',i*.085,kind==='hit'?.51:.91))
}
export function victory(){
 if(!context||!cueBuffer||!musicBus||context.currentTime-lastCue<2.8)return
 const now=context.currentTime
 lastCue=now
 const cue=context.createBufferSource(), gain=context.createGain()
 cue.buffer=cueBuffer;gain.gain.value=.67
 cue.connect(gain).connect(context.destination)
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
  if(mode==='forest')tone(680+(step%6)*109,.24,ambience*.025,'sine',.1,1.19)
  else if(mode==='village')tone(373+step%5*47,.17,ambience*.014,'triangle',.16,1.11)
  else if(mode==='graveyard'||mode==='dungeon')tone(55+step%3*8,2.9,ambience*.028,'sine',0,.84)
 },mode==='dungeon'||mode==='graveyard'?5100:3900)
}
export function soundtrack(next:Theme){
 theme=next
 if(lastTheme===next)return
 lastTheme=next
 selectTheme(next)
 playAmbience(next)
}
