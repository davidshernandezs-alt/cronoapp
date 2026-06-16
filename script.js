import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, push, get } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// =================================================================
// 1. CONFIGURACIÓN DE FIREBASE
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAajR69vZJtwswf0Qpd6QDchVmXmIctoVs",
    authDomain: "transmiruta.firebaseapp.com",
    databaseURL: "https://transmiruta-default-rtdb.firebaseio.com",
    projectId: "transmiruta",
    storageBucket: "transmiruta.firebasestorage.app",
    messagingSenderId: "585410061976",
    appId: "1:585410061976:web:6672631af90437fb3a12ed",
    measurementId: "G-QQ0N4YM3LR"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variables Globales de Mapas
window.rastreadorGps = null;
window.unidadActual = "";
window.miMapa = null;
window.marcadoresUsuarios = {};
window.marcadorChofer = null;
window.rastreadorUsuario = null;
window.ubicacionUsuario = null;
window.marcadorUsuario = null;
window.modoColocarElemento = ""; 
window.nombreElementoPendiente = "";
window.marcadoresElementosFijos = []; 
window.rolSesionActual = "";
window.lineasRutasActivas = {}; 

let cacheTerminales = {};
let cacheParadas = {};
let cacheBusesCrudos = {};

// Iconos Leaflet
const iconAutobus = new L.Icon({
    iconUrl: 'https://img.icons8.com/color/48/bus.png', 
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] 
});

const iconParada = new L.Icon({
    iconUrl: 'paradas.png', 
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34], shadowSize: [34, 34]
});

const iconTerminal = new L.Icon({
    iconUrl: 'terminal.png', 
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38], shadowSize: [38, 38]
});

// =================================================================
// 2. LÓGICA DE MAPAS, CHOFERES Y RUTAS
// =================================================================
window.solicitarPermisoGPS = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => { console.log("Permiso concedido, latitud:", position.coords.latitude); },
            (error) => { alert("Necesitamos tu ubicación para que la app funcione. Por favor, activa el GPS."); }
        );
    } else { alert("Tu dispositivo no soporta geolocalización."); }
};

window.abrirDetalleUnidad = (unidad, ruta, tiempo) => {
    document.getElementById('modal-titulo-unidad').innerText = "Unidad #" + unidad;
    document.getElementById('modal-info-ruta').innerText = "Ruta: " + ruta;
    document.getElementById('modal-info-tiempo').innerText = "Tiempo de espera: " + tiempo + " min";
    document.getElementById('modal-detalle-unidad').style.display = 'flex';
};

window.aplicarCambios = () => {
    const color = document.getElementById('picker-color-titulo').value;
    const titulo = document.querySelector('#menu-roles h2');
    if (titulo) {
        titulo.style.color = color;
        localStorage.setItem('colorTituloApp', color);
    }
    const fileInput = document.getElementById('input-fmenu');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fondo = e.target.result;
            const contenedor = document.getElementById('menu-roles');
            contenedor.style.backgroundImage = `url(${fondo})`;
            contenedor.style.backgroundSize = "cover";
            localStorage.setItem('fondoFmenuApp', fondo);
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
    alert("Cambios aplicados correctamente.");
};

window.aplicarEstilos = () => {
    const colorTitulo = document.getElementById('picker-color-titulo').value;
    const colorFondo = document.getElementById('picker-color-fondo').value;
    document.getElementById('titulo-panel').style.color = colorTitulo;
    document.getElementById('menu-roles').style.backgroundColor = colorFondo;
    localStorage.setItem('colorTitulo', colorTitulo);
    localStorage.setItem('colorFondo', colorFondo);
};

window.addEventListener('load', () => {
    const colorGuardado = localStorage.getItem('colorTitulo');
    const fondoGuardado = localStorage.getItem('colorFondo');
    if (colorGuardado) {
        const panel = document.getElementById('titulo-panel');
        if(panel) panel.style.color = colorGuardado;
        const picker = document.getElementById('picker-color-titulo');
        if(picker) picker.value = colorGuardado;
    }
    if (fondoGuardado) {
        const mRoles = document.getElementById('menu-roles');
        if(mRoles) mRoles.style.backgroundColor = fondoGuardado;
        const pickerFondo = document.getElementById('picker-color-fondo');
        if(pickerFondo) pickerFondo.value = fondoGuardado;
    }
});

