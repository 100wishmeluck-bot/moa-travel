'use strict';
function renderCategories(){
  $('#category-error').textContent='';
  $('#category-list').innerHTML=collection.categories.map((c,i)=>`<form class="category-row" data-category="${i}"><input aria-label="${escapeHTML(c)} 이름" maxlength="30" value="${escapeHTML(c)}" required ${c==='기타'?'disabled':''}><button type="submit" class="quiet" ${c==='기타'?'disabled':''}>이름 저장</button><button type="button" class="quiet category-remove" ${c==='기타'?'disabled':''}>삭제</button></form>`).join('');
  document.querySelectorAll('[data-category]').forEach(form=>{
    const name=collection.categories[Number(form.dataset.category)];
    form.onsubmit=e=>{e.preventDefault();try{TravelData.renameCategory(collection,name,form.querySelector('input').value.trim());persist();render();renderCategories();toast('종류 이름을 수정했어요');}catch(error){$('#category-error').textContent=error.message;}};
    form.querySelector('.category-remove').onclick=()=>{try{TravelData.removeCategory(collection,name);persist();renderCategories();toast('종류를 삭제했어요');}catch(error){$('#category-error').textContent=error.message;}};
  });
}
$('#category-add').onsubmit=e=>{
  e.preventDefault();const name=e.target.elements.category.value.trim();
  if(!name||collection.categories.includes(name)){$('#category-error').textContent='새 종류 이름을 입력해주세요. 같은 이름은 중복할 수 없어요.';return;}
  collection.categories.push(name);persist();renderCategories();e.target.reset();toast('새로운 종류를 추가했어요');
};
function closeSidebar(){
  const open=$('#travel-sidebar').classList.contains('drawer-open');
  $('#travel-sidebar').classList.remove('drawer-open');$('#sidebar-backdrop').hidden=true;$('#open-sidebar').setAttribute('aria-expanded','false');
  document.querySelector('main').inert=false;$('.mobile-nav').inert=false;document.body.classList.remove('drawer-visible');
  $('#travel-sidebar').removeAttribute('role');$('#travel-sidebar').removeAttribute('aria-modal');
  if(open)$('#open-sidebar').focus();
}
$('#open-sidebar').onclick=()=>{
  $('#travel-sidebar').classList.add('drawer-open');$('#sidebar-backdrop').hidden=false;$('#open-sidebar').setAttribute('aria-expanded','true');
  document.querySelector('main').inert=true;$('.mobile-nav').inert=true;document.body.classList.add('drawer-visible');
  $('#travel-sidebar').setAttribute('role','dialog');$('#travel-sidebar').setAttribute('aria-modal','true');$('#close-sidebar').focus();
};
$('#close-sidebar').onclick=closeSidebar;$('#sidebar-backdrop').onclick=closeSidebar;
document.addEventListener('keydown',e=>{
  if(!$('#travel-sidebar').classList.contains('drawer-open'))return;
  if(e.key==='Escape'){e.preventDefault();closeSidebar();}
  if(e.key==='Tab'){
    const nodes=[...$('#travel-sidebar').querySelectorAll('a,button:not(:disabled)')].filter(el=>el.getClientRects().length);
    if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}
    else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}
  }
});
window.matchMedia('(max-width: 900px)').addEventListener('change',()=>closeSidebar());
$('#top-login').onclick=()=>{$('#auth-form').elements.username.focus();};
