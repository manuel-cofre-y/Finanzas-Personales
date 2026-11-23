
(() => {
  "use strict";

  const CLAVE_METAS = "ahorra_metas";
  const CLAVE_MOVIMIENTOS = "ahorra_movimientos";
  const moneda = new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0
  });
  const lista = document.getElementById("lista-metas");
  const formMeta = document.getElementById("form-meta");
  const saldoEnMetas = document.getElementById("saldo-para-ahorrar");
  const saldoEnInicio = document.getElementById("saldo-disponible-valor");
  const ahorroEnInicio = document.getElementById("ahorro-reservado-valor");

  const leerLista = (clave) => {
    try {
      const datos = JSON.parse(localStorage.getItem(clave));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const valor = (numero) => {
    const n = Number(numero);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  function calcularSaldo() {
    const movimientos = leerLista(CLAVE_MOVIMIENTOS);
    const metas = leerLista(CLAVE_METAS);
    const ingresos = movimientos.reduce((total, m) =>
      total + (m && m.tipo === "ingreso" ? valor(m.monto) : 0), 0);
    const gastos = movimientos.reduce((total, m) =>
      total + (m && m.tipo === "gasto" ? valor(m.monto) : 0), 0);
    const ahorro = metas.reduce((total, m) => total + (m ? valor(m.acumulado) : 0), 0);
    return { ingresos, gastos, ahorro, disponible: ingresos - gastos - ahorro };
  }

  function actualizarSaldo() {
    const datos = calcularSaldo();
    if (saldoEnMetas) {
      saldoEnMetas.textContent = moneda.format(datos.disponible);
      saldoEnMetas.classList.toggle("text-danger", datos.disponible < 0);
      saldoEnMetas.classList.toggle("text-primary", datos.disponible >= 0);
    }
    if (saldoEnInicio) {
      saldoEnInicio.textContent = moneda.format(datos.disponible);
      saldoEnInicio.classList.toggle("text-danger", datos.disponible < 0);
    }
    if (ahorroEnInicio) ahorroEnInicio.textContent = moneda.format(datos.ahorro);
  }

  function mostrarError(contenedor, mensaje) {
    let aviso = contenedor.querySelector("[data-error-ahorro]");
    if (!aviso) {
      aviso = document.createElement("p");
      aviso.dataset.errorAhorro = "";
      aviso.className = "small text-danger mt-2 mb-0";
      aviso.setAttribute("role", "alert");
      contenedor.appendChild(aviso);
    }
    aviso.textContent = mensaje;
    aviso.hidden = false;
  }

  // No permitir crear una meta que reserva dinero inexistente.
  if (formMeta) {
    formMeta.addEventListener("submit", (evento) => {
      const objetivo = Number(document.getElementById("objetivo")?.value);
      const inicial = Number(document.getElementById("acumulado")?.value || 0);
      const error = formMeta.querySelector("[data-error-ahorro]");
      if (error) error.hidden = true;

      // La validación de otros campos la realiza main.js.
      if (!Number.isSafeInteger(inicial) || inicial < 0 ||
          (Number.isFinite(objetivo) && objetivo > 0 && inicial > objetivo)) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        mostrarError(formMeta, "El ahorro inicial debe ser un monto válido y no superar el objetivo.");
        return;
      }
      if (inicial > calcularSaldo().disponible) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        mostrarError(formMeta, "No tienes saldo disponible suficiente para el ahorro inicial.");
      }
    }, true); // Captura antes del evento submit de main.js.
  }

  // Aportar a una meta sin crear gastos ni alterar los ingresos.
  function instalarAportes() {
    if (!lista) return;
    const metas = leerLista(CLAVE_METAS);
    const tarjetas = lista.querySelectorAll(":scope > .col-12 > .border");

    tarjetas.forEach((tarjeta, indice) => {
      if (tarjeta.dataset.saldoAhorroInstalado) return;
      const meta = metas[indice];
      if (!meta || meta.id == null) return;
      tarjeta.dataset.saldoAhorroInstalado = "true";

      const acciones = document.createElement("div");
      acciones.className = "d-flex flex-wrap align-items-center gap-2 mt-3";
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "btn btn-primary btn-sm";
      abrir.textContent = "Añadir dinero";
      abrir.setAttribute("aria-expanded", "false");

      const formulario = document.createElement("form");
      formulario.className = "w-100 bg-light border rounded p-3";
      formulario.hidden = true;
      const etiqueta = document.createElement("label");
      etiqueta.className = "form-label fw-medium";
      etiqueta.textContent = "Monto a añadir (CLP)";
      const entrada = document.createElement("input");
      entrada.type = "number";
      entrada.min = "1";
      entrada.step = "1";
      entrada.required = true;
      entrada.className = "form-control mb-2";
      entrada.id = `aporte-meta-${indice}`;
      entrada.placeholder = "Ej.: 10000";
      etiqueta.htmlFor = entrada.id;
      const confirmar = document.createElement("button");
      confirmar.type = "submit";
      confirmar.className = "btn btn-success btn-sm";
      confirmar.textContent = "Confirmar aporte";
      const cancelar = document.createElement("button");
      cancelar.type = "button";
      cancelar.className = "btn btn-outline-secondary btn-sm ms-2";
      cancelar.textContent = "Cancelar";
      const aviso = document.createElement("p");
      aviso.className = "small text-danger mt-2 mb-0";
      aviso.setAttribute("role", "alert");
      aviso.hidden = true;
      formulario.append(etiqueta, entrada, confirmar, cancelar, aviso);

      const eliminar = tarjeta.querySelector("button.btn-outline-danger");
      if (eliminar) {
        eliminar.classList.remove("mt-3");
        acciones.append(abrir, eliminar);
      } else {
        acciones.appendChild(abrir);
      }
      acciones.appendChild(formulario);
      tarjeta.appendChild(acciones);

      const actual = metas.find((m) => String(m.id) === String(meta.id));
      if (actual && valor(actual.acumulado) >= valor(actual.objetivo)) {
        abrir.disabled = true;
        abrir.textContent = "Meta cumplida";
      }

      const cerrar = () => {
        formulario.hidden = true;
        abrir.setAttribute("aria-expanded", "false");
        entrada.value = "";
        aviso.hidden = true;
      };
      abrir.addEventListener("click", () => {
        if (!formulario.hidden) return cerrar();
        formulario.hidden = false;
        abrir.setAttribute("aria-expanded", "true");
        entrada.focus();
      });
      cancelar.addEventListener("click", cerrar);

      formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        aviso.hidden = true;
        const aporte = Number(entrada.value);
        const actuales = leerLista(CLAVE_METAS);
        const posicion = actuales.findIndex((m) => String(m.id) === String(meta.id));
        const error = (texto) => {
          aviso.textContent = texto;
          aviso.hidden = false;
        };
        if (posicion < 0) return error("La meta ya no existe. Recarga la página.");
        const antigua = valor(actuales[posicion].acumulado);
        const objetivo = valor(actuales[posicion].objetivo);
        const disponible = calcularSaldo().disponible;
        if (!Number.isSafeInteger(aporte) || aporte <= 0) {
          return error("Ingresa un monto entero mayor que cero.");
        }
        if (aporte > disponible) {
          return error(`El saldo disponible es ${moneda.format(disponible)}. No puedes apartar más dinero.`);
        }
        if (antigua + aporte > objetivo) {
          return error(`Para completar esta meta faltan ${moneda.format(Math.max(0, objetivo - antigua))}.`);
        }
        if (!Number.isSafeInteger(antigua + aporte)) {
          return error("El monto es demasiado grande.");
        }
        actuales[posicion] = { ...actuales[posicion], acumulado: antigua + aporte };
        try {
          localStorage.setItem(CLAVE_METAS, JSON.stringify(actuales));
        } catch {
          return error("No se pudo guardar el aporte en este navegador.");
        }
        // main.js atiende el evento storage y vuelve a dibujar el avance.
        window.dispatchEvent(new StorageEvent("storage", { key: CLAVE_METAS }));
        actualizarSaldo();
      });
    });
    actualizarSaldo();
  }

  if (lista) {
    // main.js redibuja las tarjetas después de crear/eliminar metas.
    const observador = new MutationObserver(instalarAportes);
    observador.observe(lista, { childList: true, subtree: true });
    instalarAportes();
  }

  // Cambios realizados en otras pestañas.
  window.addEventListener("storage", (evento) => {
    if ([CLAVE_METAS, CLAVE_MOVIMIENTOS, null].includes(evento.key)) {
      actualizarSaldo();
    }
  });

  actualizarSaldo();
})();
