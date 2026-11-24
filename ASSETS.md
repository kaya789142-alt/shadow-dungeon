# V2.1 素材清單

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

作曲、配器、音符及音量包絡見 `scripts/render-score.py`。音樂使用 FluidSynth 渲染，以 FFmpeg 編碼成 AAC。音色樣本來自 Tim Brechbill 與 David Bolton 的 TimGM6mb SoundFont（GPL-2.0）。錄音與重製程式依 GPL-2.0 發布。第三方音色庫的原始檔及來源資訊可從 [Debian timgm6mb-soundfont 原始碼套件](https://packages.debian.org/source/stable/timgm6mb-soundfont) 取得。原始 SoundFont 只用於製作配樂。完整授權與歸屬分別見 `public/licenses/score-gpl-v2.txt`、`public/licenses/timgm6mb.txt`。戰鬥操作和環境聲仍由專案的 Web Audio 音效程式產生。

在安裝 Python 3、FluidSynth、TimGM6mb SoundFont 和 FFmpeg 的環境，可執行 `python scripts/render-score.py /path/to/TimGM6mb.sf2` 重製八個檔案。
