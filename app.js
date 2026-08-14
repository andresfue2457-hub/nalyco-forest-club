async function renderAdmin() {

  try {

    const admin = await isAdmin();

    if (!admin) {
      toast('Acceso no autorizado.');
      return;
    }

    // =========================================
    // CLIENTES
    // =========================================

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


    // =========================================
    // COMPRAS
    // =========================================

    const {
      data: purchases,
      error: purchaseError
    } = await db
      .from('compras')
      .select('*')
      .order('fecha_compra', {
        ascending: false
      });

    if (purchaseError) {
      throw purchaseError;
    }


    // =========================================
    // AGRUPAR COMPRAS
    // =========================================

    const purchaseCount = {};
    const purchaseValue = {};

    (purchases || []).forEach(purchase => {

      const id = purchase.cliente_id;

      purchaseCount[id] =
        (purchaseCount[id] || 0) + 1;

      purchaseValue[id] =
        (purchaseValue[id] || 0) +
        Number(purchase.valor || 0);

    });


    // =========================================
    // ESTADÍSTICAS
    // =========================================

    const totalClients =
      clients?.length || 0;

    const totalPurchases =
      purchases?.length || 0;

    const totalSales =
      (purchases || []).reduce(
        (total, purchase) =>
          total + Number(purchase.valor || 0),
        0
      );

    const totalPoints =
      (clients || []).reduce(
        (total, client) =>
          total + Number(client.puntos || 0),
        0
      );


    const satisfactionValues =
      (clients || [])
        .filter(
          c =>
            c.satisfaccion !== null &&
            c.satisfaccion !== undefined
        )
        .map(c => Number(c.satisfaccion));


    const averageSatisfaction =
      satisfactionValues.length
        ? (
            satisfactionValues.reduce(
              (a, b) => a + b,
              0
            ) /
            satisfactionValues.length
          ).toFixed(1)
        : '—';


    // =========================================
    // ESTADÍSTICAS EN PANEL
    // =========================================

    if ($('#adminStats')) {

      $('#adminStats').innerHTML = `

        <div>
          <span>Clientes</span>
          <strong>${totalClients}</strong>
        </div>

        <div>
          <span>Ventas</span>
          <strong>
            $${totalSales.toLocaleString('es-CO')}
          </strong>
        </div>

        <div>
          <span>Compras</span>
          <strong>${totalPurchases}</strong>
        </div>

        <div>
          <span>Puntos</span>
          <strong>${totalPoints}</strong>
        </div>

        <div>
          <span>Satisfacción</span>
          <strong>${averageSatisfaction}</strong>
        </div>

      `;

    }


    // =========================================
    // TABLA CRM
    // =========================================

    if ($('#clientsTable')) {

      $('#clientsTable').innerHTML =

        (clients || []).map(client => {

          const clientPurchases =
            purchaseCount[client.id] || 0;

          const clientValue =
            purchaseValue[client.id] || 0;

          return `

            <tr>

              <td>
                ${escapeHTML(
                  client.identificacion || '—'
                )}
              </td>

              <td>

                <strong>
                  ${escapeHTML(
                    client.nombre || ''
                  )}
                </strong>

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
                  client.ciudad || '—'
                )}
              </td>

              <td>
                ${clientPurchases}
              </td>

              <td>
                $${clientValue.toLocaleString('es-CO')}
              </td>

              <td>
                ${Number(client.puntos || 0)}
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
                  onclick="editClient(${client.id})"
                >
                  ✏️ Editar
                </button>

                <button
                  class="ghost"
                  onclick="newSale(${client.id})"
                >
                  🛒 Venta
                </button>

                <button
                  class="ghost"
                  onclick="viewClientSales(${client.id})"
                >
                  📋 Ventas
                </button>

              </td>

            </tr>

          `;

        }).join('')

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
      'No se pudo cargar el CRM.'
    );

  }

}