window.mostrarPantalla = function(idPantalla) {
    document.querySelectorAll('.pantalla-menu').forEach(p => p.style.display = 'none');
    document.getElementById('vista-mapa').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById(idPantalla).style.display = 'flex';
};

window.alternarDespliegueLeyenda = function() {
    const el = document.getElementById('leyenda-mapa');
    const btn = document.getElementById('btn-indicador-leyenda');
    if (el.classList.toggle('minimizado')) btn.innerText = '▼';
    else btn.innerText = '▲';
};

window.desplegarPanelTiempos = function() {
    document.getElementById('panel-tiempos-desplegable').classList.add('activo');
    window.calcularYOrdenarListaTiempos();
};

window.cerrarPanelTiempos = function() {
    document.getElementById('panel-tiempos-desplegable').classList.remove('activo');
};

function obtenerColorPorRuta(nombreRuta) {
    if (!nombreRuta) return '#007BFF';
    let hash = 0;
    for (let i = 0; i < nombreRuta.length; i++) { hash = nombreRuta.charCodeAt(i) + ((hash << 5) - hash); }
    const paletaColores = ['#FF5733', '#28A745', '#007BFF', '#E67E22', '#9B59B6', '#1ABC9C', '#F1C40F', '#E74C3C', '#2C3E50', '#FF00FF'];
    return paletaColores[Math.abs(hash) % paletaColores.length];
}

onValue(ref(db, 'config'), (snapshot) => {
    const config = snapshot.val();
    if (config) {
        if (config.logoUrl && config.logoUrl.trim() !== "") {
            document.getElementById('logo-rol-pantalla').src = config.logoUrl;
            document.getElementById('logo-chofer-pantalla').src = config.logoUrl;
            document.getElementById('admin-url-logo').value = config.logoUrl;
        }
        if (config.logoSize) {
            const tamañoPx = config.logoSize + "px";
            document.getElementById('logo-rol-pantalla').style.width = tamañoPx;
            document.getElementById('logo-chofer-pantalla').style.width = tamañoPx;
            document.getElementById('admin-size-logo').value = config.logoSize;
        }
    }
});

onValue(ref(db, 'config/rutasDisponibles'), (snapshot) => {
    const selectChofer = document.getElementById('ruta-unidad-select');
    if(selectChofer) {
        selectChofer.innerHTML = '<option value="">-- Seleccione su Ruta Destino --</option>';
        const datos = snapshot.val();
        if (datos) {
            for (let key in datos) {
                let option = document.createElement('option');
                option.value = datos[key]; option.innerText = datos[key];
                selectChofer.appendChild(option);
            }
        }
    }
});

window.agregarNuevaRutaLista = function() {
    const rutaTexto = document.getElementById('admin-nueva-ruta').value.trim();
    if (!rutaTexto) return alert("Escribe la ruta primero.");
    push(ref(db, 'config/rutasDisponibles'), rutaTexto).then(() => {
        alert(`¡Ruta añadida con éxito!`);
        document.getElementById('admin-nueva-ruta').value = "";
    });
};

window.cambiarTamañoVistaPrevia = function(valor) {
    const px = valor + "px";
    document.getElementById('logo-rol-pantalla').style.width = px;
    document.getElementById('logo-chofer-pantalla').style.width = px;
};

window.actualizarLogoDesdeAdmin = function() {
    const nuevaUrl = document.getElementById('admin-url-logo').value.trim();
    const nuevoTamaño = document.getElementById('admin-size-logo').value;
    set(ref(db, 'config/logoUrl'), nuevaUrl);
    set(ref(db, 'config/logoSize'), parseInt(nuevoTamaño)).then(() => alert("¡Logo guardado!"));
};

window.activarModoColocarElemento = function(tipo) {
    let campoId = (tipo === 'parada') ? 'admin-nombre-parada' : 'admin-nombre-terminal';
    const nombre = document.getElementById(campoId).value.trim();
    if (!nombre) return alert(`Por favor escribe el nombre primero.`);
    window.modoColocarElemento = tipo; window.nombreElementoPendiente = nombre;
    alert(`¡Modo marcado activo! Presiona "2. Ir al Mapa de Gestión"`);
};

window.eliminarElementoFijo = function(tipo, id, nombre) {
    let nodo = (tipo === 'parada') ? 'paradas/' : 'terminales/';
    if (confirm(`¿Eliminar permanentemente la ${tipo} "${nombre}"?`)) { set(ref(db, nodo + id), null); }
};

