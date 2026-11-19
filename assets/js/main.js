/**
 * Ahorra · Integración del JavaScript de Finanzas Personales.
 * Reúne las funciones existentes del equipo en el archivo que cargan
 * index.html, ingresos-gastos.html, metas-ahorro.html y estadisticas.html.
 * Los datos se guardan en localStorage de este navegador.
 */
(() => {
  "use strict";

  const CLAVE_MOVIMIENTOS = "ahorra_movimientos";
  const CLAVE_METAS = "ahorra_metas";

  // Almacenamiento de datos (adaptado del código existente).
  const obtenerDatos = (clave) => {
    try {
      const datos = JSON.parse(localStorage.getItem(clave));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const guardarDatos = (clave, datos) => {
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
      return true;
    } catch (error) {
      console.error("No fue posible guardar los datos:", error);
      return false;
    }
  };

  let movimientos = obtenerDatos(CLAVE_MOVIMIENTOS);
  let metas = obtenerDatos(CLAVE_METAS);

  // Funciones compartidas para todas las páginas.
  const formatoCLP = (cantidad) => new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(cantidad) || 0);

  const crearElemento = (etiqueta, texto, clase = "") => {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = String(texto);
    if (clase) elemento.className = clase;
    return elemento;
  };

  const fechaChilena = (fecha) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return String(fecha || "");
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  const nuevoId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  // Alertas visuales de Bootstrap 5.3, sin ventanas emergentes del navegador.
  // El aviso aparece debajo del botón del formulario y se puede cerrar.
  const mostrarAviso = (formulario, mensaje, variante = "success") => {
    const anterior = formulario.querySelector('[data-aviso-bootstrap]');
    if (anterior) anterior.remove();

    const esError = variante === "danger";
    const aviso = document.createElement("div");
    aviso.dataset.avisoBootstrap = "";
    aviso.className = `alert alert-${esError ? "danger" : "success"} alert-dismissible d-flex align-items-start gap-2 mt-3 mb-0`;
    aviso.setAttribute("role", esError ? "alert" : "status");
    if (!esError) aviso.setAttribute("aria-live", "polite");

    const simbolo = crearElemento("span", esError ? "!" : "✓", "fw-bold");
    simbolo.setAttribute("aria-hidden", "true");
    const texto = crearElemento("span", mensaje, "flex-grow-1");
    const cerrar = crearElemento("button", "", "btn-close");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", "Cerrar aviso");
    cerrar.addEventListener("click", () => aviso.remove());

    aviso.append(simbolo, texto, cerrar);
    formulario.appendChild(aviso);
  };

  // Cálculos de ingresos, gastos y saldo disponible.
  const calcularTotales = () => {
    const ingresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((total, m) => total + Number(m.monto || 0), 0);
    const gastos = movimientos
      .filter((m) => m.tipo === "gasto")
      .reduce((total, m) => total + Number(m.monto || 0), 0);

    return { ingresos, gastos, disponible: ingresos - gastos };
  };

  // Resumen de la portada.
  const actualizarInicio = () => {
    const resumen = document.querySelector('[aria-labelledby="titulo-resumen"]');
    if (!resumen) return;

    const totales = calcularTotales();
    // El HTML del equipo usa fs-3, no fs-4.
    const tarjetas = resumen.querySelectorAll(".fs-3");
    if (tarjetas.length >= 3) {
      tarjetas[0].textContent = formatoCLP(totales.ingresos);
      tarjetas[1].textContent = formatoCLP(totales.gastos);
      tarjetas[2].textContent = formatoCLP(totales.disponible);
    }

    const seccion = document.querySelector('[aria-labelledby="titulo-ultimos"]');
    if (!seccion) return;

    let lista = document.getElementById("movimientos-recientes");
    if (!lista) {
      lista = document.createElement("div");
      lista.id = "movimientos-recientes";
      const mensaje = seccion.querySelector("p");
      if (mensaje) mensaje.replaceWith(lista);
      else seccion.appendChild(lista);
    }
    lista.replaceChildren();

    if (movimientos.length === 0) {
      lista.appendChild(crearElemento("p", "Aún no hay movimientos registrados.", "border rounded p-4 text-secondary"));
      return;
    }

    const contenedor = crearElemento("div", "", "list-group mb-3");
    movimientos.slice(-5).reverse().forEach((movimiento) => {
      const item = crearElemento("div", "", "list-group-item d-flex justify-content-between align-items-center gap-2");
      const descripcion = crearElemento("span", `${movimiento.descripcion} (${fechaChilena(movimiento.fecha)})`);
      const monto = crearElemento(
        "strong",
        `${movimiento.tipo === "ingreso" ? "+" : "-"}${formatoCLP(movimiento.monto)}`,
        movimiento.tipo === "ingreso" ? "text-success" : "text-danger"
      );
      item.append(descripcion, monto);
      contenedor.appendChild(item);
    });
    lista.appendChild(contenedor);
  };

  // Historial de movimientos, con eliminación.
  const actualizarHistorial = () => {
    const tabla = document.getElementById("tabla-movimientos");
    if (!tabla) return;
    tabla.replaceChildren();

    // La tabla original tiene cuatro columnas: se agrega la quinta para "Eliminar".
    const encabezado = tabla.closest("table")?.querySelector("thead tr");
    if (encabezado && !encabezado.querySelector('[data-columna="acciones"]')) {
      const th = crearElemento("th", "Acciones", "text-end");
      th.dataset.columna = "acciones";
      encabezado.appendChild(th);
    }

    if (movimientos.length === 0) {
      const fila = document.createElement("tr");
      const celda = crearElemento("td", "Sin registros todavía", "text-center text-secondary py-4");
      celda.colSpan = 5;
      fila.appendChild(celda);
      tabla.appendChild(fila);
      return;
    }

    [...movimientos].reverse().forEach((movimiento) => {
      const fila = document.createElement("tr");
      const valores = [
        fechaChilena(movimiento.fecha),
        movimiento.descripcion,
        movimiento.tipo === "ingreso" ? "Ingreso" : "Gasto",
        formatoCLP(movimiento.monto)
      ];
      valores.forEach((valor, indice) => {
        const celda = crearElemento("td", valor);
        if (indice === 3) celda.className = "text-end";
        fila.appendChild(celda);
      });

      const celdaAccion = document.createElement("td");
      celdaAccion.className = "text-end";
      const boton = crearElemento("button", "Eliminar", "btn btn-sm btn-outline-danger");
      boton.type = "button";
      boton.setAttribute("aria-label", `Eliminar movimiento ${movimiento.descripcion}`);
      boton.addEventListener("click", () => {
        if (!confirm("¿Deseas eliminar este movimiento?")) return;
        const siguientes = movimientos.filter((m) => m.id !== movimiento.id);
        if (!guardarDatos(CLAVE_MOVIMIENTOS, siguientes)) return;
        movimientos = siguientes;
        actualizarHistorial();
        actualizarInicio();
        actualizarEstadisticas();
      });
      celdaAccion.appendChild(boton);
      fila.appendChild(celdaAccion);
      tabla.appendChild(fila);
    });
  };

  // Metas de ahorro y botón de eliminación.
  const actualizarMetas = () => {
    const lista = document.getElementById("lista-metas");
    if (!lista) return;
    lista.replaceChildren();

    if (metas.length === 0) {
      lista.textContent = "Sin metas creadas todavía.";
      lista.className = "border rounded-3 p-4 text-center text-secondary bg-light";
      return;
    }
    lista.className = "row g-3";

    metas.forEach((meta) => {
      const progreso = Math.min(100, Math.max(0, (Number(meta.acumulado) / Number(meta.objetivo)) * 100)) || 0;
      const columna = crearElemento("div", "", "col-12");
      const tarjeta = crearElemento("div", "", "border rounded p-3");
      const titulo = crearElemento("h3", meta.nombre, "h5");
      const cantidades = crearElemento("p", `${formatoCLP(meta.acumulado)} de ${formatoCLP(meta.objetivo)}`);
      const porcentaje = crearElemento("p", `${progreso.toFixed(1)}% completado`, "small text-secondary");
      const barra = crearElemento("div", "", "progress");
      barra.setAttribute("role", "progressbar");
      barra.setAttribute("aria-label", `Progreso de ${meta.nombre}`);
      barra.setAttribute("aria-valuenow", progreso.toFixed(1));
      barra.setAttribute("aria-valuemin", "0");
      barra.setAttribute("aria-valuemax", "100");
      const avance = crearElemento("div", "", "progress-bar");
      avance.style.width = `${progreso}%`;
      barra.appendChild(avance);

      const boton = crearElemento("button", "Eliminar meta", "btn btn-sm btn-outline-danger mt-3");
      boton.type = "button";
      boton.addEventListener("click", () => {
        if (!confirm("¿Deseas eliminar esta meta?")) return;
        const siguientes = metas.filter((m) => m.id !== meta.id);
        if (!guardarDatos(CLAVE_METAS, siguientes)) return;
        metas = siguientes;
        actualizarMetas();
      });
      tarjeta.append(titulo, cantidades, barra, porcentaje, boton);
      columna.appendChild(tarjeta);
      lista.appendChild(columna);
    });
  };

  // Barras de estadísticas de gastos por categoría e ingresos/gastos.
  const actualizarEstadisticas = () => {
    const graficos = document.querySelectorAll(".grafico-pendiente");
    if (graficos.length < 2) return;
    const [graficoCategorias, graficoTotales] = graficos;
    for (const grafico of graficos) {
      grafico.classList.remove("p-5", "text-center");
      grafico.classList.add("p-3");
      grafico.replaceChildren();
    }

    const categorias = {};
    movimientos.filter((m) => m.tipo === "gasto").forEach((m) => {
      categorias[m.categoria] = (categorias[m.categoria] || 0) + Number(m.monto || 0);
    });
    const valores = Object.entries(categorias);
    const maximoCategoria = Math.max(1, ...valores.map(([, monto]) => monto));

    if (valores.length === 0) {
      graficoCategorias.textContent = "Todavía no hay gastos registrados.";
    } else {
      valores.forEach(([categoria, monto]) => {
        const contenedor = crearElemento("div", "", "mb-3");
        const etiqueta = crearElemento("div", `${categoria}: ${formatoCLP(monto)}`, "small mb-1");
        const barra = crearElemento("div", "", "progress");
        const avance = crearElemento("div", "", "progress-bar bg-primary");
        avance.style.width = `${(monto / maximoCategoria) * 100}%`;
        barra.appendChild(avance);
        contenedor.append(etiqueta, barra);
        graficoCategorias.appendChild(contenedor);
      });
    }

    const totales = calcularTotales();
    const maximo = Math.max(1, totales.ingresos, totales.gastos);
    [
      { nombre: "Ingresos", monto: totales.ingresos, clase: "bg-success" },
      { nombre: "Gastos", monto: totales.gastos, clase: "bg-danger" }
    ].forEach((dato) => {
      const contenedor = crearElemento("div", "", "mb-3");
      const etiqueta = crearElemento("div", `${dato.nombre}: ${formatoCLP(dato.monto)}`, "small mb-1");
      const barra = crearElemento("div", "", "progress");
      const avance = crearElemento("div", "", `progress-bar ${dato.clase}`);
      avance.style.width = `${(dato.monto / maximo) * 100}%`;
      barra.appendChild(avance);
      contenedor.append(etiqueta, barra);
      graficoTotales.appendChild(contenedor);
    });
  };

  // Conexión del formulario de movimientos con las funciones anteriores.
  const formMovimiento = document.getElementById("form-movimiento");
  if (formMovimiento) {
    const boton = formMovimiento.querySelector('button[disabled]');
    if (boton) {
      boton.disabled = false;
      boton.type = "submit";
      boton.textContent = "Guardar movimiento";
    }

    formMovimiento.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const formulario = new FormData(formMovimiento);
      const tipo = formulario.get("tipo");
      const monto = Number(formulario.get("monto"));
      const descripcion = String(formulario.get("descripcion") || "").trim();
      const categoria = formulario.get("categoria");
      const fecha = formulario.get("fecha");

      if (!["ingreso", "gasto"].includes(tipo) || !Number.isFinite(monto) || monto <= 0 ||
          !descripcion || !categoria || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
        mostrarAviso(formMovimiento, "Por favor, completa correctamente todos los campos.", "danger");
        return;
      }
      const movimiento = { id: nuevoId(), tipo, monto, descripcion, categoria, fecha };
      const siguientes = [...movimientos, movimiento];
      if (!guardarDatos(CLAVE_MOVIMIENTOS, siguientes)) {
        mostrarAviso(formMovimiento, "No se pudieron guardar los datos en este navegador. Revisa el almacenamiento disponible.", "danger");
        return;
      }
      movimientos = siguientes;
      formMovimiento.reset();
      actualizarHistorial();
      actualizarInicio();
      actualizarEstadisticas();
      mostrarAviso(formMovimiento, "Movimiento registrado correctamente.");
    });
  }

  // Conexión del formulario de metas con el almacenamiento y la vista.
  const formMeta = document.getElementById("form-meta");
  if (formMeta) {
    const boton = formMeta.querySelector('button[disabled]');
    if (boton) {
      boton.disabled = false;
      boton.type = "submit";
      boton.textContent = "Crear meta";
    }

    formMeta.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const nombre = String(document.getElementById("nombre-meta").value || "").trim();
      const objetivo = Number(document.getElementById("objetivo").value);
      const valorAcumulado = document.getElementById("acumulado").value;
      const acumulado = Number(valorAcumulado === "" ? 0 : valorAcumulado);

      if (!nombre || !Number.isFinite(objetivo) || !Number.isFinite(acumulado) || objetivo <= 0 || acumulado < 0) {
        mostrarAviso(formMeta, "Ingresa datos válidos para la meta.", "danger");
        return;
      }
      const siguientes = [...metas, { id: nuevoId(), nombre, objetivo, acumulado }];
      if (!guardarDatos(CLAVE_METAS, siguientes)) {
        mostrarAviso(formMeta, "No se pudo guardar la meta en este navegador. Revisa el almacenamiento disponible.", "danger");
        return;
      }
      metas = siguientes;
      formMeta.reset();
      actualizarMetas();
      mostrarAviso(formMeta, "Meta creada correctamente.");
    });
  }

  // Presentar información guardada apenas se abre cada sección.
  actualizarInicio();
  actualizarHistorial();
  actualizarMetas();
  actualizarEstadisticas();

  // Sincronizar si el mismo sitio se abre en otra pestaña del navegador.
  window.addEventListener("storage", (evento) => {
    if (evento.key === CLAVE_MOVIMIENTOS || evento.key === null) {
      movimientos = obtenerDatos(CLAVE_MOVIMIENTOS);
      actualizarInicio();
      actualizarHistorial();
      actualizarEstadisticas();
    }
    if (evento.key === CLAVE_METAS || evento.key === null) {
      metas = obtenerDatos(CLAVE_METAS);
      actualizarMetas();
    }
  });
})();
