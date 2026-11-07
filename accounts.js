'use strict';
let session=null, collection=null, selectedTrip=null, registering=false, saveQueue=Promise.resolve(), saveFailed=false;
function currentTrip(){return collection.trips.find(t=>t.id===selectedTrip);}
function tripDate(index,short=false){const d=new Date(currentTrip().start+'T12:00:00');d.setDate(d.getDate()+index);return short?`${d.getMonth()+1}.${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`:d.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'});}
function queueSave(){
  if(!session)return;
  const activeSession=session,snapshot=structuredClone(collection);
  $('#save-status').textContent='저장 중…';
  saveQueue=saveQueue.then(()=>MoaVault.save(activeSession,snapshot)).then(()=>{saveFailed=false;$('#save-status').textContent='✓ 이 브라우저에 암호화하여 저장했어요';}).catch(()=>{saveFailed=true;$('#save-status').textContent='저장하지 못했어요. 저장 공간을 확인하고 일정을 내보내 주세요.';toast('저장 실패: 현재 일정을 내보내 보관하세요.');});
  return saveQueue;
}
function sampleTrip(data=structuredClone(initial)){return {id:crypto.randomUUID(),title:'제주에서, 느리게',destination:'제주',start:'2026-11-20',end:'2026-11-23',data};}
function chooseTrip(id){
  selectedTrip=id;state=currentTrip().data;day=0;
  const trip=currentTrip();
  $('.hero-content h1').textContent=trip.title;
  $('.hero-label').textContent=trip.destination+' · MY JOURNEY';
  $('.hero-content p').textContent='좋아하는 곳을 담아, 우리만의 여행을 만들어가요.';
  $('.hero-tags').innerHTML=`<span>${escapeHTML(trip.start)} — ${escapeHTML(trip.end)}</span><span>${state.days.length-1}박 ${state.days.length}일</span>`;
  $('.breadcrumb').textContent='나의 여행 / '+trip.destination;
  $('#schedule-view h2').textContent=trip.title;
  $('.illustrated-map svg > text').textContent='여행의 동선';
  ensurePlaceState();updateSavedCount();
  $('.sample-info').textContent='동선 이미지는 디자인 예시입니다. 실제 위치는 장소별 지도에서 확인하세요.';
  $('#memo').value=state.memo;render();switchView('schedule');renderTrips();
}
function renderTrips(){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const tile=t=>`<button class="trip-tile ${t.id===selectedTrip?'active':''}" data-trip="${escapeHTML(t.id)}" aria-pressed="${t.id===selectedTrip}"><span>⌖ ${escapeHTML(t.destination)}</span><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.start)} — ${escapeHTML(t.end)}</small>${t.start<=today&&t.end>=today?'<span>여행 중</span>':''}</button>`;
  $('#trip-list').innerHTML=collection.trips.filter(t=>t.end>=today).sort((a,b)=>a.start.localeCompare(b.start)).map(tile).join('')||'<p class="side-empty">예정된 여행이 없어요</p>';
  $('#past-trip-list').innerHTML=collection.trips.filter(t=>t.end<today).sort((a,b)=>b.end.localeCompare(a.end)).map(tile).join('')||'<p class="side-empty">지난 여행이 없어요</p>';
  document.querySelectorAll('[data-trip]').forEach(b=>b.onclick=()=>chooseTrip(b.dataset.trip));
}
function enterAccount(opened){session=opened;collection=TravelData.migrate(opened.data,saved);$('#account-name').textContent=collection.username+' 님';chooseTrip(collection.trips[0].id);$('#auth-screen').hidden=true;$('#app-shell').hidden=false;document.body.classList.remove('locked');$('#auth-form').reset();$('#save-status').textContent='✓ 이 브라우저에 저장된 여행을 불러왔어요';queueSave();}
function setAuthMode(signup){
  registering=signup;$('#auth-title').textContent=signup?'나만의 여행을 시작해요':'다시 만나 반가워요';$('#auth-submit').textContent=signup?'계정 만들기':'로그인';$('#auth-toggle').textContent=signup?'이미 계정이 있나요? 로그인':'처음 오셨나요? 새 계정 만들기';$('#confirm-label').hidden=!signup;$('#auth-form').elements.confirm.required=signup;$('#auth-form').elements.password.minLength=signup?10:1;$('#auth-form').elements.password.autocomplete=signup?'new-password':'current-password';$('#auth-error').textContent='';
  let hasOld=false;try{hasOld=!!localStorage.getItem('moa-trip-v1');}catch{}
  $('#import-label').hidden=!signup||!hasOld;$('#auth-form').elements.importOld.checked=false;
}
$('#auth-toggle').onclick=()=>setAuthMode(!registering);
$('#auth-form').onsubmit=async e=>{
  e.preventDefault();const form=e.target,id=form.elements.username.value.trim().toLowerCase(),password=form.elements.password.value,signup=registering;
  $('#auth-error').textContent='';
  if(signup&&password!==form.elements.confirm.value){$('#auth-error').textContent='두 비밀번호가 일치하지 않습니다.';return;}
  if(!crypto.subtle){$('#auth-error').textContent='안전한 HTTPS 주소 또는 이 PC의 미리보기 주소에서 열어주세요.';return;}
  $('#auth-submit').disabled=true;$('#auth-toggle').disabled=true;
  try{
    let opened;
    if(signup){
      let data=structuredClone(initial),imported=false;
      if(form.elements.importOld.checked){
        const old=JSON.parse(localStorage.getItem('moa-trip-v1'));
        if(!old||!Array.isArray(old.days)||old.days.length!==4||!old.days.every(d=>Array.isArray(d)&&d.every(p=>p&&['name','time','category','note'].every(k=>typeof p[k]==='string')))||!Array.isArray(old.checks)||!old.checks.every(c=>c&&typeof c.text==='string'&&typeof c.done==='boolean')||typeof old.memo!=='string')throw new Error('기존 제주 일정을 읽을 수 없습니다. 가져오기를 해제해 새 계정을 만들 수 있습니다.');
        data=old;imported=true;
      }
      opened=await MoaVault.create(id,password,{username:id,trips:[sampleTrip(data)]});
      if(imported)localStorage.removeItem('moa-trip-v1');
    }else opened=await MoaVault.open(id,password);
    enterAccount(opened);
  }catch(error){$('#auth-error').textContent=error.name==='QuotaExceededError'?'저장 공간이 부족합니다. 계정을 저장하지 못했어요.':error.message;}
  finally{$('#auth-submit').disabled=false;$('#auth-toggle').disabled=false;}
};
$('#logout').onclick=async()=>{
  $('#logout').disabled=true;await queueSave();
  if(saveFailed){$('#logout').disabled=false;return;}
  session=null;collection=null;selectedTrip=null;state=structuredClone(initial);$('#app-shell').hidden=true;$('#auth-screen').hidden=false;document.body.classList.add('locked');$('#timeline').replaceChildren();$('#trip-list').replaceChildren();$('#past-trip-list').replaceChildren();closeSidebar();$('#memo').value='';setAuthMode(false);$('#logout').disabled=false;window.scrollTo(0,0);
};
let editingTripId=null;
function openTripEditor(edit=false){
  editingTripId=edit?selectedTrip:null;$('#trip-form').reset();$('#trip-error').textContent='';
  $('#trip-dialog-title').textContent=edit?'여행 정보 수정':'새로운 여행의 시작';$('#trip-submit').textContent=edit?'수정 내용 저장':'여행 만들기';$('#trip-edit-hint').hidden=!edit;
  if(edit)for(const k of ['title','destination','start','end'])$('#trip-form').elements[k].value=currentTrip()[k];
  closeSidebar();$('#trip-dialog').showModal();
}
$('#new-trip').onclick=()=>openTripEditor();$('#edit-trip').onclick=()=>openTripEditor(true);
$('#close-trip').onclick=()=>$('#trip-dialog').close();
$('#trip-form').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target),title=f.get('title').trim(),destination=f.get('destination').trim(),start=f.get('start'),end=f.get('end');
  if(!title||!destination){$('#trip-error').textContent='여행 이름과 여행지를 입력해주세요.';return;}
  try{
    const trip=editingTripId?currentTrip():{id:crypto.randomUUID(),data:{days:[],checks:initial.checks.map(c=>({...c,done:false})),memo:''}};
    TravelData.editTrip(trip,{title,destination,start,end});
    if(!editingTripId)collection.trips.push(trip);
    chooseTrip(trip.id);queueSave();$('#trip-dialog').close();toast(editingTripId?'여행 정보를 수정했어요':'새 여행을 만들었어요');
  }catch(error){$('#trip-error').textContent=error.message;}
};
// Avoid stale tabs overwriting an account edited in another tab.
window.addEventListener('storage',e=>{if(session&&e.key===session.name){window.location.reload();}});
setAuthMode(false);
