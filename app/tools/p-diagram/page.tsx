"use client";
import React, { useRef, useState } from "react";
import { Download, RotateCcw, Wand2, ImageDown, Printer, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// P Diagram Generator — v3.2 (manual zoom, clean JSX)

interface PDItem { id: string; text: string }
interface PDState {
  title: string;
  signals: PDItem[];
  controls: PDItem[];
  noises: PDItem[];
  ideal: PDItem[];
  errors: PDItem[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

const PRESETS: Record<string, PDState> = {
  "ECU Connector": {
    title: "ECU Connector – P Diagram",
    signals: [ { id: uid(), text: "Commanded bus load (%)" }, { id: uid(), text: "Amplitude (Vpp)" } ],
    controls: [ { id: uid(), text: "Contact normal force" }, { id: uid(), text: "Plating" } ],
    noises:   [ { id: uid(), text: "Temp cycling" }, { id: uid(), text: "Vibration" } ],
    ideal:    [ { id: uid(), text: "Contact R stable" } ],
    errors:   [ { id: uid(), text: "Intermittent opens" } ],
  }
};

type PDKeys = keyof PDState;
type EditKey = PDKeys | 'diagramTitle';

const Page: React.FC = () => {
  const [presetKey, setPresetKey] = useState<string>('ECU Connector');
  const [zoom, setZoom] = useState<number>(1);
  const [data, setData] = useState<PDState>(PRESETS['ECU Connector']);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline editor overlay
  const [editor, setEditor] = useState<{open:boolean; key:EditKey; id?: string|null; value:string; left:number; top:number; width:number}>(
    {open:false,key:'diagramTitle',id:null,value:'',left:0,top:0,width:220}
  );

  const openEditorAt = (key: EditKey, id: string|null, value: string, svgX: number, svgY: number, width = 220) => {
    if (!svgRef.current || !containerRef.current) return;
    const pt = svgRef.current.createSVGPoint(); pt.x = svgX; pt.y = svgY;
    const ctm = svgRef.current.getScreenCTM(); if (!ctm) return;
    const sp = pt.matrixTransform(ctm);
    const bounds = containerRef.current.getBoundingClientRect();
    setEditor({open:true,key,id,value,left:sp.x-bounds.left,top:sp.y-bounds.top-10,width});
  };
  const saveEditor = () => {
    if (!editor.open) return; const { key, id, value } = editor;
    if (key === 'diagramTitle') setData((d)=>({...d,title:value||d.title}));
    else setData((d)=>({...d,[key]:(d[key] as PDItem[]).map(it=>it.id===id?{...it,text:value}:it)}));
    setEditor((e)=>({...e,open:false}));
  };
  const cancelEditor = () => setEditor((e)=>({...e,open:false}));

  const addItem = (key: Exclude<PDKeys,'title'>, id?: string) => setData((d)=>({...d,[key]:[...(d[key] as PDItem[]),{id:id??uid(),text:''}]}));
  const removeItem = (key: Exclude<PDKeys,'title'>, id: string) => setData((d)=>({...d,[key]:(d[key] as PDItem[]).filter(it=>it.id!==id)}));
  const applyPreset = () => setData(PRESETS[presetKey]);
  const resetAll = () => setData(PRESETS['ECU Connector']);

  const downloadSVG = () => { if (!svgRef.current) return; const src=new XMLSerializer().serializeToString(svgRef.current); const url=URL.createObjectURL(new Blob([src],{type:'image/svg+xml;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download='p-diagram.svg'; a.click(); URL.revokeObjectURL(url); };
  const downloadPNG = () => { if (!svgRef.current) return; const src=new XMLSerializer().serializeToString(svgRef.current); const url=URL.createObjectURL(new Blob([src],{type:'image/svg+xml;charset=utf-8'})); const img=new Image(); img.onload=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);c.toBlob(b=>{if(!b)return;const u2=URL.createObjectURL(b);const a=document.createElement('a');a.href=u2;a.download='p-diagram.png';a.click();URL.revokeObjectURL(u2);URL.revokeObjectURL(url);});};img.src=url;};
  const downloadPDF = () => { if (!svgRef.current) return; const src=new XMLSerializer().serializeToString(svgRef.current); const html=`<!doctype html><html><head><meta charset='utf-8'/><title>${data.title}</title><style>@page{size:A4 landscape;margin:10mm}body{margin:0;font-family:Inter,system-ui,Arial}.wrap{display:flex;align-items:center;justify-content:center;width:100vw;height:100vh}svg{width:100%;height:auto}</style></head><body><div class='wrap'>${src}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`; const url=URL.createObjectURL(new Blob([html],{type:'text/html'})); window.open(url,'_blank'); };

  // Diagram SVG component
  const DiagramSVG: React.FC<{state:PDState;onEdit:(key:EditKey,id:string|null,value:string,x:number,y:number)=>void;onAdd:(key:Exclude<PDKeys,'title'>,x:number,y:number)=>void;onRemove:(key:Exclude<PDKeys,'title'>,id:string)=>void;svgRef:React.RefObject<SVGSVGElement|null>}> = ({state,onEdit,onAdd,onRemove,svgRef})=>{
    const W=980,H=620;const sysW=200,sysH=56;const sysX=(W-sysW)/2,sysY=(H-sysH)/2;const fontFamily="Inter,system-ui,Arial";
    const wrap=(t:string,m=24)=>{const w=t.split(/\s+/);const l:string[]=[];let line='';w.forEach(x=>{const test=line?`${line} ${x}`:x;if(test.length>m){if(line)l.push(line);line=x;}else line=test;});if(line)l.push(line);return l;};
    const lineStep=18, baseH=60; const boxH=(items:PDItem[])=>items.length*lineStep+baseH;

    const leftX=40,leftY=sysY-70,wLeft=200,hLeft=boxH(state.signals);
    const topX=380,topY=40,wTop=260,hTop=boxH(state.noises);
    const botX=360,botY=H-180,wBot=300,hBot=boxH(state.controls);
    const rightX=W-250,rightTop=sysY-100,rightBot=sysY+60,wRight=200,hIdeal=boxH(state.ideal),hErr=boxH(state.errors);

    const Box:React.FC<{keyName:Exclude<PDKeys,'title'>;x:number;y:number;w:number;h:number;title:string;items:PDItem[]}> = ({keyName,x,y,w,h,title,items}) => {
      let cy=y+40;return(
        <g>
          <rect x={x} y={y} width={w} height={h} rx={6} fill="#fff" stroke="#111827"/>
          <rect x={x} y={y} width={w} height={28} fill="#fff" stroke="#111827"/>
          <line x1={x} y1={y+28} x2={x+w} y2={y+28} stroke="#E5E7EB"/>
          <text x={x+w/2} y={y+18} textAnchor="middle" fontFamily={fontFamily} fontSize={12} fontWeight={700}>{title}</text>
          <g onClick={()=>onAdd(keyName,x+10,y+36)} className="cursor-pointer"><rect x={x+w-20} y={y+6} width={14} height={14} rx={3} fill="#F3F4F6" stroke="#E5E7EB"/><text x={x+w-13} y={y+17} fontSize={12}>+</text></g>
          {items.map(it=>{const lines=wrap(it.text);const node=(
            <g key={it.id}>
              <text x={x+8} y={cy} fontSize={11} fontFamily={fontFamily} className="cursor-text" onClick={()=>onEdit(keyName,it.id,it.text,x+8,cy)}>{lines[0]}</text>
              <g onClick={()=>onRemove(keyName,it.id)} className="cursor-pointer"><rect x={x+w-18} y={cy-10} width={14} height={14} rx={3} fill="#fee2e2" stroke="#fca5a5"/><text x={x+w-11} y={cy} fontSize={10}>×</text></g>
            </g>
          ); cy+=18; return node;})}
        </g>
      );
    };
    const midY=(y:number,h:number)=>y+h/2;

    return(
      <svg ref={svgRef} width="100%" height="auto" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className="rounded-2xl border bg-white">
        <defs>
          <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M2,2 L10,6 L2,10 Z" fill="#2563EB"/></marker>
        </defs>
        <rect x={sysX} y={sysY} width={sysW} height={sysH} rx={6} fill="#fff" stroke="#111827"/>
        {(()=>{const lines=wrap(state.title,22);const lh=14;const startY=sysY+(sysH-lines.length*lh)/2+4;return(
          <text x={sysX+sysW/2} y={startY} textAnchor="middle" fontFamily={fontFamily} fontSize={13} fontWeight={700} className="cursor-text" onClick={()=>onEdit('diagramTitle',null,state.title,sysX+sysW/2-80,sysY+sysH/2)}>
            {lines.map((ln,i)=>(<tspan key={i} x={sysX+sysW/2} dy={i===0?0:lh}>{ln}</tspan>))}
          </text>
        );})()}

        <Box keyName='signals' x={leftX} y={leftY} w={wLeft} h={hLeft} title='Input Signal' items={state.signals}/>
        <Box keyName='noises'  x={topX}  y={topY}  w={wTop}  h={hTop}  title='Noise Factors' items={state.noises}/>
        <Box keyName='controls' x={botX}  y={botY}  w={wBot}  h={hBot}  title='Control Factors' items={state.controls}/>
        <Box keyName='ideal'   x={rightX} y={rightTop} w={wRight} h={hIdeal} title='Ideal Function' items={state.ideal}/>
        <Box keyName='errors'  x={rightX} y={rightBot} w={wRight} h={hErr}   title='Error States'  items={state.errors}/>

        <line x1={leftX+wLeft} y1={midY(leftY,hLeft)} x2={sysX} y2={sysY+sysH/2} stroke="#2563EB" strokeWidth={5} markerEnd="url(#arrow)"/>
        <line x1={sysX+sysW/2} y1={topY+hTop} x2={sysX+sysW/2} y2={sysY} stroke="#2563EB" strokeWidth={5} markerEnd="url(#arrow)"/>
        <line x1={sysX+sysW/2} y1={sysY+sysH} x2={sysX+sysW/2} y2={botY} stroke="#2563EB" strokeWidth={5} markerEnd="url(#arrow)"/>
        <line x1={sysX+sysW}   y1={sysY+sysH/2-10} x2={rightX} y2={midY(rightTop,hIdeal)} stroke="#2563EB" strokeWidth={5} markerEnd="url(#arrow)"/>
        <line x1={sysX+sysW}   y1={sysY+sysH/2+10} x2={rightX} y2={midY(rightBot,hErr)}   stroke="#2563EB" strokeWidth={5} markerEnd="url(#arrow)"/>
      </svg>
    );
  };

  return (
    <div className='max-w-screen-xl mx-auto px-4 md:px-6 py-8'>
      <div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
        <div>
          <h1 className='text-xl font-semibold text-gray-900'>P Diagram Generator</h1>
          <p className='text-gray-600 text-sm'>Click directly on the diagram to edit.</p>
        </div>
        <div className='flex items-center gap-2'>
          <select value={presetKey} onChange={e=>setPresetKey(e.target.value)} className='rounded-md border px-2.5 py-1.5 text-sm'>
            {Object.keys(PRESETS).map(k=>(<option key={k}>{k}</option>))}
          </select>
          <button onClick={applyPreset} className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50'><Wand2 className='w-4 h-4'/>Preset</button>
          <button onClick={resetAll} className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50'><RotateCcw className='w-4 h-4'/>Reset</button>
          <div className='hidden sm:flex items-center gap-1 ml-2'>
            <button onClick={()=>setZoom(z=>Math.max(0.5,+((z-0.1).toFixed(2))))} className='p-2 rounded-md border bg-white hover:bg-gray-50' title='Zoom out'><ZoomOut className='w-4 h-4'/></button>
            <div className='text-sm w-14 text-center'>{Math.round(zoom*100)}%</div>
            <button onClick={()=>setZoom(z=>Math.min(2.0,+((z+0.1).toFixed(2))))} className='p-2 rounded-md border bg-white hover:bg-gray-50' title='Zoom in'><ZoomIn className='w-4 h-4'/></button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base'>Preview</CardTitle>
            <div className='flex items-center gap-2'>
              <button onClick={downloadSVG} className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50'><ImageDown className='w-4 h-4'/>SVG</button>
              <button onClick={downloadPNG} className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50'><Download className='w-4 h-4'/>PNG</button>
              <button onClick={downloadPDF} className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50'><Printer className='w-4 h-4'/>PDF</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='w-full overflow-auto relative' ref={containerRef}>
            {editor.open && (
              <textarea
                autoFocus
                className='absolute z-10 bg-white border border-indigo-400 rounded-md px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                style={{ left: editor.left, top: editor.top, width: editor.width }}
                value={editor.value}
                onChange={e=>setEditor(ed=>({...ed,value:e.target.value}))}
                onKeyDown={e=>{ if(e.key==='Escape'){ e.preventDefault(); cancelEditor(); } else if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); saveEditor(); } }}
                onBlur={saveEditor}
              />
            )}
            <div className='origin-top-left' style={{ transform:`scale(${zoom})`, transformOrigin:'top left' }}>
              <DiagramSVG
                state={data}
                onEdit={(k,id,val,x,y)=>openEditorAt(k,id,val,x,y)}
                onAdd={(k,x,y)=>{ const id=uid(); addItem(k,id); openEditorAt(k,id,'',x,y,220); }}
                onRemove={(k,id)=>removeItem(k,id)}
                svgRef={svgRef}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='mt-6 text-center text-xs text-gray-500'>Built for Reliatools · v3.2</div>
    </div>
  );
};

export default Page;
