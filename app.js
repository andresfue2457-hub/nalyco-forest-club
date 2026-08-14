/* =========================================================
   NALYCO FOREST CLUB
   CRM + FIDELIZACIÓN + SUPABASE
   ========================================================= */

const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const ADMIN_EMAIL = 'andresfue2457@gmail.com';


const benefits = [
  { p: 200, t: '5% de descuento' },
  { p: 400, t: '10% de descuento' },
  { p: 600, t: 'Envío gratis' },
  { p: 800, t: '15% de descuento' },
  { p: 1000, t: 'Beneficio especial' }
];


/* =========================================================
   UTILIDADES
   ========================================================= */

const $ = selector => document.querySelector(selector);


function toast(message) {

  const element = $('#toast');

  if (!element) return;

  element.textContent = message;

  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}


/* =========================================================
   NIVEL DEL CLIENTE
   ========================================================= */

function level(points) {

  points = Number(points || 0);

  if (points >= 1000) return 'Platinum';

  if (points >= 800) return 'Gold';

  if (points >= 600) return 'Silver';

  if (points >= 400) return 'Bronze';

  return 'Inicial';
}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


/* =========================================================
   BENEFICIOS
   ========================================================= */

function renderBenefits() {

  const grid = $('#benefitGrid');

  if (!grid) return;

  grid.innerHTML = benefits.map(benefit => `

    <article class="benefit">

      <div class="points">
        ${benefit.p} pts
      </div>

      <h3>
        ${escapeHTML(benefit.t)}
      </h3>

      <p>
        Beneficio de fidelización NALYCO.
      </p>

    </article>

  `).join('');

}


/* =========================================================
   USUARIO AUTENTICADO
   ========================================================= */

async function getUser() {

  try {

    const {
      data: { user },
      error
    } = await db.auth.getUser();

    if (error) {

      console.error(error);

      return null;

    }

    return user;

  } catch (error) {

    console.error(error);

    return null;

  }

}


/* =========================================================
   MOSTRAR CUENTA DEL CLIENTE
   ========================================================= */

async function showClientAccount(client, purchases = []) {

  if (!client) return;


  const account = $('#cuenta');

  if (account) {

    account.classList.remove('hidden');

  }


  const points = Number(client.puntos || 0);


  if ($('#accountName')) {

    $('#accountName').textContent =
      client.nombre || 'Cliente';

  }


  if ($('#accountCode')) {

    $('#accountCode').textContent =
      `Código: NALYCO-${String(client.id).padStart(3, '0')}`;

  }


  if ($('#accountPoints')) {

    $('#accountPoints').textContent =
      points;

  }


  if ($('#accountLevel')) {

    $('#accountLevel').textContent =
      client.nivel || level(points);

  }


  /* =====================================================
     PRÓXIMO BENEFICIO
     ===================================================== */

  let next =
    benefits.find(benefit => points < benefit.p);

  if (!next) {

    next =
      benefits[benefits.length - 1];

  }


  if ($('#nextBenefit')) {

    $('#nextBenefit').textContent =
      next.t;

  }


  const benefitIndex =
    benefits.indexOf(next);


  const previous =
    benefitIndex > 0
      ? benefits[benefitIndex - 1].p
      : 0;


  let progress = 0;


  if (next.p > previous) {

    progress =
      ((points - previous) /
        (next.p - previous)) *
      100;

  }


  progress =
    Math.min(
      100,
      Math.max(0, progress)
    );


  if ($('#progressBar')) {

    $('#progressBar').style.width =
      `${progress}%`;

  }


  if ($('#progressText')) {

    $('#progressText').textContent =
      points >= 1000
        ? '¡Tienes el nivel máximo!'
        : `Te faltan ${
            Math.max(0, next.p - points)
          } puntos para ${next.t}.`;

  }


  /* =====================================================
     HISTORIAL DE COMPRAS
     ===================================================== */

  if ($('#purchaseHistory')) {

    $('#purchaseHistory').innerHTML =

      (purchases || [])
        .map(purchase => `

          <div
            style="
              padding:12px 0;
              border-bottom:1px solid #eee;
            "
          >

            <b>
              ${escapeHTML(
                purchase.producto || 'Compra'
              )}
            </b>

            · ${escapeHTML(
              purchase.fecha_compra || ''
            )}

            · $${Number(
              purchase.valor || 0
            ).toLocaleString('es-CO')}

            · ${Number(
              purchase.cantidad || 1
            )} unidad(es)

          </div>

        `)
        .join('')

      ||

      '<p>No hay compras registradas.</p>';

  }


  location.hash = 'cuenta';

}


