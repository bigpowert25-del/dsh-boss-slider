'use strict';
const LABELS={liang:['小难梁','牢梁','梁子','梁圣','梁神','梁祖'],sam:['小奥','牢奥','奥特曼','奥圣','奥神','奥祖'],dario:['小达','牢达','达里奥','达圣','达神','达祖']};
const NAMES={liang:'梁文锋',sam:'奥特曼',dario:'达里奥'};
function familyFor(selection){const id=selection?.model?.toLowerCase()||'';if(/(^|\/)deepseek[-/]/.test(id))return 'liang';if(/(^|\/)gpt-/.test(id))return 'sam';if(/(^|\/)claude-/.test(id))return 'dario';return null;}
function clampFrame(value){return Number.isFinite(Number(value))?Math.min(30,Math.max(0,Math.round(Number(value)))):15;}
function levelsFor(model){const seen=new Set();return (Array.isArray(model?.reasoning?.efforts)?model.reasoning.efforts:[]).flatMap(e=>{const id=typeof e==='string'?e:e?.id;if(typeof id!=='string'||!id||seen.has(id))return [];seen.add(id);return [{id,name:typeof e==='object'&&e.name?e.name:id}];});}
function choiceFor(state){const c=state?.current;return state?.groups?.find(g=>g.id===c?.provider)?.models.find(m=>m.id===c?.model)||null;}
function keyFor(s){return s?JSON.stringify([s.provider,s.model]):'';}
function effective(s,model){return s?.reasoningEffort??model?.reasoning?.defaultEffort;}
function selectionAt(current,model,frame){if(!current)return null;const next={provider:current.provider,model:current.model};const levels=levelsFor(model);if(levels.length)next.reasoningEffort=levels[Math.min(levels.length-1,Math.floor(clampFrame(frame)*levels.length/31))].id;return next;}
function sameSelection(a,b,model){return !!a&&!!b&&a.provider===b.provider&&a.model===b.model&&effective(a,model)===effective(b,model);}
function frameFor(current,model,remembered){const eff=effective(current,model);if(eff===undefined)return remembered===undefined?15:clampFrame(remembered);const matches=Array.from({length:31},(_,i)=>i).filter(i=>selectionAt(current,model,i)?.reasoningEffort===eff);if(remembered!==undefined&&matches.includes(remembered))return remembered;return matches.length?matches[Math.floor(matches.length/2)]:15;}
function labelFor(family,frame){return LABELS[family]?.[Math.min(5,Math.floor(clampFrame(frame)/6))]||'未配置图集';}
module.exports={LABELS,NAMES,familyFor,clampFrame,levelsFor,choiceFor,keyFor,effective,selectionAt,sameSelection,frameFor,labelFor};
