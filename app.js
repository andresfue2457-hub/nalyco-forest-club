/* =========================================================
   NALYCO FOREST CLUB
   CRM + SUPABASE
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);


/* =========================================================
   ADMINISTRADOR
   ========================================================= */

const ADMIN_EMAIL =
  'andresfue2457@gmail.com';


/* =========================================================
   BENEFICIOS
   ========================================================= */

const benefits = [

  {
    p: 200,
    t: '5% de descuento'
  },

  {
    p: 400,
    t: '10% de descuento'
  },

  {
    p: 600,
    t: 'Envío gratis'
  },

  {
    p: 800,
    t: '15% de descuento'
  },

  {
    p: 1000,
    t: 'Beneficio especial'
  }

];


/* =========================================================
   UTILIDADES
   ========================================================= */

const $ = selector =>
  document.querySelector(selector);


function escapeHTML(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


function money(value) {

  return Number(value || 0)
    .toLocaleString('es-CO');

}


function toast(message) {

  const element =
    $('#toast');

  if (!element) return;

  element.textContent =
    message;

  element.classList.add('show');

  setTimeout(() => {

    element.classList.remove('show');

  }, 3000);

}


function openModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {

    modal.classList.remove('hidden');

  }

}


function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {

    modal.classList.add('hidden');

  }

}


/* =========================================================
   NIVEL DEL CLIENTE
   ========================================================= */

function level(points) {

  points =
    Number(points || 0);


  if (points >= 1000) {

    return 'Platinum';

  }


  if (points >= 800) {

    return 'Gold';

  }


  if (points >= 600) {

    return 'Silver';

  }


  if (points >= 400) {

    return 'Bronze';

  }


  return 'Inicial';

}


/* =========================================================
   BENEFICIOS
   ========================================================= */

function renderBenefits() {

  const container =
    $('#benefitGrid');

  if (!container) return;


  container.innerHTML =
    benefits.map(benefit => `

      <article class="benefit">

        <div class="points">
          ${benefit.p} pts
        </div>

        <h3>
          ${escapeHTML(benefit.t)}
        </h3>

        <p>
          Beneficio exclusivo
          de NALYCO Forest Club.
        </p>

      </article>

    `).join('');

}


/* =========================================================
   USUARIO ACTUAL
   ========================================================= */

async function getUser() {

  const {
    data,
    error
  } = await db.auth.getUser();


  if (error) {

    console.error(error);

    return null;

  }


  return data.user;

}


/* =========================================================
   VERIFICAR ADMIN
   ========================================================= */

async function isAdmin() {

  const user =
    await getUser();


  if (!user) {

    return false;

  }


  return (
    (user.email || '')
      .trim()
      .toLowerCase()
    ===
    ADMIN_EMAIL.toLowerCase()
  );

}


/* =========================================================
   CONSULTAR CLIENTE POR CORREO
   ========================================================= */

