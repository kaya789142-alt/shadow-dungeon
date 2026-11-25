import Phaser from 'phaser'
import '@fontsource-variable/noto-sans-tc'
import { achievementTitles, attributes, createHero, decodeSave, expNeeded, load, makeGear, makeRelic, materials, record, rollover, save, spawn, upgrade, upgradeInfo } from './model'
import { achievements, allMonsters, elements, gearName, jobs, materialNames, morphs, pets, quality, qualityColors, quests, rules, safeZone, slots, vendors, zoneRoutes, zones } from './data'
import type { Gear, Material, Quest } from './data'
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
import { bagLimit, categories, categoryNames, compatibleGear, fullBag, gearCategory, gearLocked, itemCategory, jobRequirement, materialLocked, sortBag } from './inventory'
import type { Category } from './inventory'
import { landNeighbor } from './overworld'
import { release, releaseDate, trackRelease, versionLabel } from './release'

const app=document.querySelector<HTMLElement>('#app')!
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
let bagTab:'all'|Category='all'
let jobIndex=0
let previousFocus:HTMLElement|null=null
let chosenGear=''
let compareGear=''
let questFilter='all'
let activeShop=0
let toastTimer=0
let mapKey=''
let confirmRisk=false
let titleState:'title'|'create'|'play'='title'
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
volume(hero.music,hero.sfx,hero.preferences.ambience)
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
 setText('top-zone',region[0]);setText('map-name',region[0]);setText('gold',hero.gold.toLocaleString('zh-TW'))
 const ratio=hero.level>=rules.maxLevel?100:Math.floor(100*hero.xp/expNeeded(hero.level))
 select('#xp-fill').style.width=ratio+'%';setText('xp-numbers',ratio+'%')
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
 const [back,next]=zoneRoutes(zone)
 if(back>=0)point(entry.x,entry.y,'#8ab8c8',4)
 if(next>=0)point(exit.x,exit.y,'#d9aa6b',4)
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
const iconCell=(m:Material)=>m==='red'?9:m==='blue'?10:11
const gearLabel=(g:Gear)=>`<span class="gear-label" style="color:${qualityColors[g.grade]}">${itemIcon(g.slot)}<span>${gearName(g)}</span></span>`
const gearStats=(g:Gear)=>[g.element!==undefined?elements[g.element]:'',g.leech?'吸血 '+g.leech+'%':''].filter(Boolean).join(' · ')
const gearDetail=(g:Gear)=>`${quality[g.grade]} · 階級 ${g.tier} · ${jobRequirement(g)} · 穿戴等級不限${g.identified?' · 附加屬性 +'+g.roll+(gearStats(g)?' · '+gearStats(g):''):' · 待鑑定'}`
const materialPrice:Record<Material,number>={red:14,blue:16,weapon:33,armor:26,bless:180,protect:140,warp:34,home:25,blink:38,morph:65,identify:31,book:62,shard:10}
const shopMaterials:Partial<Record<number,Material[]>>={2:['red','blue'],3:['weapon','armor','warp','home','blink','morph','identify'],8:['bless','protect','book','morph'],9:['book']}
const shopSlots:Partial<Record<number,number[]>>={0:[0],1:[1,2,3,4,5,6,7,8],8:[0,6,7,8]}
const stock=(id:string,limit:number)=>Math.max(0,limit-(hero.stock[id]??0))
const gradeToday=()=>2+new Date().getDate()%3
const available=(g:Gear)=>hero.bag.find(item=>item.uid===g.uid)||hero.worn[g.slot]
const allGear=()=>[...hero.bag,...Object.values(hero.worn)]
const sharedTitles:Record<string,string>={bag:'冒險背包',shield:'裝備欄',character:'角色資訊',skill:'職業技能',quest:'任務簿',shop:'燼燈市集',settings:'遊戲設定',travel:'王國地圖',forge:'燼燈鍛爐',vault:'公會倉庫',codex:'冒險圖鑑',death:'暗影降臨'}
function openPanel(next:string){
 if(titleState!=='play')return
 if(!panel)previousFocus=document.activeElement as HTMLElement
 panel=next;panelMode='open';world.blocked=true;chosenGear='';compareGear='';confirmRisk=false
 renderPanel()
}
function closePanel(){
 if(panel==='death')return
 panel='';panelMode='open';world.blocked=false;renderPanel();previousFocus?.focus()
}
function openNpc(index:number){
 if(index===4)openPanel('forge')
 else if(index===5)openPanel('vault')
 else if(index===6)openPanel('travel')
 else if(index===7)openPanel('quest')
 else if(index===9)openPanel('skill')
 else{activeShop=index;openPanel('shop')}
}
function start(loaded:boolean){
 if(!loaded){
  const name=select<HTMLInputElement>('#new-name').value
  if(!name.trim()){select<HTMLInputElement>('#new-name').reportValidity();return}
  if(hasSave&&!window.confirm('開始新冒險會覆寫現有存檔。確定繼續？'))return
  const settings={music:hero.music,sfx:hero.sfx,preferences:{...hero.preferences}}
  hero=Object.assign(createHero(name,jobIndex),settings)
 }
 if(world.hero!==hero)world.resetRegionState()
 world.hero=hero
 world.dead=false;world.auto=false;world.target=undefined
 world.enter(hero.zone,{x:hero.x,y:hero.y},true)
 const stats=attributes(hero)
 hero.hp=Math.min(stats.hp,hero.hp);hero.mp=Math.min(stats.mp,hero.mp)
 if(hero.hp<=0)world.revive()
 titleState='play';world.activePlay=true;world.blocked=false;panel=''
 volume(hero.music,hero.sfx,hero.preferences.ambience);pixelPrefs();world.applyDetail();storeProgress();paint();renderPanel()
 message(hero.zone===0?'燼燈村 · 安全區域':zones[hero.zone][0])
}
function modal(body:string,extra=''){
 return `<div class="modal-shade ${extra}"><section class="dialog" role="dialog" aria-modal="${extra.includes('dock-panel')?'false':'true'}" aria-label="${titleState==='play'?sharedTitles[panel]:'暗影地下城'}">${body}</section></div>`
}
function renderPanel(){
 const root=select('#modal-root')
 if(titleState==='title'){
  root.innerHTML=modal(`
   <div class="title-ornament"><span></span><i>${icon('crest',39)}</i><span></span></div>
   <div class="eyebrow title-kicker">SHADOW DUNGEON</div>
   <h1>暗影地下城</h1>
   <p class="build-label" data-build="${release.id}">${versionLabel} · ${releaseDate}（台灣） · ${release.id}</p>
   <div class="title-rule"><i></i></div>
   <p class="title-copy">遠古封印已出現裂痕。<br>循著燼燈的微光，走入暗影。</p>
   <div class="title-buttons">${hasSave?button('continue',icon('arrow',18)+' 繼續冒險','primary'):button('create',icon('sword',18)+' 開始冒險','primary')}${hasSave?button('create','新的冒險','quiet'):''}</div>
   <div class="title-links">${button('import',icon('book',13)+' 匯入存檔','quiet')}${button('title-help',icon('game',14)+' 操作指南','quiet')}</div>`,'title-modal')
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
 root.innerHTML=modal(`<div class="dialog-head"><h2>${sharedTitles[panel]}</h2>${controls}</div>${panelMode==='open'?'<div class="panel-body">'+renderBody()+'</div>':''}`,'dock-panel '+panelMode)

}
function questDescription(quest:Quest){
 if(quest.target!==undefined)return '擊敗 '+allMonsters.find(m=>m.id===quest.target)?.name
 return ({move:'在村莊移動',potion:'使用任一藥水',equip:'穿戴一件裝備',forge:'成功強化裝備',learn:'學習或升級技能',shard:'拾取影晶碎片',chest:'打開失落寶箱',hidden:'探索秘徑',boss:'擊敗區域魔王',kill:'擊敗任意魔物',visit:'抵達灰港要塞',rift:'擊退裂隙守衛'} as Record<string,string>)[quest.event]
}
function renderBody(){
 const village=safeZone(hero.zone)
 switch(panel){
  case 'bag':{
   const tabs=(['all',...categories] as const).map(tab=>button('bag-tab:'+tab,tab==='all'?'全部':categoryNames[tab],bagTab===tab?'primary':'')).join('')
   const gearRows=hero.bag.filter(g=>bagTab==='all'||gearCategory(g)===bagTab).map(g=>row(gearLabel(g),gearDetail(g),
    (compatibleGear(hero,g)?button('equip:'+g.uid,'穿戴'):'')+button('compare:'+g.uid,'比較')+
    (g.identified?'':button('identify:'+g.uid,'鑑定'))+button('lock:'+g.uid,gearLocked(hero,g)?'解除鎖定':'鎖定'))).join('')
   const itemRows=materials.filter(m=>hero.items[m]>0&&(bagTab==='all'||itemCategory(m)===bagTab)).map(m=>row(
    '<span class="gear-label">'+itemIcon(iconCell(m))+materialNames[m]+'</span>','持有 × '+hero.items[m],
    (['red','blue','home','warp','blink','morph'].includes(m)?button(m==='home'?'home-item':m,'使用'):'')+
    button('lock:'+m,materialLocked(hero,m)?'解除鎖定':'鎖定'))).join('')
   return `<div class="bag-summary"><b>裝備槽 ${hero.bag.length}/${bagLimit}</b>${button('sort-bag','自動排序')}</div><div class="tabs bag-tabs">${tabs}</div>`+
    (compareGear?renderComparison(hero.bag.find(g=>g.uid===compareGear)):'')+
    (gearRows?group('裝備',gearRows):'')+(itemRows?group('道具堆疊',itemRows):'')+
    (!gearRows&&!itemRows?empty('此分類沒有道具。'):'')
  }
  case 'shield':return group('已穿戴',slots.map((slot,i)=>{
   const g=hero.worn[i];return g?row(slot+' · '+gearLabel(g),gearDetail(g),button('unequip:'+i,'卸除')):row(slot,'空欄位')
  }).join(''))+(village?button('forge',icon('spark',16)+' 前往強化','primary'):'')
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
  case 'skill':return group(jobs[hero.job].name+' · 技能快捷欄',jobs[hero.job].skills.map((skill,i)=>{
   const rank=hero.skills[i], level=1+i*2, books=rank||1
   return row(skill.name+' '+badge('鍵位 '+(i+1)),(rank?'階級 '+rank+' · ':'未學習 · ')+skill.mana+' 魔力 · '+skill.cooldown+' 秒冷卻',
   rank===5?badge('已滿階'):village?button('learn:'+i,(rank?'升級':'學習')+' · '+books+' 書',hero.level<level?'muted':'')+badge('等級 '+level):badge('需在村莊修習'))
  }).join(''))+empty('持有技能書 '+hero.items.book+' 本')+(village?button('books','向導師購買技能書'):'')
  case 'shop':{
   if(!village)return empty('商人位於燼燈村。')+button('home-scroll','使用回城卷軸')
   const tabs=[0,1,2,3,8,9].map(n=>button('shop:'+n,vendors[n],n===activeShop?'primary':'')).join('')
   const limit=activeShop===8?3:25
   const grade=activeShop===8?gradeToday():1
   const material=shopMaterials[activeShop]??[]
   const goods=shopSlots[activeShop]??[]
   return `<div class="tabs">${tabs}</div>`+group('商店庫存',material.map(m=>row(materialNames[m],materialPrice[m]+' 金幣 · 庫存 '+stock(m,limit),
    `<input aria-label="${materialNames[m]}購買數量" type="number" min="1" max="${Math.max(1,stock(m,limit))}" value="1">`+button('buy:'+m,'購買'))).join('')+
    goods.map(s=>row(gearLabel(shopGear(s,grade)),(45+grade*75)+' 金幣 · 庫存 '+stock(activeShop+':'+s,limit),button('purchase:'+s,'購買'))).join(''))+
   group('出售裝備',hero.bag.map(g=>row(gearLabel(g),sellPrice(g)+' 金幣',gearLocked(hero,g)?badge('已鎖定'):button('sell:'+g.uid,'出售'))).join('')||empty('沒有可出售的裝備。'))+
   group('出售道具',materials.filter(m=>hero.items[m]>0).map(m=>row(materialNames[m],materialSale(m)+' 金幣／件 · 持有 '+hero.items[m],
     materialLocked(hero,m)?badge('已鎖定'):`<input aria-label="${materialNames[m]}出售數量" type="number" min="1" max="${hero.items[m]}" value="1">`+button('sell-material:'+m,'出售'))).join('')||empty('沒有可出售的道具。'))
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
  case 'travel':return group('艾瑟蘭王國',
   group('王國道路',`<div class="road-map">${[zones.slice(0,8),zones.slice(8)].map((chain,j)=>`<div>${chain.map(([name],i)=>`<span class="${hero.zone===i+j*8?'here':''}">${name}</span>`).join('<b aria-hidden="true">·</b>')}</div>`).join('')}</div>`)+zones.map(([name,level,,,,description],i)=>row(name+' '+badge(i===hero.zone?'所在區域':'等級 '+level),description,
   i!==hero.zone&&hero.level>=level?([landNeighbor(hero.zone,-1),landNeighbor(hero.zone,1)].includes(i)?button('road-to:'+i,'沿路步行'):'')+
   (village||hero.items.warp>0?button('travel-to:'+i,village?'傳送':'卷軸傳送'):''):'' )).join(''))+(village?button('restore','在燼燈泉休息'):'')
  case 'codex':return group('成就',achievements.map(a=>row(a.name,a.description,badge(Math.min(hero.stats[a.event]??0,a.count)+' / '+a.count))).join(''))+
   group('變身圖鑑',morphs.map(([name,,move,atk],i)=>row(name,'移速 '+Math.round(move*100)+'% · 攻速 '+Math.round(atk*100)+'%',hero.morphs.includes(i)?button('morph:'+i,'變身'):badge('未解鎖'))).join(''))+
   group('召喚生物',pets.map(p=>row(p[0],p[2])).join(''))+
   group('魔物圖鑑',allMonsters.map(m=>row(hero.bestiary[m.id]?m.name:'未記錄的魔物',zones[m.zone][0]+' · '+m.rank,badge('擊敗 '+(hero.bestiary[m.id]??0)))).join(''))
  case 'settings':return group('畫面與操作',`<label class="volume-row">字體大小 <select id="text-size"><option value="1">小字體</option><option value="1.15" ${hero.preferences.size>=1.1&&hero.preferences.size<1.3?'selected':''}>標準</option><option value="1.35" ${hero.preferences.size>=1.3?'selected':''}>大字體</option></select></label>
   <label class="volume-row">畫質 <select id="detail"><option value="balanced" ${hero.preferences.detail==='balanced'?'selected':''}>標準</option><option value="high" ${hero.preferences.detail==='high'?'selected':''}>高畫質</option><option value="ultra" ${hero.preferences.detail==='ultra'?'selected':''}>極致畫質</option></select></label>
   <label class="volume-row">地面點擊 <select id="click-mode"><option value="move">移動與互動</option><option value="interact" ${hero.preferences.click==='interact'?'selected':''}>只互動，使用搖桿移動</option></select></label>
   <label class="toggle"><input id="shake" type="checkbox" ${hero.preferences.shake?'checked':''}> 啟用爆擊震動</label>`)+group('音訊',`<label class="volume-row">背景音樂 <input id="music" type="range" min="0" max="1" step="0.05" value="${hero.music}"></label><label class="volume-row">遊戲音效 <input id="sfx" type="range" min="0" max="1" step="0.05" value="${hero.sfx}"></label><label class="volume-row">環境音量 <input id="ambience" type="range" min="0" max="1" step="0.05" value="${hero.preferences.ambience}"></label>`)+
   group('自動拾取',`<label class="toggle"><input id="pickup-enabled" type="checkbox" ${hero.pickup.enabled?'checked':''}> 自動拾取有效範圍內的戰利品</label>
   <label class="volume-row">拾取距離 <select id="pickup-range">${[65,100,135,165].map(value=>`<option value="${value}" ${value===hero.pickup.range?'selected':''}>${value}</option>`).join('')}</select></label>
   <label class="volume-row">最低裝備品質 <select id="pickup-grade">${quality.map((label,i)=>`<option value="${i}" ${i===hero.pickup.minGrade?'selected':''}>${label}</option>`).join('')}</select></label>
   <div class="pickup-groups">${categories.map(key=>`<label class="toggle"><input type="checkbox" data-pickup-group="${key}" ${hero.pickup.groups.includes(key)?'checked':''}> ${categoryNames[key]}</label>`).join('')}</div>`)+group('本機存檔',`<div class="tabs">${button('save','儲存進度')}${button('export','匯出存檔')}${button('fullscreen','切換全螢幕')}${button('import','匯入存檔')}${button('home','返回首頁')}</div>`)+group('操作',help())+group('版本',row('暗影地下城 '+versionLabel,releaseDate+'（台灣） · '+release.id)+row('角色與場景資源','已載入 '+world.assetCount+' 張圖像 · Noto Sans TC'))
  case 'death':return `<div class="death">${icon('skull',44)}<p>你在暗影中倒下，失去 6% 的金幣。</p>${button('revive','在燼燈村復活','primary')}</div>`
  default:return ''
 }
}
function help(){
 return '<p class="help-copy">方向鍵或 WASD 移動，按住 Shift 或將搖桿推到外圈可奔跑，也可點擊地面自動尋路。點擊魔物即可鎖定並自動追擊。</p><div class="help-keys"><span><kbd>SPACE</kbd> 普通攻擊</span><span><kbd>1–5</kbd> 職業技能</span><span><kbd>Q</kbd> 生命藥水</span><span><kbd>R</kbd> 魔力藥水</span><span><kbd>E</kbd> 拾取</span><span><kbd>ESC</kbd> 關閉視窗</span></div>'
}
function renderComparison(gear?:Gear){
 if(!gear)return ''
 const current=hero.worn[gear.slot]
 const before=attributes(hero), after=attributes({...hero,worn:{...hero.worn,[gear.slot]:gear}})
 const card=(item?:Gear)=>item?'<strong>'+gearLabel(item)+'</strong><p>'+gearDetail(item)+'</p>':'空欄位'
 const stats=[['物理攻擊',after.attack-before.attack],['魔法攻擊',after.magic-before.magic],['防禦',after.defense-before.defense],
  ['生命上限',after.hp-before.hp],['魔力上限',after.mp-before.mp],['吸血（百分點）',(after.leech-before.leech)*100]] as const
 return group('比較'+slots[gear.slot],`<div class="comparison"><div><h4>目前裝備</h4>${card(current)}</div><div><h4>背包裝備</h4>${card(gear)}</div></div>
 <div class="stat-grid">${stats.map(([name,value])=>`<div><span>${name}</span><b class="${value<0?'warning':'advantage'}">${value>0?'+':''}${value.toFixed(1)}</b></div>`).join('')}</div>`)

}
function shopGear(slot:number,grade:number){
 return hero.zone===8&&activeShop===8?makeRelic(slot,grade,hero.level,hero.job,0):makeGear(slot,grade,hero.level,slot===0?hero.job:undefined)
}
const materialSale=(item:Material)=>Math.max(1,Math.floor(materialPrice[item]*.45))
const sellPrice=(g:Gear)=>12+g.grade*22+g.plus*4+g.tier
function perform(key:string,element:HTMLElement){
 if(key==='retry-assets'){location.reload();return}
 const [type,...args]=key.split(':'), id=args.join(':'), index=Number(id)
 const village=safeZone(hero.zone)
 if(type==='close'){closePanel();return}
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
 const g=allGear().find(g=>g.uid===id)
 const bagItem=hero.bag.find(g=>g.uid===id)
 if(type==='bag-tab'){bagTab=id==='all'||categories.includes(id as Category)?id as typeof bagTab:'all';renderPanel();return}
 if(type==='sort-bag'){sortBag(hero.bag);storeProgress();renderPanel();return}
 if(type==='lock'&&(g||materials.includes(id as Material))){
  hero.locks=hero.locks.includes(id)?hero.locks.filter(key=>key!==id):[...hero.locks,id]
  storeProgress();renderPanel();return
 }
 if(type==='road-to'&&world.walkToRegion(index)){closePanel();return}
 if(type==='compare'&&bagItem){compareGear=compareGear===id?'':id;renderPanel();return}
 if(type==='quest-filter'){questFilter=id;renderPanel();return}
 if(type==='equip'&&bagItem&&compatibleGear(hero,bagItem)){
  const previous=hero.worn[bagItem.slot]
  hero.bag=hero.bag.filter(g=>g!==bagItem)
  if(previous)hero.bag.push(previous)
  hero.worn[bagItem.slot]=bagItem;record(hero,'equip');sound('hit');message('已穿戴 '+gearName(bagItem))
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
  hero.items[material]+=quantity;hero.gold-=cost;hero.stock[id]=(hero.stock[id]??0)+quantity
  message('已購買 '+quantity+' × '+materialNames[material])
 }else if(type==='purchase'&&village&&(shopSlots[activeShop]??[]).includes(index)){
  if(fullBag(hero)){message('背包已滿，未扣除金幣','warn');return}
  const grade=activeShop===8?gradeToday():1, cost=45+grade*75, key=activeShop+':'+index
  if(cost>hero.gold||!stock(key,activeShop===8?3:25)){message('金幣不足或已售罄','warn');return}
  hero.bag.push(shopGear(index,grade));hero.gold-=cost;hero.stock[key]=(hero.stock[key]??0)+1
  sound('loot')
 }else if(type==='sell-material'&&village&&materials.includes(id as Material)){
  const item=id as Material
  if(materialLocked(hero,item)){message('道具已鎖定','warn');return}
  const count=element.parentElement?.querySelector('input')?.valueAsNumber??1
  if(!Number.isInteger(count)||count<1||count>hero.items[item]){message('請輸入可出售的數量','warn');return}
  hero.items[item]-=count;hero.gold+=materialSale(item)*count;sound('loot')
 }else if(type==='sell'&&village&&bagItem){
  if(gearLocked(hero,bagItem)){message('裝備已鎖定','warn');return}
  hero.gold+=sellPrice(bagItem);hero.bag=hero.bag.filter(g=>g!==bagItem);sound('loot')
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
   if(quest.zone&&quest.event==='boss')hero.bag.push(quest.zone>=9?makeRelic((quest.zone+2)%8+1,3,zones[quest.zone][1],hero.job,quest.zone-8):makeGear((quest.zone+2)%9,3,zones[quest.zone][1]))
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
  hero[target.id]=Number(target.value);volume(hero.music,hero.sfx,hero.preferences.ambience);storeProgress()
 }
 if(target.id==='ambience'){hero.preferences.ambience=Number(target.value);volume(hero.music,hero.sfx,hero.preferences.ambience);storeProgress()}
})
app.addEventListener('change',async event=>{
 const input=event.target as HTMLInputElement
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
 if(input.id==='shake'){hero.preferences.shake=input.checked;storeProgress();return}
 if(input.id==='risk'){confirmRisk=input.checked;return}
 if(input.id==='bless'||input.id==='protect'){confirmRisk=false;renderPanel();return}
 if(input.id!=='import-file'||!input.files?.[0])return
 try{
  const imported=decodeSave(await input.files[0].text())
  if(hasSave&&!window.confirm('匯入會覆寫現有的本機存檔，確定繼續？'))return
  save(imported);hero=imported;hasSave=true;titleState='title';start(true);message('存檔已匯入','gold')
 }catch{message('無法匯入此存檔','warn')}
 finally{input.value=''}
})
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){if(panel)closePanel();else if(titleState==='create'){titleState='title';renderPanel()}return}
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