function limpiarTodasLasLineasRuta() {
    for (let nombreRuta in window.lineasRutasActivas) {
        if (window.lineasRutasActivas[nombreRuta]) window.miMapa.removeLayer(window.lineasRutasActivas[nombreRuta]);
    }
    window.lineasRutasActivas = {};
}

async function trazarRutaCallesReal(coordenadasUnidas, nombreRuta) {
    if (window.lineasRutasActivas[nombreRuta]) {
        window.miMapa.removeLayer(window.lineasRutasActivas[nombreRuta]);
        delete window.lineasRutasActivas[nombreRuta];
    }
    if (coordenadasUnidas.length < 2) return;
    let stringCoordenadas = coordenadasUnidas.map(coord => `${coord[1]},${coord[0]}`).join(';');
    let urlOSRM = `https://router.project-osrm.org/route/v1/driving/${stringCoordenadas}?overview=full&geometries=geojson&exclude=motorway`;
    try {
        let respuesta = await fetch(urlOSRM);
        let datosRuta = await respuesta.json();
        if (datosRuta.routes && datosRuta.routes.length > 0) {
            let geometry = datosRuta.routes[0].geometry.coordinates;
            let coordenadasCalles = geometry.map(punto => [punto[1], punto[0]]);
            let colorExclusivo = obtenerColorPorRuta(nombreRuta);
            window.lineasRutasActivas[nombreRuta] = L.polyline(coordenadasCalles, { color: colorExclusivo, weight: 6, opacity: 0.85 }).addTo(window.miMapa);
        }
    } catch (error) { console.error(error); }
}

function renderizarMapaCompleto(rutasADibujarLista) {
    window.marcadoresElementosFijos.forEach(m => window.miMapa.removeLayer(m));
    window.marcadoresElementosFijos = [];
    let coordenadasParaLinea = [];

    for (let key in cacheTerminales) {
        let t = cacheTerminales[key];
        let marker = L.marker([t.lat, t.lng], { icon: iconTerminal }).addTo(window.miMapa);
        if (window.rolSesionActual === 'admin-mapa') {
            marker.bindPopup(`<b>Terminal:</b> ${t.nombre}<button onclick="window.eliminarElementoFijo('terminal', '${key}', '${t.nombre}')">Eliminar</button>`);
        } else { marker.bindPopup(`<b>Terminal:</b> ${t.nombre}`); }
        window.marcadoresElementosFijos.push(marker);
        coordenadasParaLinea.push([t.lat, t.lng]);
    }

    for (let key in cacheParadas) {
        let p = cacheParadas[key];
        let marker = L.marker([p.lat, p.lng], { icon: iconParada }).addTo(window.miMapa);
        if (window.rolSesionActual === 'admin-mapa') {
            marker.bindPopup(`<b>Parada:</b> ${p.nombre}<button onclick="window.eliminarElementoFijo('parada', '${key}', '${p.nombre}')">Eliminar</button>`);
        } else { marker.bindPopup(`<b>Parada:</b> ${p.nombre}`); }
        window.marcadoresElementosFijos.push(marker);
        coordenadasParaLinea.push([p.lat, p.lng]);
    }

    if (rutasADibujarLista && rutasADibujarLista.length > 0) {
        rutasADibujarLista.forEach(nombreRuta => { trazarRutaCallesReal(coordenadasParaLinea, nombreRuta); });
    } else { limpiarTodasLasLineasRuta(); }
}

onValue(ref(db, 'terminales'), (snapshotT) => {
    cacheTerminales = snapshotT.val() || {};
    if(window.miMapa) renderizarMapaCompleto(Object.keys(window.lineasRutasActivas));
});

onValue(ref(db, 'paradas'), (snapshotP) => {
    cacheParadas = snapshotP.val() || {};
    if(window.miMapa) renderizarMapaCompleto(Object.keys(window.lineasRutasActivas));
});

