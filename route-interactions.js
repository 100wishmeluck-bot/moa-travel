'use strict';
function distanceBadge(p,next,index){
  if(!next)return '';
  const text=RouteUtils.distanceLabel(p.coordinates,next.coordinates);
  return text?`<span class="leg-distance" aria-label="${escapeHTML(p.name)}에서 ${escapeHTML(next.name)}까지 직선거리 ${text}"><small>직선</small>${text}</span>`:`<button class="leg-distance missing" data-coordinate="${RouteUtils.validCoordinates(p.coordinates)?index+1:index}" aria-label="${escapeHTML(p.name)} 다음 구간 거리 계산용 좌표 입력"><small>거리</small>좌표 입력</button>`;
}
function bindReorder(){
  document.querySelectorAll('[data-coordinate]').forEach(b=>b.onclick=()=>{openPlace(Number(b.dataset.coordinate));$('#place-form').elements.coordinates.focus();});
  const timeline=$('#timeline');
  timeline.querySelectorAll('.drag-handle').forEach(handle=>handle.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const list=state.days[day],index=list.findIndex(p=>p.id===handle.closest('.stop').dataset.placeId),target=index+(e.key==='ArrowUp'?-1:1);
    if(target<0||target>=list.length)return;
    const id=list[index].id;[list[index],list[target]]=[list[target],list[index]];persist();render();
    [...timeline.querySelectorAll('.stop')].find(row=>row.dataset.placeId===id).querySelector('.drag-handle').focus();toast('일정 순서를 변경했어요. 시간은 유지됩니다.');
  }));
  timeline.querySelectorAll('.stop-card').forEach(card=>{
    let drag=null,frame=null;
    function position(){
      if(!drag?.active)return;
      const others=[...timeline.querySelectorAll('.stop')].filter(r=>r!==drag.row);
      const before=others.find(r=>{const rect=r.getBoundingClientRect();return drag.y<rect.top+rect.height/2;});
      timeline.querySelectorAll('.drop-before,.drop-after').forEach(r=>r.classList.remove('drop-before','drop-after'));
      drag.beforeId=before?.dataset.placeId||null;
      if(before)before.classList.add('drop-before');else others.at(-1)?.classList.add('drop-after');
    }
    function scrollFrame(){
      if(!drag?.active)return;
      const edge=90,h=window.innerHeight;
      const delta=drag.y<edge?-Math.min(15,(edge-drag.y)/5):drag.y>h-edge?Math.min(15,(drag.y-h+edge)/5):0;
      if(delta){window.scrollBy(0,delta);position();}
      frame=requestAnimationFrame(scrollFrame);
    }
    function finish(cancel=false){
      if(!drag)return;const current=drag;drag=null;cancelAnimationFrame(frame);document.removeEventListener('keydown',escape);
      current.row.classList.remove('dragging');timeline.querySelectorAll('.drop-before,.drop-after').forEach(r=>r.classList.remove('drop-before','drop-after'));document.body.classList.remove('reordering');
      if(card.hasPointerCapture(current.pointerId))card.releasePointerCapture(current.pointerId);
      if(!current.active)return;
      if(!cancel&&selectedTrip===current.tripId&&day===current.day){
        const ids=state.days[day].map(p=>p.id).filter(id=>id!==current.row.dataset.placeId);
        const target=current.beforeId?ids.indexOf(current.beforeId):ids.length;ids.splice(target<0?ids.length:target,0,current.row.dataset.placeId);
        if(ids.join('|')!==state.days[day].map(p=>p.id).join('|')){state.days[day]=RouteUtils.reorder(state.days[day],ids);persist();toast('일정 순서를 변경했어요. 시간은 유지됩니다.');}
      }
      render();
    }
    function escape(e){if(e.key==='Escape'){e.preventDefault();finish(true);}}
    card.addEventListener('pointerdown',e=>{
      if(e.button!==0||!e.isPrimary||e.target.closest('a,input,select,textarea')||e.target.closest('button:not(.drag-handle)'))return;
      // Mobile: reserve only the handle/header for dragging so the rest of a card can scroll.
      if(e.pointerType!=='mouse'&&!e.target.closest('.stop-top'))return;
      drag={row:card.closest('.stop'),pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,y:e.clientY,active:false,tripId:selectedTrip,day};
      card.setPointerCapture(e.pointerId);document.addEventListener('keydown',escape);
    });
    card.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.pointerId)return;
      drag.y=e.clientY;
      if(!drag.active&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6){drag.active=true;drag.row.classList.add('dragging');document.body.classList.add('reordering');frame=requestAnimationFrame(scrollFrame);}
      if(drag.active){e.preventDefault();position();}
    });
    card.addEventListener('pointerup',()=>finish());card.addEventListener('pointercancel',()=>finish(true));card.addEventListener('lostpointercapture',()=>finish(true));
    card.addEventListener('dragstart',e=>e.preventDefault());
  });
}
