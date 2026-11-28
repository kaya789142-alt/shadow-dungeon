import { setBonus } from './epic'
import Phaser from 'phaser'
import '@fontsource-variable/noto-sans-tc'
import { achievementTitles, attributes, createHero, decodeSave, expNeeded, gearPower, load, makeGear, makeRelic, materials, record, rollover, save, spawn, upgrade, upgradeInfo } from './model'
import { achievements, allMonsters, elements, gearName, jobs, materialNames, morphs, pets, quality, qualityColors, quests, relicForZone, rules, safeZone, slots, vendors, zoneRoutes, zones } from './data'
import type { Gear, Material, Quest, Skill } from './data'
import { entry, exit, HEIGHT, WIDTH } from './art'
import { icon } from './icons'
import { sound, unlock, volume } from './sound'
import { playerArt } from './portrait-sprites'
import { World } from './world'
import './style.css'
import './v2.css'
import './v21.css'
import './v22.css'
import './v30.css'
import './v31.css'
import './v32.css'
import './polish.css'
import { activateCharacter, deleteCharacter, roster } from './characters'
import { realmChart } from './cartography'
import { equipmentLayers } from './equipment-appearance'
import { atlasCell, photographedDoll, sampleArt } from './art-sample'
import './art-sample.css'
import { addItem, bagCategories, bagGearCategory, bagItemCategory, bagLimit, canSellGear, canSellItem, categories, categoryNames, compatibleGear, fullBag, gearLocked, gearSalePrice, jobRequirement, materialLocked, quoteGearSale, sellQuotedGear, sortBag } from './inventory'
import type { BagCategory, Category } from './inventory'
import { directions, edgePoint, nextDirection, regionNeighbor } from './overworld'
import { release, releaseDate, trackRelease, versionLabel } from './release'

const app=document.querySelector<HTMLElement>('#app')!
app.style.setProperty('--sample-atlas',`url(${new URL(sampleArt('equipment'),document.baseURI).href})`)
app.style.setProperty('--inventory-atlas',`url(${new URL(import.meta.env.BASE_URL+'art-v30/items.webp',document.baseURI).href})`)
const select=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const nav=[['bag','背包'],['shield','裝備'],['skill','技能'],['quest','任務'],['shop','商店'],['settings','設定']]
const keyboard=['1','2','3','4','5']
const skillIcons=['skill','spark','shield','star','crest']
const action=(key:string,label:string,content:string,css='')=>`<button type="button" class="${css}" data-action="${key}" aria-label="${escape(label)}" title="${escape(label)}">${content}</button>`
app.innerHTML=`
 <header class="topbar">
  <button class="brand" data-action="home" aria-label="暗影地下城首頁"><span class="brand-mark">${icon('crest',26)}</span><span><strong>暗影地下城</strong><small>SHADOW DUNGEON <em>${versionLabel}</em></small></span></button>
  <div class="top-location">${icon('compass',16)}<span>艾瑟蘭王國</span><span class="top-divider"></span><span id="top-zone">燼燈村</span></div>
  <nav class="compact-nav" aria-label="遊戲選單">${nav.map(([key,label])=>action(key,label,icon(key,17)+`<span>${label}</span>`)).join('')}</nav>
  <div class="top-tools"><span class="online"><i></i>單人冒險</span>${action('settings','音量與設定',icon('volume'),'icon-button')}${action('fullscreen','全螢幕',icon('expand'),'icon-button')}</div>
 </header>
 <section class="stage" aria-label="遊戲場景">
  <div id="game"></div><div class="vignette"></div><div id="world-text" aria-hidden="true"></div>
  <div class="world-top">
   <button class="player-card" data-action="character" aria-label="角色資訊">
    <span id="portrait" class="portrait"><span id="portrait-symbol">${icon('shield',27)}</span><b id="level">1</b></span>
    <span class="player-details"><span class="player-title" id="player-name">無名旅人</span><span id="player-job" class="player-job">騎士</span>
     <span class="meter health"><i id="hp-fill"></i><span>${icon('heart',11)}<b id="hp-numbers"></b></span></span>
     <span class="meter mana"><i id="mp-fill"></i><span>${icon('drop',11)}<b id="mp-numbers"></b></span></span>
     <span class="hud-xp" id="hud-xp">經驗 0%</span>
    </span>
   </button>
   <div id="boss" class="boss-bar" hidden><div id="boss-name"></div><span class="meter health"><i id="boss-fill"></i></span></div>
   <aside class="map-card"><div class="map-title">${icon('map',16)}<strong id="map-name">燼燈村</strong>${action('travel','區域地圖',icon('expand',14),'small-icon')}${action('fold-map','收合小地圖',icon('minus',14),'small-icon')}</div>
    <button class="map-view" data-action="travel" aria-label="開啟區域地圖"><canvas id="minimap" width="180" height="110"></canvas><span class="north">N</span></button>
    <div class="map-foot"><span id="map-level"><i></i>安全區域</span><span id="map-progress">探索 0%</span></div>
   </aside>
  </div>
  <aside class="world-side"><div class="tracker"><div class="tracker-head">${icon('quest',17)}<strong>任務追蹤</strong>${action('quest','開啟任務',icon('chevron',15),'small-icon')}${action('fold-tracker','收合任務追蹤',icon('minus',14),'small-icon')}</div><div id="tracker"></div></div>
   <nav class="side-nav" aria-label="遊戲選單">${nav.map(([key,label])=>action(key,label,icon(key,19)+`<span>${label}</span>`,'side-button')).join('')}</nav>
  </aside>
  <div class="world-bottom">
   <div class="move-controls">
    <div id="joystick" class="joystick" aria-label="虛擬搖桿"><i class="joystick-cross"></i><span id="knob">${icon('cross',24)}</span></div>
    ${action('fold-log','展開冒險紀錄',icon('book',17),'log-toggle small-icon')}
    <div class="log" aria-live="polite"><div class="log-head">${icon('chat',13)} 冒險紀錄</div><div id="log-lines"></div></div>
   </div>
   <div class="combat">
    <div class="combat-tools">${action('pickup','拾取戰利品',icon('bag',14)+' <span>拾取</span> <kbd>E</kbd>','micro')}${action('auto','切換自動練功',icon('cross',14)+' <span>自動練功</span>','micro')}</div>
    <div class="hotbar">${action('red','生命藥水',icon('flask',24)+'<b id="red-count">8</b><kbd>Q</kbd>','hot red')}${action('blue','魔力藥水',icon('flask',24)+'<b id="blue-count">6</b><kbd>R</kbd>','hot blue')}
    <span class="hot-divider"></span><div class="skills">${keyboard.map((key,i)=>action('cast:'+i,'技能 '+key,icon(skillIcons[i],21)+`<b id="cd-${i}"></b><kbd>${key}</kbd>`,'hot spell')).join('')}</div>
    ${action('attack','普通攻擊',icon('sword',32)+'<kbd>SPACE</kbd>','hot attack')}</div>
   </div>
  </div>
  <div id="modal-root"></div>
  <div id="toast" role="status" class="toast"></div>
 </section>
 <footer class="status"><div class="experience"><span>經驗值</span><div class="experience-track"><i id="xp-fill"></i></div><b id="xp-numbers">0%</b></div><span class="gold">${icon('coin',16)} <b id="gold">180</b></span><span class="saved" id="save-state"><i></i> 本機存檔</span></footer>
 <input type="file" id="import-file" accept=".json,application/json" hidden>
`
const storedHero=load()
let hero=storedHero??createHero('無名旅人',0)
let hasSave=!!storedHero
let panel=''
let panelMode:'open'|'collapsed'|'minimized'='open'
let bagTab:'all'|BagCategory='all'
const sortLabels={slot:'部位',quality:'品質',level:'等級',price:'售價',recent:'取得時間'} as const
let bagSort:keyof typeof sortLabels='slot'
let shopTab:'buy'|'sell'='buy'
let saleQuality=0
const saleSelection=new Set<string>()
let saleDraft:{ids:string[];total:number;rare:boolean;second:boolean}|undefined
let itemSaleDraft:{item:Material;count:number}|undefined
let saleSlot='all'
let selectedSlot=0
let jobIndex=0
let previousFocus:HTMLElement|null=null
let chosenGear=''
let compareGear=''
let questFilter='all'
let activeShop=0
let toastTimer=0
let mapKey=''
let confirmRisk=false
let mapSelection=-1
let tradeColumn='sell'
let titleState:'title'|'create'|'roster'|'play'='title'
const logs:{text:string;style:string}[]=[{text:'歡迎來到燼燈村，冒險者。',style:'gold'},{text:'點擊地面探索，或使用方向鍵移動。',style:''}]
const world=new World(hero,{
 message, npc:openNpc, refresh:()=>{paint();if(panel&&panelMode==='open')renderPanel();if(titleState==='play')storeProgress()}, death:()=>openPanel('death'),failed:bootError,ready:()=>{paint();renderPanel()}
})
pixelPrefs()
const textSample='暗影地下城角色技能任務背包裝備建立冒險者攻擊商店設定繼續遊戲繁體中文字型生命魔力更新版本'+hero.name+vendors.join('')+allMonsters.map(m=>m.name).join('')+zones.map(z=>z[0]).join('')+'爆擊閃避未命中吸血'+elements.join('')
const fontReady=document.fonts?.load('700 16px "Noto Sans TC Variable"',textSample)??Promise.resolve([])
void fontReady.then(loaded=>{
 if(!loaded?.length)throw Error('Noto Sans TC')
 app.dataset.font='noto-sans-tc'
 return new Phaser.Game({type:Phaser.CANVAS,parent:'game',backgroundColor:'#25242c',pixelArt:false,render:{antialias:true,powerPreference:'low-power'},scale:{mode:Phaser.Scale.NONE,width:Math.max(1,select('#game').clientWidth),height:Math.max(1,select('#game').clientHeight)},input:{touch:{capture:true}},scene:world})
}).catch(()=>bootError('繁體中文字型'))
volume(hero.music,hero.sfx,hero.preferences.ambience,hero.preferences.master)
function pixelPrefs(){
 app.style.setProperty('--read-scale',hero.preferences.size>=1.3?'1.17':hero.preferences.size>=1.1?'1':'.9')
 app.dataset.textSize=hero.preferences.size>=1.3?'large':hero.preferences.size>=1.1?'standard':'small'
}