/* =========================================================
   CONSULTAR CLIENTE POR CORREO
   ========================================================= */

async function lookupByEmail(email) {

  try {

    email =
      String(email || '')
        .trim()
        .toLowerCase();


    if (!email) {

      toast(
        'Escribe tu correo electrónico.'
      );

      return;

    }


    /* =====================================================
       CONSULTAR CLIENTE
       ===================================================== */

    const {
      data: rpcClient,
      error: clientError
    } = await db.rpc(
      'consultar_cliente_por_correo',
      {
        p_correo: email
      }
    );


    if (clientError) {

      console.error(clientError);

      toast(
        'No se pudo consultar el cliente.'
      );

      return;

    }


    const client =
      Array.isArray(rpcClient)
        ? rpcClient[0]
        : rpcClient;


    if (!client) {

      toast(
        'No encontramos un cliente registrado con ese correo.'
      );

      return;

    }


    /* =====================================================
       CONSULTAR COMPRAS
       ===================================================== */

    const {
      data: purchases,
      error: purchaseError
    } = await db.rpc(
      'consultar_compras_por_correo',
      {
        p_correo: email
      }
    );


    if (purchaseError) {

      console.error(purchaseError);

      toast(
        'No se pudieron consultar las compras.'
      );

      return;

    }


    await showClientAccount(
      client,
      purchases || []
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo consultar la información.'
    );

  }

}


/* =========================================================
   REGISTRO DE CLIENTES
   ========================================================= */

const registerForm = $('#registerForm');


