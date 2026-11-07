// Local encrypted prototype. Production needs a hosted identity service and database.
window.MoaVault = (() => {
  const prefix = 'moa-account-v2:';
  const encode = a => btoa(Array.from(new Uint8Array(a), b => String.fromCharCode(b)).join(''));
  const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const accountKey = id => prefix + encode(new TextEncoder().encode(id.trim().toLowerCase()));
  async function derive(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:600000, hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  }
  async function seal(key, value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));
    return {iv:encode(iv),data:encode(data)};
  }
  async function open(id,password) {
    const name=accountKey(id), raw=localStorage.getItem(name);
    if(!raw)throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
    try {
      const record=JSON.parse(raw),key=await derive(password,decode(record.salt));
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv)},key,decode(record.data));
      return {name,key,salt:record.salt,data:JSON.parse(new TextDecoder().decode(plain))};
    } catch {throw new Error('아이디 또는 비밀번호가 일치하지 않거나 저장 데이터가 손상되었습니다.');}
  }
  async function create(id,password,data) {
    const name=accountKey(id);
    if(localStorage.getItem(name))throw new Error('이 브라우저에서 이미 사용 중인 아이디입니다.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt);
    const record={salt:encode(salt),...await seal(key,data)};
    if(localStorage.getItem(name))throw new Error('이미 사용 중인 아이디입니다.');
    localStorage.setItem(name,JSON.stringify(record));
    return {name,key,salt:record.salt,data};
  }
  async function save(session,data) {
    localStorage.setItem(session.name,JSON.stringify({salt:session.salt,...await seal(session.key,data)}));
  }
  return {open,create,save};
})();