function bootError(asset:string){
 const root=select('#modal-root')
 root.innerHTML=modal(`<div class="dialog-head"><h2>資源載入失敗</h2></div><p>${escape(asset)}</p><p>載入完成後即可繼續冒險。</p><button class="button primary" data-action="retry-assets">重新載入</button>`,'system-modal')
}
function message(text:string,style=''){
 logs.unshift({text,style});logs.length=Math.min(4,logs.length)
 paintLog()
 if(!style)return
 const toast=select('#toast')
 toast.textContent=text;toast.className='toast visible '+style
 window.clearTimeout(toastTimer)
 toastTimer=window.setTimeout(()=>toast.classList.remove('visible'),2350)
}
function paintLog(){
 select('#log-lines').innerHTML=logs.slice(0,2).map(row=>`<div class="${row.style}"><span>›</span> ${escape(row.text)}</div>`).join('')
}
function storeProgress(){
 if(titleState!=='play')return true
 try{save(hero);hasSave=true;select('#save-state').innerHTML='<i></i> 已儲存';return true}
 catch{select('#save-state').textContent='存檔失敗';return false}
}
function progressBar(key:string,value:number,max:number){
 select('#'+key+'-fill').style.width=Math.min(100,100*value/max)+'%'
 select('#'+key+'-numbers').textContent=Math.ceil(value)+' / '+Math.ceil(max)
}
function setText(id:string,text:string){
 const node=select('#'+id)
 if(node.textContent!==text)node.textContent=text
}
function paint(){
 const stats=attributes(hero), region=zones[hero.zone], job=jobs[hero.job]
 progressBar('hp',hero.hp,stats.hp);progressBar('mp',hero.mp,stats.mp)
 setText('level',String(hero.level));setText('player-name',hero.name)
 setText('player-job',job.name+(hero.title?' · '+hero.title:''))
 const portrait=select('#portrait-symbol')
 if(portrait.dataset.job!==String(hero.job)){
  portrait.dataset.job=String(hero.job)
  portrait.innerHTML=`<img alt="" src="${playerArt(hero.job)}">`
  portrait.style.color='#'+job.color.toString(16)
 }
 const {light,weather}=world.atmosphere
 setText('top-zone',region[0]+' · '+light+'／'+weather);setText('map-name',region[0]);setText('gold',hero.gold.toLocaleString('zh-TW'))
 const ratio=hero.level>=rules.maxLevel?100:Math.floor(100*hero.xp/expNeeded(hero.level))
 select('#xp-fill').style.width=ratio+'%';setText('xp-numbers',ratio+'%');setText('hud-xp','經驗 '+ratio+'%')
 setText('red-count',String(hero.items.red));setText('blue-count',String(hero.items.blue))
 keyboard.forEach((_,i)=>{
  const span=select('#cd-'+i), button=span.parentElement!, left=Math.ceil(world.cooldowns[i]-world.clock)
  button.classList.toggle('locked',!hero.skills[i]);button.classList.toggle('cooling',left>0)
  button.title=job.skills[i].name+(hero.skills[i]?'':'（未學習）')
  button.setAttribute('aria-label',button.title)
  if(span.textContent!==(left>0?String(left):''))span.textContent=left>0?String(left):''
 })
 select('[data-action="auto"]').classList.toggle('enabled',world.auto)
 const boss=world.boss
 select('#boss').hidden=!boss
 if(boss){setText('boss-name',boss.definition.name+' · 等級 '+boss.definition.level);select('#boss-fill').style.width=(boss.hp/boss.max*100)+'%'}
 const tracker=select('#tracker'), quest=quests.find(q=>q.id===hero.tracking)
 const trackKey=quest?quest.id+hero.quests[quest.id]+hero.claims[quest.id]+hero.zone+!!world.questPoint:''
 if(tracker.dataset.key!==trackKey){
  tracker.dataset.key=trackKey
  tracker.innerHTML=quest&&!hero.claims[quest.id]?`<div class="tracker-name"><i></i><b>${quest.name}</b></div><div class="tracker-detail">${questDescription(quest)} <span>${hero.quests[quest.id]??0}/${quest.count}</span></div>${(world.questPoint||quest.zone!==undefined&&quest.zone!==hero.zone)?action('quest-go','導航至任務目標',icon('compass',15)+' 導航','nav-guide'):''}`:'<div class="tracker-detail">在任務簿選擇要追蹤的委託</div>'
 }
 const pct=hero.explored[hero.zone]?.length??0
 setText('map-progress','探索 '+pct+'%')
 const level=select('#map-level'), text=safeZone(hero.zone)?'安全區域':'建議等級 '+region[1]
 if(level.textContent!==text)level.innerHTML='<i></i>'+text
 drawMap()
}
function drawMap(){
 const canvas=select<HTMLCanvasElement>('#minimap'), c=canvas.getContext('2d')!
 const marker=world.questPoint
 const key=[marker&&Math.round(marker.x/7),marker&&Math.round(marker.y/7),hero.zone,Math.round(hero.x/7),Math.round(hero.y/7),hero.explored[hero.zone]?.length??0].join(':')
 if(key===mapKey)return
 mapKey=key
 c.fillStyle='#242233';c.fillRect(0,0,180,110)
 const zone=hero.zone, terrain=world.textures?.exists('map-'+zone)?world.textures.get('map-'+zone).getSourceImage():undefined
 c.imageSmoothingEnabled=false
 if(terrain instanceof HTMLCanvasElement||terrain instanceof HTMLImageElement){
  c.globalAlpha=.85
  c.drawImage(terrain,0,0,180,110)
  c.globalAlpha=1
 }
 c.fillStyle='#1a172472'
 for(let i=0;i<100;i++)if(!hero.explored[zone]?.includes(i)){
  c.fillRect((i%10)*18,Math.floor(i/10)*11,18,11)
 }
 c.strokeStyle='#e5c48a25';c.strokeRect(3.5,3.5,173,103)
 const point=(x:number,y:number,col:string,size=2)=>{
  c.fillStyle=col;c.fillRect(Math.round(x/WIDTH*180-size/2),Math.round(y/HEIGHT*110-size/2),size,size)
 }
 for(const direction of directions){
  if(regionNeighbor(zone,direction)===undefined)continue
  const sign=edgePoint(direction,64)
  point(sign.x,sign.y,direction==='north'||direction==='west'?'#8ab8c8':'#d9aa6b',4)
 }
 if(marker)point(marker.x,marker.y,'#92edaf',5)
 point(hero.x,hero.y,'#271e26',9);point(hero.x,hero.y,'#ffda8b',5)
}
paintLog()
setInterval(()=>{if(world.scene?.isActive())paint()},120)
setInterval(()=>{if(titleState==='play'){rollover(hero);storeProgress()}},5000)
addEventListener('pagehide',storeProgress)
document.addEventListener('visibilitychange',()=>{if(document.hidden)storeProgress()})

