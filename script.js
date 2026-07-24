"use strict";

/* =========================================================
   ELENA GIRJOABA MUSIC
   script.js — Versión 2.0
   ========================================================= */

(() => {
  const CONFIG = Object.freeze({
    rutaCanciones: "canciones.json",
    instagramApp: "instagram://user?username=elenagirjoabamusic",
    instagramWeb: "https://instagram.com/elenagirjoabamusic",
    whatsappApp: "whatsapp://send?phone=593987388915&text=Hola%20Elena%20Girjoaba%20Music.%20%F0%9F%91%8B%0A%0AMe%20gustar%C3%ADa%20cotizar%20m%C3%BAsica%20en%20vivo%20para%20un%20evento.%0A%0A%C2%BFPodr%C3%ADan%20darme%20informaci%C3%B3n%20sobre%20disponibilidad%20y%20precios%3F%0A%0A%C2%A1Muchas%20gracias%21",
    whatsappWeb: "https://wa.me/593987388915?text=Hola%20Elena%20Girjoaba%20Music.%20%F0%9F%91%8B%0A%0AMe%20gustar%C3%ADa%20cotizar%20m%C3%BAsica%20en%20vivo%20para%20un%20evento.%0A%0A%C2%BFPodr%C3%ADan%20darme%20informaci%C3%B3n%20sobre%20disponibilidad%20y%20precios%3F%0A%0A%C2%A1Muchas%20gracias%21",
    esperaFallbackApp: 1200,
    tiempoSalidaLanding: 650,
    tiempoSeleccionTarjeta: 900,
    limiteAnimacionTarjetas: 24,
    categoriaInicial: "Todas",
    claveInstagramVisitado: "egmInstagramVisitado",
    claveInstagramDesbloqueo: "egmInstagramDesbloqueo",
    demoraContinuacionInstagram: 5000
  });

  const estado = {
    canciones: [],
    categoriaActiva: null,
    consulta: "",
    mostrarTodas: false,
    cargando: false,
    error: null,
    instagramVisitado: false
  };

  const DOM = {};

  function capturarDOM() {
    DOM.landing = document.querySelector("#landing");
    DOM.app = document.querySelector("#app");
    DOM.seguirInstagram = document.querySelector("#seguirInstagram");
    DOM.continuarExperiencia = document.querySelector("#continuarExperiencia");
    DOM.entrarRepertorio = document.querySelector("#entrarRepertorio");

    DOM.mostrarTodo = document.querySelector("#mostrarTodo");
    DOM.totalCancionesBoton = document.querySelector("#totalCancionesBoton");
    DOM.buscar = document.querySelector("#buscar");
    DOM.limpiarBusqueda = document.querySelector("#limpiarBusqueda");
    DOM.contadorCanciones = document.querySelector("#contadorCanciones");
    DOM.listaCanciones = document.querySelector("#listaCanciones");
    DOM.sinResultados = document.querySelector("#sinResultados");
    DOM.errorCarga = document.querySelector("#errorCarga");
    DOM.reintentarCarga = document.querySelector("#reintentarCarga");
    DOM.categorias = [...document.querySelectorAll(".categoria")];

    DOM.menuCanciones = document.querySelector("#menuCanciones");
    DOM.controlesCanciones = document.querySelector("#controlesCanciones");
    DOM.volverArriba = document.querySelector("#volverArriba");
    DOM.anioActual = document.querySelector("#anioActual");

    DOM.enlacesWhatsApp = [
      ...document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]')
    ];

    DOM.enlacesInstagram = [
      ...document.querySelectorAll('a[href*="instagram.com"]')
    ];
  }

  function normalizarTexto(valor = "") {
    return String(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " y ")
      .replace(/[’'`´]/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escaparHTML(valor = "") {
    return String(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function desplazarA(elemento, opciones = {}) {
    if (!elemento) return;

    elemento.scrollIntoView({
      behavior: opciones.inmediato ? "auto" : "smooth",
      block: opciones.bloque || "start"
    });
  }

  function esCancionValida(cancion) {
    return Boolean(
      cancion &&
      Number.isInteger(cancion.numero) &&
      cancion.numero > 0 &&
      typeof cancion.titulo === "string" &&
      cancion.titulo.trim() &&
      typeof cancion.artista === "string" &&
      cancion.artista.trim() &&
      Array.isArray(cancion.categorias)
    );
  }

  function prepararCancion(cancion) {
    const categorias = cancion.categorias
      .filter((categoria) => typeof categoria === "string")
      .map((categoria) => categoria.trim())
      .filter(Boolean);

    const textoBusqueda = [
      cancion.numero,
      cancion.titulo,
      cancion.artista,
      cancion.busqueda || "",
      categorias.join(" ")
    ].join(" ");

    return Object.freeze({
      numero: cancion.numero,
      titulo: cancion.titulo.trim(),
      artista: cancion.artista.trim(),
      categorias,
      favorita: Boolean(cancion.favorita),
      nueva: Boolean(cancion.nueva),
      _textoNormalizado: normalizarTexto(textoBusqueda)
    });
  }

  function esDispositivoMovil() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function guardarInstagramVisitado() {
    estado.instagramVisitado = true;

    try {
      sessionStorage.setItem(CONFIG.claveInstagramVisitado, "1");
      sessionStorage.setItem(
        CONFIG.claveInstagramDesbloqueo,
        String(Date.now() + CONFIG.demoraContinuacionInstagram)
      );
    } catch (error) {
      console.warn("No se pudo guardar el estado de Instagram:", error);
    }
  }

  function instagramFueVisitado() {
    if (estado.instagramVisitado) return true;

    try {
      return sessionStorage.getItem(CONFIG.claveInstagramVisitado) === "1";
    } catch (error) {
      return false;
    }
  }

  let temporizadorContinuacionInstagram = null;

  function obtenerDemoraRestanteInstagram() {
    try {
      const desbloqueo = Number(
        sessionStorage.getItem(CONFIG.claveInstagramDesbloqueo)
      );

      if (!Number.isFinite(desbloqueo)) {
        return CONFIG.demoraContinuacionInstagram;
      }

      return Math.max(0, desbloqueo - Date.now());
    } catch (error) {
      return CONFIG.demoraContinuacionInstagram;
    }
  }

  function programarContinuacionInstagram() {
    if (!instagramFueVisitado()) return;

    window.clearTimeout(temporizadorContinuacionInstagram);

    const demora = obtenerDemoraRestanteInstagram();

    temporizadorContinuacionInstagram = window.setTimeout(() => {
      if (DOM.landing && !DOM.landing.hidden) {
        mostrarContinuacionInstagram();
      }
    }, demora);
  }

  /* ---------------------------------------------------------
     APERTURA INTELIGENTE DE APPS
     --------------------------------------------------------- */
  function abrirAplicacionConRespaldo(urlApp, urlWeb) {
    // En computadora abrimos la web en otra pestaña para conservar la landing.
    if (!esDispositivoMovil()) {
      window.open(urlWeb, "_blank", "noopener,noreferrer");
      return;
    }

    let paginaOculta = false;
    let fallbackId;

    const detectarSalida = () => {
      if (document.visibilityState === "hidden") {
        paginaOculta = true;
        window.clearTimeout(fallbackId);
      }
    };

    document.addEventListener("visibilitychange", detectarSalida, { once: true });

    window.location.href = urlApp;

    fallbackId = window.setTimeout(() => {
      if (!paginaOculta && document.visibilityState === "visible") {
        window.location.href = urlWeb;
      }
    }, CONFIG.esperaFallbackApp);
  }

  function abrirInstagram() {
    if (!esDispositivoMovil()) {
      window.open(CONFIG.instagramWeb, "_blank", "noopener,noreferrer");
      return;
    }

    // No usamos respaldo automático en móvil:
    // así la página original queda detrás de Instagram y al volver
    // aparece directamente el botón Música a la Carta.
    window.location.href = CONFIG.instagramApp;
  }

  function prepararInstagram() {
    if (!DOM.seguirInstagram) return;

    DOM.seguirInstagram.removeAttribute("target");

    DOM.seguirInstagram.addEventListener("click", (evento) => {
      evento.preventDefault();

      guardarInstagramVisitado();
      programarContinuacionInstagram();
      abrirInstagram();
    });

    DOM.enlacesInstagram
      .filter((enlace) => enlace !== DOM.seguirInstagram)
      .forEach((enlace) => {
        enlace.removeAttribute("target");

        enlace.addEventListener("click", (evento) => {
          evento.preventDefault();
          abrirInstagram();
        });
      });
  }

  function prepararWhatsApp() {
    DOM.enlacesWhatsApp.forEach((enlace) => {
      enlace.removeAttribute("target");

      enlace.addEventListener("click", (evento) => {
        evento.preventDefault();
        abrirAplicacionConRespaldo(CONFIG.whatsappApp, CONFIG.whatsappWeb);
      });
    });
  }

  /* ---------------------------------------------------------
     LANDING
     --------------------------------------------------------- */
  function mostrarContinuacionInstagram() {
    if (!DOM.continuarExperiencia || !DOM.entrarRepertorio) return;

    DOM.continuarExperiencia.hidden = false;
    DOM.entrarRepertorio.hidden = false;

    DOM.continuarExperiencia.classList.remove("is-visible");
    void DOM.continuarExperiencia.offsetWidth;
    DOM.continuarExperiencia.classList.add("is-visible");
  }

  function fijarBotonMenu() {
    if (!DOM.volverArriba) return;

    // Lo movemos al final del body para evitar que cualquier contenedor
    // limite su posición fija o lo mande al final de la página.
    if (DOM.volverArriba.parentElement !== document.body) {
      document.body.appendChild(DOM.volverArriba);
    }

    DOM.volverArriba.hidden = false;
    DOM.volverArriba.style.position = "fixed";
    DOM.volverArriba.style.right = "16px";
    DOM.volverArriba.style.bottom = "16px";
    DOM.volverArriba.style.zIndex = "99999";
    DOM.volverArriba.style.display = "inline-flex";
    DOM.volverArriba.style.visibility = "visible";
    DOM.volverArriba.style.opacity = "1";
    DOM.volverArriba.style.pointerEvents = "auto";
  }

  function mostrarAplicacion({ inmediato = false } = {}) {
    if (!DOM.app) return;

    const abrirApp = () => {
      if (DOM.landing) {
        DOM.landing.hidden = true;
        DOM.landing.classList.remove("is-leaving");
      }

      DOM.app.hidden = false;
      DOM.app.classList.add("is-visible");
      document.body.classList.add("app-abierta");

      fijarBotonMenu();

      window.scrollTo({
        top: 0,
        behavior: inmediato ? "auto" : "smooth"
      });
    };

    if (inmediato || !DOM.landing || DOM.landing.hidden) {
      abrirApp();
      return;
    }

    DOM.landing.classList.add("is-leaving");
    window.setTimeout(abrirApp, CONFIG.tiempoSalidaLanding);
  }

  function configurarLanding() {
    if (DOM.continuarExperiencia) {
      DOM.continuarExperiencia.hidden = true;
      DOM.continuarExperiencia.classList.remove("is-visible");
    }

    if (DOM.entrarRepertorio) {
      DOM.entrarRepertorio.hidden = true;
      DOM.entrarRepertorio.addEventListener("click", () => mostrarAplicacion());
    }

    // Si regresó desde Instagram, incluso usando el botón Atrás,
    // recuperamos el estado guardado en esta sesión.
    if (instagramFueVisitado()) {
      estado.instagramVisitado = true;
      programarContinuacionInstagram();
    }

    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        instagramFueVisitado() &&
        DOM.landing &&
        !DOM.landing.hidden
      ) {
        estado.instagramVisitado = true;
        programarContinuacionInstagram();
      }
    });

    window.addEventListener("pageshow", () => {
      if (
        instagramFueVisitado() &&
        DOM.landing &&
        !DOM.landing.hidden
      ) {
        estado.instagramVisitado = true;
        programarContinuacionInstagram();
      }
    });
  }

  /* ---------------------------------------------------------
     CARGA DEL REPERTORIO
     --------------------------------------------------------- */
  async function cargarCanciones() {
    estado.cargando = true;
    estado.error = null;
    actualizarEstadoCarga();

    try {
      const respuesta = await fetch(CONFIG.rutaCanciones, {
        cache: "no-store"
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new TypeError("El archivo canciones.json debe contener una lista.");
      }

      const validas = datos
        .filter(esCancionValida)
        .map(prepararCancion)
        .sort((a, b) => a.numero - b.numero);

      if (validas.length === 0) {
        throw new Error("No se encontraron canciones válidas.");
      }

      estado.canciones = validas;
      estado.cargando = false;
      estado.error = null;

      if (DOM.totalCancionesBoton) {
        DOM.totalCancionesBoton.textContent = String(validas.length);
      }

      actualizarEstadoCarga();
      actualizarInterfaz();
    } catch (error) {
      console.error("No se pudo cargar canciones.json:", error);

      estado.canciones = [];
      estado.cargando = false;
      estado.error = error;

      actualizarEstadoCarga();
    }
  }

  function actualizarEstadoCarga() {
    if (estado.cargando) {
      DOM.contadorCanciones.textContent = "Cargando canciones...";
      DOM.errorCarga.hidden = true;
      return;
    }

    if (estado.error) {
      DOM.contadorCanciones.textContent = "";
      DOM.listaCanciones.innerHTML = "";
      DOM.sinResultados.hidden = true;
      DOM.errorCarga.hidden = false;
      return;
    }

    DOM.errorCarga.hidden = true;
  }

  /* ---------------------------------------------------------
     FILTROS Y BÚSQUEDA
     --------------------------------------------------------- */
  function obtenerTerminosBusqueda() {
    return normalizarTexto(estado.consulta)
      .split(" ")
      .filter(Boolean);
  }

  function coincideConBusqueda(cancion, terminos) {
    if (terminos.length === 0) return true;

    return terminos.every((termino) =>
      cancion._textoNormalizado.includes(termino)
    );
  }

  function coincideConCategoria(cancion) {
    if (!estado.categoriaActiva || estado.categoriaActiva === "Todas") {
      return true;
    }

    return cancion.categorias.includes(estado.categoriaActiva);
  }

  function obtenerCancionesVisibles() {
    const hayBusqueda = normalizarTexto(estado.consulta).length > 0;
    const hayCategoria = Boolean(estado.categoriaActiva);

    if (!estado.mostrarTodas && !hayBusqueda && !hayCategoria) {
      return [];
    }

    const terminos = obtenerTerminosBusqueda();

    return estado.canciones.filter((cancion) =>
      coincideConCategoria(cancion) &&
      coincideConBusqueda(cancion, terminos)
    );
  }

  function seleccionarCategoria(categoria) {
    estado.categoriaActiva = categoria;
    estado.mostrarTodas = categoria === "Todas";

    actualizarBotonesCategorias();
    actualizarBotonMostrarTodo();
    actualizarInterfaz();
  }

  function mostrarTodasLasCanciones() {
    estado.mostrarTodas = true;
    estado.categoriaActiva = "Todas";
    estado.consulta = "";

    if (DOM.buscar) {
      DOM.buscar.value = "";
    }

    actualizarBotonesCategorias();
    actualizarBotonMostrarTodo();
    actualizarInterfaz();

    desplazarA(DOM.listaCanciones, { bloque: "start" });
  }

  function limpiarBusqueda() {
    estado.consulta = "";
    DOM.buscar.value = "";
    DOM.limpiarBusqueda.hidden = true;

    actualizarInterfaz();
    DOM.buscar.focus();
  }

  /* ---------------------------------------------------------
     RENDER
     --------------------------------------------------------- */
  function crearTarjetaCancion(cancion, indice) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "cancion cancion-enter";
    tarjeta.setAttribute("role", "listitem");
    tarjeta.setAttribute("tabindex", "0");
    tarjeta.setAttribute(
      "aria-label",
      `Canción ${cancion.numero}: ${cancion.titulo}, de ${cancion.artista}`
    );
    tarjeta.dataset.numero = String(cancion.numero);

    if (indice < CONFIG.limiteAnimacionTarjetas) {
      tarjeta.style.animationDelay = `${Math.min(indice * 24, 360)}ms`;
    }

    const etiquetas = cancion.categorias
      .map((categoria) => `<span class="tag">${escaparHTML(categoria)}</span>`)
      .join("");

    tarjeta.innerHTML = `
      <div class="numero" aria-hidden="true">${cancion.numero}</div>
      <div class="info">
        <h3 class="titulo">${escaparHTML(cancion.titulo)}</h3>
        <p class="artista">${escaparHTML(cancion.artista)}</p>
        <div class="tags" aria-label="Categorías">${etiquetas}</div>
      </div>
    `;

    const seleccionar = () => seleccionarTarjeta(tarjeta);

    tarjeta.addEventListener("click", seleccionar);
    tarjeta.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        seleccionar();
      }
    });

    return tarjeta;
  }

  function seleccionarTarjeta(tarjeta) {
    DOM.listaCanciones
      .querySelectorAll(".cancion.is-selected")
      .forEach((elemento) => {
        if (elemento !== tarjeta) {
          elemento.classList.remove("is-selected");
        }
      });

    tarjeta.classList.remove("is-selected");
    void tarjeta.offsetWidth;
    tarjeta.classList.add("is-selected");

    window.setTimeout(() => {
      tarjeta.classList.remove("is-selected");
    }, CONFIG.tiempoSeleccionTarjeta);
  }

  function renderizarCanciones(canciones) {
    DOM.listaCanciones.innerHTML = "";

    if (canciones.length === 0) return;

    const fragmento = document.createDocumentFragment();

    canciones.forEach((cancion, indice) => {
      fragmento.appendChild(crearTarjetaCancion(cancion, indice));
    });

    DOM.listaCanciones.appendChild(fragmento);
  }

  function actualizarModoLista() {
    const consultaLimpia = normalizarTexto(estado.consulta);
    const mostrandoListaCompleta =
      estado.mostrarTodas &&
      estado.categoriaActiva === "Todas" &&
      consultaLimpia.length === 0 &&
      estado.canciones.length === 130;

    DOM.listaCanciones.dataset.modo =
      mostrandoListaCompleta ? "todas" : "filtrada";
  }

  function actualizarInterfaz() {
    if (estado.cargando || estado.error) return;

    const cancionesVisibles = obtenerCancionesVisibles();
    const hayBusqueda = normalizarTexto(estado.consulta).length > 0;
    const hayFiltro =
      estado.mostrarTodas ||
      hayBusqueda ||
      Boolean(estado.categoriaActiva);

    actualizarModoLista();
    renderizarCanciones(cancionesVisibles);

    DOM.sinResultados.hidden = !(
      hayFiltro &&
      cancionesVisibles.length === 0 &&
      estado.canciones.length > 0
    );

    actualizarContador(cancionesVisibles);
    actualizarBotonLimpiar();
  }

  function actualizarContador(cancionesVisibles) {
    const total = estado.canciones.length;
    const hayBusqueda = normalizarTexto(estado.consulta).length > 0;
    const hayCategoria = Boolean(estado.categoriaActiva);

    if (!estado.mostrarTodas && !hayBusqueda && !hayCategoria) {
      DOM.contadorCanciones.textContent =
        `${total} canciones disponibles. Elige una categoría, busca una canción o toca “Ver todas las canciones”.`;
      return;
    }

    if (cancionesVisibles.length === 0) {
      DOM.contadorCanciones.textContent = "0 canciones encontradas.";
      return;
    }

    if (cancionesVisibles.length === total) {
      DOM.contadorCanciones.textContent =
        `${total} ${total === 1 ? "canción disponible" : "canciones disponibles"}.`;
      return;
    }

    DOM.contadorCanciones.textContent =
      `${cancionesVisibles.length} de ${total} canciones.`;
  }

  function actualizarBotonesCategorias() {
    DOM.categorias.forEach((boton) => {
      const activa = boton.dataset.categoria === estado.categoriaActiva;
      boton.classList.toggle("is-active", activa);
      boton.setAttribute("aria-pressed", String(activa));
    });
  }

  function actualizarBotonMostrarTodo() {
    const activo =
      estado.mostrarTodas &&
      (!estado.categoriaActiva || estado.categoriaActiva === "Todas");

    DOM.mostrarTodo.classList.toggle("is-active", activo);
    DOM.mostrarTodo.setAttribute("aria-pressed", String(activo));
  }

  function actualizarBotonLimpiar() {
    DOM.limpiarBusqueda.hidden = DOM.buscar.value.length === 0;
  }

  /* ---------------------------------------------------------
     EVENTOS
     --------------------------------------------------------- */
  function registrarEventos() {
    DOM.mostrarTodo?.addEventListener("click", mostrarTodasLasCanciones);

    DOM.categorias.forEach((boton) => {
      boton.setAttribute("aria-pressed", "false");

      boton.addEventListener("click", () => {
        seleccionarCategoria(
          boton.dataset.categoria || CONFIG.categoriaInicial
        );
      });
    });

    DOM.buscar?.addEventListener("input", (evento) => {
      estado.consulta = evento.target.value;

      if (normalizarTexto(estado.consulta)) {
        estado.mostrarTodas = false;
        estado.categoriaActiva = null;
      }

      actualizarBotonesCategorias();
      actualizarBotonMostrarTodo();
      actualizarInterfaz();
    });

    DOM.buscar?.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && DOM.buscar.value) {
        limpiarBusqueda();
      }
    });

    DOM.limpiarBusqueda?.addEventListener("click", limpiarBusqueda);
    DOM.reintentarCarga?.addEventListener("click", cargarCanciones);

    DOM.volverArriba?.addEventListener("click", (evento) => {
      evento.preventDefault();

      desplazarA(DOM.controlesCanciones || DOM.menuCanciones, {
        bloque: "start"
      });
    });
  }

  async function iniciar() {
    capturarDOM();

    if (DOM.anioActual) {
      DOM.anioActual.textContent = String(new Date().getFullYear());
    }

    configurarLanding();
    prepararInstagram();
    prepararWhatsApp();
    registrarEventos();

    if (DOM.volverArriba) {
      DOM.volverArriba.hidden = true;
    }

    await cargarCanciones();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
