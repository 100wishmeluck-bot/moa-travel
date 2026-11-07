'use strict';
let editingPlace=null, pendingDelete=null;
function ensurePlaceState(){
  state.days.forEach(list=>list.forEach(p=>{p.id ||= crypto.randomUUID();}));

  if(!Array.isArray(state.deletedPlaces))state.deletedPlaces=[];
}
function mapURL(p){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.address?.trim() || (p.destination||currentTrip().destination)+' '+p.name);}
function updateSavedCount(){document.querySelector('.tabs [data-view="saved"] span').textContent=collection.savedPlaces.length;}
function renderUndo(){const last=state.deletedPlaces.at(-1);$('#undo-delete').disabled=!last;$('#undo-help').textContent=last?`최근 삭제: ${last.place.name}`:'';}
function bindPlaceActions(){
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openPlace(Number(b.dataset.edit)));
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
    const p=state.days[day][Number(b.dataset.remove)];pendingDelete={tripId:selectedTrip,day,id:p.id};
    $('#delete-description').textContent=`DAY ${day+1} · ${p.name}`;$('#delete-dialog').showModal();
  });
  document.querySelectorAll('[data-bookmark]').forEach(b=>b.onclick=()=>{
    const p=state.days[day][Number(b.dataset.bookmark)];
    if(collection.savedPlaces.some(s=>s.name===p.name&&(s.address||'')===(p.address||'')&&(s.destination||'')===(p.destination||currentTrip().destination))){toast('이미 저장한 장소예요');return;}
    collection.savedPlaces.push({...p,id:crypto.randomUUID(),destination:p.destination||currentTrip().destination});updateSavedCount();persist();toast('저장한 장소에 담았어요');
  });
}
$('#cancel-delete').onclick=()=>$('#delete-dialog').close();
$('#delete-dialog').addEventListener('close',()=>pendingDelete=null);
$('#confirm-delete').onclick=()=>{
  if(!pendingDelete||pendingDelete.tripId!==selectedTrip)return;
  const list=state.days[pendingDelete.day],index=list.findIndex(p=>p.id===pendingDelete.id);
  if(index<0){$('#delete-dialog').close();return;}
  state.deletedPlaces.push({day:pendingDelete.day,index,nextId:list[index+1]?.id,previousId:list[index-1]?.id,place:structuredClone(list[index])});
  list.splice(index,1);persist();render();$('#delete-dialog').close();toast('삭제했어요. 삭제 실행취소로 되돌릴 수 있어요.');
};
$('#undo-delete').onclick=()=>{
  const entry=state.deletedPlaces.pop();if(!entry)return;
  const list=state.days[entry.day];let index=list.findIndex(p=>p.id===entry.nextId);
  if(index<0){const prev=list.findIndex(p=>p.id===entry.previousId);index=prev>=0?prev+1:Math.min(entry.index,list.length);}
  list.splice(index,0,entry.place);day=entry.day;persist();render();toast('삭제한 일정을 복원했어요');
};
function openPlace(index=null){
  ensurePlaceState();const form=$('#place-form');form.reset();$('#coordinate-error').textContent='';form.dataset.destination=currentTrip().destination;form.elements.name.setCustomValidity('');
  editingPlace=index===null?null:{tripId:selectedTrip,day,id:state.days[day][index].id};
  $('#place-title').textContent=editingPlace?'일정 수정하기':'새로운 장소 담기';$('#place-submit').textContent=editingPlace?'수정 내용 저장':'일정에 추가하기';
  $('#saved-picker-label').hidden=!!editingPlace;
  $('#saved-picker').innerHTML='<option value="">직접 입력하기</option>'+collection.savedPlaces.map(p=>`<option value="${escapeHTML(p.id)}">${p.destination?'['+escapeHTML(p.destination)+'] ':''}${escapeHTML(p.name)}${p.address?' · '+escapeHTML(p.address):''}</option>`).join('');
  $('#saved-picker').disabled=!collection.savedPlaces.length;
  $('#place-day').innerHTML=state.days.map((_,i)=>`<option value="${i}">DAY ${i+1} · ${tripDate(i,true)}</option>`).join('');
  $('#place-day').value=String(day);
  form.elements.category.innerHTML=collection.categories.map(c=>`<option>${escapeHTML(c)}</option>`).join('');
  if(editingPlace)fillPlace(state.days[day][index],true);
  $('#place-dialog').showModal();
}
function fillPlace(p,includeTime=false){const f=$('#place-form');f.dataset.destination=p.destination||currentTrip().destination;for(const key of ['name','address','category','note'])f.elements[key].value=p[key]||'';f.elements.coordinates.value=RouteUtils.validCoordinates(p.coordinates)?`${p.coordinates.lat}, ${p.coordinates.lng}`:'';$('#coordinate-error').textContent='';if(includeTime)f.elements.time.value=p.time||'15:00';f.elements.name.setCustomValidity('');}
$('#saved-picker').onchange=e=>{const p=collection.savedPlaces.find(p=>p.id===e.target.value);if(p)fillPlace(p);};
$('#add-place').onclick=()=>openPlace();$('#close-dialog').onclick=()=>$('#place-dialog').close();
$('#place-dialog').addEventListener('close',()=>editingPlace=null);
$('#place-form').elements.name.oninput=e=>e.target.setCustomValidity('');
$('#place-form').elements.address.oninput=()=>{$('#place-form').elements.coordinates.value='';};
$('#place-form').onsubmit=e=>{
  e.preventDefault();const form=e.target,f=new FormData(form),name=f.get('name').trim(),targetDay=Number(f.get('dayIndex'));
  if(!name){form.elements.name.setCustomValidity('장소 이름을 입력해주세요');form.elements.name.reportValidity();return;}
  if(!state.days[targetDay])return;
  let coordinates;try{coordinates=RouteUtils.parseCoordinates(f.get('coordinates'));$('#coordinate-error').textContent='';}catch(error){$('#coordinate-error').textContent=error.message;form.elements.coordinates.focus();return;}
  const p={coordinates,id:editingPlace?.id||crypto.randomUUID(),name,destination:form.dataset.destination||currentTrip().destination,address:f.get('address').trim(),time:f.get('time'),category:f.get('category'),note:f.get('note').trim()};
  const isEdit=!!editingPlace;
  if(isEdit){
    if(editingPlace.tripId!==selectedTrip)return;
    const list=state.days[editingPlace.day],index=list.findIndex(p=>p.id===editingPlace.id);if(index<0)return;
    if(targetDay===editingPlace.day)list[index]=p;else{list.splice(index,1);state.days[targetDay].push(p);}
  }else state.days[targetDay].push(p);
  day=targetDay;persist();render();switchView('schedule');$('#place-dialog').close();toast(isEdit?'일정을 수정했어요':'새로운 장소를 담았어요');
};
function renderSaved(){
  ensurePlaceState();updateSavedCount();
  $('#saved-list').innerHTML=collection.savedPlaces.map(p=>`<div class="saved-card"><div><span class="category">${escapeHTML(p.destination||'')} · ${escapeHTML(p.category)}</span><h3 style="margin-top:10px">${escapeHTML(p.name)}</h3>${p.address?`<a class="place-address" target="_blank" rel="noopener noreferrer" href="${mapURL(p)}">⌖ ${escapeHTML(p.address)} ↗</a>`:''}<p>${escapeHTML(p.note)}</p></div><button class="primary" data-save="${escapeHTML(p.id)}">DAY ${day+1}에 담기</button></div>`).join('')||'<p class="empty">아직 저장한 장소가 없어요.<br>일정 카드의 ♡ 저장을 눌러 모아보세요.</p>';
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const p=collection.savedPlaces.find(p=>p.id===b.dataset.save);openPlace();$('#saved-picker').value=p.id;fillPlace(p);});
}