if (registerForm) {

  registerForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      try {

        const form =
          new FormData(event.target);


        /* ===============================================
           DATOS DEL FORMULARIO
           =============================================== */

        const identificacion =
          String(
            form.get('identificacion') || ''
          ).trim();


        const nombre =
          String(
            form.get('name') || ''
          ).trim();


        const telefono =
          String(
            form.get('phone') || ''
          ).trim();


        const email =
          String(
            form.get('email') || ''
          )
          .trim()
          .toLowerCase();


        const ciudad =
          String(
            form.get('city') || ''
          ).trim();


        const direccion =
          String(
            form.get('direccion') || ''
          ).trim();


        const fechaNacimiento =
          form.get('fecha_nacimiento') ||
          null;


        const consentimiento =
          form.get('consent') === 'on';


        /* ===============================================
           VALIDACIONES
           =============================================== */

        if (!identificacion) {

          toast(
            'Escribe tu número de identificación.'
          );

          return;

        }


        if (!nombre) {

          toast(
            'Escribe tu nombre completo.'
          );

          return;

        }


        if (!telefono) {

          toast(
            'Escribe tu teléfono.'
          );

          return;

        }


        if (!email) {

          toast(
            'Escribe tu correo electrónico.'
          );

          return;

        }


        if (!ciudad) {

          toast(
            'Escribe tu ciudad.'
          );

          return;

        }


        if (!consentimiento) {

          toast(
            'Debes aceptar recibir comunicaciones de NALYCO.'
          );

          return;

        }


        /* ===============================================
           BUSCAR CLIENTE EXISTENTE
           =============================================== */

        const {
          data: existingClients,
          error: searchError
        } = await db
          .from('clientes')
          .select('*')
          .eq('correo', email)
          .limit(1);


        if (searchError) {

          console.error(searchError);

          throw searchError;

        }


        const existingClient =
          existingClients &&
          existingClients.length
            ? existingClients[0]
            : null;


        /* ===============================================
           DATOS CRM
           =============================================== */

        const clientData = {

          identificacion,

          nombre,

          telefono,

          correo: email,

          ciudad,

          direccion,

          fecha_nacimiento:
            fechaNacimiento,

          consentimiento,

          tipo_cliente:
            existingClient?.tipo_cliente ||
            'Nuevo',

          valor_potencial_venta:
            existingClient?.valor_potencial_venta ||
            0,

          satisfaccion:
            existingClient?.satisfaccion ??
            null,

          calificacion_servicio:
            existingClient?.calificacion_servicio ??
            null,

          puntos:
            existingClient?.puntos ||
            0,

          nivel:
            existingClient?.nivel ||
            'Inicial'

        };


        let clientId;


        /* ===============================================
           ACTUALIZAR CLIENTE EXISTENTE
           =============================================== */

        if (existingClient) {


          const {
            data: updatedClient,
            error: updateError
          } = await db
            .from('clientes')
            .update(clientData)
            .eq('id', existingClient.id)
            .select()
            .single();


          if (updateError) {

            console.error(updateError);

            throw updateError;

          }


          clientId =
            updatedClient.id;


          toast(
            'Tus datos fueron actualizados correctamente.'
          );


        }

        /* ===============================================
           CREAR CLIENTE NUEVO
           =============================================== */

        else {


          const {
            data: newClient,
            error: insertError
          } = await db
            .from('clientes')
            .insert(clientData)
            .select()
            .single();


          if (insertError) {

            console.error(insertError);

            throw insertError;

          }


          clientId =
            newClient.id;


          toast(
            'Registro completado. Ya estás en el CRM de NALYCO.'
          );

        }


        console.log(
          'Cliente registrado/actualizado:',
          clientId
        );


        /* ===============================================
           LIMPIAR FORMULARIO
           =============================================== */

        event.target.reset();


        /* ===============================================
           MOSTRAR CUENTA
           =============================================== */

        setTimeout(
          () => {
            lookupByEmail(email);
          },
          500
        );


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          'No se pudo completar el registro.'
        );

      }

    }
  );

}


/* =========================================================
   CONSULTAR PUNTOS
   ========================================================= */

const loginButton = $('#loginBtn');


if (loginButton) {

  loginButton.addEventListener(
    'click',
    async () => {


      const email =
        prompt(
          'Escribe el correo registrado en NALYCO:'
        );


      if (email) {

        await lookupByEmail(email);

      }

    }
  );

}


/* =========================================================
   CERRAR SESIÓN
   ========================================================= */

const logoutButton = $('#logoutBtn');


if (logoutButton) {

  logoutButton.addEventListener(
    'click',
    async () => {

      await db.auth.signOut();


      if ($('#cuenta')) {

        $('#cuenta')
          .classList
          .add('hidden');

      }


      if ($('#adminModal')) {

        $('#adminModal')
          .classList
          .add('hidden');

      }


      location.hash = 'inicio';

    }
  );

}


/* =========================================================
   VERIFICAR ADMINISTRADOR
   ========================================================= */

async function isAdmin() {

  try {

    const user =
      await getUser();


    if (!user) {

      return false;

    }


    return (
      String(user.email || '')
        .trim()
        .toLowerCase()
      ===
      ADMIN_EMAIL
    );

  } catch (error) {

    console.error(error);

    return false;

  }

}


/* =========================================================
   ABRIR PANEL ADMIN
   ========================================================= */

