import { useEffect, useRef } from 'react';

type S=[number,number,number,number,number,number,number?];
type E={name:string;blend:'normal'|'multiply'|'overlay';states:[S,S,S]};
const W=390,H=844,SEG=2000,CYCLE=6000;
const st=(x:number,y:number,w:number,h:number,r:number,b:number,o=1):S=>[x,y,w,h,r,b,o];

export const FIGMA_LOADING_FRAME=Object.freeze({
  fileKey:'ywgbSYrD0fUcXmREaWjqRw',
  frameNodeId:'8:2679',
  componentSetNodeId:'8:3',
  sourceWidth:W,sourceHeight:H,
  frameBlendMode:'hard-light',
  variantDurationMs:SEG,cycleMs:CYCLE,
  noiseBlendMode:'soft-light',noiseStepMs:100,
  gradientStops:[
    [0,'#ff6161'],[0.195833,'#ffd361'],[0.451042,'#95ffa0'],
    [0.648958,'#95b9ff'],[0.8625,'#d795ff'],
  ] as const,
});

const ELLIPSES:readonly E[]=[
  {name:'Ellipse 259',blend:'normal',states:[
    st(218.424,461.917,598.372,598.372,112.763,135.985),
    st(869.82,-184.18,703.758,703.758,-111.237,159.935),
    st(759.696,-321.844,709.252,709.252,-91.704,161.183)]},
  {name:'Ellipse 260',blend:'multiply',states:[
    st(-43.82,329.415,875.883,875.883,63.605,112.311),
    st(342.016,-512.339,956.233,956.233,-6.434,122.614),
    st(779.692,-617.761,783.113,649.232,-70.725,129.337)]},
  {name:'Ellipse 261',blend:'overlay',states:[
    st(123.539,-520.888,875.883,875.883,-16.973,112.311),
    st(894.474,757.738,956.233,956.233,-179.689,122.614),
    st(1106.301,262.913,1008.67,1008.67,-152.105,129.337)]},
  {name:'Ellipse 262',blend:'normal',states:[
    st(384.451,1449.583,709.252,709.252,91.704,161.183),
    st(-156.821,615.156,598.372,598.372,-112.763,135.985),
    st(494.575,1313.806,703.758,703.758,111.237,159.935)]},
  {name:'Ellipse 263',blend:'multiply',states:[
    st(-419.065,747.658,875.883,875.883,-63.605,112.311,0),
    st(-419.065,747.658,875.883,875.883,-63.605,112.311,1),
    st(596.148,1911.784,783.113,649.232,70.725,129.337,1)]},
  {name:'Ellipse 264',blend:'overlay',states:[
    st(731.056,864.826,1008.67,1008.67,152.105,129.337),
    st(-251.706,1597.962,875.883,875.883,16.973,112.311),
    st(710.931,335.179,956.233,956.233,179.689,122.614)]},
  {name:'Ellipse 265',blend:'multiply',states:[
    st(-33.229,1641.964,956.233,956.233,6.434,122.614,0),
    st(-33.229,1641.964,956.233,956.233,6.434,122.614,0),
    st(-33.229,1641.964,956.233,956.233,6.434,122.614,1)]},
];

const GRAD='conic-gradient(from 90deg at 50% 50%,#ff6161 0%,#ffd361 19.5833%,#95ffa0 45.1042%,#95b9ff 64.8958%,#d795ff 86.25%,#ff6161 100%)';
const k=(a:S,offset:number):Keyframe=>({
  offset,left:`${a[0]}px`,top:`${a[1]}px`,width:`${a[2]}px`,height:`${a[3]}px`,
  transform:`rotate(${a[4]}deg)`,filter:`blur(${a[5]}px)`,opacity:a[6]??1,
});

export default function ReshadersMeshFlowLayer(){
  const stage=useRef<HTMLDivElement>(null),plane=useRef<HTMLDivElement>(null);
  const refs=useRef(new Map<string,HTMLDivElement>());
  useEffect(()=>{
    if(!stage.current||!plane.current)return;
    const fit=()=>{
      const w=Math.max(1,stage.current!.clientWidth),h=Math.max(1,stage.current!.clientHeight);
      plane.current!.style.transform=`matrix(0,${-(h/W)},${w/H},0,0,${h})`;
    };
    const ro=new ResizeObserver(fit);ro.observe(stage.current);fit();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations:Animation[]=[];
    if(!reduced)for(const e of ELLIPSES){
      const el=refs.current.get(e.name);if(!el)continue;
      const[a,b,c]=e.states;
      animations.push(el.animate([k(a,0),k(b,1/3),k(c,2/3),k(a,1)],{duration:CYCLE,iterations:Infinity,easing:'linear'}));
    }
    return()=>{ro.disconnect();animations.forEach(a=>a.cancel())};
  },[]);
  return <div ref={stage} data-figma-loading-frame aria-hidden style={{position:'absolute',inset:0,overflow:'hidden',background:'#000'}}>
    <div ref={plane} style={{position:'absolute',left:0,top:0,width:W,height:H,transformOrigin:'0 0',background:'#000',overflow:'hidden'}}>
      {ELLIPSES.map(e=>{const a=e.states[0];return <div key={e.name} ref={n=>{if(n)refs.current.set(e.name,n);else refs.current.delete(e.name)}} style={{
        position:'absolute',left:a[0],top:a[1],width:a[2],height:a[3],borderRadius:'50%',background:GRAD,
        transform:`rotate(${a[4]}deg)`,transformOrigin:'50% 50%',filter:`blur(${a[5]}px)`,opacity:a[6]??1,mixBlendMode:e.blend,
        willChange:'left,top,width,height,transform,filter,opacity'
      }}/>}
      )}
    </div>
    <div data-figma-noise>
      <img src="/field-brand/loading/figma-noise-1.png" alt="" data-noise-frame="1" />
      <img src="/field-brand/loading/figma-noise-2.png" alt="" data-noise-frame="2" />
      <img src="/field-brand/loading/figma-noise-3.png" alt="" data-noise-frame="3" />
      <img src="/field-brand/loading/figma-noise-4.png" alt="" data-noise-frame="4" />
    </div>
    <style>{`
      [data-figma-loading-frame] [data-figma-noise]{
        position:absolute;inset:0;pointer-events:none;mix-blend-mode:soft-light;
      }
      [data-figma-loading-frame] [data-noise-frame]{
        position:absolute;inset:0;width:100%;height:100%;object-fit:fill;
        opacity:0;animation:field-noise-frame 400ms steps(1,end) infinite;
      }
      [data-figma-loading-frame] [data-noise-frame="2"]{animation-delay:-300ms}
      [data-figma-loading-frame] [data-noise-frame="3"]{animation-delay:-200ms}
      [data-figma-loading-frame] [data-noise-frame="4"]{animation-delay:-100ms}
      @keyframes field-noise-frame{0%,24.99%{opacity:1}25%,100%{opacity:0}}
      @media(prefers-reduced-motion:reduce){
        [data-figma-loading-frame] [data-noise-frame]{animation:none;opacity:0}
        [data-figma-loading-frame] [data-noise-frame="1"]{opacity:1}
      }
    `}</style>
  </div>;
}
