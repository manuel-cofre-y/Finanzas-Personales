/* RF-06: consejos prácticos de ahorro basados en los movimientos registrados.
   Este archivo solo lee los datos: no modifica ingresos, gastos, presupuestos ni metas. */
(() => {
  "use strict";

  const mesInput = document.getElementById("mes-consejos");
  const lista = document.getElementById("consejos-lista");
  const resumen = document.getElementById("consejos-resumen");
  if (!mesInput || !lista || !resumen) return;

  const moneda = new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0
  });

  function leerDatos(clave, valorPredeterminado) {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave));
      return guardado ?? valorPredeterminado;
    } catch {
      return valorPredeterminado;
    }
  }

  function normalizar(texto) {
    return String(texto ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();
  }

  function sugerenciaCategoria(categoria) {
    const nombre = normalizar(categoria);
    if (nombre.includes("aliment")) {
      return "Planifica las comidas y lleva una lista al comprar para evitar compras de más.";
    }
    if (nombre.includes("transporte")) {
      return "Agrupa tus recorridos y compara el costo de transporte público u otras alternativas.";
    }
    if (nombre.includes("vivienda") || nombre.includes("servicio")) {
      return "Revisa consumos de agua y electricidad y compara tus cuentas mes a mes.";
    }
    if (nombre.includes("entreten")) {
      return "Define un monto para entretenimiento y revisa qué suscripciones realmente utilizas.";
    }
    return "Revisa los movimientos de esta categoría para identificar gastos que puedas reducir.";
  }

  function crearTarjeta({titulo, detalle, accion, enlace, textoEnlace}) {
    const columna = document.createElement("div");
    columna.className = "col-12 col-md-6 col-xl-4";

    const tarjeta = document.createElement("article");
    tarjeta.className = "border rounded-3 p-3 bg-light h-100";
    const encabezado = document.createElement("h3");
    encabezado.className = "h6 fw-bold";
    encabezado.textContent = titulo;
    const texto = document.createElement("p");
    texto.className = "small mb-2";
    texto.textContent = detalle;
    const consejo = document.createElement("p");
    consejo.className = "small text-secondary mb-2";
    consejo.textContent = accion;
    tarjeta.append(encabezado, texto, consejo);

    if (enlace && textoEnlace) {
      const link = document.createElement("a");
      link.href = enlace;
      link.className = "small fw-medium";
      link.textContent = textoEnlace;
      tarjeta.appendChild(link);
    }
    columna.appendChild(tarjeta);
    return columna;
  }

  function actualizarConsejos() {
    const mes = mesInput.value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return;

    const movimientosGuardados = leerDatos("ahorra_movimientos", []);
    const movimientos = Array.isArray(movimientosGuardados) ? movimientosGuardados : [];
    const gastos = movimientos.filter(m => m && m.tipo === "gasto" &&
      typeof m.fecha === "string" && m.fecha.startsWith(`${mes}-`) &&
      Number.isFinite(Number(m.monto)) && Number(m.monto) > 0);
    const total = gastos.reduce((suma, m) => suma + Number(m.monto), 0);

    const presupuestosGuardados = leerDatos("ahorra_presupuestos", {});
    const presupuestos = presupuestosGuardados && typeof presupuestosGuardados === "object" &&
      !Array.isArray(presupuestosGuardados) ? presupuestosGuardados : {};
    const limite = Number(presupuestos[mes]);
    const tieneLimite = Object.prototype.hasOwnProperty.call(presupuestos, mes) &&
      Number.isFinite(limite) && limite > 0;

    const metasGuardadas = leerDatos("ahorra_metas", []);
    const metas = Array.isArray(metasGuardadas) ? metasGuardadas : [];

    const recomendaciones = [];

    // Consejo 1: categoría con mayor gasto del mes, basado en datos reales.
    if (gastos.length > 0) {
      const porCategoria = new Map();
      gastos.forEach(m => {
        const nombre = String(m.categoria || "Otros").trim() || "Otros";
        porCategoria.set(nombre, (porCategoria.get(nombre) || 0) + Number(m.monto));
      });
      const [categoria, monto] = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])[0];
      recomendaciones.push({
        titulo: "Revisa tu mayor categoría de gasto",
        detalle: `En este mes, ${categoria} suma ${moneda.format(monto)} de tus gastos.`,
        accion: sugerenciaCategoria(categoria),
        enlace: "ingresos-gastos.html", textoEnlace: "Revisar movimientos"
      });
    } else {
      recomendaciones.push({
        titulo: "Comienza por registrar tus gastos",
        detalle: "Todavía no hay gastos registrados para el mes seleccionado.",
        accion: "Anota incluso los gastos pequeños para identificar en qué se va tu dinero.",
        enlace: "ingresos-gastos.html", textoEnlace: "Registrar un movimiento"
      });
    }

    // Consejo 2: estado del presupuesto, sin considerar los ahorros como gastos.
    if (!tieneLimite) {
      recomendaciones.push({
        titulo: "Define un límite mensual",
        detalle: "Aún no has fijado un presupuesto para este mes.",
        accion: "Establece un límite realista y compara tus gastos con él durante el mes.",
        enlace: "#titulo-presupuesto", textoEnlace: "Ir al presupuesto"
      });
    } else {
      const porcentaje = (total / limite) * 100;
      const uso = porcentaje.toFixed(1).replace(".", ",");
      recomendaciones.push({
        titulo: porcentaje >= 100 ? "Revisa tu presupuesto" :
          porcentaje >= 80 ? "Te acercas al límite" : "Da seguimiento a tu presupuesto",
        detalle: `Has utilizado ${uso}% de tu presupuesto de ${moneda.format(limite)}.`,
        accion: porcentaje >= 100
          ? "Ya alcanzaste o superaste el límite: prioriza gastos esenciales y revisa los pendientes."
          : porcentaje >= 80
            ? "Queda poco margen: revisa tus próximos gastos antes de comprar."
            : "Revisa tu avance semanalmente para no superar el límite al final del mes.",
        enlace: "#titulo-presupuesto", textoEnlace: "Ver presupuesto"
      });
    }

    // Consejo 3: seguimiento de las metas, sin mover dinero ni alterar saldos.
    const metasPendientes = metas.filter(m => m && Number(m.objetivo) > 0 &&
      Number.isFinite(Number(m.acumulado)) && Number(m.acumulado) < Number(m.objetivo));
    if (metasPendientes.length === 0) {
      const completadas = metas.filter(m => m && Number(m.objetivo) > 0 &&
        Number(m.acumulado) >= Number(m.objetivo));
      recomendaciones.push(completadas.length > 0 ? {
        titulo: "Mantén el hábito del ahorro",
        detalle: `Tienes ${completadas.length} meta(s) de ahorro completada(s).`,
        accion: "Puedes fijar un nuevo objetivo o reservar un monto pequeño de forma periódica.",
        enlace: "metas-ahorro.html", textoEnlace: "Ver metas"
      } : {
        titulo: "Crea una meta de ahorro",
        detalle: "Todavía no tienes una meta de ahorro pendiente.",
        accion: "Elige un objetivo alcanzable y aparta dinero únicamente cuando tengas saldo disponible.",
        enlace: "metas-ahorro.html", textoEnlace: "Crear una meta"
      });
    } else {
      const proxima = metasPendientes[0];
      const falta = Number(proxima.objetivo) - Number(proxima.acumulado);
      recomendaciones.push({
        titulo: "Avanza hacia tu meta",
        detalle: `Para «${String(proxima.nombre || "tu meta") }» faltan ${moneda.format(falta)}.`,
        accion: "Considera aportes pequeños y constantes, siempre que tu saldo disponible lo permita.",
        enlace: "metas-ahorro.html", textoEnlace: "Ver metas de ahorro"
      });
    }

    lista.replaceChildren(...recomendaciones.map(crearTarjeta));
    const periodoLegible = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" })
      .format(new Date(`${mes}-01T12:00:00`));
    resumen.textContent = `Análisis de ${periodoLegible}: ${gastos.length} gasto(s) registrado(s), por un total de ${moneda.format(total)}.`;
  }

  const ahora = new Date();
  mesInput.value = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  mesInput.addEventListener("change", actualizarConsejos);
  window.addEventListener("storage", evento => {
    if (["ahorra_movimientos", "ahorra_presupuestos", "ahorra_metas", null].includes(evento.key)) {
      actualizarConsejos();
    }
  });
  actualizarConsejos();
})();
