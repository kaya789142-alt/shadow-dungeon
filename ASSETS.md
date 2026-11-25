# 素材與授權清單

## V3.1 整合驗證

本次沿用既有素材及下列授權。發布檢查比對 `art-v22/`、`art-v30/`、`art-v31/`、`score-v22/` 和 `fx-v22/` 的 78 份 WebP、JSON 圖集及 M4A 檔案。新驗收截圖直接取自整合建置的 Chromium 遊戲畫面。

## V3.1

| 素材 | 檔案 | 來源 |
| --- | --- | --- |
| 騎士、妖精、法師、暗影刺客與聖騎士動作 | `public/art-v31/motion-{knight,archer,mage,assassin,paladin}.webp` 及對應 JSON | 為本專案原創生成。每套六格，包括兩種步幅、攻擊、施法、受傷與倒地。圖像以 WebP 發行，JSON 記錄透明裁切及落地錨點。 |
| 連續道路、接縫材質與環境光 | `src/art.ts` | 透過原創程式繪製，沿用 V2.2 建築、地形與物件素材。 |
| 背景音樂、音效及字型 | `public/score-v22/`、`public/fx-v22/`、Noto Sans TC Variable | 沿用下列 V2.2 來源與授權。 |

部分方向仍使用原有正背面立繪或既有過渡動畫。NPC 與怪物既有圖像詳見 V2.2 清單。

## V3.0

- `public/art-v30/items.webp` 為本專案原創生成的四欄三列透明圖集，包含九種裝備類型、兩種藥水與卷軸。圖集直接用於遊戲背包與裝備，未引入其他遊戲素材。
- V3.0 的五職業、NPC、怪物及魔王使用下列 V2.2 原創圖像，另調整姿勢過渡、攻擊蓄勢、施法與裝備光效。逐格專用來源仍是騎士圖集。
- 既有 `score-v22` 和 `fx-v22` 素材沿用，下列 SoundFont 授權仍適用。

## V2.2

| 素材 | 檔案 | 來源 |
| --- | --- | --- |
| 五職業正背面與動作 | `art-v22/{knight,archer,mage,assassin,paladin}*.webp`、`knight-motion.webp`、`knight-motion.json` | 為本專案原創生成，經透明邊清理和圖集切分。騎士具五個專用動作格；八方向採正背視角、鏡像及動畫變形。 |
| 十位 NPC | `art-v22/{arms,armor,herbs,scribe,smith,warehouse,navigator,herald,merchant,tutor}.webp` | 原創生成的獨立人物。 |
| 十六種怪物造型 | `slime`、`wolf`、`guard`、`spider`、`wraith`、`dragon`、`eclipse-emperor`、`wood-behemoth`、`goblin`、`bone-archer`、`moth`、`necromancer`、`flame-demon`、`tree-spirit`、`gargoyle`、`dark-lord` | 原創生成，依怪物家族與角色共用。 |
| 場景 | `cottage-blue`、`cottage-red`、`fountain`、`oak`、`tomb`、`dungeon-arch` | 原創生成，另外沿用四個 V2.1 道具（`cottage-green`、`spruce`、`boulder`、`arch`）。 |
| 地面與光影 | `src/art.ts`、`src/terrain-material.ts`、`src/world.ts` | 專案原創程式繪製。 |
| 字型 | Noto Sans TC Variable | Fontsource 發行的 SIL OFL 1.1 版本，授權位於 `public/licenses/noto-sans-tc.txt`。 |

V2.2 的七首配樂位於 `public/score-v22/`，依序為首頁 2:28、村莊 2:25、森林 2:40、墓園 2:35、地下城 2:30、戰鬥 2:17、魔王 2:34，另有 4 秒勝利曲。十一個採樣音效位於 `public/fx-v22/`，包含命中、箭矢、施法、死亡、掉落、鍛造、失敗、治療、風、水流與洞穴聲。配樂與音效使用 `scripts/render-score.py` 作曲、配器及渲染採樣；TimGM6mb 的來源與 GPL-2.0 授權見下方紀錄。

## V2.1 封存素材

## 遊戲美術