async function openAdmin() {

  try {

    const admin =
      await isAdmin();


    if (!admin) {

      toast(
        'Debes iniciar sesión como administrador.'
      );

      return;

    }


    $('#adminModal')
      ?.classList
      .remove('hidden');


    $('#adminLogin')
      ?.classList
      .add('hidden');


    $('#adminPanel')
      ?.classList
      .remove('hidden');


    await renderAdmin();


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo verificar el administrador.'
    );

  }

}


/* =========================================================
   BOTÓN ADMINISTRACIÓN
   ========================================================= */

const adminButton = $('#adminBtn');


if (adminButton) {

  adminButton.addEventListener(
    'click',
    async () => {


      const admin =
        await isAdmin();


      if (admin) {

        await openAdmin();

        return;

      }


      $('#adminModal')
        ?.classList
        .remove('hidden');


      $('#adminLogin')
        ?.classList
        .remove('hidden');


      $('#adminPanel')
        ?.classList
        .add('hidden');


      $('#adminEmail')
        ?.focus();

    }
  );

}


/* =========================================================
   LOGIN ADMINISTRADOR
   ========================================================= */

const adminLoginForm =
  $('#adminLoginForm');


if (adminLoginForm) {

  adminLoginForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const email =
        String(
          $('#adminEmail')?.value || ''
        )
        .trim()
        .toLowerCase();


      const password =
        $('#adminPassword')?.value || '';


      /* ===============================================
         VALIDAR CORREO
         =============================================== */

      if (!email) {

        toast(
          'Escribe el correo del administrador.'
        );

        return;

      }


      if (!password) {

        toast(
          'Escribe la contraseña del administrador.'
        );

        return;

      }


      if (email !== ADMIN_EMAIL) {

        toast(
          'Ese correo no tiene permisos de administrador.'
        );

        return;

      }


      try {


        const {
          data,
          error
        } =
          await db.auth.signInWithPassword({

            email,

            password

          });


        if (error) {

          console.error(error);

          toast(
            'No se pudo iniciar sesión: ' +
            error.message
          );

          return;

        }


        const authenticatedEmail =
          String(
            data?.user?.email || ''
          )
          .trim()
          .toLowerCase();


        if (
          authenticatedEmail !==
          ADMIN_EMAIL
        ) {

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


      } catch (error) {

        console.error(error);

        toast(
          'Ocurrió un error al iniciar sesión.'
        );

      }

    }
  );

}


/* =========================================================
   CERRAR MODAL ADMIN
   ========================================================= */

const closeAdmin =
  $('#closeAdmin');


if (closeAdmin) {

  closeAdmin.addEventListener(
    'click',
    () => {

      $('#adminModal')
        ?.classList
        .add('hidden');

    }
  );

}


/* =========================================================
   CARGAR PANEL CRM
   ========================================================= */

