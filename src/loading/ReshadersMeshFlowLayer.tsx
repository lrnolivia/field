import { useEffect, useRef } from 'react';

type State = { x:number; y:number; width:number; height:number; rotation:number; blur:number; opacity:number; z:number };
type Ellipse = { name:string; blend:'normal'|'multiply'|'overlay'; gradient:'mono'|'color'; states:[State,State,State]; missing?:'first'|'first-two' };

const INSTANCE_WIDTH=2875;
const INSTANCE_HEIGHT=4568;
const FRAME_WIDTH=4568;
const FRAME_HEIGHT=2975;
const SEGMENT_MS=2000;
const CYCLE_MS=6000;
const s=(x:number,y:number,width:number,height:number,rotation:number,blur:number,z:number,opacity=1):State=>({x,y,width,height,rotation,blur,z,opacity});

export const FIGMA_LOADING_FRAME=Object.freeze({
  fileKey:'ywgbSYrD0fUcXmREaWjqRw',
  frameNodeId:'8:2679',
  placedInstanceNodeId:'8:2680',
  componentSetNodeId:'8:3',
  frameWidth:FRAME_WIDTH,frameHeight:FRAME_HEIGHT,
  instanceWidth:INSTANCE_WIDTH,instanceHeight:INSTANCE_HEIGHT,
  frameBlendMode:'hard-light',variantDurationMs:SEGMENT_MS,cycleMs:CYCLE_MS,
  noiseBlendMode:'soft-light',noiseStepMs:100,
  monochromeStops:[[0,'#525252'],[0.195833,'#3a3a3a'],[0.451042,'#ffffff'],[0.648958,'#808080'],[0.8625,'#7a7a7a']] as const,
});

const F52_263=s(-3089.264,4046.568,5125.528,6155.688,-55.942,229.843,4,1);
const F53_265=s(-244.954,8886.84,7028.72,5203.156,4.733,250.928,5,1);
const ELLIPSES:readonly Ellipse[]=[
 {name:'Ellipse 259',blend:'normal',gradient:'mono',states:[
  s(1610.174,2500.043,3439.65,4256.148,119.749,278.292,0),
  s(6412.135,-996.844,4016.97,5028.632,-117.892,327.305,0),
  s(5600.323,-1741.924,3840.15,5227.391,-92.321,329.86,0)]},
 {name:'Ellipse 260',blend:'multiply',gradient:'mono',states:[
  s(-323.036,1782.901,5125.528,6155.688,55.942,229.843,1),
  s(2521.275,-2772.942,7028.72,5203.156,-4.733,250.928,1),
  s(5747.73,-3343.522,4431.529,4664.261,-64.532,264.688,1)]},
 {name:'Ellipse 261',blend:'overlay',gradient:'mono',states:[
  s(910.703,-2819.214,6328.735,4910.259,-12.631,229.843,2),
  s(6593.882,4101.124,7049.104,5175.505,-179.772,250.928,2),
  s(8155.421,1422.969,7050.619,5948.268,-158.761,264.688,3)]},
 {name:'Ellipse 262',blend:'normal',gradient:'mono',states:[
  s(2834.095,7845.608,3840.15,5227.391,92.321,329.86,3),
  s(-1156.054,3329.425,3439.65,4256.148,-119.749,278.292,3),
  s(3645.906,7110.742,4016.97,5028.632,117.892,327.305,4)]},
 {name:'Ellipse 263',blend:'multiply',gradient:'color',missing:'first',states:[
  {...F52_263,opacity:0},F52_263,s(4394.684,10347.193,4431.529,4664.261,64.532,264.688,2,1)]},
 {name:'Ellipse 264',blend:'overlay',gradient:'mono',states:[
  s(5389.192,4680.715,7050.619,5948.268,158.761,264.688,4),
  s(-1855.525,8648.684,6328.735,4910.259,12.631,229.843,5),
  s(5240.834,1814.098,7049.104,5175.505,179.772,250.928,6)]},
 {name:'Ellipse 265',blend:'multiply',gradient:'color',missing:'first-two',states:[
  {...F53_265,opacity:0,z:5},{...F53_265,opacity:0,z:5},F53_265]},
];

