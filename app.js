
const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'Andresfue2457@gmail.com';
const benefits = [
  {p:200,t:'5% de descuento'},
  {p:400,t:'10% de descuento'},
  {p:600,t:'Envío gratis'},
  {p:800,t:'15% de descuento'},
  {p:1000,t:'Beneficio especial'}
];
const $ = s => document.querySelector(s);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
function level(p){if(p>=1000)return'Platinum';if(p>=800)return'Gold';if(p>=600)return'Silver';if(p>=400)return'Bronze';return'Inicial'}
function renderBenefits(){$('#benefitGrid').innerHTML=benefits.map(b=>`<article class="benefit"><div class="points">${b.p} pts</div><h3>${b.t}</h3><p>Beneficio de fidelización NALYCO.</p></article>`).join('')}
async function getUser(){const {data:{user}}=await db.auth.getUser();return user}
async function currentClient(){
  const user=await getUser(); if(!user) return null;
  const {data,error}=await db.from('clientes').select('*').eq('correo',user.email.toLowerCase()).maybeSingle();
  if(error) throw error; return data;
}
async function showAccount(){
  try{
    const c=await currentClient();
    if(!c){toast('No encontramos tu registro de cliente.');return}
    const {data:purchases,error}=await db.from('compras').select('*').eq('cliente_id',c.id).order('fecha_compra',{ascending:false});
    if(error)throw error;
    $('#cuenta').classList.remove('hidden');
    $('#accountName').textContent=c.nombre;
    $('#accountCode').textContent=`Código: NALYCO-${String(c.id).padStart(3,'0')}`;
    $('#accountPoints').textContent=c.puntos;
    $('#accountLevel').textContent=c.nivel||level(c.puntos);
    const next=benefits.find(b=>c.puntos<b.p)||benefits[benefits.length-1];
    $('#nextBenefit').textContent=next.t;
    const prev=benefits[benefits.indexOf(next)-1]?.p||0;
    $('#progressBar').style.width=Math.min(100,Math.max(0,(c.puntos-prev)/(next.p-prev)*100))+'%';
    $('#progressText').textContent=c.puntos>=1000?'¡Tienes el nivel máximo!':`Te faltan ${Math.max(0,next.p-c.puntos)} puntos para ${next.t}.`;
    $('#purchaseHistory').innerHTML=(purchases||[]).map(x=>`<div style="padding:12px 0;border-bottom:1px solid #eee"><b>${x.producto||'Compra'}</b> · ${x.fecha_compra||''} · $${Number(x.valor||0).toLocaleString('es-CO')} · ${x.cantidad||1} unidad(es)</div>`).join('')||'<p>No hay compras registradas.</p>';
    location.hash='cuenta';
  }catch(e){console.error(e);toast('No se pudo consultar la cuenta.')}
}
$('#registerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const f=new FormData(e.target), email=f.get('email').trim().toLowerCase();
    const password=prompt('Crea una contraseña para tu cuenta NALYCO (mínimo 6 caracteres):');
    if(!password)return;
    const {data,error}=await db.auth.signUp({email,password});
    if(error)throw error;
    const {error:ie}=await db.from('clientes').insert({nombre:f.get('name').trim(),telefono:f.get('phone').trim(),correo:email,ciudad:f.get('city').trim(),puntos:0,nivel:'Inicial'});
    if(ie && !ie.message.includes('duplicate'))throw ie;
    toast('Cuenta creada. Revisa tu correo si Supabase solicita confirmación.');
    e.target.reset(); setTimeout(showAccount,800);
  }catch(err){console.error(err);toast(err.message||'No se pudo crear la cuenta.')}
});
$('#loginBtn').addEventListener('click',async()=>{
  const email=prompt('Correo registrado en NALYCO:'); if(!email)return;
  const password=prompt('Contraseña de tu cuenta:'); if(!password)return;
  const {error}=await db.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
  if(error){toast('No se pudo iniciar sesión: '+error.message);return}
  if(email.trim().toLowerCase()===ADMIN_EMAIL){openAdmin();} else {await showAccount();}
});
$('#logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();$('#cuenta').classList.add('hidden');$('#adminModal').classList.add('hidden');location.hash='inicio'});

async function openAdmin(){
  const user=await getUser();
  if(!user || user.email.toLowerCase()!==ADMIN_EMAIL){toast('Acceso no autorizado.');return}
  $('#adminModal').classList.remove('hidden');
  $('#adminLogin').classList.add('hidden');
  $('#adminPanel').classList.remove('hidden');
  await renderAdmin();
}
$('#adminBtn').addEventListener('click',async()=>{
  const user=await getUser();
  if(user && user.email.toLowerCase()===ADMIN_EMAIL){openAdmin();return}
  $('#adminModal').classList.remove('hidden');
  $('#adminLogin').classList.remove('hidden');
  $('#adminPanel').classList.add('hidden');
  $('#adminEmail').focus();
});
$('#adminLoginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#adminEmail').value.trim().toLowerCase();
  const password=$('#adminPassword').value;
  if(email!==ADMIN_EMAIL.toLowerCase()){toast('Ese correo no tiene permisos de administrador.');return}
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){toast('No se pudo iniciar sesión: '+error.message);return}
  await openAdmin();
});
$('#closeAdmin').addEventListener('click',()=>$('#adminModal').classList.add('hidden'));

