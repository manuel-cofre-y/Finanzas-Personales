(() => {
  'use strict';

  const formulario = document.getElementById('form-presupuesto');
  if (!formulario) return;

  const periodo = document.getElementById('periodo-presupuesto');
  const limite = document.getElementById('limite-presupuesto');
  const valorLimite = document.getElementById('presupuesto-limite-valor');
  const valorGastado = document.getElementById('presupuesto-gastado-valor');
  const valorRestante = document.getElementById('presupuesto-restante-valor');
  const progreso = document.getElementById('presupuesto-progreso');
  const barra = document.getElementById('presupuesto-barra');
  const detalle = document.getElementById('presupuesto-detalle');
  const aviso = document.getElementById('presupuesto-aviso');

  const CLAVE_PRESUPUESTOS = 'ahorra_presupuestos';
  const CLAVE_MOVIMIENTOS = 'ahorra_movimientos';
  const dinero = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0
  });

  function leerDatos(clave, valorPredeterminado) {
    try {
      return JSON.parse(localStorage.getItem(clave)) ?? valorPredeterminado;
    } catch (error) {
      return valorPredeterminado;
    }
  }

  function leerPresupuestos() {
    const datos = leerDatos(CLAVE_PRESUPUESTOS, {});
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  }

  function mesDeMovimiento(fecha) {
    const valor = String(fecha || '');
    // Los datos existentes de la aplicación se guardan con fecha AAAA-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor.slice(0, 7);
    // También admite registros anteriores en formato DD/MM/AAAA.
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      return `${valor.slice(6, 10)}-${valor.slice(3, 5)}`;
    }
    return '';
  }

  function gastosDelMes(mes) {
    const movimientos = leerDatos(CLAVE_MOVIMIENTOS, []);
    if (!Array.isArray(movimientos)) return 0;
    return movimientos.reduce((total, movimiento) => {
      if (!movimiento || movimiento.tipo !== 'gasto' || mesDeMovimiento(movimiento.fecha) !== mes) {
        return total;
      }
      const monto = Number(movimiento.monto);
      return total + (Number.isFinite(monto) && monto > 0 ? monto : 0);
    }, 0);
  }

  function actualizar() {
    const mes = periodo.value;
    if (!/^\d{4}-\d{2}$/.test(mes)) return;

    const presupuestos = leerPresupuestos();
    const guardado = Number(presupuestos[mes]);
    const tieneLimite = Object.prototype.hasOwnProperty.call(presupuestos, mes) &&
      Number.isFinite(guardado) && guardado > 0;
    const gastado = gastosDelMes(mes);

    // Al cambiar de mes, se recupera el presupuesto que fue guardado para ese mes.
    limite.value = tieneLimite ? String(guardado) : '';
    valorLimite.textContent = tieneLimite ? dinero.format(guardado) : 'Sin definir';
    valorGastado.textContent = dinero.format(gastado);
    valorRestante.textContent = tieneLimite ? dinero.format(guardado - gastado) : '—';

    const porcentaje = tieneLimite ? (gastado / guardado) * 100 : 0;
    progreso.style.width = `${Math.min(100, porcentaje)}%`;
    barra.setAttribute('aria-valuenow', String(Math.min(100, Math.round(porcentaje))));
    progreso.classList.toggle('bg-danger', tieneLimite && gastado > guardado);
    progreso.classList.toggle('bg-primary', !tieneLimite || gastado <= guardado);

    detalle.textContent = !tieneLimite
      ? 'Aún no hay un límite de gastos para este mes.'
      : `Has utilizado ${porcentaje.toFixed(1).replace('.', ',')}% de tu presupuesto mensual.`;
    aviso.textContent = '';
  }

  // Seleccionar por defecto el mes actual según la fecha local del dispositivo.
  const hoy = new Date();
  periodo.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  periodo.addEventListener('change', actualizar);

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const mes = periodo.value;
    const cantidad = Number(limite.value);

    if (!/^\d{4}-\d{2}$/.test(mes) || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
      aviso.textContent = 'Ingresa un mes y un límite válido, mayor a cero y sin decimales.';
      aviso.className = 'small mt-2 mb-0 text-danger';
      return;
    }

    const presupuestos = leerPresupuestos();
    presupuestos[mes] = cantidad;
    try {
      localStorage.setItem(CLAVE_PRESUPUESTOS, JSON.stringify(presupuestos));
      actualizar();
      aviso.textContent = 'Presupuesto guardado correctamente.';
      aviso.className = 'small mt-2 mb-0 text-success';
    } catch (error) {
      aviso.textContent = 'No fue posible guardar el presupuesto en este navegador.';
      aviso.className = 'small mt-2 mb-0 text-danger';
    }
  });

  // Sincroniza el resumen si se modifica el presupuesto o los gastos en otra pestaña.
  window.addEventListener('storage', (evento) => {
    if ([CLAVE_PRESUPUESTOS, CLAVE_MOVIMIENTOS, null].includes(evento.key)) actualizar();
  });

  actualizar();
})();