async function renderAdmin() {

  try {


    const admin =
      await isAdmin();


    if (!admin) {

      toast(
        'Acceso no autorizado.'
      );

      return;

    }


    /* ===============================================
       CLIENTES
       =============================================== */

    const {
      data: clients,
      error: clientError
    } = await db
      .from('clientes')
      .select('*')
      .order('nombre');


    if (clientError) {

      throw clientError;

    }


    /* ===============================================
       COMPRAS
       =============================================== */

    const {
      data: purchases,
      error: purchaseError
    } = await db
      .from('compras')
      .select('*')
      .order(
        'fecha_compra',
        {
          ascending: false
        }
      );


    if (purchaseError) {

      throw purchaseError;

    }


    /* ===============================================
       CONTADORES
       =============================================== */

    const purchaseCount = {};


    const purchaseValue = {};


    (purchases || [])
      .forEach(purchase => {


        const id =
          purchase.cliente_id;


        purchaseCount[id] =
          (purchaseCount[id] || 0) + 1;


        purchaseValue[id] =
          (purchaseValue[id] || 0) +
          Number(
            purchase.valor || 0
          );

      });


    /* ===============================================
       ESTADÍSTICAS GENERALES
       =============================================== */

    const totalClients =
      clients?.length || 0;


    const totalPoints =
      (clients || [])
        .reduce(
          (total, client) =>
            total +
            Number(client.puntos || 0),
          0
        );


    const totalPurchases =
      purchases?.length || 0;


    const totalSales =
      (purchases || [])
        .reduce(
          (total, purchase) =>
            total +
            Number(purchase.valor || 0),
          0
        );


    const averageSatisfaction =
      (clients || [])
        .filter(
          client =>
            client.satisfaccion !== null &&
            client.satisfaccion !== undefined
        )
        .reduce(
          (total, client) =>
            total +
            Number(client.satisfaccion || 0),
          0
        );


    const satisfactionClients =
      (clients || [])
        .filter(
          client =>
            client.satisfaccion !== null &&
            client.satisfaccion !== undefined
        )
        .length;


    const satisfactionAverage =
      satisfactionClients > 0
        ? (
            averageSatisfaction /
            satisfactionClients
          ).toFixed(1)
        : '—';


    /* ===============================================
       MOSTRAR ESTADÍSTICAS
       =============================================== */

    if ($('#adminStats')) {

      $('#adminStats').innerHTML = `

        <div>

          <span>
            Clientes
          </span>

          <strong>
            ${totalClients}
          </strong>

        </div>


        <div>

          <span>
            Puntos emitidos
          </span>

          <strong>
            ${totalPoints}
          </strong>

        </div>


        <div>

          <span>
            Compras
          </span>

          <strong>
            ${totalPurchases}
          </strong>

        </div>


        <div>

          <span>
            Ventas
          </span>

          <strong>
            $${totalSales.toLocaleString('es-CO')}
          </strong>

        </div>


        <div>

          <span>
            Satisfacción
          </span>

          <strong>
            ${satisfactionAverage}
          </strong>

        </div>

      `;

    }


    /* ===============================================
       TABLA CRM
       =============================================== */

    if ($('#clientsTable')) {


      $('#clientsTable').innerHTML =

        (clients || [])
          .map(client => `

            <tr>

              <td>

                ${escapeHTML(
                  client.identificacion || '—'
                )}

              </td>


              <td>

                <b>
                  ${escapeHTML(
                    client.nombre || ''
                  )}
                </b>

                <br>

                <small>
                  ${escapeHTML(
                    client.correo || ''
                  )}
                </small>

              </td>


              <td>

                ${escapeHTML(
                  client.telefono || '—'
                )}

              </td>


              <td>

                ${escapeHTML(
                  client.correo || '—'
                )}

              </td>


              <td>

                ${escapeHTML(
                  client.ciudad || '—'
                )}

              </td>


              <td>

                ${purchaseCount[client.id] || 0}

              </td>


              <td>

                ${Number(
                  client.puntos || 0
                )}

              </td>


              <td>

                ${escapeHTML(
                  client.nivel ||
                  level(client.puntos || 0)
                )}

              </td>


              <td>

                ${escapeHTML(
                  client.tipo_cliente ||
                  'Nuevo'
                )}

              </td>


              <td>

                <button
                  class="ghost"
                  onclick="addPoints(${client.id})"
                >
                  +100 pts
                </button>


                <button
                  class="ghost"
                  onclick="deleteClient(${client.id})"
                >
                  Eliminar
                </button>

              </td>

            </tr>

          `)
          .join('')

        ||

        `

          <tr>

            <td colspan="10">

              No hay clientes registrados.

            </td>

          </tr>

        `;

    }


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo cargar el panel. Revisa las políticas de Supabase.'
    );

  }

}


/* =========================================================
   AGREGAR 100 PUNTOS
   ========================================================= */