window.calcularYOrdenarListaTiempos = async function() {
    const contenedor = document.getElementById('contenedor-lista-tiempos');
    if (!cacheBusesCrudos || Object.keys(cacheBusesCrudos).length === 0) {
        contenedor.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">No hay unidades activas.</p>';
        return;
    }
    contenedor.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Calculando arribos...</p>';
    let listadoBusesCalculados = [];
    for (let id in cacheBusesCrudos) {
        let bus = cacheBusesCrudos[id];
        let minutos = 999;
        if (window.ubicacionUsuario) {
            const url = `https://router.project-osrm.org/route/v1/driving/${bus.longitud},${bus.latitud};${window.ubicacionUsuario.lng},${window.ubicacionUsuario.lat}?overview=false`;
            try {
                let resp = await fetch(url);
                let data = await resp.json();
                if (data.routes && data.routes.length > 0) { minutos = Math.ceil(data.routes[0].duration / 60); }
            } catch(e) { minutos = Math.ceil(window.miMapa.distance([bus.latitud, bus.longitud], [window.ubicacionUsuario.lat, window.ubicacionUsuario.lng]) / 250); }
        }
        listadoBusesCalculados.push({ id: id, ruta: bus.ruta || "S/R", minutos: minutos, color: obtenerColorPorRuta(bus.ruta) });
    }
    listadoBusesCalculados.sort((a, b) => a.minutos - b.minutos);
    contenedor.innerHTML = ""; 
    listadoBusesCalculados.forEach(b => {
        let txtTiempo = b.minutos === 999 ? "Esperando GPS..." : `${b.minutos} min`;
        let div = document.createElement('div');
        div.className = "card-unidad-tiempo";
        div.style.borderLeftColor = b.color;
        div.innerHTML = `<div><strong style="color:#333;">Unidad #${b.id}</strong><br><span style="color:${b.color};">Línea: ${b.ruta}</span></div><div class="tiempo-badge">${txtTiempo}</div>`;
        contenedor.appendChild(div);
    });
};

window.validarAdmin = function() {
    const correo = document.getElementById('admin-correo').value.trim();
    const clave = document.getElementById('admin-clave').value;
    if (correo === "admin@transmiruta.com" && clave === "david2026") {
        document.getElementById('admin-correo').value = ""; document.getElementById('admin-clave').value = "";
        mostrarPantalla('menu-panel-admin');
    } else { alert("Credenciales incorrectas."); }
};

function iniciarMapa() {
    if (!window.miMapa) {
        window.miMapa = L.map('mapa').setView([10.4806, -66.9036], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.miMapa);
        window.miMapa.on('click', function(e) {
            if (window.rolSesionActual === 'admin-mapa' && window.modoColocarElemento !== "") {
                let nodoBase = (window.modoColocarElemento === 'parada') ? 'paradas' : 'terminales';
                set(push(ref(db, nodoBase)), { nombre: window.nombreElementoPendiente, lat: e.latlng.lat, lng: e.latlng.lng, creadoPor: "Admin" }).then(() => {
                    alert(`¡Registrado con éxito!`);
                    document.getElementById('admin-nombre-parada').value = "";
                    document.getElementById('admin-nombre-terminal').value = "";
                    window.modoColocarElemento = ""; window.nombreElementoPendiente = "";
                    window.volverInicio();
                });
            }
        });
    }
}