async function lookupByEmail(email) {

  try {

    email =
      (email || '')
        .trim()
        .toLowerCase();


    if (!email) {

      toast(
        'Escribe tu correo electrónico.'
      );

      return;

    }


    const {
      data: client,
      error: clientError
    } = await db
      .from('clientes')
      .select('*')
      .eq('correo', email)
      .maybeSingle();


    if (clientError) {

      throw clientError;

    }


    if (!client) {

      toast(
        'No encontramos un cliente registrado con ese correo.'
      );

      return;

    }


    const {
      data: purchases,
      error: purchasesError
    } = await db
      .from('compras')
      .select('*')
      .eq(
        'cliente_id',
        client.id
      )
      .order(
        'fecha_compra',
        {
          ascending: false
        }
      );


    if (purchasesError) {

      throw purchasesError;

    }


    $('#cuenta')
      .classList
      .remove('hidden');


    $('#accountName')
      .textContent =
      client.nombre ||
      'Cliente';


    $('#accountCode')
      .textContent =
      `Código: NALYCO-${String(
        client.id
      ).padStart(3, '0')}`;


    $('#accountPoints')
      .textContent =
      client.puntos || 0;


    $('#accountLevel')
      .textContent =
      client.nivel ||
      level(client.puntos);


    const next =
      benefits.find(
        benefit =>
          Number(client.puntos || 0)
          <
          benefit.p
      )
      ||
      benefits.at(-1);


    $('#nextBenefit')
      .textContent =
      next.t;


    const index =
      benefits.indexOf(next);


    const previous =
      benefits[index - 1]?.p ||
      0;


    const progress =
      next.p > previous

        ?

        Math.min(
          100,
          Math.max(
            0,
            (
              (
                Number(client.puntos || 0)
                -
                previous
              )
              /
              (
                next.p -
                previous
              )
            ) * 100
          )
        )

        :

        100;


    $('#progressBar')
      .style
      .width =
      progress + '%';


    $('#progressText')
      .textContent =
      Number(client.puntos || 0) >= 1000

        ?

        '¡Tienes el nivel máximo!'

        :

        `Te faltan ${
          Math.max(
            0,
            next.p -
            Number(client.puntos || 0)
          )
        } puntos para ${
          next.t
        }.`;


    $('#purchaseHistory')
      .innerHTML =

      (purchases || [])
        .map(purchase => `

          <div
            style="
              padding:12px 0;
              border-bottom:1px solid #eee;
            ">

            <b>
              ${escapeHTML(
                purchase.producto ||
                'Compra'
              )}
            </b>

            ·

            ${escapeHTML(
              purchase.fecha_compra ||
              ''
            )}

            ·

            $${money(
              purchase.valor
            )}

            ·

            ${purchase.cantidad || 1}
            unidad(es)

            ·

            ${escapeHTML(
              purchase.estado_venta ||
              'Pendiente'
            )}

          </div>

        `)
        .join('')

      ||

      '<p>No hay compras registradas.</p>';


    location.hash =
      'cuenta';


  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      'No se pudo consultar la información.'
    );

  }

}


/* =========================================================
   REGISTRO DEL CLIENTE
   ========================================================= */

$('#registerForm')
  ?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      try {

        const form =
          new FormData(
            event.target
          );


        const email =
          form.get('email')
            .trim()
            .toLowerCase();


        const {
          data: existing,
          error: searchError
        } = await db
          .from('clientes')
          .select('id')
          .eq('correo', email)
          .limit(1);


        if (searchError) {

          throw searchError;

        }


        const payload = {

          identificacion:
            form.get(
              'identificacion'
            ).trim(),

          nombre:
            form.get(
              'name'
            ).trim(),

          telefono:
            form.get(
              'phone'
            ).trim(),

          correo:
            email,

          ciudad:
            form.get(
              'city'
            ).trim(),

          direccion:
            form.get(
              'direccion'
            )?.trim() ||
            null,

          fecha_nacimiento:
            form.get(
              'fecha_nacimiento'
            ) ||
            null,

          consentimiento:
            form.get('consent')
            === 'on'

        };


        let error;


        if (existing?.length) {

          ({
            error
          } = await db
            .from('clientes')
            .update(payload)
            .eq(
              'id',
              existing[0].id
            ));

        }

        else {

          payload.puntos =
            0;

          payload.nivel =
            'Inicial';

          payload.tipo_cliente =
            'Nuevo';

          payload.valor_potencial_venta =
            0;


          ({
            error
          } = await db
            .from('clientes')
            .insert(
              payload
            ));

        }


        if (error) {

          throw error;

        }


        event.target.reset();


        toast(
          'Cliente guardado correctamente.'
        );


        setTimeout(
          () => lookupByEmail(email),
          400
        );


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          'No se pudo registrar el cliente.'
        );

      }

    }
  );


/* =========================================================
   CONSULTAR PUNTOS
   ========================================================= */

$('#loginBtn')
  ?.addEventListener(
    'click',
    () => {

      const email =
        prompt(
          'Escribe el correo registrado en NALYCO:'
        );


      if (email) {

        lookupByEmail(email);

      }

    }
  );


/* =========================================================
   CERRAR CUENTA
   ========================================================= */

$('#logoutBtn')
  ?.addEventListener(
    'click',
    async () => {

      await db.auth.signOut();

      $('#cuenta')
        .classList
        .add('hidden');

      $('#adminModal')
        ?.classList
        .add('hidden');

      location.hash =
        'inicio';

    }
  );


/* =========================================================
   ABRIR ADMIN
   ========================================================= */