window.addPoints = async function(id) {

  try {


    const admin =
      await isAdmin();


    if (!admin) {

      toast(
        'No tienes permisos de administrador.'
      );

      return;

    }


    /* ===============================================
       OBTENER CLIENTE
       =============================================== */

    const {
      data: client,
      error
    } = await db
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();


    if (error) {

      throw error;

    }


    const currentPoints =
      Number(client.puntos || 0);


    const newPoints =
      currentPoints + 100;


    const newLevel =
      level(newPoints);


    /* ===============================================
       ACTUALIZAR CLIENTE
       =============================================== */

    const {
      error: updateError
    } = await db
      .from('clientes')
      .update({

        puntos: newPoints,

        nivel: newLevel,

        tipo_cliente:
          currentPoints > 0
            ? 'Recurrente'
            : (
                client.tipo_cliente ||
                'Nuevo'
              )

      })
      .eq('id', id);


    if (updateError) {

      throw updateError;

    }


    /* ===============================================
       REGISTRAR MOVIMIENTO EN COMPRAS
       =============================================== */

    const {
      error: purchaseError
    } = await db
      .from('compras')
      .insert({

        cliente_id: id,

        producto:
          'Ajuste de fidelización',

        cantidad: 1,

        valor: 0,

        fecha_compra:
          new Date()
            .toISOString()
            .slice(0, 10),

        estado_venta:
          'Completada',

        responsable:
          ADMIN_EMAIL,

        canal_compra:
          'Página web'

      });


    if (purchaseError) {

      throw purchaseError;

    }


    await renderAdmin();


    toast(
      `Se agregaron 100 puntos a ${client.nombre}.`
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudieron agregar los puntos.'
    );

  }

};


/* =========================================================
   ELIMINAR CLIENTE
   ========================================================= */

window.deleteClient = async function(id) {

  if (
    !confirm(
      '¿Eliminar este cliente y todas sus compras?'
    )
  ) {

    return;

  }


  try {


    const admin =
      await isAdmin();


    if (!admin) {

      toast(
        'No tienes permisos de administrador.'
      );

      return;

    }


    /* ===============================================
       ELIMINAR COMPRAS DEL CLIENTE
       =============================================== */

    const {
      error: purchaseError
    } = await db
      .from('compras')
      .delete()
      .eq('cliente_id', id);


    if (purchaseError) {

      throw purchaseError;

    }


    /* ===============================================
       ELIMINAR CLIENTE
       =============================================== */

    const {
      error: clientError
    } = await db
      .from('clientes')
      .delete()
      .eq('id', id);


    if (clientError) {

      throw clientError;

    }


    await renderAdmin();


    toast(
      'Cliente eliminado correctamente.'
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo eliminar el cliente.'
    );

  }

};


/* =========================================================
   EXPORTAR CRM
   ========================================================= */

const exportButton =
  $('#exportBtn');