window.elegirRol = function(rol) {
    window.rolSesionActual = rol;
    if (rol === 'chofer') { mostrarPantalla('menu-chofer'); } 
    else if (rol === 'admin-mapa') {
        document.getElementById('menu-panel-admin').style.display = 'none';
        document.getElementById('btn-estado').style.display = 'none';
        document.getElementById('leyenda-mapa').style.display = 'none';
        document.getElementById('btn-abrir-tiempos').style.display = 'none';
        document.getElementById('vista-mapa').style.display = 'block';
        iniciarMapa();
        setTimeout(() => { if (window.miMapa) window.miMapa.invalidateSize(); }, 200);
        renderizarMapaCompleto([]);
    } else if (rol === 'usuario') {
        window.solicitarPermisoGPS();
        document.getElementById('menu-roles').style.display = 'none';
        document.getElementById('btn-estado').style.display = 'none'; 
        document.getElementById('leyenda-mapa').style.display = 'flex';
        document.getElementById('btn-abrir-tiempos').style.display = 'block';
        document.getElementById('vista-mapa').style.display = 'block';
        iniciarMapa();
        setTimeout(() => { if (window.miMapa) window.miMapa.invalidateSize(); }, 200);
        renderizarMapaCompleto([]);

        if (navigator.geolocation) {
            window.rastreadorUsuario = navigator.geolocation.watchPosition((pos) => {
                window.ubicacionUsuario = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                if (!window.marcadorUsuario) {
                    const greenIcon = new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41]
                    });
                    window.marcadorUsuario = L.marker([pos.coords.latitude, pos.coords.longitude], {icon: greenIcon}).addTo(window.miMapa).bindPopup("<b>Tú estás aquí</b>");
                    window.miMapa.setView([pos.coords.latitude, pos.coords.longitude], 15);
                } else { window.marcadorUsuario.setLatLng([pos.coords.latitude, pos.coords.longitude]); }
                if(document.getElementById('panel-tiempos-desplegable').classList.contains('activo')){ window.calcularYOrdenarListaTiempos(); }
            }, null, { enableHighAccuracy: true });
        }

        onValue(ref(db, 'buses'), (snapshot) => {
            const datos = snapshot.val();
            cacheBusesCrudos = datos || {}; 
            let rutasActivasDetectadas = [];
            for (let id in window.marcadoresUsuarios) {
                if (!datos || !datos[id]) { window.miMapa.removeLayer(window.marcadoresUsuarios[id]); delete window.marcadoresUsuarios[id]; }
            }
            if (datos) {
                for (let id in datos) {
                    let bus = datos[id];
                    if (bus.ruta && !rutasActivasDetectadas.includes(bus.ruta)) { rutasActivasDetectadas.push(bus.ruta); }
                    if (window.marcadoresUsuarios[id]) {
                        window.marcadoresUsuarios[id].setLatLng([bus.latitud, bus.longitud]);
                    } else {
                        window.marcadoresUsuarios[id] = L.marker([bus.latitud, bus.longitud], {icon: iconAutobus}).addTo(window.miMapa);
                        window.marcadoresUsuarios[id].on('click', function() {
                            let colorLinea = obtenerColorPorRuta(bus.ruta);
                            this.bindPopup("<b>Unidad:</b> "+id+"<br>Ruta: <b style='color:"+colorLinea+";'>"+(bus.ruta || "S/R")+"</b>").openPopup();
                        });
                    }
                }
            }
            renderizarMapaCompleto(rutasActivasDetectadas);
            if(document.getElementById('panel-tiempos-desplegable').classList.contains('activo')){ window.calcularYOrdenarListaTiempos(); }
        });
    }
};

window.confirmarChofer = function() {
    window.unidadActual = document.getElementById('numero-unidad').value;
    window.rutaUnidadActual = document.getElementById('ruta-unidad-select').value;
    if(window.unidadActual === '' || window.rutaUnidadActual === '') return alert('Por favor complete todos los datos.');
    window.solicitarPermisoGPS();
    document.getElementById('menu-chofer').style.display = 'none';
    document.getElementById('btn-estado').style.display = 'block';
    document.getElementById('leyenda-mapa').style.display = 'none'; 
    document.getElementById('btn-abrir-tiempos').style.display = 'none'; 
    document.getElementById('vista-mapa').style.display = 'block';
    iniciarMapa();
    setTimeout(() => { if (window.miMapa) window.miMapa.invalidateSize(); }, 200);
    renderizarMapaCompleto([window.rutaUnidadActual]); 
};

window.volverInicio = function() {
    if (window.rastreadorGps) navigator.geolocation.clearWatch(window.rastreadorGps);
    if (window.rastreadorUsuario) navigator.geolocation.clearWatch(window.rastreadorUsuario);
    window.cerrarPanelTiempos();
    const btn = document.getElementById('btn-estado');
    if (btn.classList.contains('activo')) {
        btn.classList.remove('activo'); btn.innerText = 'OFF';
        if (window.unidadActual !== "") {
            onDisconnect(ref(db, 'buses/' + window.unidadActual)).cancel();
            set(ref(db, 'buses/' + window.unidadActual), null);
        }
    }
    if (window.marcadorChofer) { window.miMapa.removeLayer(window.marcadorChofer); window.marcadorChofer = null; }
    if (window.marcadorUsuario) { window.miMapa.removeLayer(window.marcadorUsuario); window.marcadorUsuario = null; }
    for (let id in window.marcadoresUsuarios) { window.miMapa.removeLayer(window.marcadoresUsuarios[id]); }
    window.marcadoresUsuarios = {}; window.unidadActual = ""; cacheBusesCrudos = {};
    limpiarTodasLasLineasRuta();
    document.getElementById('numero-unidad').value = '';
    document.getElementById('ruta-unidad-select').value = '';
    if (window.rolSesionActual === 'admin-mapa') { mostrarPantalla('menu-panel-admin'); } 
    else { mostrarPantalla('menu-roles'); }
};

