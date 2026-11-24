let context:AudioContext|undefined
let timer=0
let previous=''
let step=0
let music=.3
let effects=.65
export function volume(m:number,s:number){music=m;effects=s}
export function unlock(){
 const Ctx=window.AudioContext??(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext
 if(!Ctx)return
 context??=new Ctx()
 if(context.state!=='running')void context.resume().catch(()=>{})
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
const effectsMap:Record<string,number[]>={hit:[155,90],magic:[335,512,710],death:[116,72],level:[262,330,392,523],loot:[523,659,784],forge:[176,262,523],fail:[180,110],heal:[329,440],walk:[65]}
export function sound(kind:string){
 effectsMap[kind]?.forEach((note,i)=>tone(note,.18,effects*.095,i?'triangle':'square',i*.085,kind==='hit'?.51:.91))
}
const themes = { village:[196,247,294,330,294,247,220,196], forest:[146,174,220,196,174,261,196,146], dungeon:[110,131,156,147,98,117,131,110], boss:[98,116,98,147,98,155,116,87] }
export function soundtrack(theme:keyof typeof themes){
 if(previous===theme&&timer)return
 previous=theme
 if(timer)window.clearInterval(timer)
 step=0
 timer=window.setInterval(()=>{
  const notes=themes[theme], note=notes[step++%notes.length]
  tone(note,1.1,music*.07,'triangle')
  if(step%4===1)tone(note/2,2.3,music*.07,'sine')
  if(theme==='forest'&&step%8===3)tone(note*5,.16,music*.018,'sine',.18,1.15)
 },theme==='boss'?340:600)
}
