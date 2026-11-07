// Shared account data and non-destructive trip edits. Also used by regression tests.
(function(root){
  const defaults=['관광','맛집','카페','숙소','교통','기타'];
  function places(account){return [...account.savedPlaces,...account.trips.flatMap(t=>[...t.data.days.flat(),...(t.data.deletedPlaces||[]).map(e=>e.place)])];}
  function migrate(account,seed){
    if(!Array.isArray(account.savedPlaces))account.savedPlaces=[];
    for(const trip of account.trips){
      const list=Array.isArray(trip.data.savedPlaces)?trip.data.savedPlaces:(!account.sharedPlacesVersion&&trip.destination==='제주'?seed:[]);
      for(const p of list){
        const copy={...p,id:p.id||crypto.randomUUID(),destination:p.destination||trip.destination};
        if(!account.savedPlaces.some(s=>['name','address','destination','category','note'].every(k=>(s[k]||'')===(copy[k]||''))))account.savedPlaces.push(copy);
      }
      delete trip.data.savedPlaces;
    }
    // IDs must remain unique when old trips happen to contain the same saved ID.
    const ids=new Set();for(const p of account.savedPlaces){if(!p.id||ids.has(p.id))p.id=crypto.randomUUID();ids.add(p.id);}
    account.sharedPlacesVersion=1;
    account.categories=[...new Set([...(account.categories||defaults),...places(account).map(p=>p.category).filter(Boolean),'기타'])];
    return account;
  }
  function renameCategory(account,oldName,newName){
    if(!newName||newName.length>30)throw new Error('종류 이름을 1~30자로 입력해주세요.');
    if(newName!==oldName&&account.categories.includes(newName))throw new Error('이미 있는 종류 이름입니다.');
    if(oldName==='기타')throw new Error('기타는 기본 종류로 유지됩니다.');
    account.categories=account.categories.map(c=>c===oldName?newName:c);
    for(const p of places(account))if(p.category===oldName)p.category=newName;
  }
  function removeCategory(account,name){
    if(name==='기타')throw new Error('기타는 기본 종류로 유지됩니다.');
    if(places(account).some(p=>p.category===name))throw new Error('일정 또는 저장한 장소에서 사용 중인 종류입니다. 이름을 수정하거나 해당 장소의 종류를 먼저 바꿔주세요.');
    account.categories=account.categories.filter(c=>c!==name);
  }
  function editTrip(trip,fields){
    const count=Math.round((Date.parse(fields.end+'T00:00:00Z')-Date.parse(fields.start+'T00:00:00Z'))/86400000)+1;
    if(!Number.isInteger(count)||count<1||count>90)throw new Error('마지막 날은 출발일 이후여야 하며, 한 여행은 최대 90일입니다.');
    if(trip.data.days.slice(count).some(d=>d.length)||(trip.data.deletedPlaces||[]).some(e=>e.day>=count))throw new Error('줄어드는 날짜에 일정 또는 삭제 복원 기록이 있어요. 삭제한 일정은 실행취소한 뒤, 남길 날짜로 옮겨주세요.');
    trip.data.days=Array.from({length:count},(_,i)=>trip.data.days[i]||[]);
    Object.assign(trip,fields);
    return trip;
  }
  root.TravelData={migrate,renameCategory,removeCategory,editTrip};
})(typeof window==='undefined'?globalThis:window);