window.alternarEstado = function() {
    const btn = document.getElementById('btn-estado');
    if (btn.classList.contains('activo')) {
        btn.classList.remove('activo'); btn.innerText = 'OFF';
        navigator.geolocation.clearWatch(window.rastreadorGps);
        if (window.marcadorChofer) { window.miMapa.removeLayer(window.marcadorChofer); window.marcadorChofer = null; }
        onDisconnect(ref(db, 'buses/' + window.unidadActual)).cancel();
        set(ref(db, 'buses/' + window.unidadActual), null);
    } else {
        btn.classList.add('activo'); btn.innerText = 'ON';
        const busRef = ref(db, 'buses/' + window.unidadActual);
        onDisconnect(busRef).remove();
        window.rastreadorGps = navigator.geolocation.watchPosition((posicion) => {
            const lat = posicion.coords.latitude; const lng = posicion.coords.longitude;
            set(busRef, { latitud: lat, longitud: lng, ruta: window.rutaUnidadActual, ultimaActualizacion: Date.now() }).then(() => {
                if (window.miMapa) {
                    window.miMapa.setView([lat, lng], 16);
                    if(window.marcadorChofer) { window.marcadorChofer.setLatLng([lat, lng]); } 
                    else { window.marcadorChofer = L.marker([lat, lng], {icon: iconAutobus}).addTo(window.miMapa).bindPopup("Tu unidad"); }
                }
            });
        }, (error) => { alert("Error GPS: " + error.message); }, { enableHighAccuracy: true });
    }
};

window.abrirFiscal = () => {
    mostrarPantalla('menu-fiscal');
    const cont = document.getElementById('fiscal-contenedor');
    cont.innerHTML = "Cargando unidades...";
    onValue(ref(db, 'buses'), (snapshot) => {
        const data = snapshot.val();
        if (!data) { cont.innerHTML = "No hay unidades activas"; return; }
        let lista = Object.keys(data).map(id => ({ unidad: id, ruta: data[id].ruta || "Sin ruta", tiempo: Math.floor(Math.random() * 30) }));
        lista.sort((a, b) => a.tiempo - b.tiempo);
        cont.innerHTML = lista.map(item => {
            const color = window.obtenerColorPorRuta ? window.obtenerColorPorRuta(item.ruta) : '#007BFF';
            return `
                <div class="fiscal-item" style="border-left: 8px solid ${color}; cursor: pointer;" 
                    onclick="window.abrirDetalleUnidad('${item.unidad}', '${item.ruta}', '${item.tiempo}')">
                    <div>
                        <div class="fiscal-unidad">#${item.unidad}</div>
                        <div class="fiscal-ruta" style="color: ${color};">${item.ruta}</div>
                    </div>
                    <div class="fiscal-tiempo">${item.tiempo} min</div>
                </div>
            `;
        }).join('');
    });
};

setTimeout(() => {
    const splash = document.getElementById('pantalla-splash');
    const usuarioGuardado = localStorage.getItem('usuarioLogueado'); 
    if (splash && splash.style.display !== 'none' && !usuarioGuardado) { console.log("Esperando interacción del usuario..."); }
}, 3500);

// =================================================================
// 3. LÓGICA DE ECONOMÍA Y PASAJE
// =================================================================
window.CONFIG_PAGOS = {
    tasaBCV: 560.00,
    equivalenciaMonedas: 2000, 
    valorDolar: 0.25
};

