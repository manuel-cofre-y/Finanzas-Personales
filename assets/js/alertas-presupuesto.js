
(() => {
  'use strict';

  const CLAVE_PRESUPUESTOS = 'ahorra_presupuestos';
  const CLAVE_MOVIMIENTOS = 'ahorra_movimientos';
  const formPresupuesto = document.getElementById('form-presupuesto');
  const formMovimiento = document.getElementById('form-movimiento');
  const selectorMes = document.getElementById('periodo-presupuesto');
  const barraProgreso = document.getElementById('presupuesto-progreso');
  const dinero = new Intl.NumberFormat('es-CL', {style: 'currency', currency: 'CLP', maximumFractionDigits: 0});

  if (!formPresupuesto && !formMovimiento) return;

  function leerDatos(clave, respaldo) {
    try {
      return JSON.parse(localStorage.getItem(clave)) ?? respaldo;
    } catch {
      return respaldo;
    }
  }

  function mesActual() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  function obtenerMes() {
    return selectorMes && /^\d{4}-(0[1-9]|1[0-2])$/.test(selectorMes.value)
      ? selectorMes.value : mesActual();
  }

  function mesDeFecha(fecha) {
    const valor = String(fecha || '');
    if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(valor)) return valor.slice(0, 7);
    if (/^\d{2}\/(0[1-9]|1[0-2])\/\d{4}$/.test(valor)) {
      return `${valor.slice(6)}-${valor.slice(3, 5)}`;
    }
    return '';
  }

  function consultar(mes) {
    const presupuestos = leerDatos(CLAVE_PRESUPUESTOS, {});
    const limite = presupuestos && typeof presupuestos === 'object' && !Array.isArray(presupuestos)
      ? Number(presupuestos[mes]) : 0;
    if (!Number.isFinite(limite) || limite <= 0) return null;

    const movimientos = leerDatos(CLAVE_MOVIMIENTOS, []);
    const gastado = (Array.isArray(movimientos) ? movimientos : []).reduce((total, movimiento) => {
      if (!movimiento || movimiento.tipo !== 'gasto' || mesDeFecha(movimiento.fecha) !== mes) return total;
      const monto = Number(movimiento.monto);
      return total + (Number.isFinite(monto) && monto > 0 ? monto : 0);
    }, 0);
    const porcentaje = (gastado / limite) * 100;
    return { mes, limite, gastado, porcentaje, restante: limite - gastado };
  }

  function nivelAlerta(porcentaje) {
    if (porcentaje >= 100) return 100;
    if (porcentaje >= 80) return 80;
    if (porcentaje >= 60) return 60;
    return 0;
  }

  function mensajeAlerta(datos) {
    const nivel = nivelAlerta(datos.porcentaje);
    const uso = `${datos.porcentaje.toFixed(1).replace('.', ',')}%`;
    if (nivel === 100) {
      return {
        titulo: '¡Presupuesto mensual agotado!',
        icono: 'bi-exclamation-octagon-fill',
        detalle: `Has utilizado ${uso} de tu límite. ${datos.restante < 0 ? `Te excediste en ${dinero.format(-datos.restante)}.` : 'Ya no queda presupuesto para este mes.'}`,
        consejo: 'Revisa los gastos pendientes y prioriza solo lo indispensable.',
        clase: 'alert-danger border-danger'
      };
    }
    if (nivel === 80) {
      return {
        titulo: '¡Estás muy cerca del límite!',
        icono: 'bi-exclamation-circle-fill',
        detalle: `Has utilizado ${uso} del presupuesto. Solo quedan ${dinero.format(datos.restante)}.`,
        consejo: 'Ten cuidado: estás por agotar el presupuesto mensual.',
        clase: 'alert-danger border-danger'
      };
    }
    return {
      titulo: '¡Atención! Llegaste al 60% del presupuesto',
      icono: 'bi-exclamation-triangle-fill',
      detalle: `Ya utilizaste ${uso} de tu presupuesto mensual. Te quedan ${dinero.format(datos.restante)}.`,
      consejo: 'Revisa tus próximos gastos para evitar superar el límite.',
      clase: 'alert-warning border-warning'
    };
  }


  function crearIcono(nombre, tamano = 'fs-4') {
    const icono = document.createElement('i');
    icono.className = `bi ${nombre} ${tamano} flex-shrink-0`;
    icono.setAttribute('aria-hidden', 'true');
    return icono;
  }


  const zona = (formPresupuesto || formMovimiento).parentElement;
  const panel = document.createElement('div');
  panel.id = 'alerta-presupuesto-destacada';
  panel.className = 'd-none';
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-live', 'polite');
  zona.insertBefore(panel, formPresupuesto || formMovimiento);

  function mostrarPanel(datos) {
    if (!datos || nivelAlerta(datos.porcentaje) === 0) {
      panel.className = 'd-none';
      panel.replaceChildren();
      return;
    }
    const mensaje = mensajeAlerta(datos);
    panel.className = `alert ${mensaje.clase} border-3 shadow-sm rounded-3 px-3 py-3 mt-3 mb-3`;
    const titulo = document.createElement('h3');
    titulo.className = 'h5 fw-bold mb-2 d-flex align-items-center gap-2';
    titulo.append(crearIcono(mensaje.icono), document.createTextNode(mensaje.titulo));
    const detalle = document.createElement('p');
    detalle.className = 'mb-1 fw-semibold';
    detalle.textContent = mensaje.detalle;
    const consejo = document.createElement('p');
    consejo.className = 'small mb-0';
    consejo.textContent = mensaje.consejo;
    panel.replaceChildren(titulo, detalle, consejo);
  }

  function actualizarColorBarra(datos) {
    if (!barraProgreso) return;
    barraProgreso.classList.remove('bg-primary', 'bg-warning', 'bg-danger');
    const nivel = datos ? nivelAlerta(datos.porcentaje) : 0;
    barraProgreso.classList.add(nivel >= 80 ? 'bg-danger' : nivel >= 60 ? 'bg-warning' : 'bg-primary');
  }

  function mostrarNotificacion(datos) {
    const anterior = document.getElementById('alerta-presupuesto-flotante');
    if (anterior) anterior.remove();

    const mensaje = mensajeAlerta(datos);
    const notificacion = document.createElement('div');
    notificacion.id = 'alerta-presupuesto-flotante';
    notificacion.className = `alert ${mensaje.clase} border-3 shadow-lg rounded-3`;
    notificacion.setAttribute('role', 'alert');
    notificacion.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:2000;width:calc(100% - 2rem);max-width:430px;';

    const encabezado = document.createElement('div');
    encabezado.className = 'd-flex justify-content-between align-items-start gap-3';
    const titulo = document.createElement('strong');
    titulo.className = 'fs-5 d-flex align-items-start gap-2';
    titulo.append(crearIcono(mensaje.icono, 'fs-3'), document.createTextNode(mensaje.titulo));
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'btn-close';
    cerrar.setAttribute('aria-label', 'Cerrar alerta de presupuesto');
    cerrar.addEventListener('click', () => notificacion.remove());
    encabezado.append(titulo, cerrar);

    const texto = document.createElement('p');
    texto.className = 'mt-2 mb-2';
    texto.textContent = mensaje.detalle;
    const consejo = document.createElement('p');
    consejo.className = 'small mb-3';
    consejo.textContent = mensaje.consejo;
    const enlace = document.createElement('a');
    enlace.className = 'btn btn-sm btn-dark';
    enlace.href = formPresupuesto ? '#titulo-presupuesto' : 'index.html#titulo-presupuesto';
    enlace.textContent = 'Ver presupuesto';
    enlace.addEventListener('click', () => notificacion.remove());
    notificacion.append(encabezado, texto, consejo, enlace);
    document.body.appendChild(notificacion);
  }

  function actualizar(mes = obtenerMes()) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return;
    const datos = consultar(mes);
    mostrarPanel(datos);
    actualizarColorBarra(datos);

    const nivel = datos ? nivelAlerta(datos.porcentaje) : 0;
    const clave = `ahorra_alerta_presupuesto_${mes}`;
    let ultimo = 0;
    try { ultimo = Number(sessionStorage.getItem(clave)) || 0; } catch { /* privacidad */ }

    
    if (nivel < ultimo) {
      try { sessionStorage.setItem(clave, String(nivel)); } catch { /* privacidad */ }
    } else if (nivel > ultimo) {
      mostrarNotificacion(datos);
      try { sessionStorage.setItem(clave, String(nivel)); } catch { /* privacidad */ }
    }
  }

  if (selectorMes) selectorMes.addEventListener('change', () => actualizar());

  
  if (formPresupuesto) {
    formPresupuesto.addEventListener('submit', () => {
      queueMicrotask(() => actualizar());
    });
  }

  if (formMovimiento) {
    document.addEventListener('submit', (evento) => {
      if (evento.target !== formMovimiento) return;
      const campos = new FormData(formMovimiento);
      if (campos.get('tipo') !== 'gasto') return;
      const mes = mesDeFecha(campos.get('fecha'));
      if (!mes) return;
      const anterior = consultar(mes)?.gastado ?? 0;
      queueMicrotask(() => {
        const nuevo = consultar(mes)?.gastado ?? 0;
        if (nuevo > anterior) actualizar(mes);
      });
    }, true);
  }

  window.addEventListener('storage', (evento) => {
    if ([CLAVE_MOVIMIENTOS, CLAVE_PRESUPUESTOS, null].includes(evento.key)) actualizar();
  });

  actualizar();
})();
