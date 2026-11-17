const React=require('react'),h=React.createElement;
const EMPTY=Object.freeze({current:null,groups:[],routable:null,status:'idle',error:null});
const EMPTY_STORE={getSnapshot:()=>EMPTY,subscribe:()=>()=>{}};
const wallpaper=Backdrop.createBackdrop(document,window);

function Rheostat({frame,disabled,onInput,onCommit,onCancel,onWake,label}){
 const pct=frame/30*100;
 const span=(cls,...children)=>h('span',{className:cls,'aria-hidden':true},...children);
 return h('div',{className:'ls-rheostat','data-blocked':disabled?'true':'false'},
  span('ls-plate ls-plate-left',span('ls-plate-post')),span('ls-plate ls-plate-right',span('ls-plate-post')),span('ls-base'),span('ls-rod'),
  span('ls-tube',span('ls-windings'),h('span',{className:'ls-coil-live',style:{width:pct+'%'}})),span('ls-post ls-post-left'),span('ls-post ls-post-right'),
  span('ls-wiper-track',h('span',{className:'ls-wiper',style:{left:pct+'%'}},span('ls-wiper-plate'),span('ls-wiper-wedge'),span('ls-wiper-tip'))),
  h('input',{className:'ls-range',type:'range',min:-15,max:15,step:1,value:frame-15,disabled,'aria-label':'31档推理变阻器','aria-valuetext':label,
   onPointerDown:onWake,onFocus:onWake,onChange:e=>onInput(Number(e.target.value)+15),onPointerUp:e=>onCommit(Number(e.currentTarget.value)+15),
   onPointerCancel:onCancel,onKeyDown:e=>{if(e.key==='Escape')onCancel()},onKeyUp:e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))onCommit(Number(e.currentTarget.value)+15)},onBlur:onCancel}));
}
function Seat({available,directory,load,select,locked,sessionId}){
 const state=React.useSyncExternalStore(cb=>directory.subscribe(cb),()=>directory.getSnapshot());
 const [open,setOpen]=React.useState(false),[picking,setPicking]=React.useState(false),[preview,setPreview]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(null),[saved,setSaved]=React.useState(false),[remembered,bump]=React.useReducer(n=>n+1,0);
 const root=React.useRef(null),trigger=React.useRef(null),panel=React.useRef(null),loadRef=React.useRef(load),saving=React.useRef(false),latest=React.useRef(state),requestGeneration=React.useRef(0);
 latest.current=state;loadRef.current=load;
 const memory=React.useRef(null);if(memory.current===null){try{memory.current=JSON.parse(localStorage.getItem('boss31:positions:'+sessionId)||'{}')}catch{memory.current={}}if(!memory.current||typeof memory.current!=='object')memory.current={};}
 const [position,setPosition]=React.useState(null);
 const current=state.current,model=Core.choiceFor(state),family=Core.familyFor(current),key=Core.keyFor(current),levels=Core.levelsFor(model);
 const committed=Core.frameFor(current,model,memory.current[key]);const frame=preview===null?committed:preview;
 const shown=preview===null?Core.effective(current,model):Core.selectionAt(current,model,frame)?.reasoningEffort;
 const effort=shown===undefined?'Default':levels.find(e=>e.id===shown)?.name||shown;
 const person=Core.NAMES[family]||'未配置人物';const score=(frame>15?'+':'')+String(frame-15);const caption=(model?.name||current?.model||'选择模型')+' · '+effort;
 const blocked=!available||!!locked||state.routable===false||!current||!model;
 const rangeDisabled=blocked||busy||!family;
 React.useEffect(()=>{if(available)loadRef.current()},[available,directory]);
 React.useEffect(()=>{setPreview(null);setError(null);setSaved(false);requestGeneration.current++;wallpaper.release(sessionId);},[key]);
 React.useEffect(()=>{setPreview(null);},[current?.reasoningEffort]);
 React.useEffect(()=>()=>{requestGeneration.current++;wallpaper.release(sessionId)},[sessionId]);
 React.useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=trigger.current?.getBoundingClientRect();if(!r)return;const width=Math.min(430,window.innerWidth-24),bottom=Math.max(12,window.innerHeight-r.top+8);setPosition({width,right:Math.max(12,Math.min(window.innerWidth-r.right,window.innerWidth-width-12)),bottom})};place();window.addEventListener('resize',place);document.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true)}},[open,picking]);
 const close=()=>{setOpen(false);setPicking(false);setPreview(null);wallpaper.release(sessionId)};
 React.useEffect(()=>{if(!open)return;const down=e=>{if(root.current?.contains(e.target)||panel.current?.contains(e.target))return;close()};const keydown=e=>{if(e.key==='Escape'){close();trigger.current?.focus()}};document.addEventListener('pointerdown',down,true);document.addEventListener('keydown',keydown,true);return()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('keydown',keydown,true)}},[open]);
 function saveFrame(frame){memory.current[key]=frame;try{localStorage.setItem('boss31:positions:'+sessionId,JSON.stringify(memory.current))}catch{}bump();}
 function wake(at=frame){if(family&&FRAMES[family]?.images[at])wallpaper.show(sessionId,root.current,FRAMES[family].images[at]);}
 async function submit(selection,onSuccess){if(!selection||blocked||saving.current)return;const requestKey=Core.keyFor(latest.current.current);const gen=++requestGeneration.current;saving.current=true;setBusy(true);setError(null);setSaved(false);try{const result=await select(selection);if(!result||result.ok!==true)throw new Error(result?.error?.message||'设置未被接受');if(Core.keyFor(latest.current.current)!==requestKey&&Core.keyFor(selection)===requestKey)return;onSuccess?.();setSaved(true);}catch(e){if(Core.keyFor(latest.current.current)===requestKey){setError(e.message||String(e));wake(committed);}}finally{saving.current=false;setBusy(false);setPreview(null);}}
 function commit(raw){const targetFrame=Core.clampFrame(raw);if(rangeDisabled){setPreview(null);return;}if(!levels.length){saveFrame(targetFrame);setPreview(null);setSaved(false);return;}const wanted=Core.selectionAt(current,model,targetFrame);if(Core.sameSelection(current,wanted,model)){saveFrame(targetFrame);setPreview(null);return;}submit(wanted,()=>saveFrame(targetFrame));}
 function changeModel(encoded){let pair;try{pair=JSON.parse(encoded)}catch{return;}if(!Array.isArray(pair)||pair.length!==2)return;const group=state.groups.find(g=>g.id===pair[0]),next=group?.models.find(m=>m.id===pair[1]);if(!next)return;const selection={provider:group.id,model:next.id};if(next.reasoning?.defaultEffort!==undefined)selection.reasoningEffort=next.reasoning.defaultEffort;submit(selection,()=>{setPicking(false);setPreview(null);});}
 if(!available)return null;
 const note=error||state.error||(busy?'正在保存…':blocked?'模型暂不可用，保留当前选择':!family?'此模型尚无31帧图集，可通过“换模型”选择':!levels.length?'图集可预览；该模型未公布推理等级':preview!==null?'预览中 · 松手保存':saved?'已保存 · 下次请求生效':'31张逐档换图 · 松手保存推理等级');
 return h('div',{className:'ls-root bs31-root',ref:root,'data-boss31-family':family||'', 'data-boss31-frame':frame},
  h('button',{type:'button',ref:trigger,className:'ls-trigger'+(open?' ls-trigger-on':''),'aria-expanded':open,'aria-haspopup':'dialog','aria-label':'模型与31帧变阻器',title:person+' · '+caption,onClick:()=>{if(open)close();else setOpen(true)}},h('span',{className:'ls-tri','aria-hidden':true},open?'▾':'▸'),h('span',{className:'ls-trigger-text'},caption)),
  open&&h('div',{className:'ls-popover bs31-popover',ref:panel,role:'dialog','aria-label':'31帧滑动变阻器',style:position?{width:position.width,right:position.right,bottom:position.bottom,maxHeight:'calc(100vh - 120px)',overflowY:'auto'}:{visibility:'hidden'}},
   h('div',{className:'ls-popover-head'},h('span',{className:'ls-popover-title'},person+' · 31帧变阻器'),h('button',{className:'ls-settings-btn',type:'button',disabled:busy,onClick:()=>setPicking(v=>!v)},picking?'收起模型':'换模型'),h('button',{className:'ls-close',type:'button','aria-label':'关闭变阻器',onClick:close},'×')),
   picking&&h('div',{className:'bs31-picker'},h('label',null,'当前模型',h('select',{'aria-label':'选择变阻器模型',value:key,disabled:busy||blocked,onChange:e=>changeModel(e.target.value)},...state.groups.map(g=>h('optgroup',{key:g.id,label:g.name||g.id},...g.models.map(m=>h('option',{key:m.id,value:JSON.stringify([g.id,m.id])},m.name||m.id))))))),
   h('div',{className:'ls-body'},h('span',{className:'ls-chip'+(busy?' ls-busy':'')},h('span',{className:'ls-chip-main'},h('span',{className:'ls-model'},model?.name||current?.model||'加载模型目录…'),h('span',{className:'ls-chip-tags'},h('span',{className:'ls-stage'},Core.labelFor(family,frame)),h('span',{className:'ls-score'},score))),h('span',{className:'ls-sub'},(current?.provider||'')+' · '+effort+' · '+(frame+1)+'/31')),
    h(Rheostat,{frame,disabled:rangeDisabled,label:person+' '+score+' '+effort,onWake:()=>wake(),onInput:at=>{setPreview(at);setSaved(false);wake(at)},onCommit:commit,onCancel:()=>setPreview(null)}),
    h('div',{className:'ls-stations','aria-hidden':true},(Core.LABELS[family]||[]).map((text,i)=>h('span',{className:'ls-station'+(Math.min(5,Math.floor(frame/6))===i?' ls-station-active':''),key:i,style:{left:'calc(30px + (100% - 60px) * '+(i===5?1:(i*6+2.5)/30)+')'}},text))),
    h('div',{className:'ls-ticks','aria-hidden':true},h('span',null,'−15'),h('span',null,'0'),h('span',null,'+15'))),
   h('div',{className:'bs31-footer'},h('span',{role:error?'alert':'status',className:error?'bs31-error':''},note),h('button',{className:'ls-settings-btn',type:'button',disabled:blocked||busy,onClick:()=>submit({provider:current.provider,model:current.model})},'Default')),
   error&&h('button',{className:'ls-retry',type:'button',onClick:()=>{setError(null);loadRef.current()}},'刷新模型目录')));
}
class Boundary extends React.Component{constructor(p){super(p);this.state={error:null}}static getDerivedStateFromError(e){return {error:e.message}}render(){return this.state.error?h('span',{role:'alert'},'变阻器加载异常；可用 /model 切换模型'):this.props.children}}
function createInject(ctx){return sessionId=>{let available=true;try{available=ctx.sessions.subagentAddress(sessionId)===undefined}catch{}let dir=null;const get=()=>dir||(dir=ctx.modelDirectories.directoryFor(sessionId));return {sessionId,available,get directory(){try{return get().store}catch{return EMPTY_STORE}},load:()=>{try{if(available)get().load().catch(()=>{})}catch{}},select:selection=>{try{return available?get().select(selection):Promise.resolve(undefined)}catch(e){return Promise.reject(e)}}}};}
function apply(ctx){ctx.effect(()=>{const style=document.createElement('style');style.dataset.plugin='dsh-boss-slider-31';style.textContent=CSS;document.head.append(style);return()=>{style.remove();wallpaper.dispose()}});ctx.slots.inject('conversation.input.model',()=>ctx.slots.register({name:'conversation.input.model',priority:-10,inject:createInject(ctx)},props=>h(Boundary,null,h(Seat,props))));}
return {inject:['modelDirectories','remote','remote.session','sessions','slots'],apply};