const button=(key:string,text:string,css='')=>`<button type="button" class="button ${css}" data-action="${key}">${text}</button>`
const row=(heading:string,detail:string,tools='')=>`<div class="item-row"><div><strong>${heading}</strong><small>${detail}</small></div><div class="row-tools">${tools}</div></div>`
const empty=(text:string)=>`<p class="empty">${text}</p>`
const badge=(text:string)=>`<span class="badge">${text}</span>`
const group=(title:string,body:string)=>`<section class="panel-group"><h3>${title}</h3>${body}</section>`
const itemIcon=(cell:number)=>`<i aria-hidden="true" class="item-art" style="--atlas-x:${cell%4*100/3}%;--atlas-y:${Math.floor(cell/4)*50}%"></i>`
const gearIcon=(slot:number)=>`<i aria-hidden="true" class="item-art sample-icon" style="${atlasCell(slot)}"></i>`
const slotLabel=(slot:number)=>slot===0?'主武器':slot===1?'副手':slots[slot]
const iconCell=(m:Material)=>m==='red'?9:m==='blue'?10:11
const gearLabel=(g:Gear)=>`<span class="gear-label" style="color:${qualityColors[g.grade]}">${gearIcon(g.slot)}<span>${gearName(g)}</span></span>`
const gearStats=(g:Gear)=>[g.element!==undefined?elements[g.element]:'',g.leech?'吸血 '+g.leech+'%':''].filter(Boolean).join(' · ')
const gearDetail=(g:Gear)=>`${quality[g.grade]} · 階級 ${g.tier} · ${jobRequirement(g)} · 穿戴等級不限 · ${g.slot===0?'攻擊 +'+gearPower(g).toFixed(1):'防禦 +'+(gearPower(g)*.48).toFixed(1)}${g.identified?' · 附加屬性 +'+g.roll+(gearStats(g)?' · '+gearStats(g):''):' · 待鑑定'}`
const materialPrice:Record<Material,number>={red:14,blue:16,weapon:33,armor:26,bless:180,protect:140,warp:34,home:25,blink:38,morph:65,identify:31,book:62,shard:10}
const shopMaterials:Partial<Record<number,Material[]>>={2:['red','blue'],3:['weapon','armor','warp','home','blink','morph','identify'],8:['bless','protect','book','morph'],9:['book']}
const shopSlots:Partial<Record<number,number[]>>={0:[0],1:[1,2,3,4,5,6,7,8,9],8:[0,6,7,8]}
const stock=(id:string,limit:number)=>Math.max(0,limit-(hero.stock[id]??0))
const gradeToday=()=>2+new Date().getDate()%3
const available=(g:Gear)=>hero.bag.find(item=>item.uid===g.uid)||hero.worn[g.slot]
const allGear=()=>[...hero.bag,...Object.values(hero.worn)]
const sharedTitles:Record<string,string>={bag:'冒險背包',shield:'裝備欄',character:'角色資訊',skill:'職業技能',quest:'任務簿',shop:'燼燈市集',settings:'遊戲設定',travel:'王國地圖',trade:'整備與交易',forge:'燼燈鍛爐',vault:'公會倉庫',codex:'冒險圖鑑',death:'暗影降臨'}
function openPanel(next:string){
 if(titleState!=='play')return
 if(!panel)previousFocus=document.activeElement as HTMLElement
 panel=next;panelMode='open';world.blocked=true;chosenGear='';compareGear='';confirmRisk=false
 saleDraft=undefined;itemSaleDraft=undefined;saleSelection.clear();shopTab='buy'
 if(next==='travel')mapSelection=hero.zone
 if(next==='trade')tradeColumn='sell'
 renderPanel()
}
function closePanel(){
 if(panel==='death')return
 panel='';panelMode='open';world.blocked=false;saleDraft=undefined;itemSaleDraft=undefined;saleSelection.clear();renderPanel();previousFocus?.focus()
}
function openNpc(index:number){
 if(index===4)openPanel('forge')
 else if(index===5)openPanel('vault')
 else if(index===6)openPanel('travel')
 else if(index===7)openPanel('quest')
 else if(index===9)openPanel('skill')
 else{activeShop=index;openPanel('shop')}
}
function switchCharacter(next:typeof hero){
 try{
  activateCharacter(hasSave?hero:undefined,next)
  hero=next;hasSave=true
  return true
 }catch{message('角色存檔失敗，請確認瀏覽器儲存空間','warn');return false}
}
function start(loaded:boolean){
 if(!loaded){
  const name=select<HTMLInputElement>('#new-name').value
  if(!name.trim()){select<HTMLInputElement>('#new-name').reportValidity();return}
  const settings={music:hero.music,sfx:hero.sfx,preferences:{...hero.preferences}}
  if(!switchCharacter(Object.assign(createHero(name,jobIndex),settings)))return
 }
 if(world.hero!==hero)world.resetRegionState()
 world.hero=hero
 world.dead=false;world.auto=false;world.target=undefined
 world.enter(hero.zone,{x:hero.x,y:hero.y},true)
 const stats=attributes(hero)
 hero.hp=Math.min(stats.hp,hero.hp);hero.mp=Math.min(stats.mp,hero.mp)
 if(hero.hp<=0)world.revive()
 titleState='play';world.activePlay=true;world.blocked=false;panel=''
 volume(hero.music,hero.sfx,hero.preferences.ambience,hero.preferences.master);pixelPrefs();world.applyDetail();storeProgress();paint();renderPanel()
 message(hero.zone===0?'燼燈村 · 安全區域':zones[hero.zone][0])
}
function modal(body:string,extra=''){
 return `<div class="modal-shade ${extra}"><section class="dialog" role="dialog" aria-modal="${extra.includes('dock-panel')?'false':'true'}" aria-label="${titleState==='play'?sharedTitles[panel]:'暗影地下城'}">${body}</section></div>`
}
function renderPanel(){
 app.dataset.dock=titleState==='play'&&!!panel&&panel!=='death'?panelMode:'none'
 const root=select('#modal-root')
 const previousDeck=root.querySelector<HTMLElement>('.trade-deck')
 const scroll=previousDeck?Array.from(previousDeck.querySelectorAll('.trade-column'),node=>node.scrollTop):[]
 if(titleState==='roster'){
  const characters=roster(hasSave?hero:undefined)
  root.innerHTML=modal(`<div class="dialog-head"><h2>選擇角色</h2>${action('home','回到首頁',icon('close'),'icon-button')}</div>
   <div class="roster-list">${characters.map(character=>`<article class="roster-character"><img src="${playerArt(character.job)}" alt="">
    <div><strong>${escape(character.name)}</strong><span>${jobs[character.job].glyph} ${jobs[character.job].name} · 等級 ${character.level}</span></div>
    <div>${button('character-play:'+character.characterId,'進入冒險','primary')}${button('character-delete:'+character.characterId,'刪除角色','quiet')}</div></article>`).join('')||empty('目前沒有角色。')}</div>
    ${button('create','新的冒險')}`,'create-modal roster-modal')
  return
 }
 if(titleState==='title'){
  root.innerHTML=modal(`
   <div class="title-ornament"><span></span><i>${icon('crest',39)}</i><span></span></div>
   <div class="eyebrow title-kicker">SHADOW DUNGEON</div>
   <h1>暗影地下城</h1>
   <p class="build-label" data-build="${release.id}">${versionLabel} · ${releaseDate}（台灣） · ${release.id}</p>
   <div class="title-rule"><i></i></div>
   <p class="title-copy">遠古封印已出現裂痕。<br>循著燼燈的微光，走入暗影。</p>
   <div class="title-buttons">${hasSave?button('continue',icon('arrow',18)+' 繼續冒險','primary'):button('create',icon('sword',18)+' 開始冒險','primary')}${hasSave?button('create','新的冒險','quiet'):''}</div>
   ${hasSave?`<p class="character-current">${escape(hero.name)} · ${jobs[hero.job].name} · 等級 ${hero.level}</p>`:''}
   <div class="title-links">${button('roster','選擇角色','quiet')}${button('import',icon('book',13)+' 匯入存檔','quiet')}${button('title-help',icon('game',14)+' 操作指南','quiet')}</div>`,'title-modal')
  return
 }
 if(titleState==='create'){
  root.innerHTML=modal(`<div class="dialog-head"><div><span class="eyebrow">角色建立</span><h2>建立冒險者</h2></div>${action('home','回到首頁',icon('close'),'icon-button')}</div>
   <form id="character-form"><label class="field-label" for="new-name">角色名稱</label><input class="name-input" id="new-name" name="name" maxlength="16" required placeholder="輸入你的名字">
   <span class="field-label">選擇職業</span><div class="class-grid">${jobs.map((job,i)=>`<button class="class-card ${i===jobIndex?'selected':''}" style="--job:#${job.color.toString(16)}" type="button" data-action="job:${i}" aria-pressed="${i===jobIndex}"><span class="class-portrait"><img src="${playerArt(i)}" alt=""></span><strong>${job.name}</strong><small>${job.title}</small></button>`).join('')}</div>
   <p id="class-description" class="class-description">${jobs[jobIndex].description}</p><button type="submit" class="button primary">${icon('arrow',18)} 進入燼燈村</button></form>`,'create-modal')
  return
 }
 if(!panel){root.innerHTML='';return}
 if(panel==='death'){
  root.innerHTML=modal(`<div class="dialog-head"><h2>${sharedTitles[panel]}</h2></div><div class="panel-body">${renderBody()}</div>`,'system-modal')
  return
 }
 const controls=`<div class="panel-controls">
  ${action(panelMode==='collapsed'?'panel-expand':'panel-collapse',panelMode==='collapsed'?'展開視窗':'收合視窗',icon(panelMode==='collapsed'?'expand':'chevron',17),'small-icon')}
  ${action(panelMode==='minimized'?'panel-expand':'panel-minimize',panelMode==='minimized'?'還原視窗':'縮小視窗',icon(panelMode==='minimized'?'expand':'minus',17),'small-icon')}
  ${action('close','關閉視窗',icon('close',17),'small-icon')}
 </div>`
 root.innerHTML=modal(`<div class="dialog-head"><h2>${sharedTitles[panel]}</h2>${controls}</div>${panelMode==='open'?'<div class="panel-body">'+renderBody()+'</div>':''}`,'dock-panel '+panelMode+(panel==='trade'?' trade-modal':panel==='travel'?' map-modal':''))
 if(panel==='trade')root.querySelectorAll('.trade-column').forEach((node,i)=>{node.scrollTop=scroll[i]??0})

}
function questDescription(quest:Quest){
 if(quest.target!==undefined)return '擊敗 '+allMonsters.find(m=>m.id===quest.target)?.name
 return ({move:'在村莊移動',potion:'使用任一藥水',equip:'穿戴一件裝備',forge:'成功強化裝備',learn:'學習或升級技能',shard:'拾取影晶碎片',chest:'打開失落寶箱',hidden:'探索秘徑',boss:'擊敗區域魔王',kill:'擊敗任意魔物',visit:'抵達灰港要塞',rift:'擊退裂隙守衛'} as Record<string,string>)[quest.event]
}
function renderBody(view=panel):string{
 const village=safeZone(hero.zone)
 switch(view){
  case 'bag':{
   const wrap=(rows:string)=>panel==='trade'?'<div class="inventory-grid">'+rows+'</div>':rows
   const tabs=(['all',...Object.keys(bagCategories)] as ('all'|BagCategory)[]).map(tab=>button('bag-tab:'+tab,tab==='all'?'全部':bagCategories[tab],bagTab===tab?'primary':'')).join('')
   const gearRows=orderedGear().filter(g=>bagTab==='all'||bagGearCategory(g)===bagTab).map(g=>row(gearLabel(g),gearDetail(g),
    (compatibleGear(hero,g)?button('equip:'+g.uid,'穿戴'):'')+button('compare:'+g.uid,'比較')+
    (g.identified?'':button('identify:'+g.uid,'鑑定'))+button('lock:'+g.uid,gearLocked(hero,g)?'解除鎖定':'鎖定'))).join('')
   const itemRows=orderedItems().filter(m=>hero.items[m]>0&&(bagTab==='all'||bagItemCategory(m)===bagTab)).map(m=>row(
    '<span class="gear-label">'+itemIcon(iconCell(m))+materialNames[m]+'</span>','持有 × '+hero.items[m],
    (['red','blue','home','warp','blink','morph'].includes(m)?button(m==='home'?'home-item':m,'使用'):'')+
    button('lock:'+m,materialLocked(hero,m)?'解除鎖定':'鎖定'))).join('')
   return `<div class="bag-summary"><b>裝備槽 ${hero.bag.length}/${bagLimit}</b>${button('sort-bag','自動排序')}</div><label class="sale-filter">排序方式 <select id="bag-sort">${Object.entries(sortLabels).map(([id,label])=>`<option value="${id}" ${bagSort===id?'selected':''}>${label}</option>`).join('')}</select></label><div class="tabs bag-tabs">${tabs}</div>`+
    (panel!=='trade'&&compareGear?renderComparison(hero.bag.find(g=>g.uid===compareGear)):'')+
    (gearRows?group('裝備',wrap(gearRows)):'')+(itemRows?group('道具堆疊',wrap(itemRows)):'')+
    (!gearRows&&!itemRows?empty('此分類沒有道具。'):'')
  }
  case 'shield':return paperDoll()+(village?button('forge',icon('spark',16)+' 前往強化','primary'):'')
  case 'character':{
   const a=attributes(hero), names=['力量','敏捷','智力','體質','精神','物理攻擊','魔法攻擊','防禦','命中','迴避','爆擊','攻擊間隔','吸血']
   const values=[a.str,a.dex,a.int,a.con,a.spi,Math.round(a.attack),Math.round(a.magic),Math.round(a.defense),Math.round(a.hit*100)+'%',Math.round(a.evade*100)+'%',Math.round(a.crit*100)+'%',a.interval.toFixed(2)+' 秒',Math.round(a.leech*100)+'%']
   return group(escape(hero.name)+' · '+jobs[hero.job].name,`<div class="stat-grid">${names.map((name,i)=>`<div><span>${name}</span><b>${values[i]}</b></div>`).join('')}</div>`)+
   group('稱號',achievementTitles(hero).map(a=>button('title:'+a.id,a.name,hero.title===a.name?'primary':'')).join(' ')||empty('完成成就後可裝備稱號。'))+button('codex','查看冒險圖鑑')
  }
  case 'quest':return '<div class="tabs">'+[['all','全部'],['active','進行中'],['daily','每日'],['exp','遠征']].map(([id,label])=>button('quest-filter:'+id,label,questFilter===id?'primary':'')).join('')+'</div>'+
   group('委託與封印紀事',quests.filter(q=>(!q.zone||zones[q.zone][1]<=hero.level+4||hero.quests[q.id]!==undefined)&&
    (questFilter==='all'||questFilter==='daily'&&q.daily||questFilter==='exp'&&(q.zone??0)>=8||questFilter==='active'&&hero.quests[q.id]!==undefined&&!hero.claims[q.id])).map(q=>{
   const points=hero.quests[q.id], claimed=hero.claims[q.id]
   return row(q.name,`<span class="quest-text">${questDescription(q)} · ${points??0} / ${q.count}</span>`,claimed?badge('已領取'):points===undefined?button('accept:'+q.id,'接受'):button('track:'+q.id,hero.tracking===q.id?'追蹤中':'追蹤')+(points>=q.count?button('claim:'+q.id,'領取獎勵','primary'):hero.tracking===q.id&&(world.questPoint||q.zone!==undefined&&q.zone!==hero.zone)?button('quest-go','導航'):''))
  }).join('')||empty('這個分類目前沒有可接取的任務。'))
  case 'skill':return skillTree(village)
  case 'trade':return `<div class="tabs trade-tabs">${[['sell','出售'],['doll','人物'],['bag','背包']].map(([id,label])=>button('trade-column:'+id,label,tradeColumn===id?'primary':'')).join('')}</div>
   <div class="trade-deck" data-column="${tradeColumn}"><section class="trade-column trade-sell" aria-label="出售區域">${village?salesPane():empty('回到安全區域即可出售。')}</section>
   <section class="trade-column trade-character" aria-label="人物紙娃娃">${paperDoll()}</section>
   <section class="trade-column trade-bag" aria-label="背包及道具">${renderBody('bag')}</section></div>`
  case 'shop':{
   if(!village)return empty('商人位於燼燈村。')+button('home-scroll','使用回城卷軸')
   const mode='<div class="tabs">'+button('shop-tab:buy','購買分頁',shopTab==='buy'?'primary':'')+button('shop-tab:sell','出售分頁',shopTab==='sell'?'primary':'')+'</div>'
   if(shopTab==='sell')return mode+button('trade','開啟整備與交易')+salesPane()
   const tabs=[0,1,2,3,8,9].map(n=>button('shop:'+n,vendors[n],n===activeShop?'primary':'')).join('')
   const limit=activeShop===8?3:25
   const grade=activeShop===8?gradeToday():1
   const material=shopMaterials[activeShop]??[]
   const goods=shopSlots[activeShop]??[]
   return mode+`<div class="tabs">${tabs}</div>`+group('商店庫存',material.map(m=>row(materialNames[m],materialPrice[m]+' 金幣 · 庫存 '+stock(m,limit),
    `<input aria-label="${materialNames[m]}購買數量" type="number" min="1" max="${Math.max(1,stock(m,limit))}" value="1">`+button('buy:'+m,'購買'))).join('')+
    goods.map(s=>row(gearLabel(shopGear(s,grade)),(45+grade*75)+' 金幣 · 庫存 '+stock(activeShop+':'+s,limit),button('purchase:'+s,'購買'))).join(''))
  }
  case 'forge':{
   if(!village)return empty('請返回燼燈村找強化師。')
   const gear=allGear().find(g=>g.uid===chosenGear)
   if(!gear)return group('選擇要強化的裝備',allGear().map(g=>row(gearLabel(g),gearDetail(g),button('forge-select:'+g.uid,'選擇'))).join('')||empty('沒有可強化的裝備。'))
   const bless=select<HTMLInputElement>('#bless')?.checked??false
   const protect=select<HTMLInputElement>('#protect')?.checked??false
   const info=upgradeInfo(gear,bless)
   return group('強化 '+gearLabel(gear),gear.plus>=rules.maxUpgrade?empty('已達強化上限 +15'):`<div class="forge-info"><strong>+${gear.plus} → +${gear.plus+1}</strong><b>${Math.round(info.chance*100)}% 成功率</b></div>
    <p>需要 ${info.price} 金幣與 1 張${materialNames[info.material]}（持有 ${hero.items[info.material]}）。</p>
    <p class="${info.risk?'warning':''}">${info.risk?(protect?'失敗時消耗保護卷軸，保留強化等級。':'失敗會降級，失敗時有 '+Math.round(rules.destroy*100)+'% 機率損毀裝備。'):'這次強化位於安全範圍。'}</p>
    <label class="toggle"><input id="bless" type="checkbox" ${bless?'checked':''}> 使用祝福卷軸（${hero.items.bless}）</label>
    <label class="toggle"><input id="protect" type="checkbox" ${protect?'checked':''}> 使用保護卷軸（${hero.items.protect}）</label>
    ${info.risk?`<label class="toggle warning"><input id="risk" type="checkbox" ${confirmRisk?'checked':''}> 我確認接受上述風險</label>`:''}
    ${button('upgrade','執行強化','primary')}`)+button('forge-select:','更換裝備')
  }
  case 'vault':return village?group('存入裝備',hero.bag.map(g=>row(gearLabel(g),gearDetail(g),button('deposit:'+g.uid,'存入'))).join('')||empty('背包沒有裝備。'))+group('倉庫',hero.vault.map(g=>row(gearLabel(g),gearDetail(g),button('withdraw:'+g.uid,'取出'))).join('')||empty('倉庫是空的。')):empty('請返回燼燈村使用倉庫。')
  case 'travel':{
   const tracked=quests.find(quest=>quest.id===hero.tracking&&hero.quests[quest.id]!==undefined&&!hero.claims[quest.id])
   const objective=tracked?.zone??(tracked&&['move','equip','forge','learn'].includes(tracked.event)?0:undefined)
   const first=zones[mapSelection]?mapSelection:hero.zone
   const order=[first,...zones.map((_,i)=>i).filter(i=>i!==first)]
   return group('艾瑟蘭王國',realmChart(hero.zone,objective,hero.explored,mapSelection)+
    order.map(i=>{const [name,level,,,,description]=zones[i];return row(name+' '+badge(i===hero.zone?'所在區域':hero.explored[i]?.length?'已探索 · 等級 '+level:'未探索 · 等級 '+level),description,
     i!==hero.zone&&hero.level>=level?(nextDirection(hero.zone,i,hero.level)?button('road-to:'+i,'沿路步行'):'')+
     (village||hero.items.warp>0?button('travel-to:'+i,village?'傳送':'卷軸傳送'):''):'' )}).join(''))+(village?button('restore','在燼燈泉休息'):'')
  }
  case 'codex':return group('成就',achievements.map(a=>row(a.name,a.description,badge(Math.min(hero.stats[a.event]??0,a.count)+' / '+a.count))).join(''))+
   group('變身圖鑑',morphs.map(([name,,move,atk],i)=>row(name,'移速 '+Math.round(move*100)+'% · 攻速 '+Math.round(atk*100)+'%',hero.morphs.includes(i)?button('morph:'+i,'變身'):badge('未解鎖'))).join(''))+
   group('召喚生物',pets.map(p=>row(p[0],p[2])).join(''))+
   group('魔物圖鑑',allMonsters.map(m=>row(hero.bestiary[m.id]?m.name:'未記錄的魔物',zones[m.zone][0]+' · '+m.rank,badge('擊敗 '+(hero.bestiary[m.id]??0)))).join(''))
  case 'settings':return group('畫面與操作',`<label class="volume-row">字體大小 <select id="text-size"><option value="1">小字體</option><option value="1.15" ${hero.preferences.size>=1.1&&hero.preferences.size<1.3?'selected':''}>標準</option><option value="1.35" ${hero.preferences.size>=1.3?'selected':''}>大字體</option></select></label>
   <label class="volume-row">畫質 <select id="detail"><option value="balanced" ${hero.preferences.detail==='balanced'?'selected':''}>標準</option><option value="high" ${hero.preferences.detail==='high'?'selected':''}>高畫質</option><option value="ultra" ${hero.preferences.detail==='ultra'?'selected':''}>極致畫質</option></select></label>
   <label class="volume-row">地面點擊 <select id="click-mode"><option value="move">移動與互動</option><option value="interact" ${hero.preferences.click==='interact'?'selected':''}>只互動，使用搖桿移動</option></select></label>
   <label class="toggle"><input id="shake" type="checkbox" ${hero.preferences.shake?'checked':''}> 啟用爆擊震動</label>
   ${[['damageText','傷害浮動文字'],['shadows','角色接地陰影'],['effects','戰鬥與環境特效']].map(([key,label])=>`<label class="toggle"><input type="checkbox" data-visual="${key}" ${hero.preferences[key as 'damageText'|'shadows'|'effects']?'checked':''}> ${label}</label>`).join('')}`)+group('音訊',`<label class="volume-row">主音量 <input id="master" type="range" min="0" max="1" step="0.05" value="${hero.preferences.master}"></label><label class="volume-row">背景音樂 <input id="music" type="range" min="0" max="1" step="0.05" value="${hero.music}"></label><label class="volume-row">遊戲音效 <input id="sfx" type="range" min="0" max="1" step="0.05" value="${hero.sfx}"></label><label class="volume-row">環境音量 <input id="ambience" type="range" min="0" max="1" step="0.05" value="${hero.preferences.ambience}"></label>`)+
   group('自動拾取',`<label class="toggle"><input id="pickup-enabled" type="checkbox" ${hero.pickup.enabled?'checked':''}> 自動拾取有效範圍內的戰利品</label>
   <label class="volume-row">拾取距離 <select id="pickup-range">${[65,100,135,165].map(value=>`<option value="${value}" ${value===hero.pickup.range?'selected':''}>${value}</option>`).join('')}</select></label>
   <label class="volume-row">最低裝備品質 <select id="pickup-grade">${quality.map((label,i)=>`<option value="${i}" ${i===hero.pickup.minGrade?'selected':''}>${label}</option>`).join('')}</select></label>
   <div class="pickup-groups">${categories.map(key=>`<label class="toggle"><input type="checkbox" data-pickup-group="${key}" ${hero.pickup.groups.includes(key)?'checked':''}> ${categoryNames[key]}</label>`).join('')}</div>`)+group('本機存檔',`<div class="tabs">${button('save','儲存進度')}${button('export','匯出存檔')}${button('fullscreen','切換全螢幕')}${button('import','匯入存檔')}${button('home','返回首頁')}</div>`)+group('操作',help())+group('版本',row('暗影地下城 '+versionLabel,releaseDate+'（台灣） · '+release.id)+row('角色與場景資源','已載入 '+world.assetCount+' 張圖像 · Noto Sans TC'))
  case 'death':return `<div class="death">${icon('skull',44)}<p>你在暗影中倒下，失去 6% 的金幣。</p>${button('revive','在燼燈村復活','primary')}</div>`
  default:return ''
 }
}
const skillEffects:Record<Skill['effect'],string>={hit:'單體攻擊',area:'範圍攻擊',heal:'治療',shield:'減傷護盾',freeze:'攻擊並冰凍',dash:'突進打擊',stealth:'短暫隱身',summon:'召喚夥伴'}
function skillValue(skill:Skill,rank:number){
 const boost=1+(Math.max(rank,1)-1)*.18
 if(skill.effect==='heal')return '恢復生命上限的 '+Math.round(skill.power*boost*100)+'%'
 if(skill.effect==='shield')return '減傷 '+Math.round(skill.power*100)+'% · '+(5*boost).toFixed(1)+' 秒'
 if(skill.effect==='stealth')return '隱身 '+(5*boost).toFixed(1)+' 秒'
 if(skill.effect==='summon')return '召喚 '+pets[skill.power][0]+' · '+Math.round(52*boost)+' 秒'
 return '攻擊倍率 ×'+(skill.power*boost).toFixed(2)+(skill.effect==='freeze'?' · 冰凍 '+(2.1*boost).toFixed(1)+' 秒':'')
}
function skillTree(village:boolean){
 const job=jobs[hero.job]
 const lanes=[
  {label:'戰鬥',icons:job.skills.map((skill,index)=>({skill,index})).filter(({skill})=>['hit','area','freeze','dash'].includes(skill.effect))},
  {label:'支援',icons:job.skills.map((skill,index)=>({skill,index})).filter(({skill})=>!['hit','area','freeze','dash'].includes(skill.effect))}
 ]
 return `<div class="skill-tree" style="--tree-accent:#${job.color.toString(16)}"><div class="tree-root">${job.glyph} ${job.name} · 可用技能書 ${hero.items.book} 本</div>
 <div class="tree-lanes">${lanes.filter(lane=>lane.icons.length).map(lane=>`<section class="tree-lane"><h3>${lane.label}</h3>${lane.icons.map(({skill,index})=>{
  const rank=hero.skills[index],level=1+index*2,books=Math.max(1,rank)
  const available=village&&hero.level>=level&&hero.items.book>=books&&rank<5
  const state=rank===5?'已滿階':available?(rank?'可升級':'可學習'):rank?'已學習':'尚未解鎖'
  return `<article class="tree-node ${available?'available':rank?'learned':'unlearned'}">
   <div class="tree-heading">${icon(skillIcons[index],20)} <strong>${skill.name}</strong> ${badge(state)}</div>
   <span>階級 ${rank}/5 · 鍵位 ${index+1} · ${skillEffects[skill.effect]}</span>
   <span>${skillValue(skill,rank)}</span><span>${skill.mana} 魔力 · ${skill.cooldown} 秒冷卻</span>
   ${rank===5?'':`<span>需求：等級 ${level} · 技能書 ${books} 本${village?'':' · 安全區域'}</span>`}
   ${available?button('learn:'+index,(rank?'升級':'學習')+' · '+books+' 書','primary'):''}</article>`
 }).join('')}</section>`).join('')}</div></div>`+(village?button('books','向導師購買技能書'):'')
}
function help(){
 return '<p class="help-copy">方向鍵或 WASD 移動，按住 Shift 或將搖桿推到外圈可奔跑，也可點擊地面自動尋路。點擊魔物即可鎖定並自動追擊。</p><div class="help-keys"><span><kbd>SPACE</kbd> 普通攻擊</span><span><kbd>1–5</kbd> 職業技能</span><span><kbd>Q</kbd> 生命藥水</span><span><kbd>R</kbd> 魔力藥水</span><span><kbd>E</kbd> 拾取</span><span><kbd>ESC</kbd> 關閉視窗</span></div>'
}
function renderComparison(gear?:Gear){
 if(!gear)return ''
 const current=hero.worn[gear.slot]
 const eligible=compatibleGear(hero,gear)
 const before=attributes(hero), after=eligible?attributes({...hero,worn:{...hero.worn,[gear.slot]:gear}}):before
 const card=(item?:Gear)=>item?'<strong>'+gearLabel(item)+'</strong><p>'+gearDetail(item)+'</p>':'空欄位'
 const stats=[['戰力指標',combatScore(after)-combatScore(before)],['物理攻擊',after.attack-before.attack],['魔法攻擊',after.magic-before.magic],['防禦',after.defense-before.defense],
  ['生命上限',after.hp-before.hp],['魔力上限',after.mp-before.mp],['吸血（百分點）',(after.leech-before.leech)*100]] as const
 return group('比較'+slotLabel(gear.slot),`<div id="gear-comparison" class="comparison"><div><h4>目前裝備</h4>${card(current)}</div><div><h4>背包裝備</h4>${card(gear)}</div></div>
 <div class="stat-grid">${eligible?stats.map(([name,value])=>`<div><span>${name}</span><b class="${value<0?'warning':'advantage'}">${value>0?'+':''}${value.toFixed(1)}</b></div>`).join(''):empty('此裝備不符合職業限制。')}</div>`)

}
function combatScore(stats:ReturnType<typeof attributes>){
 return Math.round(Math.max(stats.attack,stats.magic)+stats.defense+stats.hp*.15+stats.mp*.1+stats.leech*100)
}
function orderedGear(){
 const bag=[...hero.bag]
 if(bagSort==='quality')return bag.sort((a,b)=>b.grade-a.grade||b.plus-a.plus)
 if(bagSort==='level')return bag.sort((a,b)=>b.tier-a.tier)
 if(bagSort==='price')return bag.sort((a,b)=>gearSalePrice(b)-gearSalePrice(a))
 if(bagSort==='recent')return bag.sort((a,b)=>(b.acquiredAt??0)-(a.acquiredAt??0))
 return bag
}
function orderedItems(){
 if(bagSort==='price')return [...materials].sort((a,b)=>materialSale(b)-materialSale(a))
 if(bagSort==='recent')return [...materials].sort((a,b)=>(hero.itemAcquiredAt[b]??0)-(hero.itemAcquiredAt[a]??0))
 return materials
}
function paperDoll(){
 const slotCard=(index:number)=>{
  const gear=hero.worn[index], name=slotLabel(index)
  return `<button type="button" class="doll-slot" style="--slot-ink:${gear?qualityColors[gear.grade]:'#e7cfab'}" data-action="doll-slot:${index}" aria-pressed="${selectedSlot===index}" aria-label="${name}：${gear?escape(gearName(gear)):'未裝備'}">
   ${gear?gearIcon(index):'<span class="doll-empty" aria-hidden="true">＋</span>'}
   <span>${name}${gear?.plus?' +'+gear.plus:''}</span></button>`
 }
 const gear=hero.worn[selectedSlot], job=jobs[hero.job], stats=attributes(hero), set=setBonus(hero.worn)
 return `<div class="doll-stats">戰力指標 ${combatScore(stats)} · 物攻 ${Math.round(stats.attack)} · 魔攻 ${Math.round(stats.magic)} · 防禦 ${Math.round(stats.defense)}</div>
  <div class="doll"><div class="doll-slots">${[2,3,4,9,5].map(slotCard).join('')}</div>
  <div class="doll-portrait"><div class="doll-figure ${hero.job===0?'sample-doll':''}">${hero.job===0?photographedDoll(hero.worn,true):''}<img src="${playerArt(hero.job)}" alt="">${hero.job===0?photographedDoll(hero.worn,false):equipmentLayers(hero.job,hero.worn)}</div><span>${escape(hero.name)} · ${job.name}</span></div>
  <div class="doll-slots">${[0,1,6,7,8].map(slotCard).join('')}</div></div>`+
  (set.pieces>=3?group('套裝效果',empty(set.pieces+' 件 · 防禦 +'+set.defense+(set.damage?' · 物攻及魔攻 +'+set.damage:''))):'')+
  group('角色屬性',`<div class="doll-vitals"><span>生命 ${Math.ceil(hero.hp)} / ${Math.ceil(stats.hp)}</span><span>魔力 ${Math.ceil(hero.mp)} / ${Math.ceil(stats.mp)}</span>
   <span>攻速 ${world.attackRate.toFixed(2)} 次／秒</span><span>移速 ${Math.round(world.movementSpeed)} 單位／秒</span>
   <span>爆擊 ${Math.round(stats.crit*100)}%</span><span>護盾減傷 ${Math.round(world.shieldReduction*100)}%</span></div>`)+
  group(slotLabel(selectedSlot),gear?row(gearLabel(gear),gearDetail(gear),button('unequip:'+selectedSlot,'卸除')+button('lock:'+gear.uid,gearLocked(hero,gear)?'解除鎖定':'鎖定')):empty('此部位尚未裝備。'))+
  (compareGear?renderComparison(hero.bag.find(g=>g.uid===compareGear)):'')+
  group('背包替換裝備',orderedGear().filter(g=>g.slot===selectedSlot).map(g=>row(gearLabel(g),gearDetail(g),
   button('compare:'+g.uid,'比較')+(compatibleGear(hero,g)?button('equip:'+g.uid,'穿戴'):badge('職業不符')))).join('')||empty('背包沒有此部位的裝備。'))
}
function canTrade(){return safeZone(hero.zone)&&(panel==='trade'||panel==='shop'&&shopTab==='sell')}
function salesPane(){
 if(itemSaleDraft){
  const {item,count}=itemSaleDraft
  return group('確認出售道具',`<p role="status">出售 ${count} 件${materialNames[item]}，可獲得 ${materialSale(item)*count} 金幣。</p>`+
     button('sale-item-cancel','取消')+button('sale-item-confirm','確認出售','primary'))
 }
 if(saleDraft)return group('確認出售裝備',equipmentSales())
 return group('出售裝備',equipmentSales())+
    group('出售道具',materials.filter(m=>hero.items[m]>0).map(m=>row(materialNames[m],materialSale(m)+' 金幣／件 · 持有 '+hero.items[m],
     !canSellItem(hero,m)?badge(materialLocked(hero,m)?'已鎖定':'任務道具'):
      `<input aria-label="${materialNames[m]}出售數量" type="number" min="1" max="${hero.items[m]}" value="1">`+button('sell-material:'+m,'出售'))).join('')||empty('沒有可出售的道具。'))
}
function equipmentSales(){
 if(saleDraft){
  const draft=saleDraft,quote=quoteGearSale(hero,draft.ids)
  return `<p role="status">出售 ${draft.ids.length} 件裝備，可獲得 ${draft.total} 金幣。</p>`+
   quote.gear.map(gear=>row(gearLabel(gear),gearSalePrice(gear)+' 金幣')).join('')+
   (draft.rare?'<p class="warning">包含稀有以上裝備，售出後無法取回。</p>':'')+
   button('sale-cancel','取消')+button('sale-confirm',draft.second?'再次確認出售':'確認出售','primary')
 }
 const counts=slots.map((_,slot)=>hero.bag.filter(gear=>gear.slot===slot&&canSellGear(hero,gear)).length)
 const options=slots.map((_,index)=>`<option value="${index}" ${saleSlot===String(index)?'selected':''}>${slotLabel(index)}（${counts[index]}）</option>`).join('')
 const rows=hero.bag.filter(gear=>saleSlot==='all'||String(gear.slot)===saleSlot).map(gear=>
  row(gearLabel(gear),slotLabel(gear.slot)+' · '+gearSalePrice(gear)+' 金幣',canSellGear(hero,gear)?
   `<label class="sale-check"><input type="checkbox" data-sale-id="${gear.uid}" ${saleSelection.has(gear.uid)?'checked':''}>選取</label>`+button('sell:'+gear.uid,'出售'):
   badge(gearLocked(hero,gear)?'已鎖定':'已穿戴'))).join('')
 const selected=quoteGearSale(hero,saleSelection)
 return `<label class="sale-filter">裝備分類 <select id="sale-slot"><option value="all" ${saleSlot==='all'?'selected':''}>全部（${counts.reduce((sum,count)=>sum+count,0)}）</option>${options}</select></label>
  <div class="sale-toolbar"><label class="sale-filter">整批品質 <select id="sale-quality">${quality.map((name,index)=>`<option value="${index}" ${saleQuality===index?'selected':''}>${name}</option>`).join('')}</select></label>
  ${button('sale-grade','出售此品質')}${button('sale-selected','出售所選')}${button('sale-clear','清除選取')}</div>
  <p class="sale-summary" aria-live="polite">已選 ${selected.gear.length} 件，可獲得 ${selected.total} 金幣</p>`+
  (rows||empty('此分類沒有背包装備。'))
}
function previewSale(ids:Iterable<string>){
 const quote=quoteGearSale(hero,ids)
 if(!quote.gear.length){message('沒有符合條件的可出售裝備','warn');return}
 saleDraft={ids:quote.gear.map(gear=>gear.uid),total:quote.total,rare:quote.rare,second:false}
 renderPanel()
}
function shopGear(slot:number,grade:number){
 return hero.zone===8&&activeShop===8?makeRelic(slot,grade,hero.level,hero.job,0):makeGear(slot,grade,hero.level,slot===0?hero.job:undefined)
}
const materialSale=(item:Material)=>Math.max(1,Math.floor(materialPrice[item]*.45))
function perform(key:string,element:HTMLElement){
 if(key==='retry-assets'){location.reload();return}
 const [type,...args]=key.split(':'), id=args.join(':'), index=Number(id)
 const village=safeZone(hero.zone)
 if(type==='close'){closePanel();return}
 if(type==='fold-log'){
  const visible=select('.move-controls').classList.toggle('show-log')
  element.setAttribute('aria-expanded',String(visible))
  element.setAttribute('aria-label',(visible?'收合':'展開')+'冒險紀錄')
  element.title=(visible?'收合':'展開')+'冒險紀錄'
  return
 }
 if(type==='fold-map'||type==='fold-tracker'){
  const selector=type==='fold-map'?'.map-card':'.tracker'
  const folded=select(selector).classList.toggle('folded')
  const noun=type==='fold-map'?'小地圖':'任務追蹤'
  element.setAttribute('aria-expanded',String(!folded))
  element.setAttribute('aria-label',(folded?'展開':'收合')+noun)
  element.title=(folded?'展開':'收合')+noun
  if(type==='fold-map')app.dataset.mapFolded=String(folded)
  return
 }
 if(panel&&panel!=='death'&&['panel-expand','panel-minimize','panel-collapse'].includes(type)){
  panelMode=type==='panel-expand'?'open':type==='panel-minimize'?'minimized':'collapsed'
  world.blocked=panelMode==='open'
  renderPanel()
  return
 }
 if(type==='title-help'){
  select('#modal-root').innerHTML=modal(`<div class="dialog-head"><h2>操作指南</h2>${action('home','關閉視窗',icon('close'),'icon-button')}</div>${help()}`,'create-modal')
  return
 }
 if(type==='home'){
  storeProgress();titleState='title';world.activePlay=false;world.blocked=false;panel='';renderPanel();return
 }
 if(type==='roster'){titleState='roster';renderPanel();return}
 if(titleState==='roster'&&(type==='character-play'||type==='character-delete')){
  const candidate=roster(hasSave?hero:undefined).find(character=>character.characterId===id)
  if(!candidate)return
  if(type==='character-play'){if(switchCharacter(candidate))start(true);return}
  if(!window.confirm('確定要刪除角色「'+candidate.name+'」？'))return
  if(!window.confirm('此角色的等級、裝備及任務將永久刪除。再次確認？'))return
  try{const next=deleteCharacter(id,hasSave?hero:undefined);hasSave=!!next;hero=next??createHero('無名旅人',0);renderPanel()}
  catch{message('無法完成刪除，請確認瀏覽器儲存空間','warn')}
  return
 }
 if(type==='create'){titleState='create';jobIndex=hero.job;renderPanel();select('#new-name').focus();return}
 if(type==='continue'){start(true);return}
 if(type==='job'){
  jobIndex=index
  select('#class-description').textContent=jobs[index].description
  document.querySelectorAll<HTMLElement>('.class-card').forEach((item,i)=>{item.classList.toggle('selected',i===index);item.setAttribute('aria-pressed',String(i===index))})
  return
 }
 if(type==='import'){select<HTMLInputElement>('#import-file').click();return}
 if(type==='fullscreen'){
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>message('無法退出全螢幕','warn'))
  else{
   const immersive=()=>{app.classList.toggle('immersive');message('可從 Safari 分享選單加入主畫面，以全螢幕遊玩','gold')}
   if(document.documentElement.requestFullscreen)void document.documentElement.requestFullscreen().catch(immersive)
   else immersive()
  }
  return
 }
 if(titleState!=='play'){
  if(type==='settings'){titleState='title';select('#modal-root').innerHTML=modal(`<div class="dialog-head"><h2>音量與操作</h2>${action('home','關閉視窗',icon('close'),'icon-button')}</div>
   <label class="volume-row">背景音樂 <input id="music" type="range" min="0" max="1" step="0.05" value="${hero.music}"></label>
   <label class="volume-row">遊戲音效 <input id="sfx" type="range" min="0" max="1" step="0.05" value="${hero.sfx}"></label>${help()}`,'create-modal')}
  return
 }
 if(type==='shop'&&id)activeShop=index
 if(type==='books'){activeShop=9;openPanel('shop');return}
 if(Object.hasOwn(sharedTitles,type)){openPanel(type);return}
 if(type==='revive'){world.revive();panel='';world.blocked=false;renderPanel();return}
 if(world.dead)return
 if(type==='attack'){world.attack();return}
 if(type==='cast'){world.cast(index);return}
 if(type==='pickup'){world.pickup();return}
 if(type==='auto'){
  if(world.blocked)return
  if(village){message('離開安全區域後可開啟自動練功','warn');return}
  world.auto=!world.auto;world.target=undefined
  message('自動練功已'+(world.auto?'開啟':'關閉'));paint();return
 }
 if(type==='quest-go'){
  const quest=quests.find(q=>q.id===hero.tracking)
  if(world.navigateQuest()){closePanel();message('已開始任務導航','gold')}
  else if(quest?.zone!==undefined&&quest.zone!==hero.zone)openPanel('travel')
  return
 }
 if(type==='blink'){if(world.blink())closePanel();return}
 if(type==='red'||type==='blue'){world.usePotion(type);return}
 if(type==='home-scroll'||type==='home-item'){
  if(!hero.items.home){message('需要回城卷軸','warn');return}
  hero.items.home--;world.travel(0);closePanel();return
 }
 if(type==='warp'){
  if(!hero.items.warp){message('需要傳送卷軸','warn');return}
  openPanel('travel');return
 }
 if(type==='map-zone'&&panel==='travel'&&zones[index]){
  mapSelection=index
  const map=select('.realm-scroll'),scroll=map.scrollLeft
  renderPanel();select('.realm-scroll').scrollLeft=scroll
  select(`[data-action="map-zone:${index}"]`).focus({preventScroll:true});return
 }
 if(type==='trade-column'&&panel==='trade'&&['sell','doll','bag'].includes(id)){tradeColumn=id;renderPanel();return}
 if(type==='shop-tab'&&panel==='shop'&&village){
  shopTab=id==='sell'?'sell':'buy';saleDraft=undefined;itemSaleDraft=undefined;saleSelection.clear();renderPanel();return
 }
 if(canTrade()){
  if(type==='sell'){previewSale([id]);return}
  if(type==='sale-selected'){previewSale(saleSelection);return}
  if(type==='sale-grade'){previewSale(hero.bag.filter(gear=>gear.grade===saleQuality).map(gear=>gear.uid));return}
  if(type==='sale-item-cancel'){itemSaleDraft=undefined;renderPanel();return}
  if(type==='sale-item-confirm'&&itemSaleDraft){
   const {item,count}=itemSaleDraft
   const total=materialSale(item)*count
   itemSaleDraft=undefined
   if(canSellItem(hero,item)&&hero.items[item]>=count&&hero.gold+total<=1e9){
    hero.items[item]-=count;hero.gold+=total
    storeProgress();paint();sound('loot');message('已出售 '+count+' 件，獲得 '+total+' 金幣','gold')
   }else message('道具數量或金額已變更，請重新確認','warn')
   renderPanel();return
  }
  if(type==='sale-clear'){saleSelection.clear();renderPanel();return}
  if(type==='sale-cancel'){saleDraft=undefined;renderPanel();return}
  if(type==='sale-confirm'&&saleDraft){
   const draft=saleDraft
   if(draft.rare&&!draft.second){draft.second=true;renderPanel();return}
   saleDraft=undefined
   if(sellQuotedGear(hero,draft.ids,draft.total,draft.second)){
    for(const uid of draft.ids)saleSelection.delete(uid)
    storeProgress();paint();sound('loot');message('已出售 '+draft.ids.length+' 件裝備，獲得 '+draft.total+' 金幣','gold')
   }else message('裝備或總價已變更，請重新確認','warn')
   renderPanel();return
  }
 }
 const g=allGear().find(g=>g.uid===id)
 const bagItem=hero.bag.find(g=>g.uid===id)
 if(type==='bag-tab'){bagTab=id==='all'||Object.hasOwn(bagCategories,id)?id as typeof bagTab:'all';renderPanel();return}
 if(type==='doll-slot'&&(panel==='shield'||panel==='trade')&&slots[index]){
  selectedSlot=index;compareGear='';renderPanel()
  select(`[data-action="doll-slot:${index}"]`).focus({preventScroll:true})
  return
 }
 if(type==='sort-bag'){bagSort='slot';sortBag(hero.bag);storeProgress();renderPanel();return}
 if(type==='lock'&&(g||materials.includes(id as Material))){
  hero.locks=hero.locks.includes(id)?hero.locks.filter(key=>key!==id):[...hero.locks,id]
  storeProgress();renderPanel();return
 }
 if(type==='road-to'&&world.walkToRegion(index)){closePanel();return}
 if(type==='compare'&&bagItem){
  compareGear=compareGear===id?'':id
  if(panel==='trade'){tradeColumn='doll';selectedSlot=bagItem.slot}
  renderPanel()
  if(panel==='trade'&&compareGear)select('#gear-comparison').scrollIntoView({block:'nearest'})
  return
 }
 if(type==='quest-filter'){questFilter=id;renderPanel();return}
 if(type==='equip'&&bagItem&&compatibleGear(hero,bagItem)){
  const previous=hero.worn[bagItem.slot]
  hero.bag=hero.bag.filter(g=>g!==bagItem)
  if(previous)hero.bag.push(previous)
  hero.worn[bagItem.slot]=bagItem;compareGear='';record(hero,'equip');sound('hit');message('已穿戴 '+gearName(bagItem))
 }else if(type==='unequip'&&hero.worn[index]){
  if(fullBag(hero)){message('背包已滿','warn');return}
  hero.bag.push(hero.worn[index]);delete hero.worn[index]
 }else if(type==='identify'&&g&&!g.identified){
  if(hero.items.identify<1){message('需要鑑定卷軸','warn');return}
  hero.items.identify--;g.identified=true;sound('magic');message('鑑定完成：附加屬性 +'+g.roll,'gold')
 }else if(type==='restore'&&village){world.restore()}
 else if(type==='travel-to'&&zones[index]&&index!==hero.zone&&hero.level>=zones[index][1]){
  if(!village&&!hero.items.warp){message('需要傳送卷軸','warn');return}
  if(!village)hero.items.warp--
  world.travel(index);closePanel();return
 }else if(type==='morph'){world.transform(id?index:undefined);return}
 else if(type==='buy'&&village&&(shopMaterials[activeShop]??[]).includes(id as Material)){
  const material=id as Material, input=element.parentElement?.querySelector('input'), quantity=input?.valueAsNumber??1
  const limit=activeShop===8?3:25, cost=quantity*materialPrice[material]
  if(!Number.isInteger(quantity)||quantity<1||quantity>stock(id,limit)||cost>hero.gold){message('請檢查購買數量、庫存與金幣','warn');return}
  addItem(hero,material,quantity);hero.gold-=cost;hero.stock[id]=(hero.stock[id]??0)+quantity
  message('已購買 '+quantity+' × '+materialNames[material])
 }else if(type==='purchase'&&village&&(shopSlots[activeShop]??[]).includes(index)){
  if(fullBag(hero)){message('背包已滿，未扣除金幣','warn');return}
  const grade=activeShop===8?gradeToday():1, cost=45+grade*75, key=activeShop+':'+index
  if(cost>hero.gold||!stock(key,activeShop===8?3:25)){message('金幣不足或已售罄','warn');return}
  hero.bag.push(shopGear(index,grade));hero.gold-=cost;hero.stock[key]=(hero.stock[key]??0)+1
  sound('loot')
 }else if(type==='sell-material'&&canTrade()&&materials.includes(id as Material)){
  const item=id as Material
  if(!canSellItem(hero,item)){message('此道具無法出售','warn');return}
  const count=element.parentElement?.querySelector('input')?.valueAsNumber??1
  if(!Number.isInteger(count)||count<1||count>hero.items[item]){message('請輸入可出售的數量','warn');return}
  itemSaleDraft={item,count};renderPanel();return
 }else if(type==='deposit'&&village&&bagItem){
  hero.bag=hero.bag.filter(g=>g!==bagItem);hero.vault.push(bagItem)
 }else if(type==='withdraw'&&village){
  const item=hero.vault.find(g=>g.uid===id)
  if(item&&fullBag(hero)){message('背包已滿，裝備保留在倉庫','warn');return}
  if(item){hero.vault=hero.vault.filter(g=>g!==item);hero.bag.push(item)}
 }else if(type==='forge-select'&&village){chosenGear=id;confirmRisk=false}
 else if(type==='upgrade'&&village){
  const selected=allGear().find(g=>g.uid===chosenGear)
  if(!selected)return
  const result=upgrade(hero,selected,select<HTMLInputElement>('#bless').checked,select<HTMLInputElement>('#protect').checked,confirmRisk)
  confirmRisk=false
  const success=result==='強化成功'
  message(result,success?'gold':'warn');sound(success?'forge':'fail');world.burst(hero,success?0xefd084:0xff7c70,85)
  if(!available(selected))chosenGear=''
 }else if(type==='learn'&&village){
  const rank=hero.skills[index]
  if(rank===undefined||rank>=5)return
  if(hero.level<1+index*2||hero.items.book<Math.max(1,rank)){message('等級或技能書不足','warn');return}
  hero.items.book-=Math.max(1,rank);hero.skills[index]++;record(hero,'learn');sound('magic')
  message('已修習 '+jobs[hero.job].skills[index].name,'gold')
 }else if(type==='accept'||type==='track'||type==='claim'){
  rollover(hero)
  const quest=quests.find(q=>q.id===id)
  if(!quest)return
  if(type==='accept'&&hero.quests[id]===undefined){
   const completed=quest.event==='chest'&&hero.chests.includes(quest.zone!)||quest.event==='hidden'&&hero.hidden.includes(quest.zone!)||quest.event==='visit'&&!!hero.explored[quest.zone!]?.length||quest.event==='rift'&&!!hero.stats['riftDay'+(quest.zone??hero.zone)]
   hero.quests[id]=completed?quest.count:quest.event==='shard'?Math.min(hero.items.shard,quest.count):0
   hero.tracking=id
  }else if(type==='track'&&hero.quests[id]!==undefined)hero.tracking=id
  else if(type==='claim'&&!hero.claims[id]&&hero.quests[id]>=quest.count){
   if(quest.zone&&quest.event==='boss'&&fullBag(hero)){message('背包已滿，獎勵仍可領取','warn');return}
   hero.claims[id]=true;hero.gold+=30+quest.count*7+(quest.zone??0)*27
   world.reward(28+quest.count*7+(quest.zone??0)*36)
   if(quest.zone&&quest.event==='boss'){
    const slot=(quest.zone+2)%9, tier=zones[quest.zone][1]
    hero.bag.push(quest.zone>=9?makeRelic((quest.zone+2)%8+1,3,tier,hero.job,relicForZone(quest.zone)):
     makeGear(slot,3,tier,slot===0?hero.job:undefined))
   }
   if(hero.tracking===id)hero.tracking=quests.find(q=>!hero.claims[q.id]&&hero.quests[q.id]!==undefined)?.id??''
   message('完成任務：'+quest.name,'gold')
  }
 }else if(type==='title'){
  const title=achievementTitles(hero).find(a=>a.id===id)
  if(title)hero.title=hero.title===title.name?'':title.name
 }else if(type==='save'){storeProgress();message('遊戲進度已儲存','gold');return}
 else if(type==='export'){
  const url=URL.createObjectURL(new Blob([JSON.stringify(hero,null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download='shadow-dungeon-save.json';link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000);return
 }
 storeProgress();paint()
 if(panel&&panelMode==='open'){
  const scroll=select('.panel-body').scrollTop
  renderPanel()
  select('.panel-body').scrollTop=scroll
 }
}

app.addEventListener('pointerdown',unlock,{passive:true})
app.addEventListener('submit',event=>{
 if((event.target as HTMLElement).id!=='character-form')return
 event.preventDefault();unlock();start(false)
})
app.addEventListener('click',event=>{
 const element=(event.target as HTMLElement).closest<HTMLElement>('[data-action]')
 if(!element)return
 unlock();perform(element.dataset.action!,element)
})
app.addEventListener('input',event=>{
 const target=event.target as HTMLInputElement
 if(target.id==='music'||target.id==='sfx'){
  hero[target.id]=Number(target.value);volume(hero.music,hero.sfx,hero.preferences.ambience,hero.preferences.master);storeProgress()
 }
 if(target.id==='master'){hero.preferences.master=Number(target.value);volume(hero.music,hero.sfx,hero.preferences.ambience,hero.preferences.master);storeProgress()}
 if(target.id==='ambience'){hero.preferences.ambience=Number(target.value);volume(hero.music,hero.sfx,hero.preferences.ambience,hero.preferences.master);storeProgress()}
})
app.addEventListener('change',async event=>{
 const input=event.target as HTMLInputElement
 if(input.id==='bag-sort'&&Object.hasOwn(sortLabels,input.value)){
  bagSort=input.value as keyof typeof sortLabels;renderPanel();select('#bag-sort').focus();return
 }
 if(input.id==='sale-quality'){saleQuality=Number(input.value);return}
 if(input.dataset.saleId&&canTrade()&&!saleDraft){
  const uid=input.dataset.saleId
  if(input.checked)saleSelection.add(uid)
  else saleSelection.delete(uid)
  const selected=quoteGearSale(hero,saleSelection)
  select('.sale-summary').textContent='已選 '+selected.gear.length+' 件，可獲得 '+selected.total+' 金幣'
  return
 }
 if(input.id==='sale-slot'){
  saleSlot=input.value
  const scroll=select('.panel-body').scrollTop
  renderPanel()
  select('.panel-body').scrollTop=scroll
  select('#sale-slot').focus({preventScroll:true})
  return
 }
 if(input.id==='pickup-enabled'){hero.pickup.enabled=input.checked;storeProgress();return}
 if(input.id==='pickup-range'){hero.pickup.range=Number(input.value);storeProgress();return}
 if(input.id==='pickup-grade'){hero.pickup.minGrade=Number(input.value);storeProgress();return}
 const group=input.dataset.pickupGroup as Category|undefined
 if(group&&categories.includes(group)){
  hero.pickup.groups=input.checked?[...new Set([...hero.pickup.groups,group])]:hero.pickup.groups.filter(value=>value!==group)
  storeProgress();return
 }
 if(input.id==='text-size'){hero.preferences.size=Number(input.value);pixelPrefs();storeProgress();return}
 if(input.id==='detail'){
  hero.preferences.detail=input.value==='ultra'?'ultra':input.value==='balanced'?'balanced':'high'
  world.applyDetail();storeProgress();return
 }
 if(input.id==='click-mode'){hero.preferences.click=input.value==='interact'?'interact':'move';storeProgress();return}
 const visual=input.dataset.visual
 if(visual==='damageText'||visual==='shadows'||visual==='effects'){hero.preferences[visual]=input.checked;storeProgress();return}
 if(input.id==='shake'){hero.preferences.shake=input.checked;storeProgress();return}
 if(input.id==='risk'){confirmRisk=input.checked;return}
 if(input.id==='bless'||input.id==='protect'){confirmRisk=false;renderPanel();return}
 if(input.id!=='import-file'||!input.files?.[0])return
 try{
  const imported=decodeSave(await input.files[0].text())
  imported.characterId=createHero(imported.name,imported.job).characterId
  if(switchCharacter(imported)){start(true);message('存檔已匯入為獨立角色','gold')}
 }catch{message('無法匯入此存檔','warn')}
 finally{input.value=''}
})
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){if(panel)closePanel();else if(titleState==='create'||titleState==='roster'){titleState='title';renderPanel()}return}
 if(titleState!=='play'||world.blocked||event.repeat||event.ctrlKey||event.altKey||event.metaKey)return
 if((event.target as HTMLElement).matches('button,input,select,textarea')&&event.key===' ')return
 const key=event.key.toLowerCase()
 if([' ','q','r','e',...keyboard].includes(key)){event.preventDefault();unlock()}
 if(key===' ')world.attack()
 if(key==='q')world.usePotion('red')
 if(key==='r')world.usePotion('blue')
 if(key==='e')world.pickup()
 if(keyboard.includes(key))world.cast(Number(key)-1)
})
const joystick=select('#joystick'), knob=select('#knob')
let stick:number|undefined
function stickMove(event:PointerEvent){
 if(event.pointerId!==stick)return
 const rect=joystick.getBoundingClientRect(), x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2
 const radius=rect.width*.34, length=Math.max(radius,Math.hypot(x,y))
 world.joystick={x:x/length,y:y/length}
 knob.style.transform=`translate(${world.joystick.x*radius}px,${world.joystick.y*radius}px)`
}
joystick.addEventListener('pointerdown',event=>{
 if(titleState!=='play'||world.blocked)return
 if(stick!==undefined)return
 stick=event.pointerId;joystick.setPointerCapture(stick);stickMove(event)
})
joystick.addEventListener('pointermove',stickMove)
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{
 if((e as PointerEvent).pointerId!==stick)return
 stick=undefined;world.joystick={x:0,y:0};knob.style.transform=''
})
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){stick=undefined;world.joystick={x:0,y:0};knob.style.transform=''}
})
trackRelease(storeProgress,()=>message('新版已就緒。請先匯出目前存檔，再重新載入。','warn'))
