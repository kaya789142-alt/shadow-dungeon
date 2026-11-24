export type Point={x:number;y:number}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
const cell=24
const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
export type Passable=(x:number,y:number)=>boolean
export function clearPath(a:Point,b:Point,passable:Passable){
 const steps=Math.ceil(distance(a,b)/8)
 for(let i=1;i<=steps;i++){
  const t=i/steps
  if(!passable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false
 }
 return true
}
export function makeRoute(start:Point,goal:Point,width:number,height:number,passable:Passable,stop=10){
 const cols=Math.ceil(width/cell), rows=Math.ceil(height/cell)
 const toPoint=(i:number)=>({x:(i%cols+.5)*cell,y:(Math.floor(i/cols)+.5)*cell})
 const center=Math.floor(start.y/cell)*cols+Math.floor(start.x/cell)
 const costs=new Map<number,number>()
 const parent=new Map<number,number>()
 const open=new Map<number,number>()
 const put=(index:number,cost:number)=>{costs.set(index,cost);open.set(index,cost+distance(toPoint(index),goal))}
 const col=center%cols, row=Math.floor(center/cols)
 for(let y=Math.max(0,row-1);y<=Math.min(row+1,rows-1);y++)for(let x=Math.max(0,col-1);x<=Math.min(col+1,cols-1);x++){
  const index=y*cols+x,p=toPoint(index)
  if(clearPath(start,p,passable))put(index,distance(start,p))
 }
 let best=-1, nearest=Infinity
 for(let iteration=0;open.size&&iteration<1300;iteration++){
  let index=-1, score=Infinity
  for(const [candidate,priority] of open)if(priority<score){index=candidate;score=priority}
  open.delete(index)
  const here=toPoint(index), gap=distance(here,goal)
  if(gap<nearest){best=index;nearest=gap}
  if(gap<=stop||clearPath(here,goal,passable)){best=index;break}
  for(const [dx,dy] of directions){
   const x=index%cols+dx,y=Math.floor(index/cols)+dy
   if(x<0||x>=cols||y<0||y>=rows)continue
   const next=y*cols+x, point=toPoint(next), cost=costs.get(index)!+(dx&&dy?Math.SQRT2:1)*cell
   if((costs.get(next)??Infinity)<=cost||!clearPath(here,point,passable))continue
   parent.set(next,index);put(next,cost)
  }
 }
 const trace=[goal]
 if(best<0)return trace
 for(let index:number|undefined=best;index!==undefined;index=parent.get(index))trace.push(toPoint(index))
 trace.reverse()
 const route:Point[]=[]
 let point=start
 for(let index=0;index<trace.length;){
  let next=trace.length-1
  while(next>index&&!clearPath(point,trace[next],passable))next--
  if(!clearPath(point,trace[next],passable))break
  point=trace[next];route.push(point);index=next+1
 }
 return route
}