const CLAVE_CACHE = 'pasaje_bcv_v2';

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('montoBs');
    if (el) {
        let datos = JSON.parse(localStorage.getItem(CLAVE_CACHE));
        const hoy = new Date();
        const mesActual = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`;
        if (!datos || datos.mes !== mesActual) {
            datos = { mes: mesActual, tasa: window.CONFIG_PAGOS.tasaBCV };
            localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
        }
        el.innerText = Math.round(datos.tasa * window.CONFIG_PAGOS.valorDolar) + ' Bs';
    }
});

// =================================================================
// 4. LÓGICA DEL MINIJUEGO (USANDO EL DOM, NO CANVAS)
// =================================================================
let gameScore = 0;
let isJumping = false;
let gameActive = false;
let generadorObstaculos;
let obstaculosActivos = [];

// Distribución solicitada: 3 carros, 2 autobuses, 1 moto
const bolsaObstaculos = [
    'auto.png', 'auto.png', 'auto.png',
    'autobus.png', 'autobus.png',
    'moto .png' // Respetando tu nombre con espacio
];

window.abrirJuego = () => {
    // Escondemos otros menús y abrimos el juego
    document.querySelectorAll('.pantalla-menu').forEach(p => p.style.display = 'none');
    document.getElementById('vista-mapa').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    window.reiniciarJuego();
};

window.volverAlMenu = () => {
    gameActive = false;
    clearInterval(generadorObstaculos);
    limpiarObstaculos();
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('menu-roles').style.display = 'flex'; // Volvemos al menú
};

window.reiniciarJuego = () => {
    gameActive = true;
    gameScore = 0;
    document.getElementById('game-score').innerText = '0';
    
    isJumping = false;
    const player = document.getElementById('player');
    if (player) player.style.bottom = '0px';
    
    limpiarObstaculos();
    clearInterval(generadorObstaculos);
    generadorObstaculos = setInterval(crearObstaculo, 2200); // Un obstáculo cada 2.2 segundos
};

function limpiarObstaculos() {
    obstaculosActivos.forEach(obs => {
        clearInterval(obs.mover);
        if (obs.el && obs.el.parentNode) obs.el.remove();
    });
    obstaculosActivos = [];
}

function crearObstaculo() {
    if (!gameActive) return;

    const obsEl = document.createElement('img');
    obsEl.src = bolsaObstaculos[Math.floor(Math.random() * bolsaObstaculos.length)];
    obsEl.style.position = 'absolute';
    obsEl.style.bottom = '0px';
    obsEl.style.right = '-80px'; 
    obsEl.style.width = '60px'; 
    obsEl.style.objectFit = 'contain';

    document.getElementById('game-container').appendChild(obsEl);

    let obsRight = -80;
    let superado = false;

    let mover = setInterval(() => {
        if (!gameActive) return;
        
        obsRight += 10; 
        obsEl.style.right = obsRight + 'px';

        const playerEl = document.getElementById('player');
        if(!playerEl) return;

        const pRect = playerEl.getBoundingClientRect();
        const oRect = obsEl.getBoundingClientRect();

        // CHOQUE
        if (
            pRect.right - 8 > oRect.left &&
            pRect.left + 8 < oRect.right &&
            pRect.bottom > oRect.top + 5
        ) {
            gameActive = false;
            clearInterval(generadorObstaculos);
            obstaculosActivos.forEach(o => clearInterval(o.mover));
            alert("¡Chocaste! Puntuación final: " + gameScore);
        }

        // PUNTUACIÓN PERSONALIZADA AL ESQUIVAR
        if (oRect.right < pRect.left && !superado) {
            superado = true;
            let puntosGanados = 1; // Carro por defecto
            
            if (obsEl.src.includes('autobus.png')) puntosGanados = 4;
            if (obsEl.src.includes('moto .png') || obsEl.src.includes('moto%20.png')) puntosGanados = 8;
            
            gameScore += puntosGanados;
            document.getElementById('game-score').innerText = gameScore;
        }

        // Eliminar cuando sale de pantalla
        if (obsRight > window.innerWidth + 100) {
            clearInterval(mover);
            if (obsEl.parentNode) obsEl.remove();
            obstaculosActivos = obstaculosActivos.filter(o => o.el !== obsEl);
        }
    }, 20);

    obstaculosActivos.push({ el: obsEl, mover: mover });
}

// Conexión del botón de salto
document.addEventListener('DOMContentLoaded', () => {
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
        const saltarAccion = (e) => {
            if (e) e.preventDefault();
            if (isJumping || !gameActive) return;
            
            isJumping = true;
            const player = document.getElementById('player');
            let position = 0;
            
            let up = setInterval(() => {
                position += 18; 
                player.style.bottom = position + 'px';
                
                if (position >= 260) { // Altura del salto
                    clearInterval(up);
                    let down = setInterval(() => {
                        position -= 18;
                        player.style.bottom = position + 'px';
                        
                        if (position <= 0) {
                            clearInterval(down);
                            player.style.bottom = '0px';
                            isJumping = false;
                        }
                    }, 20);
                }
            }, 20);
        };

        btnJump.addEventListener('mousedown', saltarAccion);
        btnJump.addEventListener('touchstart', saltarAccion, { passive: false });
    }
});