async function renderAdmin(){
  try{
    const {data:clients,error}=await db.from('clientes').select('*').order('nombre');
    if(error)throw error;
    const {data:purchases,error:pe}=await db.from('compras').select('cliente_id');
    if(pe)throw pe;
    const counts={};(purchases||[]).forEach(p=>counts[p.cliente_id]=(counts[p.cliente_id]||0)+1);
    const total=clients?.length||0, points=(clients||[]).reduce((a,c)=>a+(c.puntos||0),0), sales=purchases?.length||0;
    $('#adminStats').innerHTML=`<div><span>Clientes</span><strong>${total}</strong></div><div><span>Puntos emitidos</span><strong>${points}</strong></div><div><span>Compras registradas</span><strong>${sales}</strong></div>`;
    $('#clientsTable').innerHTML=(clients||[]).map(c=>`<tr><td><b>${c.nombre}</b><br><small>${c.correo}</small></td><td>${c.ciudad||''}</td><td>${counts[c.id]||0}</td><td>${c.puntos||0}</td><td>${c.nivel||level(c.puntos||0)}</td><td><button class="ghost" onclick="addPoints(${c.id})">+100 pts</button> <button class="ghost" onclick="deleteClient(${c.id})">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="6">No hay clientes registrados.</td></tr>';
  }catch(e){console.error(e);toast('No se pudo cargar el panel. Revisa las políticas de Supabase.')}
}
window.addPoints=async id=>{
  try{
    const {data:c,error}=await db.from('clientes').select('*').eq('id',id).single();if(error)throw error;
    const newPoints=(c.puntos||0)+100, newLevel=level(newPoints);
    const {error:ue}=await db.from('clientes').update({puntos:newPoints,nivel:newLevel}).eq('id',id);if(ue)throw ue;
    const {error:ie}=await db.from('compras').insert({cliente_id:id,producto:'Ajuste de fidelización',cantidad:1,valor:0,fecha_compra:new Date().toISOString().slice(0,10)});if(ie)throw ie;
    await renderAdmin();toast(`Se agregaron 100 puntos a ${c.nombre}.`);
  }catch(e){console.error(e);toast('No se pudieron agregar puntos.')}
};
window.deleteClient=async id=>{
  if(!confirm('¿Eliminar este cliente y sus compras?'))return;
  try{const {error}=await db.from('clientes').delete().eq('id',id);if(error)throw error;await renderAdmin();toast('Cliente eliminado.')}catch(e){console.error(e);toast('No se pudo eliminar el cliente.')}
};
$('#exportBtn').addEventListener('click',async()=>{
  try{
    const {data,error}=await db.from('clientes').select('*').order('nombre');if(error)throw error;
    const rows=[['ID','Nombre','Teléfono','Correo','Ciudad','Dirección','Fecha nacimiento','Puntos','Nivel'],...(data||[]).map(c=>[c.id,c.nombre,c.telefono,c.correo,c.ciudad,c.direccion,c.fecha_nacimiento,c.puntos,c.nivel])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='nalyco_clientes.csv';a.click();
  }catch(e){console.error(e);toast('No se pudo exportar.')}
});
renderBenefits();
(async()=>{const {data:{session}}=await db.auth.getSession();if(session){if(session.user.email.toLowerCase()===ADMIN_EMAIL)openAdmin();else showAccount()}})();
