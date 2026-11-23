
(() => {
  "use strict";

  const CLAVE_METAS = "ahorra_metas";
  const lista = document.getElementById("lista-metas");
  if (!lista) return;

  const leerMetas = () => {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_METAS));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const mensaje = (elemento, texto, error = false) => {
    elemento.textContent = texto;
    elemento.className = error ? "small text-danger mt-2" : "small text-success mt-2";
  };

 
  const instalarBotones = () => {
    const metas = leerMetas();
    const tarjetas = lista.querySelectorAll(":scope > .col-12 > .border");

    tarjetas.forEach((tarjeta, indice) => {
      if (tarjeta.dataset.aportesInstalados) return;
      const meta = metas[indice];
      if (!meta || meta.id === undefined || meta.id === null) return;
      tarjeta.dataset.aportesInstalados = "true";

      const acciones = document.createElement("div");
      acciones.className = "d-flex flex-wrap gap-2 mt-3";

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
      entrada.placeholder = "Ej.: 10000";
      entrada.id = `monto-aporte-${indice}`;
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
      aviso.className = "small mt-2";
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

      const cerrarFormulario = () => {
        formulario.hidden = true;
        abrir.setAttribute("aria-expanded", "false");
        entrada.value = "";
        aviso.hidden = true;
      };

      abrir.addEventListener("click", () => {
        if (!formulario.hidden) return cerrarFormulario();
        formulario.hidden = false;
        abrir.setAttribute("aria-expanded", "true");
        entrada.focus();
      });
      cancelar.addEventListener("click", cerrarFormulario);

      formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const aporte = Number(entrada.value);
        if (!Number.isSafeInteger(aporte) || aporte <= 0) {
          aviso.hidden = false;
          mensaje(aviso, "Ingresa un monto entero mayor que cero.", true);
          return;
        }

        const actuales = leerMetas();
        const posicion = actuales.findIndex((m) => String(m.id) === String(meta.id));
        if (posicion === -1) {
          aviso.hidden = false;
          mensaje(aviso, "Esta meta ya no existe. Actualiza la página.", true);
          return;
        }

        const anterior = Number(actuales[posicion].acumulado) || 0;
        const nuevoAcumulado = anterior + aporte;
        if (!Number.isSafeInteger(nuevoAcumulado)) {
          aviso.hidden = false;
          mensaje(aviso, "El monto total es demasiado grande.", true);
          return;
        }

        actuales[posicion] = { ...actuales[posicion], acumulado: nuevoAcumulado };
        try {
          localStorage.setItem(CLAVE_METAS, JSON.stringify(actuales));
        } catch {
          aviso.hidden = false;
          mensaje(aviso, "No fue posible guardar el aporte en este navegador.", true);
          return;
        }

        window.dispatchEvent(new StorageEvent("storage", { key: CLAVE_METAS }));
      });
    });
  };


  const observador = new MutationObserver(instalarBotones);
  observador.observe(lista, { childList: true, subtree: true });
  instalarBotones();
})();