async function openAdmin() {

  const admin =
    await isAdmin();


  if (!admin) {

    toast(
      'Acceso no autorizado.'
    );

    return;

  }


  $('#adminModal')
    .classList
    .remove('hidden');


  $('#adminLogin')
    .classList
    .add('hidden');


  $('#adminPanel')
    .classList
    .remove('hidden');


  await renderAdmin();

}


/* =========================================================
   BOTÓN ADMIN
   ========================================================= */

$('#adminBtn')
  ?.addEventListener(
    'click',
    async () => {

      if (await isAdmin()) {

        await openAdmin();

        return;

      }


      $('#adminModal')
        .classList
        .remove('hidden');


      $('#adminLogin')
        .classList
        .remove('hidden');


      $('#adminPanel')
        .classList
        .add('hidden');


      $('#adminEmail')
        ?.focus();

    }
  );


/* =========================================================
   CERRAR ADMIN
   ========================================================= */

$('#closeAdmin')
  ?.addEventListener(
    'click',
    () => {

      closeModal(
        'adminModal'
      );

    }
  );


/* =========================================================
   LOGIN ADMIN
   ========================================================= */

$('#adminLoginForm')
  ?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const email =
        $('#adminEmail')
          .value
          .trim()
          .toLowerCase();


      const password =
        $('#adminPassword')
          .value;


      if (
        email !==
        ADMIN_EMAIL.toLowerCase()
      ) {

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

          throw error;

        }


        if (
          (data.user?.email || '')
            .toLowerCase()
          !==
          ADMIN_EMAIL.toLowerCase()
        ) {

          await db.auth.signOut();

          toast(
            'Cuenta no autorizada.'
          );

          return;

        }


        await openAdmin();


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          'No se pudo iniciar sesión.'
        );

      }

    }
  );


/* =========================================================
   CARGAR CRM
   ========================================================= */

