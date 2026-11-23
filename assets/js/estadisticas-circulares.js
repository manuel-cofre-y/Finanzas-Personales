(() => {
  'use strict';

  const contenedores = document.querySelectorAll('.grafico-pendiente');
  if (contenedores.length < 2) return;

  const [contenedorCategorias, contenedorTotales] = contenedores;
  const CLAVE_MOVIMIENTOS = 'ahorra_movimientos';
  const dinero = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  });

  const colores = ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#198754', '#0dcaf0'];

  function instalarEstilos() {
    if (document.getElementById('estilos-estadisticas-circulares')) return;
    const style = document.createElement('style');
    style.id = 'estilos-estadisticas-circulares';
    style.textContent = `
      .contenedor-donut {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        min-height: 300px;
      }
      .circulo-donut {
        width: 210px;
        height: 210px;
        border-radius: 50%;
        position: relative;
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,.06);
      }
      .centro-donut {
        position: absolute;
        inset: 28px;
        border-radius: 50%;
        background: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: .75rem;
        box-shadow: 0 0 0 1px rgba(0,0,0,.04);
      }
      .centro-donut small {
        color: #6c757d;
        line-height: 1.2;
      }
      .centro-donut strong {
        font-size: 1rem;
        line-height: 1.2;
      }
      .leyenda-donut {
        width: 100%;
        display: grid;
        gap: .75rem;
      }
      .item-leyenda-donut {
        display: flex;
        align-items: center;
        gap: .75rem;
        border: 1px solid rgba(0,0,0,.08);
        background: #fff;
        border-radius: .75rem;
        padding: .75rem .9rem;
      }
      .muestra-color-donut {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .texto-leyenda-donut {
        flex: 1;
        min-width: 0;
      }
      .texto-leyenda-donut strong,
      .texto-leyenda-donut small {
        display: block;
      }
      .texto-leyenda-donut small {
        color: #6c757d;
      }
      @media (min-width: 576px) {
        .leyenda-donut {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function leerMovimientos() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_MOVIMIENTOS));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function limpiarContenedor(elemento) {
    elemento.classList.remove('text-center', 'p-5');
    elemento.classList.add('p-4');
    elemento.replaceChildren();
  }

  function crearEstadoVacio(texto) {
    const p = document.createElement('p');
    p.className = 'text-secondary text-center my-5';
    p.textContent = texto;
    return p;
  }

  function crearItemLeyenda(color, nombre, valor, porcentaje) {
    const item = document.createElement('div');
    item.className = 'item-leyenda-donut';

    const muestra = document.createElement('span');
    muestra.className = 'muestra-color-donut';
    muestra.style.backgroundColor = color;

    const texto = document.createElement('div');
    texto.className = 'texto-leyenda-donut';

    const titulo = document.createElement('strong');
    titulo.textContent = nombre;

    const detalle = document.createElement('small');
    detalle.textContent = `${dinero.format(valor)} · ${porcentaje.toFixed(1).replace('.', ',')}%`;

    texto.append(titulo, detalle);
    item.append(muestra, texto);
    return item;
  }

  function crearDonut(datos, opciones) {
    const total = datos.reduce((acum, item) => acum + item.valor, 0);
    const contenedor = document.createElement('div');
    contenedor.className = 'contenedor-donut';

    const donut = document.createElement('div');
    donut.className = 'circulo-donut';

    let acumulado = 0;
    const segmentos = datos.map((item, indice) => {
      const inicio = acumulado;
      const fraccion = total > 0 ? (item.valor / total) * 100 : 0;
      acumulado += fraccion;
      return `${item.color || colores[indice % colores.length]} ${inicio}% ${acumulado}%`;
    });

    donut.style.background = total > 0
      ? `conic-gradient(${segmentos.join(', ')})`
      : '#dee2e6';

    const centro = document.createElement('div');
    centro.className = 'centro-donut';
    const subtitulo = document.createElement('small');
    subtitulo.textContent = opciones.subtitulo;
    const valorCentral = document.createElement('strong');
    valorCentral.textContent = dinero.format(total);
    centro.append(subtitulo, valorCentral);
    donut.appendChild(centro);

    const leyenda = document.createElement('div');
    leyenda.className = 'leyenda-donut';
    datos.forEach((item, indice) => {
      leyenda.appendChild(
        crearItemLeyenda(
          item.color || colores[indice % colores.length],
          item.nombre,
          item.valor,
          total > 0 ? (item.valor / total) * 100 : 0
        )
      );
    });

    contenedor.append(donut, leyenda);
    return contenedor;
  }

  function renderizarCategorias(movimientos) {
    limpiarContenedor(contenedorCategorias);
    const gastos = movimientos.filter((m) => m && m.tipo === 'gasto');
    if (gastos.length === 0) {
      contenedorCategorias.appendChild(crearEstadoVacio('Todavía no hay gastos registrados para mostrar.'));
      return;
    }

    const categorias = {};
    gastos.forEach((movimiento) => {
      const categoria = String(movimiento.categoria || 'Otros').trim() || 'Otros';
      categorias[categoria] = (categorias[categoria] || 0) + Number(movimiento.monto || 0);
    });

    const datos = Object.entries(categorias)
      .map(([nombre, valor], indice) => ({
        nombre,
        valor,
        color: colores[indice % colores.length]
      }))
      .sort((a, b) => b.valor - a.valor);

    contenedorCategorias.appendChild(
      crearDonut(datos, { subtitulo: 'Total gastos' })
    );
  }

  function renderizarTotales(movimientos) {
    limpiarContenedor(contenedorTotales);
    const ingresos = movimientos
      .filter((m) => m && m.tipo === 'ingreso')
      .reduce((total, m) => total + Number(m.monto || 0), 0);
    const gastos = movimientos
      .filter((m) => m && m.tipo === 'gasto')
      .reduce((total, m) => total + Number(m.monto || 0), 0);

    if (ingresos === 0 && gastos === 0) {
      contenedorTotales.appendChild(crearEstadoVacio('Todavía no hay movimientos registrados para comparar.'));
      return;
    }

    const datos = [
      { nombre: 'Ingresos', valor: ingresos, color: '#198754' },
      { nombre: 'Gastos', valor: gastos, color: '#dc3545' }
    ];

    contenedorTotales.appendChild(
      crearDonut(datos, { subtitulo: 'Movimientos' })
    );
  }

  function actualizar() {
    const movimientos = leerMovimientos();
    renderizarCategorias(movimientos);
    renderizarTotales(movimientos);
  }

  instalarEstilos();
  actualizar();
  window.addEventListener('storage', (evento) => {
    if ([CLAVE_MOVIMIENTOS, null].includes(evento.key)) actualizar();
  });
})();