if (exportButton) {

  exportButton.addEventListener(
    'click',
    async () => {


      try {


        const admin =
          await isAdmin();


        if (!admin) {

          toast(
            'No tienes permisos para exportar el CRM.'
          );

          return;

        }


        /* =============================================
           CLIENTES
           ============================================= */

        const {
          data: clients,
          error: clientError
        } = await db
          .from('clientes')
          .select('*')
          .order('nombre');


        if (clientError) {

          throw clientError;

        }


        /* =============================================
           COMPRAS
           ============================================= */

        const {
          data: purchases,
          error: purchaseError
        } = await db
          .from('compras')
          .select('*')
          .order(
            'fecha_compra',
            {
              ascending: false
            }
          );


        if (purchaseError) {

          throw purchaseError;

        }


        /* =============================================
           AGRUPAR COMPRAS
           ============================================= */

        const purchasesByClient = {};


        (purchases || [])
          .forEach(purchase => {


            const clientId =
              purchase.cliente_id;


            if (
              !purchasesByClient[clientId]
            ) {

              purchasesByClient[clientId] = [];

            }


            purchasesByClient[clientId]
              .push(purchase);

          });


        /* =============================================
           ENCABEZADOS CRM
           ============================================= */

        const rows = [

          [

            'ID',

            'Identificación',

            'Nombre y apellidos',

            'Teléfono',

            'Correo',

            'Ciudad',

            'Dirección',

            'Fecha de nacimiento',

            'Estado de venta',

            'Fecha de compra',

            'Satisfacción',

            'Calificación del servicio',

            'Cantidad',

            'Tipo de cliente',

            'Valor potencial de venta',

            'Responsable',

            'Canal de compra',

            'Puntos',

            'Nivel'

          ]

        ];


        /* =============================================
           CREAR FILAS
           ============================================= */

        (clients || [])
          .forEach(client => {


            const clientPurchases =
              purchasesByClient[client.id] ||
              [];


            /* =========================================
               CLIENTE SIN COMPRAS
               ========================================= */

            if (
              clientPurchases.length === 0
            ) {


              rows.push([

                client.id,

                client.identificacion || '',

                client.nombre || '',

                client.telefono || '',

                client.correo || '',

                client.ciudad || '',

                client.direccion || '',

                client.fecha_nacimiento || '',

                '',

                '',

                client.satisfaccion ?? '',

                client.calificacion_servicio ?? '',

                '',

                client.tipo_cliente || 'Nuevo',

                client.valor_potencial_venta || 0,

                '',

                '',

                client.puntos || 0,

                client.nivel ||
                  level(client.puntos || 0)

              ]);

            }


            /* =========================================
               CLIENTE CON COMPRAS
               ========================================= */

            else {


              clientPurchases
                .forEach(purchase => {


                  rows.push([

                    client.id,

                    client.identificacion || '',

                    client.nombre || '',

                    client.telefono || '',

                    client.correo || '',

                    client.ciudad || '',

                    client.direccion || '',

                    client.fecha_nacimiento || '',

                    purchase.estado_venta || '',

                    purchase.fecha_compra || '',

                    client.satisfaccion ?? '',

                    client.calificacion_servicio ?? '',

                    purchase.cantidad || '',

                    client.tipo_cliente || 'Nuevo',

                    client.valor_potencial_venta || 0,

                    purchase.responsable || '',

                    purchase.canal_compra || '',

                    client.puntos || 0,

                    client.nivel ||
                      level(client.puntos || 0)

                  ]);

                });

            }

          });


        /* =============================================
           CREAR CSV
           ============================================= */

        const csv =
          rows
            .map(row =>

              row
                .map(value =>
                  `"${String(
                    value ?? ''
                  ).replaceAll(
                    '"',
                    '""'
                  )}"`
                )
                .join(',')

            )
            .join('\n');


        /* =============================================
           BOM PARA EXCEL
           ============================================= */

        const blob =
          new Blob(
            [
              '\uFEFF',
              csv
            ],
            {
              type:
                'text/csv;charset=utf-8;'
            }
          );


        const url =
          URL.createObjectURL(blob);


        const link =
          document.createElement('a');


        link.href = url;


        link.download =
          'NALYCO_CRM.csv';


        document.body.appendChild(link);


        link.click();


        link.remove();


        URL.revokeObjectURL(url);


        toast(
          'CRM exportado correctamente.'
        );


      } catch (error) {

        console.error(error);

        toast(
          'No se pudo exportar el CRM.'
        );

      }

    }
  );

}


/* =========================================================
   INICIO DE LA APLICACIÓN
   ========================================================= */

renderBenefits();


/* =========================================================
   COMPROBAR SESIÓN ADMINISTRADOR
   ========================================================= */

(async function init() {

  try {


    const {
      data: { session }
    } =
      await db.auth.getSession();


    if (
      session &&
      String(
        session.user?.email || ''
      )
      .trim()
      .toLowerCase()
      ===
      ADMIN_EMAIL
    ) {

      await openAdmin();

    }


  } catch (error) {

    console.error(
      'Error al iniciar aplicación:',
      error
    );

  }

})();