| 素材 | 檔案與用途 | 來源 |
| --- | --- | --- |
| 五大職業 | `public/art/{knight,archer,mage,assassin,paladin}.webp` 與各自的 `-back.webp`。角色選擇、頭像、冒險人物 | 為本專案原創生成，從高解析度圖集裁切、清理透明邊並轉為 WebP |
| 十位商人及導師 | `arms`、`armor`、`herbs`、`scribe`、`smith`、`warehouse`、`navigator`、`herald`、`merchant`、`tutor` | 為本專案原創生成，每位使用獨立立繪 |
| 六種怪物美術 | `slime`、`wolf`、`guard`、`spider`、`wraith`、`dragon`，由既有魔物依物種使用 | 為本專案原創生成 |
| 魔王與精英立繪 | `eclipse-emperor`、`necromancer`、`wood-behemoth`、`flame-demon`。蝕月皇、暗黑王座、墓園、森林及峽谷敵人 | 為本專案原創生成 |
| 場景道具 | `cottage-blue`、`cottage-red`、`cottage-green`、`spruce`、`boulder`、`arch` | 為本專案原創生成 |
| 地面材質與效果 | 石板、屋瓦、木紋、接地陰影、火光與水面。見 `src/terrain-material.ts`、`src/art.ts`、`src/world.ts` | 專案原創程式繪製 |
| 字型 | Noto Sans TC Variable，隨正式版託管 | [Fontsource 套件](https://fontsource.org/fonts/noto-sans-tc)，SIL Open Font License 1.1，見 `public/licenses/noto-sans-tc.txt` |

五大職業以正背面立繪、鏡像與前後側姿勢組成八方向顯示，步行和奔跑另以分層足部動畫呈現。其餘動作使用程式動畫，並由既有裝備資料觸發武器發光及護甲光效。

## 原創配樂

| 檔案 | 場景 | 長度 | 編制 |
| --- | --- | --- | --- |
| `title.m4a` | 首頁 | 2:12 | 弦樂、法國號、合唱、豎琴、單簧管、鼓 |
| `village.m4a` | 村莊與城鎮 | 2:11 | 弦樂、豎琴、鋼琴、木吉他、長笛 |
| `forest.m4a` | 森林與蒼龍谷 | 2:17 | 弦樂、豎琴、泛音與陶笛 |
| `graveyard.m4a` | 亡靈墓園 | 2:13 | 大提琴、定音鼓、合唱、鐘與單簧管 |
| `dungeon.m4a` | 洞穴及地下城 | 2:10 | 低弦、定音鼓、聲部、鐘與英國管 |
| `battle.m4a` | 一般戰鬥 | 2:06 | 弦樂、銅管、長號、撥弦與鼓 |
| `boss.m4a` | 魔王戰鬥 | 2:12 | 弦樂、銅管、定音鼓、合唱與戰鼓 |
| `victory.m4a` | 擊敗魔王及升級 | 0:04 | 弦樂、法國號、合唱、豎琴與長笛 |

作曲、配器、音符及音量包絡見 `scripts/render-score.py`。音樂使用 FluidSynth 渲染，以 FFmpeg 編碼成 AAC。音色樣本來自 Tim Brechbill 與 David Bolton 的 TimGM6mb SoundFont（GPL-2.0）。錄音與重製程式依 GPL-2.0 發布。第三方音色庫的原始檔及來源資訊可從 [Debian timgm6mb-soundfont 原始碼套件](https://packages.debian.org/source/stable/timgm6mb-soundfont) 取得。原始 SoundFont 只用於製作配樂。完整授權與歸屬分別見 `public/licenses/score-gpl-v2.txt`、`public/licenses/timgm6mb.txt`。V2.1 的戰鬥操作和環境聲由當時的 Web Audio 音效程式產生；V2.2 改用新的採樣音效。

在安裝 Python 3、FluidSynth、TimGM6mb SoundFont 和 FFmpeg 的環境，可執行 `python scripts/render-score.py /path/to/TimGM6mb.sf2` 重製 V2.2 的八個配樂檔案和十一個音效檔案。