const MONO='conic-gradient(from 90deg at 50% 50%,#525252 0%,#3a3a3a 19.5833%,#fff 45.1042%,#808080 64.8958%,#7a7a7a 86.25%,#525252 100%)';
const COLOR='conic-gradient(from 90deg at 50% 50%,#ff6161 0%,#ffd361 19.5833%,#95ffa0 45.1042%,#95b9ff 64.8958%,#d795ff 86.25%,#ff6161 100%)';
const px=(n:number)=>String(n)+'px';
const key=(a:State,offset:number):Keyframe=>({offset,left:px(a.x),top:px(a.y),width:px(a.width),height:px(a.height),transform:'rotate('+a.rotation+'deg)',filter:'blur('+a.blur+'px)',opacity:a.opacity,zIndex:String(a.z)});

const NOISE=['/field-brand/loading/figma-noise-1.png','/field-brand/loading/figma-noise-2.png','/field-brand/loading/figma-noise-3.png','/field-brand/loading/figma-noise-4.png'] as const;

const CSS=[
 '[data-figma-loading-frame] [data-figma-noise]{position:absolute;left:0;top:0;width:100%;height:96.941%;pointer-events:none;mix-blend-mode:soft-light;overflow:hidden}',
 '[data-figma-loading-frame] [data-noise-frame]{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:0;animation:field-noise-frame 400ms steps(1,end) infinite}',
 '[data-figma-loading-frame] [data-noise-frame="2"]{animation-delay:-300ms}',
 '[data-figma-loading-frame] [data-noise-frame="3"]{animation-delay:-200ms}',
 '[data-figma-loading-frame] [data-noise-frame="4"]{animation-delay:-100ms}',
 '@keyframes field-noise-frame{0%,24.99%{opacity:1}25%,100%{opacity:0}}',
 '@media(prefers-reduced-motion:reduce){[data-figma-loading-frame] [data-noise-frame]{animation:none;opacity:0}[data-figma-loading-frame] [data-noise-frame="1"]{opacity:1}}'
].join('\n');

export default function ReshadersMeshFlowLayer(){
 const stage=useRef<HTMLDivElement>(null);
 const plane=useRef<HTMLDivElement>(null);
 const refs=useRef(new Map<string,HTMLDivElement>());
 useEffect(()=>{
  if(!stage.current||!plane.current)return;
  const fit=()=>{
   const sx=Math.max(1,stage.current!.clientWidth)/FRAME_WIDTH;
   const sy=Math.max(1,stage.current!.clientHeight)/FRAME_HEIGHT;
   plane.current!.style.transform='matrix(0,'+(-sy)+','+sx+',0,0,'+(INSTANCE_WIDTH*sy)+')';
  };
  const ro=new ResizeObserver(fit);ro.observe(stage.current);fit();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations:Animation[]=[];
  if(!reduced)for(const e of ELLIPSES){
   const el=refs.current.get(e.name);if(!el)continue;
   const[a,b,c]=e.states;
   const frames=e.missing==='first'?[key(a,0),key(b,1/3),key(c,2/3),key({...c,opacity:0},.999),key(a,1)]:e.missing==='first-two'?[key(a,0),key(b,1/3),key(c,2/3),key({...c,opacity:0},.999),key(a,1)]:[key(a,0),key(b,1/3),key(c,2/3),key(a,1)];
   animations.push(el.animate(frames,{duration:CYCLE_MS,iterations:Infinity,easing:'linear'}));
  }
  return()=>{ro.disconnect();animations.forEach(a=>a.cancel())};
 },[]);
 return <div ref={stage} data-figma-loading-frame aria-hidden style={{position:'absolute',inset:0,overflow:'hidden',background:'#000'}}>
  <div ref={plane} data-figma-placed-instance style={{position:'absolute',left:0,top:0,width:INSTANCE_WIDTH,height:INSTANCE_HEIGHT,transformOrigin:'0 0',background:'#000',overflow:'hidden'}}>
   {ELLIPSES.map(e=>{const a=e.states[0];return <div key={e.name} ref={n=>{if(n)refs.current.set(e.name,n);else refs.current.delete(e.name)}} style={{position:'absolute',left:a.x,top:a.y,width:a.width,height:a.height,borderRadius:'50%',background:e.gradient==='mono'?MONO:COLOR,transform:'rotate('+a.rotation+'deg)',transformOrigin:'50% 50%',filter:'blur('+a.blur+'px)',opacity:a.opacity,mixBlendMode:e.blend,zIndex:a.z,willChange:'left,top,width,height,transform,filter,opacity'}}/>})}
  </div>
  <div data-figma-noise>{NOISE.map((src,i)=><img key={src} src={src} alt="" data-noise-frame={i+1}/>)}</div>
  <style>{CSS}</style>
 </div>;
}
