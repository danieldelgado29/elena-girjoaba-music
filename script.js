"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const MODOS = Object.freeze([
  { id: "principal-diario", nombre: "Principal diario" },
  { id: "solo-ingles", nombre: "Solo inglés" },
  { id: "principal-privados", nombre: "Principal privados" },
  { id: "tranquilas-principal", nombre: "Canciones tranquilas · Principal" },
  { id: "tranquilas-todas", nombre: "Canciones tranquilas · Todas + Jazz y Blues" },
  { id: "todas", nombre: "Todas las canciones" },
  { id: "solo-espanol", nombre: "Solo español" }
]);

const CONFIG = Object.freeze({
  claveAdmin: "2907",
  duracionPulsacionAdmin: 5000,
  rutaCanciones: "canciones.json",
  rutaConfiguracion: "configuracion.json",
  instagramApp: "instagram://user?username=elenagirjoabamusic",
  instagramWeb: "https://instagram.com/elenagirjoabamusic",
  telefonoWhatsApp: "593987388915",
  telefonoElena: "593987388915",
  telefonoDaniel: "593992890540",
  claveInstagramVisitado: "egmInstagramVisitado",
  claveInstagramDesbloqueo: "egmInstagramDesbloqueo",
  demoraContinuacionInstagram: 5000,
  rutaAnotaciones: "assets/anotaciones",
  extensionesAnotaciones: ["jpg", "jpeg", "png", "webp"]
});

const estado = {
  todas: [],
  base: [],
  visibles: [],
  modo: "principal-diario",
  modoForzado: false,
  vistaClientes: false,
  categoria: null,
  consulta: "",
  mostrar: false,
  configRemota: {
    lista_activa: "principal-diario",
    pedidos_whatsapp: false,
    mostrar_cola: true,
    inicio_show: 0,
    cola: [],
    tocadas: [],
    lugar: "",
    perfil_clientes: "medio",
    show_activo: false
  },
  firebase: null,
  db: null,
  estadoRef: null,
  duracionShowMs: 8 * 60 * 60 * 1000,
  temporizadorAdmin: null,
  pedidoSeleccionado: null,
  reinicioEnCurso: false,
  contactos: [],
  filtroContactos: "show",
  anotacionesCache: new Map()
};

