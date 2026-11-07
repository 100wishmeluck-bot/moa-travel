(function(root){
  function validCoordinates(p){return p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
  function parseCoordinates(text){
    if(!text.trim())return null;
    const match=text.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)$/);
    const p=match?{lat:Number(match[1]),lng:Number(match[2])}:null;
    if(!validCoordinates(p))throw new Error('좌표를 ‘위도, 경도’ 순서로 입력해주세요. 예: 33.5104, 126.4913 (위도 -90~90, 경도 -180~180)');
    return p;
  }
  function distanceKm(a,b){
    if(!validCoordinates(a)||!validCoordinates(b))return null;
    const rad=d=>d*Math.PI/180,deltaLat=rad(b.lat-a.lat),deltaLng=rad(b.lng-a.lng);
    const h=Math.sin(deltaLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(deltaLng/2)**2;
    return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
  }
  function distanceLabel(a,b){const km=distanceKm(a,b);return km===null?null:km>0&&km<0.01?'< 0.01 km':`${km.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} km`;}
  function reorder(list,ids){
    if(ids.length!==list.length||new Set(ids).size!==ids.length||ids.some(id=>!list.some(p=>p.id===id)))throw new Error('일정 목록이 변경되었습니다. 다시 시도해주세요.');
    const byId=new Map(list.map(p=>[p.id,p]));return ids.map(id=>byId.get(id));
  }
  root.RouteUtils={validCoordinates,parseCoordinates,distanceKm,distanceLabel,reorder};
})(typeof window==='undefined'?globalThis:window);
