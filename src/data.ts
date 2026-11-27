export const slots = ['武器','盾牌','頭盔','盔甲','手套','靴子','披風','項鍊','戒指','腰帶'] as const
export const quality = ['普通','優良','稀有','史詩','傳說','神話']
export const qualityColors = ['#ded1bc','#a7d68a','#83baff','#d6a1ff','#ffcb72','#ff7178']
export const rules = { maxLevel:50, qualityWeights:[48,27,15,7,2.5,.5], drop:.78, book:.18, materialCuts:[.4,.58,.72,.85], safeWeapon:6, safeArmor:4, maxUpgrade:15, upgrade:[.84,.74,.65,.56,.49,.42,.36,.30,.25,.20,.16], destroy:.24, blessing:.12 }
export type Effect = 'hit'|'area'|'heal'|'shield'|'freeze'|'dash'|'stealth'|'summon'
export type Skill = { name:string; effect:Effect; power:number; mana:number; cooldown:number; range:number }
const skill = (name:string,effect:Effect,power:number,mana:number,cooldown:number,range=120):Skill => ({name,effect,power,mana,cooldown,range})
export const jobs = [
 {name:'騎士', glyph:'⚔', title:'鐵壁守衛', description:'以鋼鐵與意志擋住暗影，擅長近身搏擊。', color:0xd0ab78, weapon:'闊劍', stats:[10,5,3,12,5], growth:[3,1,0,3,1], range:68, interval:.66, skills:[skill('重擊','hit',2,8,3,76),skill('旋風斬','area',1.7,13,6),skill('鐵壁','shield',.55,12,10),skill('盾擊','freeze',1.5,11,6,80),skill('破陣衝鋒','dash',2.8,19,10,215)]},
 {name:'妖精', glyph:'➳', title:'林地遊俠', description:'以長弓與迅捷步伐追獵遠處的敵人。', color:0x8bbd87, weapon:'長弓', stats:[6,13,5,7,6], growth:[1,3,1,1,2], range:208, interval:.59, skills:[skill('多重箭','area',1.4,9,4,220),skill('穿透箭','hit',2.5,12,5,272),skill('寒木箭','freeze',1.4,11,6,235),skill('林隱','stealth',1,12,12),skill('召喚荊棘狼','summon',0,19,16)]},
 {name:'法師', glyph:'✦', title:'秘法傳人', description:'操縱元素、凍結敵人並召喚秘法生物。', color:0xb49ae8, weapon:'法杖', stats:[3,6,15,6,11], growth:[0,1,4,1,3], range:177, interval:.77, skills:[skill('火球術','hit',2.1,8,3,238),skill('雷電術','area',1.8,14,5,220),skill('冰凍術','freeze',1.55,12,6,210),skill('秘法屏障','shield',.65,13,10),skill('召喚餘燼靈','summon',1,19,16)]},
 {name:'暗影刺客', glyph:'†', title:'寂夜之刃', description:'以雙刃與暗影突襲打出連續暴擊。', color:0xe08493, weapon:'雙刃', stats:[9,15,4,7,4], growth:[2,4,1,1,1], range:64, interval:.43, skills:[skill('暗影突襲','dash',2.2,9,4,205),skill('隱身術','stealth',1,10,10),skill('裂刃','hit',2.8,13,6,72),skill('刃雨','area',1.75,15,6),skill('蝕毒','freeze',2,15,8,90)]},
 {name:'聖騎士', glyph:'✚', title:'黎明誓衛', description:'以神聖護盾與治癒守護戰線。', color:0xf1ce75, weapon:'戰鎚', stats:[9,5,8,11,9], growth:[2,1,2,2,2], range:70, interval:.69, skills:[skill('神聖打擊','hit',2,8,3,83),skill('治癒術','heal',.35,13,7),skill('神聖護盾','shield',.7,15,10),skill('破曉','area',2,16,7,146),skill('召喚微光衛士','summon',2,20,16)]}
]
export const zones = [
 ['燼燈村',1,0x31373b,0x252a31,0xf9bd70,'遠行的人啊，讓燼燈照亮你的歸路。'],
 ['幽暗森林',1,0x25392f,0x1b2d2b,0x9cc58b,'樹根纏住礦道，林中傳來低鳴。'],
 ['哥布林營地',5,0x44382c,0x312921,0xebaf67,'野火和木樁圍住破碎的王國遺址。'],
 ['亡靈墓園',10,0x30394a,0x252733,0xb1c8eb,'每當暮鐘響起，墓碑底下便有動靜。'],
 ['蜘蛛洞穴',16,0x42334b,0x2b2239,0xd4a5ec,'銀絲上結著凝固的古代魔力。'],
 ['火焰峽谷',23,0x532f2c,0x351f28,0xff9361,'赤紅煙塵覆蓋著封印的第一道裂口。'],
 ['暗影地下城',32,0x363252,0x241e38,0xbd9bf8,'王國留下的最後一塊封印在此沉睡。'],
 ['黑暗魔王城堡',42,0x49283b,0x2e1c30,0xf88494,'黑暗王座正等待新的挑戰者。'],
 ['灰港要塞',1,0x41433c,0x272a2c,0xf1bf77,'港城的商隊在此整備，東門通往古代遺跡。'],
 ['沉星遺跡',12,0x304649,0x222e32,0x8cd4bd,'大殿長廊藏著通往深層地底的機關。'],
 ['蒼龍谷',34,0x434c37,0x29342e,0xdfc595,'乾涸河谷迴盪著遠古蒼龍的嘶鳴。'],
 ['深淵迴廊・一層',40,0x40434e,0x282531,0xabafcf,'被遺棄的守衛仍徘徊在石階下。'],
 ['深淵迴廊・二層',47,0x492e40,0x281d29,0xef9da5,'血月升起時，世界魔王降臨祭壇。'],
 ['亡靈地監・一層',33,0x374143,0x252e35,0xaacccb,'鬆動的石板在寒光下顫動，沿牆前進可避開機關。'],
 ['亡靈地監・二層',38,0x403649,0x292638,0xcbacd9,'早已掩埋的刑室保存著稀有的亡靈寶物。'],
 ['魔龍古堡',45,0x55413b,0x35272c,0xf3ab72,'古龍盤據內殿，戰勝後可取得傳說裝備。']
] as const
const creatures = [
 ['苔芽史萊姆','灰脊狼人','尖刺毒蛾','苔冠貝希摩'],
 ['碎牙哥布林','炭弓斥候','赤旗巨魔','裂旗領主'],
 ['骷髏戰士','骷髏弓箭手','墓燈幽靈','亡鐘祭司'],
 ['幼穴蛛','銀絲巨蛛','晶眼潛伏者','織夜蛛后'],
 ['熔岩精靈','焦翼飛蜥','火焰惡魔','燼齒巨龍'],
 ['幽影哨兵','黑暗騎士','亡靈法師','無面獄主'],
 ['血棘劍士','暮翼幼龍','暗冠死靈','黑暗魔王']
]
const baselineMonsters = creatures.flatMap((names,region)=>names.map((name,index)=>({
 id:region*4+index, zone:region+1,name,rank:['普通','普通','稀有','魔王'][index], boss:index===3, ranged:index===1||name.includes('法師'),
 color:[0x8abb77,0xb68ac6,0xe5a477,0xe67c88][index], pattern:region%5, level:zones[region+1][1]+(index===3?3:index)
})))
const eliteNames=['荊棘樹魂','赤旗軍督','碎陵守衛','絲甲衛蛛','焦岩巨像','裂隙執刑者','王座禁衛']
export const monsters = [...baselineMonsters,...eliteNames.map((name,i)=>({
 id:28+i,zone:i+1,name,rank:'精英',boss:false,ranged:i===2||i===5,color:0xf8bc88,pattern:i%5,level:zones[i+1][1]+2
}))]
export const safeZone=(id:number)=>id===0||id===8
const routes=[[-1,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,-1],[0,9],[8,10],[9,11],[10,12],[11,13],[12,14],[13,15],[14,-1]]
export const zoneRoutes=(zone:number)=>routes[zone]
const expeditionNames=[
 ['沉星巡衛','殘光祭使','灰翎石像','碎星執政官'],
 ['谷底幼龍','峽谷巡翼','琥珀龍裔','蒼翼古龍'],
 ['失誓獄卒','鏡面咒師','蒼鐵吞噬者','門扉看守'],
 ['血月守衛','暮痕祭司','冥火幻獸','世界魔王・蝕月皇'],
 ['灰骨戰士','石獄守衛','墳霧幽靈','鎖魂監守'],
 ['枯血囚徒','裂骨獄卒','幽燼法師','獄鐵亡王'],
 ['燼翼飛龍','赤銅龍衛','硫火守護者','魔龍・焚宙']
]
export const allMonsters=[...monsters,...expeditionNames.flatMap((names,region)=>names.map((name,i)=>({
 id:35+region*4+i,zone:9+region,name,rank:i===3?(region===3?'世界魔王':'魔王'):i===2?'稀有':i===1?'精英':'普通',
 boss:i===3,ranged:i===1,color:[0x9fc2a6,0xdbc28c,0xca96c0,0xe38e79][i],pattern:region===6?6:region===3?5:(region+2)%5,
 level:Math.min(50,zones[9+region][1]+i)
})))]
export const elements=['火焰','寒霜','雷電','暗影','神聖'] as const
export const jobElements=[2,1,0,3,4]
export const relicForZone=(zone:number)=>zone-8
export const relicNames=['灰港熔鋼','沉星遺產','蒼龍誓約','斷罪神諭','蝕月王印','灰骨誓言','獄鐵王權','焚宙龍鑄']
export type Gear = { uid:string; slot:number; grade:number; tier:number; plus:number; roll:number; job?:number; identified:boolean; acquiredAt?:number; element?:number; leech?:number; relic?:number }
const setNames = ['旅人','苔紋','夜銀','星燼','王印','無光']
export const gearName = (gear:Gear) => (gear.relic===undefined?setNames[gear.grade]:relicNames[gear.relic])+'・'+(gear.slot===0 ? jobs[gear.job??0].weapon : slots[gear.slot])+(gear.plus?' +'+gear.plus:'')
export const materialNames = { red:'生命藥水',blue:'魔力藥水',weapon:'武器強化卷軸',armor:'防具強化卷軸',bless:'祝福強化卷軸',protect:'裝備保護卷軸',warp:'傳送卷軸',home:'回城卷軸',blink:'瞬間移動卷軸',morph:'變身卷軸',identify:'鑑定卷軸',book:'技能書',shard:'影晶碎片' } as const
export type Material = keyof typeof materialNames
export const morphs = [
 ['骷髏戰士',0xcac5ae,1.15,1],['暗影騎士',0xa88cdb,1,1.2],['狼族戰士',0xb59372,1.2,1.12],
 ['魔法使',0x92c9e5,1.1,1.16],['亡靈守衛',0x9fc894,1.05,1.13],['龍族戰士',0xeb837c,1.18,1.18]
] as const
export const pets = [['荊棘狼',0x98c475,'提升移動速度'],['餘燼靈',0xf9a977,'提升攻擊傷害'],['微光衛士',0xaedbe8,'降低所受傷害']] as const
export const vendors = ['武器商人','防具商人','藥水商人','魔法卷軸商人','裝備強化師','倉庫管理員','傳送師','任務管理員','神秘商人','技能導師']
export type Quest = { id:string; name:string; event:string; count:number; zone?:number; target?:number; daily?:boolean }
export const quests:Quest[] = [
 {id:'move',name:'踏出第一步',event:'move',count:1},
 {id:'potion',name:'旅人的準備',event:'potion',count:1},
 {id:'gear',name:'披甲上路',event:'equip',count:1},
 {id:'forge',name:'鍛爐初火',event:'forge',count:1},
 {id:'learn',name:'導師的試煉',event:'learn',count:1},
 {id:'gather',name:'封印的碎片',event:'shard',count:5},
 {id:'daily',name:'每日委託・清除魔物',event:'kill',count:8,daily:true},
 ...zones.slice(1,8).flatMap(([name], index)=>[
   {id:'hunt'+index,name:name+'・狩獵令',event:'kill',count:6,zone:index+1,target:index*4},
   {id:'chest'+index,name:name+'・失落的寶箱',event:'chest',count:1,zone:index+1},
   {id:'hidden'+index,name:name+'・秘徑',event:'hidden',count:1,zone:index+1},
   {id:'boss'+index,name:'封印紀事・'+monsters[index*4+3].name,event:'boss',count:1,zone:index+1}
 ]),
 {id:'harbor',name:'遠行支線・灰港的使者',event:'visit',zone:8,count:1},
 ...expeditionNames.flatMap(([name],i)=>[
  {id:'exp-hunt'+i,name:'遠征狩獵・'+name,event:'kill',count:4,zone:9+i,target:35+i*4},
  {id:'exp-relic'+i,name:'支線・封存的遺物',event:'chest',count:1,zone:9+i},
  {id:'exp-event'+i,name:'支線・調查裂隙',event:'rift',count:1,zone:9+i},
  {id:'exp-boss'+i,name:'遠征主線・'+expeditionNames[i][3],event:'boss',count:1,zone:9+i}
 ]),
 {id:'dailyRift',name:'每日委託・淨化裂隙',event:'rift',count:1,daily:true}
]
export const achievements = [
 {id:'first',name:'破曉旅人',description:'擊敗第一隻魔物',event:'kill',count:1},
 {id:'forge',name:'淬火之手',description:'強化成功五次',event:'forge',count:5},
 {id:'hidden',name:'秘徑行者',description:'發現三處隱藏區域',event:'hidden',count:3},
 {id:'boss',name:'封印守望者',description:'擊敗七種區域魔王',event:'bossUnique',count:7}
]