async function renderAdmin() {

  try {

    if (!(await isAdmin())) {

      return;

    }


    /* CLIENTES */

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


    /* VENTAS */

    const {
      data: sales,
      error: salesError
    } = await db
      .from('compras')
      .select('*')
      .order(
        'fecha_compra',
        {
          ascending: false
        }
      );


    if (salesError) {

      throw salesError;

    }


    /* AGRUPAR */

    const purchaseCount = {};
    const purchaseValue = {};


    (sales || [])
      .forEach(sale => {

        const id =
          sale.cliente_id;


        purchaseCount[id] =
          (
            purchaseCount[id] ||
            0
          ) + 1;


        purchaseValue[id] =
          (
            purchaseValue[id] ||
            0
          ) +
          Number(
            sale.valor || 0
          );

      });


    /* ESTADÍSTICAS */

    const totalClients =
      clients?.length ||
      0;


    const totalPurchases =
      sales?.length ||
      0;


    const totalSales =
      (sales || [])
        .reduce(
          (total, sale) =>
            total +
            Number(
              sale.valor || 0
            ),
          0
        );


    const totalPoints =
      (clients || [])
        .reduce(
          (total, client) =>
            total +
            Number(
              client.puntos || 0
            ),
          0
        );


    const satisfactionValues =
      (clients || [])
        .filter(
          client =>
            client.satisfaccion !== null &&
            client.satisfaccion !== undefined
        )
        .map(
          client =>
            Number(
              client.satisfaccion
            )
        );


    const averageSatisfaction =
      satisfactionValues.length

        ?

        (
          satisfactionValues.reduce(
            (a,b) => a + b,
            0
          )
          /
          satisfactionValues.length
        ).toFixed(1)

        :

        '—';


    /* ESTADÍSTICAS HTML */

    if ($('#adminStats')) {

      $('#adminStats')
        .innerHTML = `

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
              Ventas
            </span>

            <strong>
              $${money(totalSales)}
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
              Puntos
            </span>

            <strong>
              ${totalPoints}
            </strong>

          </div>


          <div>

            <span>
              Satisfacción
            </span>

            <strong>
              ${averageSatisfaction}
            </strong>

          </div>

        `;

    }


    /* TABLA CLIENTES */

    $('#clientsTable')
      .innerHTML =

      (clients || [])
        .map(client => `

          <tr>

            <td>
              ${escapeHTML(
                client.identificacion ||
                '—'
              )}
            </td>


            <td>

              <strong>
                ${escapeHTML(
                  client.nombre ||
                  ''
                )}
              </strong>

              <br>

              <small>
                ${escapeHTML(
                  client.correo ||
                  ''
                )}
              </small>

            </td>


            <td>
              ${escapeHTML(
                client.telefono ||
                '—'
              )}
            </td>


            <td>
              ${escapeHTML(
                client.ciudad ||
                '—'
              )}
            </td>


            <td>
              ${purchaseCount[
                client.id
              ] || 0}
            </td>


            <td>
              $${money(
                purchaseValue[
                  client.id
                ]
              )}
            </td>


            <td>
              ${Number(
                client.puntos || 0
              )}
            </td>


            <td>
              ${escapeHTML(
                client.nivel ||
                level(
                  client.puntos
                )
              )}
            </td>


            <td>
              ${escapeHTML(
                client.tipo_cliente ||
                'Nuevo'
              )}
            </td>


            <td>

              <div class="crm-actions">

                <button
                  class="ghost"
                  onclick="editClient(${client.id})">

                  ✏️ Editar

                </button>


                <button
                  class="ghost"
                  onclick="newSale(${client.id})">

                  🛒 Venta

                </button>


                <button
                  class="ghost"
                  onclick="viewClientSales(${client.id})">

                  📋 Ventas

                </button>

              </div>

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


    /* NOMBRES */

    const names = {};


    (clients || [])
      .forEach(client => {

        names[
          client.id
        ] =
          client.nombre;

      });


    /* TABLA VENTAS */

    $('#salesTable')
      .innerHTML =

      (sales || [])
        .map(sale => `

          <tr>

            <td>
              ${escapeHTML(
                names[
                  sale.cliente_id
                ] ||
                'Cliente'
              )}
            </td>


            <td>
              ${escapeHTML(
                sale.producto ||
                ''
              )}
            </td>


            <td>
              ${sale.cantidad || 1}
            </td>


            <td>
              $${money(
                sale.valor
              )}
            </td>


            <td>
              ${escapeHTML(
                sale.fecha_compra ||
                ''
              )}
            </td>


            <td>

              <select
                class="status-select"
                onchange="changeSaleStatus(${sale.id}, this.value)">

                ${
                  [
                    'Pendiente',
                    'Confirmada',
                    'En proceso',
                    'Enviada',
                    'Entregada',
                    'Cancelada'
                  ]
                  .map(status => `

                    <option
                      value="${status}"
                      ${
                        status ===
                        (
                          sale.estado_venta ||
                          'Pendiente'
                        )
                          ? 'selected'
                          : ''
                      }>

                      ${status}

                    </option>

                  `)
                  .join('')
                }

              </select>

            </td>


            <td>
              ${escapeHTML(
                sale.canal_compra ||
                '—'
              )}
            </td>


            <td>
              ${escapeHTML(
                sale.responsable ||
                '—'
              )}
            </td>

          </tr>

        `)
        .join('')

      ||

      `

        <tr>

          <td colspan="8">
            No hay ventas registradas.
          </td>

        </tr>

      `;


  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      'No se pudo cargar el CRM.'
    );

  }

}


/* =========================================================
   EDITAR CLIENTE
   ========================================================= */

window.editClient =
async function(id) {

  try {

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


    const form =
      $('#editClientForm');


    form.elements.id.value =
      client.id;


    form.elements.identificacion.value =
      client.identificacion ||
      '';


    form.elements.nombre.value =
      client.nombre ||
      '';


    form.elements.telefono.value =
      client.telefono ||
      '';


    form.elements.correo.value =
      client.correo ||
      '';


    form.elements.ciudad.value =
      client.ciudad ||
      '';


    form.elements.direccion.value =
      client.direccion ||
      '';


    form.elements.fecha_nacimiento.value =
      client.fecha_nacimiento ||
      '';


    form.elements.tipo_cliente.value =
      client.tipo_cliente ||
      'Nuevo';


    form.elements.valor_potencial_venta.value =
      client.valor_potencial_venta ||
      0;


    openModal(
      'editModal'
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo cargar el cliente.'
    );

  }

};


/* =========================================================
   GUARDAR CLIENTE EDITADO
   ========================================================= */

$('#editClientForm')
  ?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      try {

        const form =
          new FormData(
            event.target
          );


        const id =
          form.get('id');


        const update = {

          identificacion:
            form.get(
              'identificacion'
            ).trim(),

          nombre:
            form.get(
              'nombre'
            ).trim(),

          telefono:
            form.get(
              'telefono'
            ).trim(),

          correo:
            form.get(
              'correo'
            ).trim()
            .toLowerCase(),

          ciudad:
            form.get(
              'ciudad'
            ).trim(),

          direccion:
            form.get(
              'direccion'
            ).trim() ||
            null,

          fecha_nacimiento:
            form.get(
              'fecha_nacimiento'
            ) ||
            null,

          tipo_cliente:
            form.get(
              'tipo_cliente'
            ),

          valor_potencial_venta:
            Number(
              form.get(
                'valor_potencial_venta'
              ) || 0
            )

        };


        const {
          error
        } = await db
          .from('clientes')
          .update(update)
          .eq(
            'id',
            id
          );


        if (error) {

          throw error;

        }


        closeModal(
          'editModal'
        );


        toast(
          'Cliente actualizado correctamente.'
        );


        await renderAdmin();


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          'No se pudo actualizar el cliente.'
        );

      }

    }
  );


/* =========================================================
   ABRIR REGISTRO DE VENTA
   ========================================================= */

window.newSale =
async function(id) {

  try {

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


    const form =
      $('#saleForm');


    form.reset();


    form.elements.cliente_id.value =
      id;


    form.elements.fecha_compra.value =
      new Date()
        .toISOString()
        .slice(0,10);


    form.elements.responsable.value =
      ADMIN_EMAIL;


    $('#saleClientName')
      .textContent =
      `Cliente: ${client.nombre}`;


    openModal(
      'saleModal'
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudo abrir el formulario de venta.'
    );

  }

};


/* =========================================================
   GUARDAR VENTA
   ========================================================= */

$('#saleForm')
  ?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      try {

        const form =
          new FormData(
            event.target
          );


        const clientId =
          Number(
            form.get(
              'cliente_id'
            )
          );


        const quantity =
          Number(
            form.get(
              'cantidad'
            )
          );


        const value =
          Number(
            form.get(
              'valor'
            )
          );


        if (
          !clientId ||
          quantity < 1 ||
          value < 0
        ) {

          toast(
            'Revisa la cantidad y el valor.'
          );

          return;

        }


        const {
          data: client,
          error: clientError
        } = await db
          .from('clientes')
          .select('*')
          .eq(
            'id',
            clientId
          )
          .single();


        if (clientError) {

          throw clientError;

        }


        /* INSERTAR VENTA */

        const {
          error: saleError
        } = await db
          .from('compras')
          .insert({

            cliente_id:
              clientId,

            producto:
              form.get(
                'producto'
              ).trim(),

            cantidad:
              quantity,

            valor:
              value,

            fecha_compra:
              form.get(
                'fecha_compra'
              ),

            estado_venta:
              form.get(
                'estado_venta'
              ),

            responsable:
              form.get(
                'responsable'
              ).trim(),

            canal_compra:
              form.get(
                'canal_compra'
              )

          });


        if (saleError) {

          throw saleError;

        }


        /* AGREGAR PUNTOS */

        const newPoints =
          Number(
            client.puntos || 0
          ) + 100;


        const newLevel =
          level(
            newPoints
          );


        const newPotential =
          Math.max(
            Number(
              client.valor_potencial_venta ||
              0
            ),
            value
          );


        const {
          error: updateError
        } = await db
          .from('clientes')
          .update({

            puntos:
              newPoints,

            nivel:
              newLevel,

            tipo_cliente:
              'Recurrente',

            valor_potencial_venta:
              newPotential

          })
          .eq(
            'id',
            clientId
          );


        if (updateError) {

          throw updateError;

        }


        closeModal(
          'saleModal'
        );


        toast(
          'Venta registrada correctamente. +100 puntos.'
        );


        await renderAdmin();


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          'No se pudo registrar la venta.'
        );

      }

    }
  );


/* =========================================================
   CAMBIAR ESTADO DE VENTA
   ========================================================= */

window.changeSaleStatus =
async function(
  id,
  status
) {

  try {

    const allowed = [

      'Pendiente',

      'Confirmada',

      'En proceso',

      'Enviada',

      'Entregada',

      'Cancelada'

    ];


    if (
      !allowed.includes(
        status
      )
    ) {

      toast(
        'Estado no válido.'
      );

      return;

    }


    const {
      error
    } = await db
      .from('compras')
      .update({

        estado_venta:
          status

      })
      .eq(
        'id',
        id
      );


    if (error) {

      throw error;

    }


    toast(
      'Estado de venta actualizado.'
    );


    await renderAdmin();


  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      'No se pudo cambiar el estado.'
    );

  }

};


/* =========================================================
   VER VENTAS DEL CLIENTE
   ========================================================= */

window.viewClientSales =
async function(id) {

  try {

    const {
      data: client,
      error: clientError
    } = await db
      .from('clientes')
      .select('nombre')
      .eq(
        'id',
        id
      )
      .single();


    if (clientError) {

      throw clientError;

    }


    const {
      data: sales,
      error
    } = await db
      .from('compras')
      .select('*')
      .eq(
        'cliente_id',
        id
      )
      .order(
        'fecha_compra',
        {
          ascending: false
        }
      );


    if (error) {

      throw error;

    }


    $('#salesClientName')
      .textContent =
      `Cliente: ${client.nombre}`;


    $('#salesList')
      .innerHTML =

      (sales || [])
        .map(sale => `

          <div class="sale-card">

            <div class="sale-card-top">

              <strong>
                ${escapeHTML(
                  sale.producto ||
                  'Producto'
                )}
              </strong>

              <strong>
                $${money(
                  sale.valor
                )}
              </strong>

            </div>


            <p>

              Cantidad:
              ${sale.cantidad || 1}

              <br>

              Fecha:
              ${escapeHTML(
                sale.fecha_compra ||
                '—'
              )}

              <br>

              Estado:
              ${escapeHTML(
                sale.estado_venta ||
                'Pendiente'
              )}

              <br>

              Canal:
              ${escapeHTML(
                sale.canal_compra ||
                '—'
              )}

              <br>

              Responsable:
              ${escapeHTML(
                sale.responsable ||
                '—'
              )}

            </p>

          </div>

        `)
        .join('')

      ||

      '<p>No hay ventas registradas.</p>';


    openModal(
      'salesModal'
    );


  } catch (error) {

    console.error(error);

    toast(
      'No se pudieron consultar las ventas.'
    );

  }

};


/* =========================================================
   EXPORTAR CRM
   ========================================================= */

$('#exportBtn')
  ?.addEventListener(
    'click',
    async () => {

      try {

        const {
          data,
          error
        } = await db
          .from('clientes')
          .select('*')
          .order('nombre');


        if (error) {

          throw error;

        }


        const rows = [

          [

            'ID',

            'Identificación',

            'Nombre',

            'Teléfono',

            'Correo',

            'Ciudad',

            'Dirección',

            'Fecha nacimiento',

            'Tipo cliente',

            'Valor potencial',

            'Puntos',

            'Nivel'

          ],

          ...(data || [])
            .map(client => [

              client.id,

              client.identificacion,

              client.nombre,

              client.telefono,

              client.correo,

              client.ciudad,

              client.direccion,

              client.fecha_nacimiento,

              client.tipo_cliente,

              client.valor_potencial_venta,

              client.puntos,

              client.nivel

            ])

        ];


        const csv =
          '\uFEFF' +

          rows
            .map(
              row =>
                row
                  .map(
                    value =>
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


        const blob =
          new Blob(
            [csv],
            {
              type:
                'text/csv;charset=utf-8'
            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            'a'
          );


        link.href =
          url;


        link.download =
          'NALYCO_CRM.csv';


        link.click();


        URL.revokeObjectURL(
          url
        );


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


/* =========================================================
   CERRAR MODALES
   ========================================================= */

document
  .querySelectorAll(
    '[data-close]'
  )
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        closeModal(
          button.dataset.close
        );

      }
    );

  });


/* =========================================================
   INICIO
   ========================================================= */

renderBenefits();


(async () => {

  try {

    if (
      await isAdmin()
    ) {

      await openAdmin();

    }

  } catch (error) {

    console.error(error);

  }

})();
