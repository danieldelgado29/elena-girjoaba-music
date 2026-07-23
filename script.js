
"use strict";

/* =========================================================
   ELENA GIRJOABA MUSIC
   script.js
   ========================================================= */

(() => {
  /* ---------------------------------------------------------
     01. CONFIGURACIÓN
     --------------------------------------------------------- */
  const CONFIG = Object.freeze({
    rutaCanciones: "canciones.json",
    claveLanding: "egmLandingVisitada",
    tiempoSalidaLanding: 650,
    tiempoSeleccionTarjeta: 900,
    limiteAnimacionTarjetas: 24,
    categoriaInicial: "Todas"
  });

  /* ---------------------------------------------------------
     02. ESTADO
     --------------------------------------------------------- */
  const estado = {
    canciones: [],
    categoriaActiva: null,
    consulta: "",
    mostrarTodas: false,
    cargando: false,
    error: null
  };

  /* ---------------------------------------------------------
     03. REFERENCIAS DEL DOM
     --------------------------------------------------------- */
  const DOM = {};

  function capturarDOM() {
    DOM.landing = document.querySelector("#landing");
    DOM.app = document.querySelector("#app");
    DOM.seguirInstagram = document.querySelector("#seguirInstagram");
    DOM.entrarRepertorio = document.querySelector("#entrarRepertorio");
    DOM.continuarExperiencia = document.querySelector("#continuarExperiencia");

    DOM.mostrarTodo = document.querySelector("#mostrarTodo");
    DOM.buscar = document.querySelector("#buscar");
    DOM.limpiarBusqueda = document.querySelector("#limpiarBusqueda");
    DOM.contadorCanciones = document.querySelector("#contadorCanciones");
    DOM.listaCanciones = document.querySelector("#listaCanciones");
    DOM.menuCanciones = document.querySelector("#menuCanciones");
    DOM.explorador = document.querySelector(".explorador");
    DOM.sinResultados = document.querySelector("#sinResultados");
    DOM.errorCarga = document.querySelector("#errorCarga");
    DOM.reintentarCarga = document.querySelector("#reintentarCarga");
    DOM.categorias = [...document.querySelectorAll(".categoria")];

    DOM.volverArriba = document.querySelector("#volverArriba");
    DOM.anioActual = document.querySelector("#anioActual");
  }

  /* ---------------------------------------------------------
     04. UTILIDADES
     --------------------------------------------------------- */
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

  function guardarPreferencia(clave, valor) {
    try {
      sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      console.warn("No se pudo guardar la preferencia local:", error);
    }
  }

  function leerPreferencia(clave, valorPredeterminado = null) {
    try {
      const valor = sessionStorage.getItem(clave);
      return valor === null ? valorPredeterminado : JSON.parse(valor);
    } catch (error) {
      console.warn("No se pudo leer la preferencia local:", error);
      return valorPredeterminado;
    }
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

  /* ---------------------------------------------------------
     05. LANDING
     --------------------------------------------------------- */
  function marcarInstagramVisitado() {
    DOM.landing?.classList.add("instagram-visitado");

    if (DOM.continuarExperiencia) {
      DOM.continuarExperiencia.hidden = false;
      DOM.continuarExperiencia.classList.remove("is-visible");
      void DOM.continuarExperiencia.offsetWidth;
      DOM.continuarExperiencia.classList.add("is-visible");
    }
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

      window.scrollTo({
        top: 0,
        behavior: inmediato ? "auto" : "smooth"
      });

      window.requestAnimationFrame(actualizarBotonVolverArriba);
    };

    if (inmediato || !DOM.landing || DOM.landing.hidden) {
      abrirApp();
      return;
    }

    DOM.landing.classList.add("is-leaving");
    window.setTimeout(abrirApp, CONFIG.tiempoSalidaLanding);
  }

  function configurarLanding() {
    // Siempre comienza únicamente con el botón de Instagram.
    DOM.landing?.classList.remove("instagram-visitado");
    if (DOM.continuarExperiencia) {
      DOM.continuarExperiencia.hidden = true;
      DOM.continuarExperiencia.classList.remove("is-visible");
    }

    DOM.seguirInstagram?.addEventListener("click", marcarInstagramVisitado);
    DOM.entrarRepertorio?.addEventListener("click", () => mostrarAplicacion());
  }

  /* ---------------------------------------------------------
     06. CARGA Y VALIDACIÓN DEL JSON
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

      validarNumeracion(validas);

      estado.canciones = validas;
      estado.cargando = false;
      estado.error = null;

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

  function validarNumeracion(canciones) {
    const numeros = canciones.map((cancion) => cancion.numero);
    const duplicados = numeros.filter(
      (numero, indice) => numeros.indexOf(numero) !== indice
    );

    if (duplicados.length > 0) {
      console.warn("Hay números de canción duplicados:", [...new Set(duplicados)]);
    }

    const numeroMinimo = Math.min(...numeros);
    const numeroMaximo = Math.max(...numeros);
    const faltantes = [];

    for (let numero = numeroMinimo; numero <= numeroMaximo; numero += 1) {
      if (!numeros.includes(numero)) {
        faltantes.push(numero);
      }
    }

    if (faltantes.length > 0) {
      console.warn("Faltan números en la secuencia:", faltantes);
    }

    if (canciones.length !== 130) {
      console.info(
        `El repertorio contiene ${canciones.length} canciones. ` +
        "El contador se actualizará automáticamente."
      );
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
     07. FILTROS Y BÚSQUEDA
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
     08. RENDER DE TARJETAS
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

  /* ---------------------------------------------------------
     09. ACTUALIZACIÓN DE INTERFAZ
     --------------------------------------------------------- */
  function actualizarInterfaz() {
    if (estado.cargando || estado.error) return;

    const cancionesVisibles = obtenerCancionesVisibles();
    const hayBusqueda = normalizarTexto(estado.consulta).length > 0;
    const hayFiltro =
      estado.mostrarTodas ||
      hayBusqueda ||
      Boolean(estado.categoriaActiva);

    renderizarCanciones(cancionesVisibles);

    DOM.sinResultados.hidden = !(
      hayFiltro &&
      cancionesVisibles.length === 0 &&
      estado.canciones.length > 0
    );

    actualizarContador(cancionesVisibles);
    actualizarBotonLimpiar();
    actualizarBotonVolverArriba();
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
     10. BOTÓN VOLVER ARRIBA
     --------------------------------------------------------- */
  function actualizarBotonVolverArriba() {
    if (!DOM.volverArriba || DOM.app?.hidden) {
      if (DOM.volverArriba) DOM.volverArriba.hidden = true;
      return;
    }

    // Regla simple y estable para computadora y celular.
    DOM.volverArriba.hidden = window.scrollY <= 600;
  }

  /* ---------------------------------------------------------
     11. EVENTOS
     --------------------------------------------------------- */
  function registrarEventos() {
    DOM.mostrarTodo?.addEventListener("click", mostrarTodasLasCanciones);

    DOM.categorias.forEach((boton) => {
      boton.setAttribute("aria-pressed", "false");

      boton.addEventListener("click", () => {
        seleccionarCategoria(boton.dataset.categoria || CONFIG.categoriaInicial);
      });
    });

    DOM.buscar?.addEventListener("input", (evento) => {
      estado.consulta = evento.target.value;

      if (normalizarTexto(estado.consulta)) {
        estado.mostrarTodas = false;
      }

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

    DOM.volverArriba?.addEventListener("click", () => {
      desplazarA(DOM.menuCanciones, { bloque: "start" });
    });

    let scrollPendiente = false;

    window.addEventListener("scroll", () => {
      if (scrollPendiente) return;

      scrollPendiente = true;
      window.requestAnimationFrame(() => {
        actualizarBotonVolverArriba();
        scrollPendiente = false;
      });
    }, { passive: true });

    window.addEventListener("resize", actualizarBotonVolverArriba, {
      passive: true
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        actualizarBotonVolverArriba();

        if (
          DOM.landing &&
          !DOM.landing.hidden &&
          DOM.continuarExperiencia &&
          !DOM.continuarExperiencia.hidden
        ) {
          DOM.continuarExperiencia.classList.remove("is-visible");
          void DOM.continuarExperiencia.offsetWidth;
          DOM.continuarExperiencia.classList.add("is-visible");
        }
      }
    });
  }

  /* ---------------------------------------------------------
     12. INICIALIZACIÓN
     --------------------------------------------------------- */
  async function iniciar() {
    capturarDOM();

    if (DOM.anioActual) {
      DOM.anioActual.textContent = String(new Date().getFullYear());
    }

    configurarLanding();
    registrarEventos();
    actualizarBotonVolverArriba();

    await cargarCanciones();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
