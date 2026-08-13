const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'andresfue2457@gmail.com';

const benefits = [
  {p:200,t:'5% de descuento'},
  {p:400,t:'10% de descuento'},
  {p:600,t:'Envío gratis'},
  {p:800,t:'15% de descuento'},
  {p:1000,t:'Beneficio especial'}
];

const $ = s => document.querySelector(s);

function toast(m){
  const t=$('#toast');
  t.textContent=m;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function level(p){
  if(p>=1000)return'Platinum';
  if(p>=800)return'Gold';
  if(p>=600)return'Silver';
  if(p>=400)return'Bronze';
  return'Inicial';
}

function renderBenefits(){
  $('#benefitGrid').innerHTML=benefits.map(b=>`
    <article class="benefit">
      <div class="points">${b.p} pts</div>
      <h3>${b.t}</h3>
      <p>Beneficio de fidelización NALYCO.</p>
    </article>
  `).join('');
}

async function getUser(){
  const {data:{user},error}=await db.auth.getUser();

  if(error){
    console.error(error);
    return null;
  }

  return user;
}


/* =========================================
   CONSULTA DE CLIENTES SOLO CON CORREO
   ========================================= */

async function lookupByEmail(email){

  try{

    email=(email||'').trim().toLowerCase();

    if(!email){
      toast('Escribe tu correo electrónico.');
      return;
    }

    const {data:c,error}=await db.rpc(
      'consultar_cliente_por_correo',
      {p_correo:email}
    );

    if(error){
      console.error(error);
      toast('No se pudo consultar el cliente.');
      return;
    }

    const client=Array.isArray(c)?c[0]:c;

    if(!client){
      toast('No encontramos un cliente registrado con ese correo.');
      return;
    }

    const {data:purchases,error:pe}=await db.rpc(
      'consultar_compras_por_correo',
      {p_correo:email}
    );

    if(pe){
      console.error(pe);
      toast('No se pudieron consultar las compras.');
      return;
    }

    $('#cuenta').classList.remove('hidden');

    $('#accountName').textContent=client.nombre;

    $('#accountCode').textContent=
      `Código: NALYCO-${String(client.id).padStart(3,'0')}`;

    $('#accountPoints').textContent=client.puntos||0;

    $('#accountLevel').textContent=
      client.nivel||level(client.puntos||0);

    const next=
      benefits.find(b=>(client.puntos||0)<b.p)||
      benefits[benefits.length-1];

    $('#nextBenefit').textContent=next.t;

    const index=benefits.indexOf(next);

    const previous=
      benefits[index-1]?.p||0;

    let progress=0;

    if(next.p>previous){

      progress=
        ((client.puntos||0)-previous)/
        (next.p-previous)*100;

    }

    progress=Math.min(100,Math.max(0,progress));

    $('#progressBar').style.width=progress+'%';

    $('#progressText').textContent=
      (client.puntos||0)>=1000
      ?'¡Tienes el nivel máximo!'
      :`Te faltan ${
        Math.max(0,next.p-(client.puntos||0))
      } puntos para ${next.t}.`;

    $('#purchaseHistory').innerHTML=
      (purchases||[]).map(x=>`
        <div style="padding:12px 0;border-bottom:1px solid #eee">
          <b>${x.producto||'Compra'}</b>
          · ${x.fecha_compra||''}
          · $${Number(x.valor||0).toLocaleString('es-CO')}
          · ${x.cantidad||1} unidad(es)
        </div>
      `).join('')
      ||'<p>No hay compras registradas.</p>';

    location.hash='cuenta';

  }catch(e){

    console.error(e);
    toast('No se pudo consultar la información.');

  }

}


/* =========================================
   REGISTRO DE CLIENTES
   ========================================= */

$('#registerForm').addEventListener('submit',async e=>{

  e.preventDefault();

  try{

    const f=new FormData(e.target);

    const email=
      f.get('email').trim().toLowerCase();

    const {error}=await db
      .from('clientes')
      .insert({

        nombre:f.get('name').trim(),

        telefono:f.get('phone').trim(),

        correo:email,

        ciudad:f.get('city').trim(),

        puntos:0,

        nivel:'Inicial'

      });

    if(error)throw error;

    toast(
      'Registro completado. Ya puedes consultar tus puntos usando tu correo.'
    );

    e.target.reset();

    setTimeout(()=>{
      lookupByEmail(email);
    },500);

  }catch(err){

    console.error(err);

    toast(
      err.message||
      'No se pudo completar el registro.'
    );

  }

});


/* =========================================
   BOTÓN CONSULTAR PUNTOS
   ========================================= */

$('#loginBtn').addEventListener('click',async()=>{

  const email=prompt(
    'Escribe el correo registrado en NALYCO:'
  );

  if(email){

    await lookupByEmail(email);

  }

});


/* =========================================
   CERRAR SESIÓN
   ========================================= */

$('#logoutBtn').addEventListener('click',async()=>{

  await db.auth.signOut();

  $('#cuenta').classList.add('hidden');

  $('#adminModal').classList.add('hidden');

  location.hash='inicio';

});


/* =========================================
   ADMINISTRADOR
   ========================================= */

async function openAdmin(){

  try{

    const user=await getUser();

    if(!user){

      toast(
        'Debes iniciar sesión como administrador.'
      );

      return;
    }

    const email=
      (user.email||'').trim().toLowerCase();

    console.log(
      'Correo autenticado:',
      email
    );

    console.log(
      'Correo administrador:',
      ADMIN_EMAIL
    );

    if(email!==ADMIN_EMAIL){

      toast('Acceso no autorizado.');

      return;
    }

    $('#adminModal').classList.remove('hidden');

    $('#adminLogin').classList.add('hidden');

    $('#adminPanel').classList.remove('hidden');

    await renderAdmin();

  }catch(error){

    console.error(error);

    toast(
      'No se pudo verificar el administrador.'
    );

  }

}


/* =========================================
   BOTÓN ADMINISTRACIÓN
   ========================================= */

$('#adminBtn').addEventListener('click',async()=>{

  try{

    const user=await getUser();

    if(
      user &&
      (user.email||'').trim().toLowerCase()===
      ADMIN_EMAIL
    ){

      await openAdmin();

      return;
    }

  }catch(error){

    console.error(error);

  }

  $('#adminModal').classList.remove('hidden');

  $('#adminLogin').classList.remove('hidden');

  $('#adminPanel').classList.add('hidden');

  $('#adminEmail').focus();

});


/* =========================================
   LOGIN DEL ADMINISTRADOR
   ========================================= */

$('#adminLoginForm').addEventListener(
  'submit',
  async e=>{

    e.preventDefault();

    const email=
      $('#adminEmail')
      .value
      .trim()
      .toLowerCase();

    const password=
      $('#adminPassword').value;

    if(!email){

      toast(
        'Escribe el correo del administrador.'
      );

      return;
    }

    if(!password){

      toast(
        'Escribe la contraseña del administrador.'
      );

      return;
    }

    if(email!==ADMIN_EMAIL){

      toast(
        'Ese correo no tiene permisos de administrador.'
      );

      return;
    }

    try{

      const {data,error}=
        await db.auth.signInWithPassword({

          email:email,

          password:password

        });

      if(error){

        console.error(error);

        toast(
          'No se pudo iniciar sesión: '+
          error.message
        );

        return;
      }

      const authenticatedEmail=
        (data?.user?.email||'')
        .trim()
        .toLowerCase();

      if(authenticatedEmail!==ADMIN_EMAIL){

        toast(
          'La cuenta autenticada no es administradora.'
        );

        await db.auth.signOut();

        return;
      }

      toast(
        'Administrador conectado correctamente.'
      );

      await openAdmin();

    }catch(error){

      console.error(error);

      toast(
        'Ocurrió un error al iniciar sesión.'
      );

    }

  }
);


/* =========================================
   CERRAR PANEL ADMIN
   ========================================= */

$('#closeAdmin').addEventListener('click',()=>{

  $('#adminModal').classList.add('hidden');

});


/* =========================================
   PANEL ADMINISTRADOR
   ========================================= */

async function renderAdmin(){

  try{

    const user=await getUser();

    if(
      !user ||
      (user.email||'').trim().toLowerCase()!==ADMIN_EMAIL
    ){

      toast('Acceso no autorizado.');

      return;
    }

    const {
      data:clients,
      error
    }=await db
      .from('clientes')
      .select('*')
      .order('nombre');

    if(error)throw error;

    const {
      data:purchases,
      error:pe
    }=await db
      .from('compras')
      .select('cliente_id');

    if(pe)throw pe;

    const counts={};

    (purchases||[]).forEach(p=>{

      counts[p.cliente_id]=
        (counts[p.cliente_id]||0)+1;

    });

    const total=
      clients?.length||0;

    const points=
      (clients||[]).reduce(
        (a,c)=>a+(c.puntos||0),
        0
      );

    const sales=
      purchases?.length||0;

    $('#adminStats').innerHTML=`

      <div>
        <span>Clientes</span>
        <strong>${total}</strong>
      </div>

      <div>
        <span>Puntos emitidos</span>
        <strong>${points}</strong>
      </div>

      <div>
        <span>Compras registradas</span>
        <strong>${sales}</strong>
      </div>

    `;

    $('#clientsTable').innerHTML=

      (clients||[]).map(c=>`

        <tr>

          <td>
            <b>${c.nombre}</b>
            <br>
            <small>${c.correo}</small>
          </td>

          <td>
            ${c.ciudad||''}
          </td>

          <td>
            ${counts[c.id]||0}
          </td>

          <td>
            ${c.puntos||0}
          </td>

          <td>
            ${c.nivel||level(c.puntos||0)}
          </td>

          <td>

            <button
              class="ghost"
              onclick="addPoints(${c.id})"
            >
              +100 pts
            </button>

            <button
              class="ghost"
              onclick="deleteClient(${c.id})"
            >
              Eliminar
            </button>

          </td>

        </tr>

      `).join('')

      ||

      '<tr><td colspan="6">No hay clientes registrados.</td></tr>';

  }catch(e){

    console.error(e);

    toast(
      'No se pudo cargar el panel. Revisa las políticas de Supabase.'
    );

  }

}


/* =========================================
   AGREGAR PUNTOS
   ========================================= */

window.addPoints=async id=>{

  try{

    const {
      data:c,
      error
    }=await db
      .from('clientes')
      .select('*')
      .eq('id',id)
      .single();

    if(error)throw error;

    const newPoints=
      (c.puntos||0)+100;

    const newLevel=
      level(newPoints);

    const {
      error:ue
    }=await db
      .from('clientes')
      .update({

        puntos:newPoints,

        nivel:newLevel

      })
      .eq('id',id);

    if(ue)throw ue;

    const {
      error:ie
    }=await db
      .from('compras')
      .insert({

        cliente_id:id,

        producto:
          'Ajuste de fidelización',

        cantidad:1,

        valor:0,

        fecha_compra:
          new Date()
          .toISOString()
          .slice(0,10)

      });

    if(ie)throw ie;

    await renderAdmin();

    toast(
      `Se agregaron 100 puntos a ${c.nombre}.`
    );

  }catch(e){

    console.error(e);

    toast(
      'No se pudieron agregar puntos.'
    );

  }

};


/* =========================================
   ELIMINAR CLIENTE
   ========================================= */

window.deleteClient=async id=>{

  if(
    !confirm(
      '¿Eliminar este cliente y sus compras?'
    )
  )return;

  try{

    const {
      error
    }=await db
      .from('clientes')
      .delete()
      .eq('id',id);

    if(error)throw error;

    await renderAdmin();

    toast(
      'Cliente eliminado.'
    );

  }catch(e){

    console.error(e);

    toast(
      'No se pudo eliminar el cliente.'
    );

  }

};


/* =========================================
   EXPORTAR CLIENTES
   ========================================= */

$('#exportBtn').addEventListener(
  'click',
  async()=>{

    try{

      const {
        data,
        error
      }=await db
        .from('clientes')
        .select('*')
        .order('nombre');

      if(error)throw error;

      const rows=[

        [
          'ID',
          'Nombre',
          'Teléfono',
          'Correo',
          'Ciudad',
          'Dirección',
          'Fecha nacimiento',
          'Puntos',
          'Nivel'
        ],

        ...(data||[]).map(c=>[

          c.id,

          c.nombre,

          c.telefono,

          c.correo,

          c.ciudad,

          c.direccion,

          c.fecha_nacimiento,

          c.puntos,

          c.nivel

        ])

      ];

      const csv=
        rows
        .map(r=>
          r.map(v=>
            `"${String(v??'').replaceAll('"','""')}"`
          ).join(',')
        )
        .join('\n');

      const a=
        document.createElement('a');

      a.href=
        URL.createObjectURL(
          new Blob(
            [csv],
            {type:'text/csv'}
          )
        );

      a.download=
        'nalyco_clientes.csv';

      a.click();

    }catch(e){

      console.error(e);

      toast(
        'No se pudo exportar.'
      );

    }

  }
);


/* =========================================
   INICIO
   ========================================= */

renderBenefits();

(async()=>{

  try{

    const {
      data:{session}
    }=await db.auth.getSession();

    if(
      session &&
      (session.user.email||'')
      .trim()
      .toLowerCase()===
      ADMIN_EMAIL
    ){

      await openAdmin();

    }

  }catch(error){

    console.error(error);

  }

})();