const DOM = {};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function normalizar(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapar(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function esMovil() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function modoValido(id) {
  return MODOS.some((modo) => modo.id === id);
}

function nombreModo(id) {
  return MODOS.find((modo) => modo.id === id)?.nombre || id;
}

function obtenerCancion(id) {
  return estado.todas.find((cancion) => cancion.id === id) || null;
}

function capturarDOM() {
  Object.assign(DOM, {
    landing: $("#landing"),
    app: $("#app"),
    seguirInstagram: $("#seguirInstagram"),
    continuar: $("#continuarExperiencia"),
    entrar: $("#entrarRepertorio"),
    mostrarTodo: $("#mostrarTodo"),
    textoMostrarTodo: $("#textoMostrarTodo"),
    totalBoton: $("#totalCancionesBoton"),
    buscar: $("#buscar"),
    limpiar: $("#limpiarBusqueda"),
    contador: $("#contadorCanciones"),
    lista: $("#listaCanciones"),
    sinResultados: $("#sinResultados"),
    errorCarga: $("#errorCarga"),
    reintentar: $("#reintentarCarga"),
    categorias: $$(".categoria"),
    controles: $("#controlesCanciones"),
    volver: $("#volverArriba"),
    anio: $("#anioActual"),
    adminTrigger: $("#adminTrigger"),
    adminTriggerPortada: $("#adminTriggerPortada"),
    adminModal: $("#adminModal"),
    adminAcceso: $("#adminAcceso"),
    adminSelector: $("#adminSelector"),
    adminClave: $("#adminClave"),
    adminError: $("#adminError"),
    adminIngresar: $("#adminIngresar"),
    adminOpciones: $("#adminOpciones"),
    adminGuardar: $("#adminGuardar"),
    adminEstado: $("#adminEstado"),
    adminPedidosWhatsapp: $("#adminPedidosWhatsapp"),
    adminMostrarCola: $("#adminMostrarCola"),
    adminLugar: $("#adminLugar"),
    adminBuscarCancion: $("#adminBuscarCancion"),
    adminListaCompleta: $("#adminListaCompleta"),
    adminColaFija: $("#adminColaFija"),
    adminColaFijaCantidad: $("#adminColaFijaCantidad"),
    adminColaFijaVacia: $("#adminColaFijaVacia"),
    adminFinalizarShow: $("#adminFinalizarShow"),
    adminVolverConfiguracion: $("#adminVolverConfiguracion"),
    adminSubir: $("#adminSubir"),
    adminPasoConfiguracion: $("#adminPasoConfiguracion"),
    adminPasoCanciones: $("#adminPasoCanciones"),
    adminVistaEstadisticas: $("#adminVistaEstadisticas"),
    adminVistaHerramientas: $("#adminVistaHerramientas"),
    adminVistaTitulo: $("#adminVistaTitulo"),
    adminShowLugar: $("#adminShowLugar"),
    adminShowLista: $("#adminShowLista"),
    adminShowPerfil: $("#adminShowPerfil"),
    adminAccionesCanciones: $("#adminAccionesCanciones"),
    adminMenuBoton: $("#adminMenuBoton"),
    adminMenuLateral: $("#adminMenuLateral"),
    adminCerrarSesion: $("#adminCerrarSesion"),
    firebaseEstado: $("#firebaseEstado"),
    estadoShowPublico: $("#estadoShowPublico"),
    colaPublica: $("#colaPublica"),
    colaPublicaVacia: $("#colaPublicaVacia"),
    tocadasPublicas: $("#tocadasPublicas"),
    tocadasPublicasVacia: $("#tocadasPublicasVacia"),
    pedidoModal: $("#pedidoModal"),
    pedidoCancion: $("#pedidoCancion"),
    pedidoNombre: $("#pedidoNombre"),
    pedidoTelefono: $("#pedidoTelefono"),
    pedidoConsentimiento: $("#pedidoConsentimiento"),
    pedidoError: $("#pedidoError"),
    pedidoEnviar: $("#pedidoEnviar"),
    adminCantidadContactos: $("#adminCantidadContactos"),
    adminListaContactos: $("#adminListaContactos"),
    adminFiltrosContactos: $$("[data-contactos-filtro]"),
    adminCompartirContactosElena: $("#adminCompartirContactosElena"),
    adminCompartirContactosDaniel: $("#adminCompartirContactosDaniel"),
    adminExportarContactos: $("#adminExportarContactos"),
    adminAbrirPublico: $("#adminAbrirPublico"),
    adminAbrirClientes: $("#adminAbrirClientes"),
    adminCopiarEnlace: $("#adminCopiarEnlace"),
    adminCompartirElena: $("#adminCompartirElena"),
    adminCompartirDaniel: $("#adminCompartirDaniel"),
    adminExportarDatos: $("#adminExportarDatos"),
    notasModal: $("#notasModal"),
    notasCancion: $("#notasCancion"),
    notasImagen: $("#notasImagen")
  });
}

async function cargarDatos() {
  const [respuestaCanciones, respuestaConfig] = await Promise.all([
    fetch(CONFIG.rutaCanciones, { cache: "no-store" }),
    fetch(CONFIG.rutaConfiguracion, { cache: "no-store" })
  ]);

  if (!respuestaCanciones.ok) {
    throw new Error("No se pudieron cargar las canciones.");
  }

  estado.todas = await respuestaCanciones.json();

  const configuracion = respuestaConfig.ok
    ? await respuestaConfig.json()
    : {};

  estado.duracionShowMs =
    Number(configuracion.duracionShowHoras || 8) * 60 * 60 * 1000;

  const parametroLista = new URLSearchParams(window.location.search).get("lista");

  if (modoValido(parametroLista)) {
    estado.modo = parametroLista;
    estado.modoForzado = true;
    estado.vistaClientes = parametroLista === "todas";
  } else {
    estado.modo = configuracion.modoPredeterminado || "principal-diario";
  }

  iniciarFirebase(configuracion.firebase);
  aplicarModo(estado.modo, false);
}

function iniciarFirebase(firebaseConfig) {
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
    actualizarEstadoFirebase("Sin configuración", "error");
    return;
  }

  try {
    estado.firebase = initializeApp(firebaseConfig);
    estado.db = getFirestore(estado.firebase);
    estado.estadoRef = doc(estado.db, "config", "estado");

    onSnapshot(
      estado.estadoRef,
      async (snapshot) => {
        const datos = snapshot.exists() ? snapshot.data() : {};

        if (!snapshot.exists()) {
          await setDoc(
            estado.estadoRef,
            {
              lista_activa: estado.modo,
              pedidos_whatsapp: false,
              mostrar_cola: true,
              inicio_show: Date.now(),
              cola: [],
              tocadas: []
            },
            { merge: true }
          );
          return;
        }

        const listaRemota =
          datos.lista_activa ||
          datos.listaActiva ||
          estado.configRemota.lista_activa ||
          estado.modo;

        estado.configRemota = {
          lista_activa: modoValido(listaRemota) ? listaRemota : "principal-diario",
          pedidos_whatsapp: Boolean(datos.pedidos_whatsapp),
          mostrar_cola: datos.mostrar_cola !== false,
          inicio_show: Number(datos.inicio_show || 0),
          cola: Array.isArray(datos.cola) ? datos.cola : [],
          tocadas: Array.isArray(datos.tocadas) ? datos.tocadas : [],
          lugar: String(datos.lugar || ""),
          perfil_clientes: ["alto", "medio", "bajo"].includes(datos.perfil_clientes)
            ? datos.perfil_clientes
            : "medio",
          show_activo: Boolean(datos.show_activo)
        };

        actualizarEstadoFirebase("En línea", "online");
        await comprobarReinicioAutomatico();
        await cargarContactos();

        if (!estado.modoForzado && estado.modo !== estado.configRemota.lista_activa) {
          aplicarModo(estado.configRemota.lista_activa, false);
        }

        sincronizarInterfazRemota();
      },
      (error) => {
        console.error("Error de Firestore:", error);
        actualizarEstadoFirebase("Sin conexión", "error");
      }
    );
  } catch (error) {
    console.error("No se pudo iniciar Firebase:", error);
    actualizarEstadoFirebase("Error", "error");
  }
}

async function comprobarReinicioAutomatico() {
  if (
    !estado.estadoRef ||
    estado.reinicioEnCurso ||
    !estado.configRemota.inicio_show
  ) {
    return;
  }

  const vencido =
    Date.now() - estado.configRemota.inicio_show >= estado.duracionShowMs;

  if (!vencido) return;

  estado.reinicioEnCurso = true;

  try {
    await updateDoc(estado.estadoRef, {
      inicio_show: Date.now(),
      fin_show: null,
      show_activo: true,
      cola: [],
      tocadas: []
    });
  } catch (error) {
    console.error("No se pudo reiniciar automáticamente:", error);
  } finally {
    estado.reinicioEnCurso = false;
  }
}

function actualizarEstadoFirebase(texto, tipo = "") {
  if (!DOM.firebaseEstado) return;

  DOM.firebaseEstado.textContent = texto;
  DOM.firebaseEstado.classList.toggle("is-online", tipo === "online");
  DOM.firebaseEstado.classList.toggle("is-error", tipo === "error");
}


function actualizarCategoriasDisponibles() {
  DOM.categorias.forEach((boton) => {
    const categoria = boton.dataset.categoria;

    const tieneCanciones = estado.base.some((cancion) =>
      cancion.categorias.includes(categoria)
    );

    boton.hidden = !tieneCanciones;

    if (!tieneCanciones && estado.categoria === categoria) {
      estado.categoria = null;
      boton.classList.remove("is-active");
      boton.setAttribute("aria-pressed", "false");
    }
  });
}

function aplicarModo(modo, desplazar = true) {
  estado.modo = modo;
  estado.base = estado.todas.filter((cancion) => cancion.listas.includes(modo));
  estado.categoria = null;
  estado.consulta = "";
  estado.mostrar = false;

  if (DOM.buscar) DOM.buscar.value = "";

  DOM.categorias.forEach((boton) => {
    boton.classList.remove("is-active");
    boton.setAttribute("aria-pressed", "false");
  });

  actualizarCategoriasDisponibles();
  actualizarControles();
  renderizar();

  if (desplazar) {
    DOM.controles?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function obtenerVisibles() {
  if (!estado.mostrar && !estado.categoria && !normalizar(estado.consulta)) {
    return [];
  }

  const terminos = normalizar(estado.consulta).split(" ").filter(Boolean);

  return estado.base.filter((cancion) => {
    const coincideCategoria =
      !estado.categoria || cancion.categorias.includes(estado.categoria);

    const texto = normalizar(
      [
        cancion.titulo,
        cancion.artista,
        cancion.categorias.join(" "),
        cancion.idioma
      ].join(" ")
    );

    return (
      coincideCategoria &&
      terminos.every((termino) => texto.includes(termino))
    );
  });
}

function actualizarControles() {
  const cantidad = estado.base.length;

  if (DOM.totalBoton) {
    DOM.totalBoton.textContent = String(cantidad);
  }

  if (DOM.textoMostrarTodo) {
    DOM.textoMostrarTodo.textContent = `Ver las ${cantidad} canciones`;
  }

  if (DOM.limpiar && DOM.buscar) {
    DOM.limpiar.hidden = !DOM.buscar.value;
  }
}

function estadoCancion(id) {
  if (estado.vistaClientes) return "disponible";
  if (estado.configRemota.tocadas.includes(id)) return "tocada";
  if (estado.configRemota.cola.includes(id)) return "cola";
  return "disponible";
}

function crearTarjeta(cancion, indice) {
  const situacion = estadoCancion(cancion.id);
  const articulo = document.createElement("article");

  articulo.className = "cancion cancion-enter";
  articulo.dataset.id = cancion.id;
  articulo.dataset.estado = situacion;
  articulo.setAttribute("role", "listitem");
  articulo.tabIndex = 0;

  const etiquetaEstado =
    situacion === "cola"
      ? '<span class="cancion__estado cancion__estado--cola">Ya pedida</span>'
      : situacion === "tocada"
        ? '<span class="cancion__estado cancion__estado--tocada">Ya sonó</span>'
        : "";

  const puedePedir =
    !estado.vistaClientes &&
    estado.configRemota.pedidos_whatsapp &&
    situacion === "disponible";

  const botonPedido = estado.vistaClientes
    ? ""
    : puedePedir
      ? '<button class="cancion__pedir" type="button">Pedir por WhatsApp</button>'
      : situacion === "cola"
        ? '<button class="cancion__pedir" type="button" disabled>Esta canción ya fue pedida</button>'
        : situacion === "tocada"
          ? '<button class="cancion__pedir" type="button" disabled>Esta canción ya sonó</button>'
          : "";

  articulo.innerHTML = `
    ${etiquetaEstado}
    <div class="numero" aria-hidden="true">${indice + 1}</div>
    <div class="info">
      <h3 class="titulo">${escapar(cancion.titulo)}</h3>
      <p class="artista">${escapar(cancion.artista)}</p>
      <div class="tags">
        ${cancion.categorias
          .map((categoria) => `<span class="tag">${escapar(categoria)}</span>`)
          .join("")}
      </div>
      ${botonPedido}
    </div>
  `;

  articulo
    .querySelector(".cancion__pedir:not([disabled])")
    ?.addEventListener("click", (evento) => {
      evento.stopPropagation();
      abrirPedido(cancion);
    });

  return articulo;
}

function renderizar() {
  estado.visibles = obtenerVisibles();
  DOM.lista.innerHTML = "";

  const listaCompleta =
    estado.mostrar &&
    !estado.categoria &&
    !normalizar(estado.consulta);

  DOM.lista.dataset.modo = listaCompleta ? "todas" : "filtrada";
  DOM.lista.style.setProperty(
    "--filas-lista",
    Math.ceil(estado.visibles.length / 2)
  );

  const fragmento = document.createDocumentFragment();

  estado.visibles.forEach((cancion, indice) => {
    fragmento.appendChild(crearTarjeta(cancion, indice));
  });

  DOM.lista.appendChild(fragmento);

  const hayFiltro =
    estado.mostrar ||
    Boolean(estado.categoria) ||
    Boolean(normalizar(estado.consulta));

  DOM.sinResultados.hidden = !(hayFiltro && estado.visibles.length === 0);

  if (!hayFiltro) {
    DOM.contador.textContent =
      `${estado.base.length} canciones disponibles en ${nombreModo(estado.modo)}.`;
  } else if (estado.visibles.length === estado.base.length) {
    DOM.contador.textContent =
      `${estado.base.length} canciones disponibles.`;
  } else {
    DOM.contador.textContent =
      `${estado.visibles.length} canciones encontradas.`;
  }
}

function sincronizarInterfazRemota() {
  renderizarEstadoPublico();
  renderizarColaFijaAdmin();

  if (DOM.adminPasoCanciones && !DOM.adminPasoCanciones.hidden) {
    renderizarListaMaestra();
  }

  if (DOM.adminPedidosWhatsapp) {
    DOM.adminPedidosWhatsapp.checked =
      estado.configRemota.pedidos_whatsapp;
  }

  if (DOM.adminMostrarCola) {
    DOM.adminMostrarCola.checked =
      estado.configRemota.mostrar_cola;
  }

  if (estado.visibles.length || estado.mostrar || estado.categoria || estado.consulta) {
    renderizar();
  }
}

function numeroCancionEnLista(idCancion) {
  const indice = estado.base.findIndex(
    (cancion) => cancion.id === idCancion
  );

  return indice >= 0 ? indice + 1 : null;
}

function renderizarColaFijaAdmin() {
  if (!DOM.adminColaFija) return;

  const canciones = estado.configRemota.cola
    .map(obtenerCancion)
    .filter(Boolean);

  DOM.adminColaFijaCantidad.textContent = String(canciones.length);
  DOM.adminColaFijaVacia.hidden = canciones.length > 0;

  DOM.adminColaFija.innerHTML = canciones
    .map((cancion) => {
      const numero = numeroCancionEnLista(cancion.id);

      return `
        <li>
          <span class="admin-cola-fija__numero">${numero || "—"}</span>
          <span class="admin-cola-fija__cancion">${escapar(cancion.titulo)}</span>
          <button
            class="admin-cola-fija__tocada"
            type="button"
            data-cola-fija-tocada="${cancion.id}"
          >
            Tocada
          </button>
        </li>
      `;
    })
    .join("");

  DOM.adminColaFija
    .querySelectorAll("[data-cola-fija-tocada]")
    .forEach((boton) => {
      boton.addEventListener("click", async () => {
        await marcarTocada(boton.dataset.colaFijaTocada);
        renderizarColaFijaAdmin();
        renderizarListaMaestra();
      });
    });
}

function renderizarEstadoPublico() {
  if (estado.vistaClientes || !estado.configRemota.mostrar_cola) {
    DOM.estadoShowPublico.hidden = true;
    document.body.classList.remove("cola-publica-visible");
    return;
  }

  DOM.estadoShowPublico.hidden = false;
  document.body.classList.add("cola-publica-visible");

  const cancionesCola = estado.configRemota.cola
    .map(obtenerCancion)
    .filter(Boolean);

  DOM.colaPublica.innerHTML = cancionesCola
    .map((cancion) => {
      const numero = numeroCancionEnLista(cancion.id);

      return `
        <li>
          <span class="cola-publica-compacta__numero">${numero || "—"}</span>
          <span class="cola-publica-compacta__cancion">${escapar(cancion.titulo)}</span>
          <span class="cola-publica-compacta__estado">A la cola</span>
        </li>
      `;
    })
    .join("");

  DOM.colaPublicaVacia.hidden = cancionesCola.length > 0;

  const hayCancionesEnCola = cancionesCola.length > 0;
  DOM.estadoShowPublico.classList.toggle(
    "cola-publica-compacta--con-canciones",
    hayCancionesEnCola
  );
  document.body.classList.toggle(
    "cola-publica-visible",
    hayCancionesEnCola
  );
}

function mostrarApp() {
  DOM.landing.hidden = true;
  DOM.app.hidden = false;
  document.body.classList.add("app-abierta");
  fijarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fijarMenu() {
  if (!DOM.volver) return;

  if (DOM.volver.parentElement !== document.body) {
    document.body.appendChild(DOM.volver);
  }

  DOM.volver.hidden = false;

  Object.assign(DOM.volver.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "99999",
    display: "inline-flex",
    visibility: "visible",
    opacity: "1"
  });
}

function mostrarContinuacion() {
  DOM.continuar.hidden = false;
  DOM.entrar.hidden = false;
  DOM.continuar.classList.remove("is-visible");
  void DOM.continuar.offsetWidth;
  DOM.continuar.classList.add("is-visible");
}

function guardarVisitaInstagram() {
  sessionStorage.setItem(CONFIG.claveInstagramVisitado, "1");
  sessionStorage.setItem(
    CONFIG.claveInstagramDesbloqueo,
    String(Date.now() + CONFIG.demoraContinuacionInstagram)
  );
}

function programarContinuacion() {
  if (sessionStorage.getItem(CONFIG.claveInstagramVisitado) !== "1") return;

  const demora = Math.max(
    0,
    Number(sessionStorage.getItem(CONFIG.claveInstagramDesbloqueo) || 0) -
      Date.now()
  );

  window.setTimeout(() => {
    if (!DOM.landing.hidden) mostrarContinuacion();
  }, demora);
}

function abrirInstagram() {
  if (esMovil()) {
    window.location.href = CONFIG.instagramApp;
    return;
  }

  const nuevaPestana = window.open(
    CONFIG.instagramWeb,
    "_blank",
    "noopener,noreferrer"
  );

  if (!nuevaPestana) {
    const enlace = document.createElement("a");
    enlace.href = CONFIG.instagramWeb;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }
}

function abrirAplicacionConRespaldo(urlApp, urlWeb) {
  if (!esMovil()) {
    window.open(urlWeb, "_blank", "noopener,noreferrer");
    return;
  }

  // En móvil abrimos únicamente la aplicación.
  // Si la persona cancela el aviso del navegador, permanece en esta página.
  window.location.href = urlApp;
}

function abrirAdmin() {
  DOM.adminModal.hidden = false;
  document.body.classList.add("admin-abierto");
  DOM.adminAcceso.hidden = false;
  DOM.adminSelector.hidden = true;
  DOM.adminClave.value = "";
  DOM.adminError.hidden = true;
  window.setTimeout(() => DOM.adminClave.focus(), 100);
}

function cerrarAdmin() {
  DOM.adminModal.hidden = true;
  document.body.classList.remove("admin-abierto");
}

function mostrarSelectorAdmin() {
  DOM.adminAcceso.hidden = true;
  DOM.adminSelector.hidden = false;

  DOM.adminOpciones.innerHTML = MODOS.map((modo) => {
    const cantidad = estado.todas.filter((cancion) =>
      cancion.listas.includes(modo.id)
    ).length;

    return `
      <label class="admin-opcion">
        <input
          type="radio"
          name="modoAdmin"
          value="${modo.id}"
          ${modo.id === estado.configRemota.lista_activa ? "checked" : ""}
        >
        <span class="admin-opcion__nombre">${modo.nombre}</span>
        <span class="admin-opcion__cantidad">${cantidad}</span>
      </label>
    `;
  }).join("");

  DOM.adminPedidosWhatsapp.checked =
    estado.configRemota.pedidos_whatsapp;

  DOM.adminMostrarCola.checked =
    estado.configRemota.mostrar_cola;

  DOM.adminLugar.value = estado.configRemota.lugar || "";

  const perfil = document.querySelector(
    `input[name="perfilClientes"][value="${estado.configRemota.perfil_clientes}"]`
  );

  if (perfil) perfil.checked = true;

  mostrarVistaAdmin("configuracion");
}

function iniciarPulsacionAdmin() {
  window.clearTimeout(estado.temporizadorAdmin);
  estado.temporizadorAdmin = window.setTimeout(
    abrirAdmin,
    CONFIG.duracionPulsacionAdmin
  );
}

function cancelarPulsacionAdmin() {
  window.clearTimeout(estado.temporizadorAdmin);
}

async function guardarConfiguracionAdmin() {
  if (!estado.estadoRef) {
    DOM.adminEstado.textContent = "Firebase todavía no está conectado.";
    return;
  }

  const listaElegida =
    document.querySelector('input[name="modoAdmin"]:checked')?.value ||
    estado.configRemota.lista_activa;

  const perfilElegido =
    document.querySelector('input[name="perfilClientes"]:checked')?.value ||
    "medio";

  const lugar = DOM.adminLugar.value.trim();

  DOM.adminEstado.textContent = "Guardando configuración…";

  try {
    await setDoc(
      estado.estadoRef,
      {
        lista_activa: listaElegida,
        listaActiva: listaElegida,
        pedidos_whatsapp: DOM.adminPedidosWhatsapp.checked,
        mostrar_cola: DOM.adminMostrarCola.checked,
        lugar,
        perfil_clientes: perfilElegido,
        inicio_show: Date.now(),
        fin_show: null,
        show_activo: true,
        cola: [],
        tocadas: []
      },
      { merge: true }
    );

    estado.configRemota.lista_activa = listaElegida;
    estado.configRemota.lugar = lugar;
    estado.configRemota.perfil_clientes = perfilElegido;
    estado.configRemota.show_activo = true;

    if (!estado.modoForzado) {
      aplicarModo(listaElegida, false);
    }

    DOM.adminEstado.textContent = "";
    mostrarVistaAdmin("canciones");
  } catch (error) {
    console.error(error);
    DOM.adminEstado.textContent =
      "No se pudo guardar. Revisa Firebase y las reglas de Firestore.";
  }
}


function slugAnotacion(titulo = "") {
  return normalizar(titulo)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function detectarAnotacion(cancion) {
  if (!cancion) return null;

  if (estado.anotacionesCache.has(cancion.id)) {
    return estado.anotacionesCache.get(cancion.id);
  }

  const slug = slugAnotacion(cancion.titulo);

  for (const extension of CONFIG.extensionesAnotaciones) {
    const ruta = `${CONFIG.rutaAnotaciones}/${slug}.${extension}`;

    try {
      const respuesta = await fetch(ruta, {
        method: "HEAD",
        cache: "no-store"
      });

      if (respuesta.ok) {
        estado.anotacionesCache.set(cancion.id, ruta);
        return ruta;
      }
    } catch (error) {
      // Probamos la siguiente extensión.
    }
  }

  estado.anotacionesCache.set(cancion.id, null);
  return null;
}

async function abrirNotas(cancion) {
  const ruta = await detectarAnotacion(cancion);

  if (!ruta) {
    DOM.adminEstado.textContent =
      `No hay anotaciones para “${cancion.titulo}”.`;
    return;
  }

  DOM.notasCancion.textContent = `${cancion.titulo} — ${cancion.artista}`;
  DOM.notasImagen.src = ruta;
  DOM.notasImagen.alt = `Anotaciones de ${cancion.titulo}`;
  DOM.notasModal.hidden = false;
  document.body.classList.add("notas-abiertas");
}

function cerrarNotas() {
  DOM.notasModal.hidden = true;
  DOM.notasImagen.removeAttribute("src");

  if (DOM.notasNavegacion) {
    DOM.notasNavegacion.hidden = true;
  }

  estado.paginasNotas = [];
  estado.indicePaginaNotas = 0;
  document.body.classList.remove("notas-abiertas");

  if (DOM.adminSelector && !DOM.adminSelector.hidden) {
    mostrarVistaAdmin("canciones");
  }
}

async function añadirBotonesNotas(resultados) {
  await Promise.all(
    resultados.map(async (cancion) => {
      const ruta = await detectarAnotacion(cancion);
      if (!ruta) return;

      const tarjeta = document.querySelector(
        `.admin-cancion[data-cancion-id="${CSS.escape(cancion.id)}"]`
      );

      if (!tarjeta || tarjeta.querySelector("[data-admin-notas]")) return;

      const boton = document.createElement("button");
      boton.className =
        "admin-cancion__accion admin-cancion__accion--notas";
      boton.type = "button";
      boton.dataset.adminNotas = cancion.id;
      boton.textContent = "Notas";
      boton.addEventListener("click", () => abrirNotas(cancion));
      tarjeta.appendChild(boton);
    })
  );
}


function nombrePerfil(perfil) {
  return perfil === "alto"
    ? "Alto potencial"
    : perfil === "bajo"
      ? "Bajo potencial"
      : "Potencial medio";
}

function ocultarVistasAdmin() {
  [
    DOM.adminPasoConfiguracion,
    DOM.adminPasoCanciones,
    DOM.adminVistaEstadisticas,
    DOM.adminVistaHerramientas
  ].forEach((vista) => {
    if (vista) vista.hidden = true;
  });

  if (DOM.adminAccionesCanciones) {
    DOM.adminAccionesCanciones.hidden = true;
  }
}

function cerrarMenuAdmin() {
  DOM.adminMenuLateral.hidden = true;
  DOM.adminMenuBoton.setAttribute("aria-expanded", "false");
}

function mostrarVistaAdmin(vista) {
  ocultarVistasAdmin();
  cerrarMenuAdmin();

  if (vista === "canciones") {
    DOM.adminVistaTitulo.textContent = "Control de canciones";
    DOM.adminPasoCanciones.hidden = false;

    if (DOM.adminAccionesCanciones) {
      DOM.adminAccionesCanciones.hidden = false;
    }
    DOM.adminShowLugar.textContent =
      estado.configRemota.lugar || "Sin definir";
    DOM.adminShowLista.textContent =
      nombreModo(estado.configRemota.lista_activa);
    DOM.adminShowPerfil.textContent =
      nombrePerfil(estado.configRemota.perfil_clientes);
    DOM.adminBuscarCancion.value = "";
    renderizarColaFijaAdmin();
    renderizarListaMaestra();
    return;
  }

  if (vista === "estadisticas") {
    DOM.adminVistaTitulo.textContent = "Estadísticas y contactos";
    DOM.adminVistaEstadisticas.hidden = false;
    cargarContactos();
    return;
  }

  if (vista === "herramientas") {
    DOM.adminVistaTitulo.textContent = "Compartir y enlaces";
    DOM.adminVistaHerramientas.hidden = false;
    return;
  }

  DOM.adminVistaTitulo.textContent = "Configuración del show";
  DOM.adminPasoConfiguracion.hidden = false;
}

function cancionesPanelMaestro() {
  const consultaOriginal = String(
    DOM.adminBuscarCancion?.value || ""
  ).trim();

  if (!consultaOriginal) {
    return estado.base;
  }

  // Si Elena escribe únicamente un número, busca la posición
  // consecutiva de la canción dentro de la lista activa.
  if (/^\d+$/.test(consultaOriginal)) {
    const numeroBuscado = Number(consultaOriginal);

    return estado.base.filter(
      (cancion, indice) => indice + 1 === numeroBuscado
    );
  }

  const consulta = normalizar(consultaOriginal);
  const terminos = consulta.split(" ").filter(Boolean);

  return estado.base.filter((cancion) => {
    const texto = normalizar(`${cancion.titulo} ${cancion.artista}`);
    return terminos.every((termino) => texto.includes(termino));
  });
}

async function crearFilaMaestra(cancion, indice) {
  const situacion = estadoCancion(cancion.id);
  const fila = document.createElement("article");

  fila.className = "admin-lista-cancion";
  fila.dataset.estado = situacion;
  fila.dataset.cancionId = cancion.id;

  fila.innerHTML = `
    <span class="admin-lista-cancion__numero" aria-hidden="true">${indice + 1}</span>

    <div class="admin-lista-cancion__info">
      <strong>${escapar(cancion.titulo)}</strong>
      <small>${escapar(cancion.artista)} · ${
        situacion === "tocada"
          ? "Ya sonó"
          : situacion === "cola"
            ? "En cola"
            : "Disponible"
      }</small>
    </div>

    <button
      class="admin-lista-cancion__boton admin-lista-cancion__boton--tocada"
      type="button"
      data-maestra-tocada="${cancion.id}"
    >
      Tocada
    </button>

    <button
      class="admin-lista-cancion__boton admin-lista-cancion__boton--cola"
      type="button"
      data-maestra-cola="${cancion.id}"
      ${situacion === "cola" ? "disabled" : ""}
    >
      ${situacion === "cola" ? "En cola" : "A la cola"}
    </button>
  `;

  const anotacion = await detectarAnotacion(cancion);

  if (anotacion) {
    const botonNotas = document.createElement("button");
    botonNotas.className =
      "admin-lista-cancion__boton admin-lista-cancion__boton--notas";
    botonNotas.type = "button";
    botonNotas.textContent = "Notas";
    botonNotas.addEventListener("click", () => abrirNotas(cancion));
    fila.appendChild(botonNotas);
  }

  fila
    .querySelector("[data-maestra-tocada]")
    .addEventListener("click", async () => {
      await marcarTocada(cancion.id);
      renderizarListaMaestra();
    });

  const botonCola = fila.querySelector("[data-maestra-cola]");

  if (!botonCola.disabled) {
    botonCola.addEventListener("click", async () => {
      await agregarACola(cancion.id);
      renderizarColaFijaAdmin();
      renderizarListaMaestra();
    });
  }

  return fila;
}

async function renderizarListaMaestra() {
  if (!DOM.adminListaCompleta || DOM.adminPasoCanciones.hidden) return;

  const canciones = cancionesPanelMaestro();
  DOM.adminListaCompleta.innerHTML = "";

  if (!canciones.length) {
    DOM.adminListaCompleta.innerHTML =
      '<p class="admin-panel__ayuda">No encontramos esa canción.</p>';
    return;
  }

  const fragmento = document.createDocumentFragment();

  for (const cancion of canciones) {
    const indiceOriginal = estado.base.findIndex(
      (elemento) => elemento.id === cancion.id
    );

    fragmento.appendChild(
      await crearFilaMaestra(cancion, indiceOriginal)
    );
  }

  DOM.adminListaCompleta.appendChild(fragmento);
}

function buscarCancionesAdmin() {
  const consulta = normalizar(DOM.adminBuscarCancion.value);

  if (!consulta) {
    DOM.adminResultadosCanciones.innerHTML =
      '<p class="admin-panel__ayuda">Busca una canción para agregarla a la cola o marcarla como tocada.</p>';
    return;
  }

  const terminos = consulta.split(" ").filter(Boolean);

  const resultados = estado.base
    .filter((cancion) => {
      const texto = normalizar(`${cancion.titulo} ${cancion.artista}`);
      return terminos.every((termino) => texto.includes(termino));
    })
    .slice(0, 8);

  if (!resultados.length) {
    DOM.adminResultadosCanciones.innerHTML =
      '<p class="admin-panel__ayuda">No encontramos esa canción.</p>';
    return;
  }

  DOM.adminResultadosCanciones.innerHTML = resultados
    .map((cancion) => {
      const situacion = estadoCancion(cancion.id);

      return `
        <article class="admin-cancion" data-cancion-id="${cancion.id}">
          <div class="admin-cancion__info">
            <strong>${escapar(cancion.titulo)}</strong>
            <small>${escapar(cancion.artista)} · ${situacion === "cola" ? "En cola" : situacion === "tocada" ? "Ya sonó" : "Disponible"}</small>
          </div>

          <button
            class="admin-cancion__accion admin-cancion__accion--tocada"
            type="button"
            data-admin-tocada="${cancion.id}"
          >
            Tocada
          </button>

          <button
            class="admin-cancion__accion admin-cancion__accion--cola"
            type="button"
            data-admin-cola="${cancion.id}"
          >
            A la cola
          </button>
        </article>
      `;
    })
    .join("");

  $$("[data-admin-cola]").forEach((boton) => {
    boton.addEventListener("click", () =>
      agregarACola(boton.dataset.adminCola)
    );
  });

  $$("[data-admin-tocada]").forEach((boton) => {
    boton.addEventListener("click", () =>
      marcarTocada(boton.dataset.adminTocada)
    );
  });

  añadirBotonesNotas(resultados);
}

async function agregarACola(idCancion) {
  if (!estado.estadoRef || !idCancion) return;

  try {
    await updateDoc(estado.estadoRef, {
      cola: arrayUnion(idCancion),
      tocadas: arrayRemove(idCancion)
    });

    DOM.adminEstado.textContent = "Canción agregada a la cola.";
  } catch (error) {
    console.error(error);
    DOM.adminEstado.textContent = "No se pudo agregar la canción.";
  }
}

async function quitarDeCola(idCancion) {
  if (!estado.estadoRef || !idCancion) return;

  try {
    await updateDoc(estado.estadoRef, {
      cola: arrayRemove(idCancion)
    });
  } catch (error) {
    console.error(error);
  }
}

async function marcarTocada(idCancion) {
  if (!estado.estadoRef || !idCancion) return;

  try {
    await updateDoc(estado.estadoRef, {
      cola: arrayRemove(idCancion),
      tocadas: arrayUnion(idCancion)
    });

    DOM.adminEstado.textContent = "Canción marcada como tocada.";
  } catch (error) {
    console.error(error);
    DOM.adminEstado.textContent = "No se pudo marcar la canción.";
  }
}

function renderizarAdminCola() {
  if (!DOM.adminCola) return;

  const canciones = estado.configRemota.cola
    .map(obtenerCancion)
    .filter(Boolean);

  DOM.adminCantidadCola.textContent = String(canciones.length);
  DOM.adminColaVacia.hidden = canciones.length > 0;

  DOM.adminCola.innerHTML = canciones
    .map(
      (cancion, indice) => `
        <li>
          <span class="admin-cola__numero">${indice + 1}</span>
          <span class="admin-cola__nombre">${escapar(cancion.titulo)} · ${escapar(cancion.artista)}</span>

          <button
            class="admin-cola__boton"
            type="button"
            data-cola-tocada="${cancion.id}"
          >
            Tocada
          </button>

          <button
            class="admin-cola__boton admin-cola__boton--quitar"
            type="button"
            data-cola-quitar="${cancion.id}"
          >
            Quitar
          </button>
        </li>
      `
    )
    .join("");

  $$("[data-cola-tocada]").forEach((boton) => {
    boton.addEventListener("click", () =>
      marcarTocada(boton.dataset.colaTocada)
    );
  });

  $$("[data-cola-quitar]").forEach((boton) => {
    boton.addEventListener("click", () =>
      quitarDeCola(boton.dataset.colaQuitar)
    );
  });
}


async function finalizarShow() {
  if (!estado.estadoRef) return;

  const confirmar = window.confirm(
    "¿Estás seguro de finalizar el show?\n\n" +
    "Se reiniciarán la cola y los estados de todas las canciones."
  );

  if (!confirmar) return;

  DOM.adminEstado.textContent = "Finalizando show…";

  try {
    await updateDoc(estado.estadoRef, {
      show_activo: false,
      fin_show: Date.now(),
      inicio_show: Date.now(),
      cola: [],
      tocadas: []
    });

    estado.configRemota.cola = [];
    estado.configRemota.tocadas = [];
    estado.configRemota.show_activo = false;

    mostrarVistaAdmin("configuracion");
    DOM.adminEstado.textContent = "Show finalizado. Los estados fueron reiniciados.";
  } catch (error) {
    console.error(error);
    DOM.adminEstado.textContent = "No se pudo finalizar el show.";
  }
}

async function reiniciarShow() {
  if (!estado.estadoRef) return;

  const confirmar = window.confirm(
    "¿Seguro que quieres borrar la cola y todos los estados de las canciones?"
  );

  if (!confirmar) return;

  DOM.adminEstado.textContent = "Reiniciando show…";

  try {
    await updateDoc(estado.estadoRef, {
      inicio_show: Date.now(),
      fin_show: null,
      show_activo: true,
      cola: [],
      tocadas: []
    });

    DOM.adminEstado.textContent = "Estados del show reiniciados.";
  } catch (error) {
    console.error(error);
    DOM.adminEstado.textContent = "No se pudo reiniciar el show.";
  }
}

function abrirPedido(cancion) {
  estado.pedidoSeleccionado = cancion;
  DOM.pedidoCancion.textContent = `${cancion.titulo} — ${cancion.artista}`;
  DOM.pedidoNombre.value = "";
  DOM.pedidoTelefono.value = "";
  DOM.pedidoConsentimiento.checked = false;
  DOM.pedidoError.hidden = true;
  DOM.pedidoModal.hidden = false;
}

function cerrarPedido() {
  DOM.pedidoModal.hidden = true;
  estado.pedidoSeleccionado = null;
}

async function enviarPedidoWhatsApp() {
  const cancion = estado.pedidoSeleccionado;

  if (!cancion) return;

  const nombre = DOM.pedidoNombre.value.trim() || "Sin nombre";
  const telefono = normalizarTelefono(DOM.pedidoTelefono.value);

  if (
    !telefonoValido(telefono) ||
    !DOM.pedidoConsentimiento.checked
  ) {
    DOM.pedidoError.hidden = false;
    return;
  }

  DOM.pedidoError.hidden = true;
  DOM.pedidoEnviar.disabled = true;
  DOM.pedidoEnviar.textContent = "Abriendo WhatsApp…";

  try {
    await guardarContactoYPedido(cancion);
    await agregarACola(cancion.id);
    await cargarContactos();

    const mensaje = encodeURIComponent(
      `Hola Elena Girjoaba Music 👋\n\nSoy ${nombre}. Quisiera pedir esta canción:\n${cancion.titulo} — ${cancion.artista}\n\n¡Gracias!`
    );

    const app = `whatsapp://send?phone=${CONFIG.telefonoWhatsApp}&text=${mensaje}`;
    const web = `https://wa.me/${CONFIG.telefonoWhatsApp}?text=${mensaje}`;

    cerrarPedido();
    abrirAplicacionConRespaldo(app, web);
  } finally {
    DOM.pedidoEnviar.disabled = false;
    DOM.pedidoEnviar.textContent = "Enviar por WhatsApp";
  }
}



function normalizarTelefono(valor = "") {
  let digitos = String(valor).replace(/\D/g, "");

  if (digitos.startsWith("0")) {
    digitos = `593${digitos.slice(1)}`;
  }

  if (!digitos.startsWith("593") && digitos.length === 9) {
    digitos = `593${digitos}`;
  }

  return digitos;
}

function telefonoValido(valor = "") {
  const telefono = normalizarTelefono(valor);
  return /^593\d{9}$/.test(telefono);
}

function idContactoDesdeTelefono(telefono) {
  return `tel_${telefono}`;
}

function idShowActual() {
  return String(estado.configRemota.inicio_show || Date.now());
}

async function guardarContactoYPedido(cancion) {
  const nombre = DOM.pedidoNombre.value.trim() || "Sin nombre";
  const telefono = normalizarTelefono(DOM.pedidoTelefono.value);
  const ahora = Date.now();
  const showId = idShowActual();

  const contactoRef = doc(
    estado.db,
    "contactos",
    idContactoDesdeTelefono(telefono)
  );

  await setDoc(
    contactoRef,
    {
      nombre,
      telefono,
      creado_en: serverTimestamp(),
      creado_en_ms: ahora,
      ultima_interaccion: serverTimestamp(),
      ultima_interaccion_ms: ahora,
      total_pedidos: 1,
      primer_show_id: showId,
      ultimo_show_id: showId,
      ultimo_lugar: estado.configRemota.lugar || "",
      perfil_clientes: estado.configRemota.perfil_clientes || "medio",
      shows: arrayUnion(showId)
    },
    { merge: true }
  );

  // Incremento simple y seguro para el prototipo:
  const contactoSnapshot = await getDocs(
    query(
      collection(estado.db, "contactos"),
      where("telefono", "==", telefono)
    )
  );

  let totalPedidos = 1;

  contactoSnapshot.forEach((documento) => {
    const actual = Number(documento.data().total_pedidos || 0);
    totalPedidos = Math.max(totalPedidos, actual + 1);
  });

  await setDoc(
    contactoRef,
    {
      nombre,
      telefono,
      ultima_interaccion: serverTimestamp(),
      ultima_interaccion_ms: ahora,
      total_pedidos: totalPedidos,
      ultimo_show_id: showId,
      ultimo_lugar: estado.configRemota.lugar || "",
      perfil_clientes: estado.configRemota.perfil_clientes || "medio",
      shows: arrayUnion(showId)
    },
    { merge: true }
  );

  const pedidoRef = doc(collection(estado.db, "pedidos"));

  await setDoc(pedidoRef, {
    contacto_id: idContactoDesdeTelefono(telefono),
    nombre,
    telefono,
    cancion_id: cancion.id,
    cancion: cancion.titulo,
    artista: cancion.artista,
    show_id: showId,
    lista_activa: estado.configRemota.lista_activa,
    creado_en: serverTimestamp(),
    creado_en_ms: ahora,
    origen: "whatsapp",
    estado: "cola",
    lugar: estado.configRemota.lugar || "",
    perfil_clientes: estado.configRemota.perfil_clientes || "medio"
  });
}

async function cargarContactos() {
  if (!estado.db) return;

  try {
    const snapshot = await getDocs(collection(estado.db, "contactos"));
    estado.contactos = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    renderizarContactosAdmin();
  } catch (error) {
    console.error("No se pudieron cargar los contactos:", error);
  }
}

function contactosFiltrados() {
  const ahora = Date.now();
  const hace30Dias = ahora - 30 * 24 * 60 * 60 * 1000;
  const showId = idShowActual();

  return estado.contactos
    .filter((contacto) => {
      if (estado.filtroContactos === "show") {
        return Array.isArray(contacto.shows) && contacto.shows.includes(showId);
      }

      if (estado.filtroContactos === "mes") {
        return Number(contacto.ultima_interaccion_ms || 0) >= hace30Dias;
      }

      return true;
    })
    .sort(
      (a, b) =>
        Number(b.ultima_interaccion_ms || 0) -
        Number(a.ultima_interaccion_ms || 0)
    );
}

function formatearFechaHora(ms) {
  if (!ms) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(ms));
}

function renderizarContactosAdmin() {
  if (!DOM.adminListaContactos) return;

  const contactos = contactosFiltrados();
  DOM.adminCantidadContactos.textContent = String(contactos.length);

  if (!contactos.length) {
    DOM.adminListaContactos.innerHTML =
      '<p class="admin-panel__ayuda">No hay contactos para este filtro.</p>';
    return;
  }

  DOM.adminListaContactos.innerHTML = contactos
    .map(
      (contacto) => `
        <article class="admin-contacto">
          <div class="admin-contacto__info">
            <strong>${escapar(contacto.nombre || "Sin nombre")}</strong>
            <span>+${escapar(contacto.telefono || "")}</span>
            <small>
              Agregado: ${escapar(formatearFechaHora(contacto.creado_en_ms))}
              · Última interacción: ${escapar(formatearFechaHora(contacto.ultima_interaccion_ms))}
            </small>
          </div>
          <span class="admin-contacto__pedidos" title="Pedidos">
            ${Number(contacto.total_pedidos || 0)}
          </span>
        </article>
      `
    )
    .join("");
}

function construirResumenContactos() {
  const contactos = contactosFiltrados();

  const titulo =
    estado.filtroContactos === "show"
      ? "Contactos de este show"
      : estado.filtroContactos === "mes"
        ? "Contactos de los últimos 30 días"
        : "Todos los contactos";

  const lineas = contactos.length
    ? contactos.map(
        (contacto, indice) =>
          `${indice + 1}. ${contacto.nombre || "Sin nombre"} · +${contacto.telefono} · ${contacto.total_pedidos || 0} pedidos · ${formatearFechaHora(contacto.creado_en_ms)}`
      )
    : ["Sin contactos"];

  return [
    "Elena Girjoaba Music",
    titulo,
    `Total: ${contactos.length}`,
    "",
    ...lineas
  ].join("\n");
}

function compartirContactosWhatsapp(numero) {
  const mensaje = encodeURIComponent(construirResumenContactos());
  abrirAplicacionConRespaldo(
    `whatsapp://send?phone=${numero}&text=${mensaje}`,
    `https://wa.me/${numero}?text=${mensaje}`
  );
}

function exportarContactos() {
  const contactos = contactosFiltrados();
  const encabezados = [
    "nombre",
    "telefono",
    "fecha_agregado",
    "ultima_interaccion",
    "total_pedidos"
  ];

  const filas = contactos.map((contacto) => [
    contacto.nombre || "",
    `+${contacto.telefono || ""}`,
    formatearFechaHora(contacto.creado_en_ms),
    formatearFechaHora(contacto.ultima_interaccion_ms),
    Number(contacto.total_pedidos || 0)
  ]);

  const csv = [encabezados, ...filas]
    .map((fila) =>
      fila
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const archivo = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `contactos-elena-girjoaba-${estado.filtroContactos}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function construirResumenShow() {
  const cola = estado.configRemota.cola
    .map(obtenerCancion)
    .filter(Boolean);

  const tocadas = estado.configRemota.tocadas
    .map(obtenerCancion)
    .filter(Boolean);

  const lineasCola = cola.length
    ? cola.map((cancion, indice) => `${indice + 1}. ${cancion.titulo} — ${cancion.artista}`)
    : ["Sin canciones en cola"];

  const lineasTocadas = tocadas.length
    ? tocadas.map((cancion, indice) => `${indice + 1}. ${cancion.titulo} — ${cancion.artista}`)
    : ["Sin canciones marcadas como tocadas"];

  return [
    "Elena Girjoaba Music · Resumen del show",
    "",
    `Lista activa: ${nombreModo(estado.configRemota.lista_activa)}`,
    `Pedidos por WhatsApp: ${estado.configRemota.pedidos_whatsapp ? "Activados" : "Desactivados"}`,
    `Cola visible: ${estado.configRemota.mostrar_cola ? "Sí" : "No"}`,
    "",
    `En cola (${cola.length}):`,
    ...lineasCola,
    "",
    `Ya sonaron (${tocadas.length}):`,
    ...lineasTocadas
  ].join("\n");
}

function compartirResumenWhatsapp(numero) {
  const mensaje = encodeURIComponent(construirResumenShow());
  const app = `whatsapp://send?phone=${numero}&text=${mensaje}`;
  const web = `https://wa.me/${numero}?text=${mensaje}`;

  abrirAplicacionConRespaldo(app, web);
}

async function copiarEnlaceShow() {
  const enlace = `${window.location.origin}${window.location.pathname}`;

  try {
    await navigator.clipboard.writeText(enlace);
    DOM.adminEstado.textContent = "Enlace del show copiado.";
  } catch (error) {
    window.prompt("Copia este enlace:", enlace);
  }
}

function exportarDatosShow() {
  const datos = {
    exportado_en: new Date().toISOString(),
    lista_activa: estado.configRemota.lista_activa,
    lista_nombre: nombreModo(estado.configRemota.lista_activa),
    pedidos_whatsapp: estado.configRemota.pedidos_whatsapp,
    mostrar_cola: estado.configRemota.mostrar_cola,
    inicio_show: estado.configRemota.inicio_show,
    cola: estado.configRemota.cola
      .map(obtenerCancion)
      .filter(Boolean)
      .map(({ id, titulo, artista }) => ({ id, titulo, artista })),
    tocadas: estado.configRemota.tocadas
      .map(obtenerCancion)
      .filter(Boolean)
      .map(({ id, titulo, artista }) => ({ id, titulo, artista }))
  };

  const contenido = JSON.stringify(datos, null, 2);
  const archivo = new Blob([contenido], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);

  enlace.href = url;
  enlace.download = `elena-girjoaba-show-${fecha}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  DOM.adminEstado.textContent = "Datos del show exportados.";
}

function registrarEventos() {
  DOM.seguirInstagram.addEventListener("click", (evento) => {
    evento.preventDefault();
    guardarVisitaInstagram();
    programarContinuacion();
    abrirInstagram();
  });

  DOM.entrar.addEventListener("click", mostrarApp);

  DOM.mostrarTodo.addEventListener("click", () => {
    estado.mostrar = true;
    estado.categoria = null;
    estado.consulta = "";
    DOM.buscar.value = "";

    DOM.categorias.forEach((boton) =>
      boton.classList.remove("is-active")
    );

    actualizarControles();
    renderizar();

    DOM.lista.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  DOM.categorias.forEach((boton) => {
    boton.addEventListener("click", () => {
      estado.categoria = boton.dataset.categoria;
      estado.mostrar = false;
      estado.consulta = "";
      DOM.buscar.value = "";

      DOM.categorias.forEach((otro) =>
        otro.classList.toggle("is-active", otro === boton)
      );

      actualizarControles();
      renderizar();
    });
  });

  DOM.buscar.addEventListener("input", (evento) => {
    estado.consulta = evento.target.value;
    estado.mostrar = false;
    estado.categoria = null;

    DOM.categorias.forEach((boton) =>
      boton.classList.remove("is-active")
    );

    actualizarControles();
    renderizar();
  });

  DOM.limpiar.addEventListener("click", () => {
    estado.consulta = "";
    DOM.buscar.value = "";
    actualizarControles();
    renderizar();
    DOM.buscar.focus();
  });

  DOM.volver.addEventListener("click", () =>
    DOM.controles.scrollIntoView({ behavior: "smooth", block: "start" })
  );

  $$('a[href*="wa.me"]').forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
      if (enlace.closest("#pedidoModal")) return;

      evento.preventDefault();

      const mensaje = encodeURIComponent(
        "Hola Elena Girjoaba Music. 👋\n\nMe gustaría cotizar música en vivo para un evento.\n\n¿Podrían darme información sobre disponibilidad y precios?\n\n¡Muchas gracias!"
      );

      abrirAplicacionConRespaldo(
        `whatsapp://send?phone=${CONFIG.telefonoWhatsApp}&text=${mensaje}`,
        `https://wa.me/${CONFIG.telefonoWhatsApp}?text=${mensaje}`
      );
    });
  });

  $$('a[href*="instagram.com"]')
    .filter((enlace) => enlace !== DOM.seguirInstagram)
    .forEach((enlace) => {
      enlace.addEventListener("click", (evento) => {
        evento.preventDefault();
        abrirInstagram();
      });
    });

  const accesosAdmin = [
    DOM.adminTrigger,
    DOM.adminTriggerPortada
  ].filter(Boolean);

  accesosAdmin.forEach((acceso) => {
    ["pointerdown", "touchstart"].forEach((evento) => {
      acceso.addEventListener(evento, iniciarPulsacionAdmin, {
        passive: true
      });
    });

    [
      "pointerup",
      "pointercancel",
      "pointerleave",
      "touchend",
      "touchcancel"
    ].forEach((evento) => {
      acceso.addEventListener(evento, cancelarPulsacionAdmin, {
        passive: true
      });
    });

    acceso.addEventListener("contextmenu", (evento) => {
      evento.preventDefault();
    });
  });

  $$("[data-cerrar-admin]").forEach((elemento) =>
    elemento.addEventListener("click", cerrarAdmin)
  );

  DOM.adminIngresar.addEventListener("click", () => {
    if (DOM.adminClave.value === CONFIG.claveAdmin) {
      mostrarSelectorAdmin();
    } else {
      DOM.adminError.hidden = false;
    }
  });

  DOM.adminClave.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") DOM.adminIngresar.click();
  });

  DOM.adminGuardar.addEventListener("click", guardarConfiguracionAdmin);
  DOM.adminBuscarCancion.addEventListener("input", renderizarListaMaestra);
  DOM.adminFinalizarShow.addEventListener("click", finalizarShow);

  DOM.adminVolverConfiguracion.addEventListener("click", () =>
    mostrarVistaAdmin("configuracion")
  );

  DOM.adminSubir.addEventListener("click", () => {
    DOM.adminBuscarCancion.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    DOM.adminBuscarCancion.focus();
  });

  DOM.adminMenuBoton.addEventListener("click", () => {
    const abierto = !DOM.adminMenuLateral.hidden;
    DOM.adminMenuLateral.hidden = abierto;
    DOM.adminMenuBoton.setAttribute("aria-expanded", String(!abierto));
  });

  $$("[data-admin-seccion]").forEach((boton) => {
    boton.addEventListener("click", () =>
      mostrarVistaAdmin(boton.dataset.adminSeccion)
    );
  });

  $$("[data-admin-volver]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const destino = estado.configRemota.show_activo
        ? "canciones"
        : "configuracion";
      mostrarVistaAdmin(destino);
    });
  });

  DOM.adminCerrarSesion.addEventListener("click", cerrarAdmin);

  DOM.adminAbrirPublico.addEventListener("click", () => {
    window.open(`${window.location.origin}${window.location.pathname}`, "_blank", "noopener");
  });

  DOM.adminAbrirClientes.addEventListener("click", () => {
    window.open(`${window.location.origin}${window.location.pathname}?lista=todas`, "_blank", "noopener");
  });

  DOM.adminCopiarEnlace.addEventListener("click", copiarEnlaceShow);
  DOM.adminCompartirElena.addEventListener("click", () =>
    compartirResumenWhatsapp(CONFIG.telefonoElena)
  );
  DOM.adminCompartirDaniel.addEventListener("click", () =>
    compartirResumenWhatsapp(CONFIG.telefonoDaniel)
  );
  DOM.adminExportarDatos.addEventListener("click", exportarDatosShow);

  DOM.adminFiltrosContactos.forEach((boton) => {
    boton.addEventListener("click", () => {
      estado.filtroContactos = boton.dataset.contactosFiltro;

      DOM.adminFiltrosContactos.forEach((otro) =>
        otro.classList.toggle("is-active", otro === boton)
      );

      renderizarContactosAdmin();
    });
  });

  DOM.adminCompartirContactosElena.addEventListener("click", () =>
    compartirContactosWhatsapp(CONFIG.telefonoElena)
  );

  DOM.adminCompartirContactosDaniel.addEventListener("click", () =>
    compartirContactosWhatsapp(CONFIG.telefonoDaniel)
  );

  DOM.adminExportarContactos.addEventListener("click", exportarContactos);

  $$("[data-cerrar-pedido]").forEach((elemento) =>
    elemento.addEventListener("click", cerrarPedido)
  );

  DOM.pedidoEnviar.addEventListener("click", enviarPedidoWhatsApp);

  $$("[data-cerrar-notas]").forEach((elemento) =>
    elemento.addEventListener("click", cerrarNotas)
  );

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") programarContinuacion();
  });

  window.addEventListener("pageshow", programarContinuacion);
}

async function iniciar() {
  capturarDOM();

  DOM.anio.textContent = String(new Date().getFullYear());
  DOM.continuar.hidden = true;
  DOM.entrar.hidden = true;
  DOM.volver.hidden = true;

  registrarEventos();
  programarContinuacion();

  try {
    await cargarDatos();
  } catch (error) {
    console.error(error);
    DOM.errorCarga.hidden = false;
    DOM.contador.textContent = "";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
