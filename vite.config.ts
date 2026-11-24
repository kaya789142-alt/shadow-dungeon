import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const {version}=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')) as {version:string}
const builtAt=new Date().toISOString()
const commit=process.env.GITHUB_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const sequence=[process.env.GITHUB_RUN_ID,process.env.GITHUB_RUN_ATTEMPT].filter(Boolean).join('.')||Date.parse(builtAt).toString(36)
const release={version,builtAt,commit,id:`${version}-${commit.slice(0,8)}-${sequence}`}

export default defineConfig({
 base:'./',
 define:{__SHADOW_RELEASE__:JSON.stringify(release)},
 plugins:[{
  name:'shadow-dungeon-release',
  transformIndexHtml(){
   return [{tag:'meta',attrs:{name:'shadow-build',content:release.id},injectTo:'head'}]
  },
  generateBundle(){
   this.emitFile({type:'asset',fileName:'release.json',source:JSON.stringify(release,null,2)+'\n'})
  }
 }]
})
