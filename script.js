// ==========================================
// 1. CONFIGURACIÓN DEL ENTORNO 3D Y AUDIO
// ==========================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1e7);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const audioFondo = document.getElementById('musica-fondo');
const volumenControl = document.getElementById('volumen-musica');
if(audioFondo && volumenControl) {
    audioFondo.volume = volumenControl.value;
    volumenControl.addEventListener('input', (e) => { audioFondo.volume = e.target.value; });
}

const listaEtiquetas = [];
const objetosInteractivos = []; 

// Instanciar el cargador de Modelos 3D GLTF/GLB
const gltfLoader = new THREE.GLTFLoader();

const baseDeDatosAstros = {
    "Sol": { desc: "Estrella central. Fuente de vida.", img: "https://upload.wikimedia.org/wikipedia/commons/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg" },
    "Mercurio": { desc: "El planeta más cercano al Sol.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg" },
    "Venus": { desc: "Planeta con efecto invernadero extremo.", img: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg" },
    "Tierra": { desc: "Nuestro hogar.", img: "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg" },
    "Marte": { desc: "El planeta rojo.", img: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg" },
    "Júpiter": { desc: "Gigante gaseoso masivo.", img: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg" },
    "Saturno": { desc: "Conocido por sus anillos.", img: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg" },
    "Urano": { desc: "Gigante de hielo inclinado.", img: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg" },
    "Neptuno": { desc: "Planeta azul oscuro y ventoso.", img: "https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg" },
    "Plutón": { desc: "Planeta enano distante.", img: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Pluto_in_True_Color_-_High-Res.jpg" },
    "Voyager 1": { desc: "Sonda interestelar. Se aleja a 17 km/s.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Voyager_spacecraft_model.png" },
    "Voyager 2": { desc: "Exploradora de los límites del sistema solar.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Voyager_spacecraft_model.png" },
    "Alfa Centauri": { desc: "El sistema estelar más cercano a nuestro Sol (a 4.36 años luz). Consta de las estrellas A, B y Próxima.", img: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Alpha_Centauri_relative_sizes.svg" }
};

// ==========================================
// 2. CREACIÓN DEL SISTEMA SOLAR Y MODELOS GLB
// ==========================================
const sunGeo = new THREE.SphereGeometry(120, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 }); 
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = "Sol";
scene.add(sun);
objetosInteractivos.push(sun);
crearEtiquetaHTML("Sol", sun);

const sunLight = new THREE.PointLight(0xffffff, 2, 100000);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x444444)); 

// Función para cargar modelos GLB
function cargarGLB(ruta, escala, objetoPadre) {
    gltfLoader.load(ruta, (gltf) => {
        const modelo = gltf.scene;
        modelo.scale.set(escala, escala, escala);
        objetoPadre.add(modelo);
        // Ocultar la esfera de hitbox visualmente (pero dejarla interactiva para clics)
        objetoPadre.children.forEach(child => {
            if (child.type === 'Mesh' && child.geometry.type === 'SphereGeometry') {
                child.material.transparent = true;
                child.material.opacity = 0; // Transparente, pero los rayos láser del clic aún chocan aquí
            }
        });
    }, undefined, (error) => { console.error('Fallo al cargar modelo: ' + ruta, error); });
}

// Datos con soporte para los modelos 3D que pasaste
// NOTA: Ajusta `escalaGLB` si al cargar se ven muy grandes o pequeños.
const datosPlanetas = [
    { nombre: 'Mercurio', radio: 8, distancia: 300, color: 0x888888, velocidad: 0.01, rutaGLB: 'modelos 3d/mercurio_v1.1.glb', escalaGLB: 8 },
    { nombre: 'Venus', radio: 15, distancia: 450, color: 0xe3bb76, velocidad: 0.007, rutaGLB: 'modelos 3d/venus.glb', escalaGLB: 15 },
    { nombre: 'Tierra', radio: 16, distancia: 650, color: 0x2233ff, velocidad: 0.005, rutaGLB: 'modelos 3d/earth__terra_-_downloadable_model.glb', escalaGLB: 16, 
      lunas: [
          {nombre: 'Luna', radio: 4, distancia: 35, color: 0xaaaaaa, velocidad: 0.05, rutaGLB: 'modelos 3d/moon.glb', escalaGLB: 4},
          {nombre: 'ISS', radio: 1.5, distancia: 22, color: 0xffffff, velocidad: 0.08, rutaGLB: 'modelos 3d/iss.glb', escalaGLB: 0.5},
          {nombre: 'Hubble', radio: 1.2, distancia: 26, color: 0x999999, velocidad: 0.06, rutaGLB: 'modelos 3d/hubble_space_telescope.glb', escalaGLB: 0.5}
      ] 
    },
    { nombre: 'Marte', radio: 10, distancia: 850, color: 0xc1440e, velocidad: 0.004, rutaGLB: 'modelos 3d/marte_v1.1.glb', escalaGLB: 10 },
    { nombre: 'Júpiter', radio: 45, distancia: 1300, color: 0xb07f35, velocidad: 0.002, rutaGLB: 'modelos 3d/jupiter.glb', escalaGLB: 45 },
    { nombre: 'Saturno', radio: 38, distancia: 1800, color: 0xe2bf7d, velocidad: 0.0009, tieneAnillos: true, rutaGLB: 'modelos 3d/saturno_v1.1.glb', escalaGLB: 38 },
    { nombre: 'Urano', radio: 25, distancia: 2300, color: 0x4b70dd, velocidad: 0.0004 }, // Sin GLB
    { nombre: 'Neptuno', radio: 24, distancia: 2800, color: 0x274687, velocidad: 0.0001 }, // Sin GLB
    { nombre: 'Plutón', radio: 4, distancia: 3300, color: 0xaabbcc, velocidad: 0.00005, rutaGLB: 'modelos 3d/pluto.glb', escalaGLB: 4 }
];

const planetasMallas = [];
const materialOrbita = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });

datosPlanetas.forEach((datos) => {
    const curvaOrbita = new THREE.EllipseCurve(0, 0, datos.distancia, datos.distancia, 0, 2 * Math.PI, false, 0);
    const puntosOrbita = curvaOrbita.getPoints(100);
    const geoOrbita = new THREE.BufferGeometry().setFromPoints(puntosOrbita);
    const lineaOrbita = new THREE.Line(geoOrbita, materialOrbita);
    lineaOrbita.rotation.x = Math.PI / 2;
    scene.add(lineaOrbita);

    const pivote = new THREE.Object3D();
    scene.add(pivote);

    const geo = new THREE.SphereGeometry(datos.radio, 32, 32);
    // Si tiene modelo 3D, el material inicial será nuestra "Hitbox" (caja de colisión para clics)
    const mat = new THREE.MeshPhongMaterial({ color: datos.color });
    const malla = new THREE.Mesh(geo, mat);
    malla.position.set(datos.distancia, 0, 0);
    malla.name = datos.nombre;
    pivote.add(malla);
    
    // Cargar GLB si existe
    if (datos.rutaGLB) cargarGLB(datos.rutaGLB, datos.escalaGLB, malla);

    objetosInteractivos.push(malla);
    crearEtiquetaHTML(datos.nombre, malla);

    const lunasMallas = [];
    if (datos.lunas) {
        datos.lunas.forEach(lunaDatos => {
            const lunaPivote = new THREE.Object3D();
            malla.add(lunaPivote);
            const lunaGeo = new THREE.SphereGeometry(lunaDatos.radio, 16, 16);
            const lunaMat = new THREE.MeshPhongMaterial({ color: lunaDatos.color });
            const lunaMalla = new THREE.Mesh(lunaGeo, lunaMat);
            lunaMalla.position.set(lunaDatos.distancia, 0, 0);
            lunaMalla.name = lunaDatos.nombre; // Para poder clicar
            lunaPivote.add(lunaMalla);
            
            if (lunaDatos.rutaGLB) cargarGLB(lunaDatos.rutaGLB, lunaDatos.escalaGLB, lunaMalla);

            crearEtiquetaHTML(lunaDatos.nombre, lunaMalla);
            objetosInteractivos.push(lunaMalla);
            lunasMallas.push({ pivote: lunaPivote, velocidad: lunaDatos.velocidad });
        });
    }

    if (datos.tieneAnillos && !datos.rutaGLB) { // Solo añadir anillos manuales si no trae modelo GLB propio
        const anilloGeo = new THREE.RingGeometry(datos.radio + 10, datos.radio + 35, 32);
        const anilloMat = new THREE.MeshBasicMaterial({ color: 0xa68553, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const anillo = new THREE.Mesh(anilloGeo, anilloMat);
        anillo.rotation.x = Math.PI / 2;
        malla.add(anillo);
    }

    planetasMallas.push({ pivote: pivote, malla: malla, velocidad: datos.velocidad, lunasMallas: lunasMallas });
});

// Cinturón de Asteroides 
const astGeo = new THREE.BufferGeometry();
const astMat = new THREE.PointsMaterial({ color: 0x999999, size: 1.5, sizeAttenuation: true });
const astVertices = [];
for (let i = 0; i < 4000; i++) {
    const radioCinturon = 950 + (Math.random() * 200);
    const theta = Math.random() * Math.PI * 2;
    const yDisp = (Math.random() - 0.5) * 40; 
    astVertices.push(radioCinturon * Math.cos(theta), yDisp, radioCinturon * Math.sin(theta));
}
astGeo.setAttribute('position', new THREE.Float32BufferAttribute(astVertices, 3));
scene.add(new THREE.Points(astGeo, astMat));

// ==========================================
// 3. VOYAGER 1, 2 Y ALFA CENTAURI (Nuevas Físicas)
// ==========================================
function crearSonda(nombre, xPos, zPos) {
    const sondaGroup = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshPhongMaterial({ color: 0xcccccc }));
    sondaGroup.add(cuerpo);
    const plato = new THREE.Mesh(new THREE.CylinderGeometry(5, 0, 2, 16), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    plato.rotation.x = Math.PI / 2; plato.position.z = 3;
    sondaGroup.add(plato);
    sondaGroup.position.set(xPos, 50, zPos);
    sondaGroup.name = nombre;
    scene.add(sondaGroup);
    
    const hitBox = new THREE.Mesh(new THREE.SphereGeometry(20, 8, 8), new THREE.MeshBasicMaterial({visible: false}));
    hitBox.name = nombre;
    sondaGroup.add(hitBox);

    objetosInteractivos.push(hitBox);
    crearEtiquetaHTML(nombre, sondaGroup);
    return sondaGroup;
}

// Las sondas ahora guardan vectores de velocidad para alejarse
const voyager1 = crearSonda("Voyager 1", 3800, -1000);
voyager1.userData.velocidad = new THREE.Vector3(0.5, 0.2, -0.6); // Dirección hacia Ophiuchus

const voyager2 = crearSonda("Voyager 2", 3600, 1500);
voyager2.userData.velocidad = new THREE.Vector3(-0.4, -0.3, 0.7);

// Sistema Alfa Centauri (Ubicado muy lejos)
const alfaCentauriGrupo = new THREE.Group();
// Posición: Z lejano simulando años luz de distancia
alfaCentauriGrupo.position.set(15000, 5000, -25000); 
alfaCentauriGrupo.name = "Alfa Centauri";
scene.add(alfaCentauriGrupo);

// Hitbox general para viajar al sistema
const acHitBox = new THREE.Mesh(new THREE.SphereGeometry(500, 16, 16), new THREE.MeshBasicMaterial({visible: false}));
acHitBox.name = "Alfa Centauri";
alfaCentauriGrupo.add(acHitBox);
objetosInteractivos.push(acHitBox);
crearEtiquetaHTML("Sist. Alfa Centauri", alfaCentauriGrupo);

// Estrella A
const acAGeo = new THREE.SphereGeometry(140, 32, 32);
const acAMat = new THREE.MeshBasicMaterial({ color: 0xfff4e8 }); // Amarilla/Blanca
const acA = new THREE.Mesh(acAGeo, acAMat);
acA.position.set(-300, 0, 0);
alfaCentauriGrupo.add(acA);
alfaCentauriGrupo.add(new THREE.PointLight(0xfff4e8, 1.5, 10000));

// Estrella B
const acBGeo = new THREE.SphereGeometry(100, 32, 32);
const acBMat = new THREE.MeshBasicMaterial({ color: 0xffd2a1 }); // Naranja
const acB = new THREE.Mesh(acBGeo, acBMat);
acB.position.set(400, 0, 0);
alfaCentauriGrupo.add(acB);

// Constelaciones y Estrellas de fondo
const starGeo = new THREE.BufferGeometry();
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.4 });
const starVertices = [];
for (let i = 0; i < 20000; i++) {
    const radius = 8000 + Math.random() * 40000; // Fondo expandido para que cubra viajes lejanos
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    starVertices.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
scene.add(new THREE.Points(starGeo, starMat));

function crearEtiquetaHTML(texto, objeto3D) {
    const div = document.createElement('div');
    div.className = 'etiqueta-celeste';
    div.innerText = texto;
    document.body.appendChild(div);
    listaEtiquetas.push({ div: div, malla: objeto3D, esConstelacion: false });
}

// ==========================================
// 4. NAVEGACIÓN Y CONTROLES (Con Inversión Y)
// ==========================================
const nave = new THREE.Object3D();
nave.position.set(0, 400, 1200); 
nave.lookAt(0, 0, 0);
nave.rotation.order = 'YXZ';
scene.add(nave);

let enCabina = true;
nave.add(camera);
camera.position.set(0, 0, 0);
camera.rotation.order = 'YXZ';

let configSensibilidadRat = 0.003;
let configSensibilidadJoy = 12; 
let configAceleracion = 0.15;
let invertirEjeY = false; // Variable global para la nueva opción
let velocidad = 0;
let menuAbierto = false; 

const raycaster = new THREE.Raycaster();
const raton = new THREE.Vector2();
let objetivoViaje = null;

// Ligar el checkbox de invertir controles a la variable
document.getElementById('invertir-eje-y').addEventListener('change', (e) => {
    invertirEjeY = e.target.checked;
});

const pantallaInicio = document.getElementById('pantalla-inicio');
if(pantallaInicio) {
    pantallaInicio.addEventListener('click', function() {
        if(audioFondo) audioFondo.play().catch(e => console.log("Autoplay bloqueado."));
        this.style.opacity = '0';
        setTimeout(() => { this.style.display = 'none'; }, 500);
    });
}

// Ventana de Información
const ventanaInfo = document.getElementById('info-ventana');
document.getElementById('cerrar-info').addEventListener('click', () => {
    ventanaInfo.style.display = 'none';
    ventanaInfo.classList.add('oculto');
});

function mostrarVentanaInfo(nombreAstro) {
    const data = baseDeDatosAstros[nombreAstro] || { desc: "Objeto astronómico en exploración.", img: "https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg" };
    document.getElementById('info-titulo').innerText = nombreAstro;
    document.getElementById('info-desc').innerText = data.desc;
    document.getElementById('info-img').src = data.img;
    ventanaInfo.style.display = 'flex';
    ventanaInfo.classList.remove('oculto');
}

// --- LÓGICA DE CONTROLES TÁCTILES ---
let joyX = 0, joyY = 0; 
let touchActive = false;
let btnAvanzarFijo = false, btnRetrocederFijo = false;

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
let joyOrigin = { x: 0, y: 0 };

if(joystickBase) {
    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault(); touchActive = true;
        const rect = joystickBase.getBoundingClientRect();
        joyOrigin.x = rect.left + rect.width / 2;
        joyOrigin.y = rect.top + rect.height / 2;
        updateJoystick(e.changedTouches[0]);
    }, {passive: false});

    joystickBase.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchActive) updateJoystick(e.changedTouches[0]);
    }, {passive: false});

    joystickBase.addEventListener('touchend', (e) => {
        e.preventDefault(); touchActive = false; joyX = 0; joyY = 0;
        joystickKnob.style.transform = `translate(-50%, -50%)`;
    });
}

function updateJoystick(touch) {
    let dx = touch.clientX - joyOrigin.x;
    let dy = touch.clientY - joyOrigin.y;
    const maxR = 35; 
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > maxR) { dx = (dx/dist)*maxR; dy = (dy/dist)*maxR; }
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joyX = dx / maxR; joyY = dy / maxR;
}

const btnAvanzarDOM = document.getElementById('btn-avanzar');
const btnRetrocederDOM = document.getElementById('btn-retroceder');
if(btnAvanzarDOM) {
    btnAvanzarDOM.addEventListener('touchstart', (e) => { e.preventDefault(); btnAvanzarFijo = true; cancelarViaje(); });
    btnAvanzarDOM.addEventListener('touchend', (e) => { e.preventDefault(); btnAvanzarFijo = false; });
    btnRetrocederDOM.addEventListener('touchstart', (e) => { e.preventDefault(); btnRetrocederFijo = true; cancelarViaje(); });
    btnRetrocederDOM.addEventListener('touchend', (e) => { e.preventDefault(); btnRetrocederFijo = false; });
}

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    if (menuAbierto || touchActive) return; 
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    if (Math.abs(mouseX) < 0.1) mouseX = 0;
    if (Math.abs(mouseY) < 0.1) mouseY = 0;
    if ((Math.abs(mouseX) > 0.5 || Math.abs(mouseY) > 0.5) && objetivoViaje) cancelarViaje();
});

const teclasPresionadas = {};
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    teclasPresionadas[key] = true;
    if (['w','a','s','d'].includes(key)) cancelarViaje(); 
    if (key === 'c' && !menuAbierto) {
        enCabina = !enCabina;
        document.getElementById('ui-camara').innerText = enCabina ? "Cabina" : "Libre";
        cancelarViaje();
        if (!enCabina) {
            scene.add(camera); camera.position.copy(nave.position); camera.rotation.copy(nave.rotation);
        } else {
            nave.add(camera); camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
        }
    }
    if (e.key === 'Escape') toggleMenu();
});
window.addEventListener('keyup', (e) => { teclasPresionadas[e.key.toLowerCase()] = false; });

window.addEventListener('click', (e) => {
    if (menuAbierto || e.target.closest('#hud') || e.target.closest('#controles-tactiles') || e.target.closest('#info-ventana') || e.target.tagName === 'INPUT') return;
    raton.x = (e.clientX / window.innerWidth) * 2 - 1;
    raton.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(raton, camera);
    const intersecciones = raycaster.intersectObjects(objetosInteractivos);
    if (intersecciones.length > 0) { 
        cancelarViaje(); 
        objetivoViaje = intersecciones[0].object; 
        
        // Si clickeamos una HitBox hija (sondas, modelos GLB, lunas), el nombre puede estar en ella o en su padre
        const nombreTarget = objetivoViaje.name || objetivoViaje.parent.name;
        mostrarVentanaInfo(nombreTarget);
    }
});

document.getElementById('btn-opciones').addEventListener('click', toggleMenu);
function toggleMenu() {
    menuAbierto = !menuAbierto;
    const m = document.getElementById('menu-config');
    m.classList.remove('oculto'); m.style.display = menuAbierto ? "block" : "none";
}

document.getElementById('btn-inicio').addEventListener('click', () => {
    cancelarViaje(); velocidad = 0;
    nave.position.set(0, 400, 1200); nave.lookAt(0, 0, 0);
});

document.getElementById('btn-cerrar').addEventListener('click', () => {
    configSensibilidadRat = parseFloat(document.getElementById('rango-sensibilidad').value);
    configSensibilidadJoy = parseFloat(document.getElementById('rango-sensibilidad-joy').value);
    configAceleracion = parseFloat(document.getElementById('rango-velocidad').value);
    toggleMenu();
});

function cancelarViaje() {
    objetivoViaje = null; tourActivo = false;
    document.getElementById('tour-activar').checked = false;
}

const listaTour = document.getElementById('lista-tour');
const planetasTour = ['Sol', 'Mercurio', 'Venus', 'Tierra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno', 'Plutón', 'Alfa Centauri'];
planetasTour.forEach(nombre => {
    const lbl = document.createElement('label'); lbl.style.cursor = 'pointer';
    lbl.innerHTML = `<input type="checkbox" value="${nombre}" class="tour-chk" checked> ${nombre}`;
    listaTour.appendChild(lbl);
});

let tourActivo = false, tourIndex = 0, contadorTour = 0;
document.getElementById('tour-activar').addEventListener('change', (e) => {
    tourActivo = e.target.checked;
    if (tourActivo) { tourIndex = 0; contadorTour = 0; siguienteDestinoTour(); } 
    else cancelarViaje();
});

function siguienteDestinoTour() {
    const activas = Array.from(document.querySelectorAll('.tour-chk')).filter(c => c.checked);
    if (activas.length === 0 || !tourActivo) { cancelarViaje(); return; }
    if (tourIndex >= activas.length) tourIndex = 0;
    
    // Buscar el objeto por nombre para el Tour
    objetivoViaje = objetosInteractivos.find(obj => (obj.name === activas[tourIndex].value) || (obj.parent && obj.parent.name === activas[tourIndex].value));
    
    if(objetivoViaje) mostrarVentanaInfo(activas[tourIndex].value);
    contadorTour = 0;
}

// ==========================================
// 5. CICLO DE ANIMACIÓN
// ==========================================
const tempV = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    // Animación Planetas
    planetasMallas.forEach((p) => {
        p.pivote.rotation.y += p.velocidad; 
        p.malla.rotation.y += 0.01;         
        p.lunasMallas.forEach(l => l.pivote.rotation.y += l.velocidad);
    });
    
    // Animación Alfa Centauri (Estrellas orbitando un centro común)
    alfaCentauriGrupo.rotation.y += 0.005;
    acA.rotation.y += 0.01;
    acB.rotation.y += 0.01;

    // Físicas de las Sondas Voyager (se alejan continuamente)
    voyager1.position.add(voyager1.userData.velocidad);
    voyager2.position.add(voyager2.userData.velocidad);

    // Etiquetas HTML
    listaEtiquetas.forEach(et => {
        if(et.esConstelacion) { et.div.style.display = 'none'; return; }
        tempV.setFromMatrixPosition(et.malla.matrixWorld);
        tempV.project(camera);
        if (tempV.z < 1) {
            const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
            const y = -(tempV.y * 0.5 - 0.5) * window.innerHeight;
            et.div.style.display = 'block';
            et.div.style.left = `${x}px`; et.div.style.top = `${y}px`;
        } else { et.div.style.display = 'none'; }
    });

    if (!menuAbierto) {
        const moverActivo = enCabina ? nave : camera;

        if (tourActivo && objetivoViaje) {
            contadorTour++; if (contadorTour > 600) { tourIndex++; siguienteDestinoTour(); }
        }

        if (objetivoViaje) {
            const posDest = new THREE.Vector3(); objetivoViaje.getWorldPosition(posDest);
            let radio = 10;
            if(objetivoViaje.geometry) radio = objetivoViaje.geometry.parameters.radius || 10;
            // Aumentar la distancia segura drásticamente si es Alfa Centauri para no chocar con las estrellas
            const esEstrellaMasiva = (objetivoViaje.name === "Alfa Centauri" || objetivoViaje.name === "Sol");
            const distSegura = esEstrellaMasiva ? Math.max(radio * 8, 800) : Math.max(radio * 4, 30);
            
            const ideal = posDest.clone().add(new THREE.Vector3(distSegura, distSegura*0.3, distSegura));
            moverActivo.position.lerp(ideal, 0.04);
            moverActivo.lookAt(posDest);
        } else {
            let factorGiro = touchActive ? configSensibilidadJoy : 1;
            
            // LOGICA PARA INVERTIR EJE Y:
            let finalLookX = (joyX !== 0) ? joyX : mouseX;
            let finalLookY = (joyY !== 0) ? joyY : mouseY;
            if (invertirEjeY) {
                finalLookY = finalLookY * -1; // ¡Aquí ocurre la magia de inversión!
            }

            moverActivo.rotation.y -= finalLookX * configSensibilidadRat * factorGiro;
            moverActivo.rotation.x += finalLookY * configSensibilidadRat * factorGiro;
            moverActivo.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, moverActivo.rotation.x));
            moverActivo.rotation.z = 0; 

            let movAdelante = teclasPresionadas['w'] || btnAvanzarFijo;
            let movAtras = teclasPresionadas['s'] || btnRetrocederFijo;

            if (enCabina) {
                if (movAdelante) velocidad += configAceleracion;
                if (movAtras) velocidad -= configAceleracion;
                velocidad *= 0.98; 
                
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(nave.quaternion);
                nave.position.add(dir.multiplyScalar(velocidad));
                document.getElementById('ui-velocidad').innerText = Math.abs(Math.round(velocidad * 100));
            } else {
                const dirL = new THREE.Vector3();
                if (movAdelante) dirL.z -= (configAceleracion * 40);
                if (movAtras) dirL.z += (configAceleracion * 40);
                if (teclasPresionadas['a']) dirL.x -= (configAceleracion * 40);
                if (teclasPresionadas['d']) dirL.x += (configAceleracion * 40);
                dirL.applyQuaternion(camera.quaternion);
                camera.position.add(dirL);
            }
        }

        // --- CÁLCULO DE AÑOS LUZ ---
        // Simulación: Definimos que 1 Año Luz equivale a 8,000 unidades de distancia de Three.js en este mapa
        const distanciaAlCentro = moverActivo.position.length();
        const factorAñoLuz = 8000;
        const añosLuz = (distanciaAlCentro / factorAñoLuz).toFixed(4);
        document.getElementById('ui-distancia-al').innerText = añosLuz;

        document.getElementById('ui-coords').innerText = `X:${Math.round(moverActivo.position.x)} Y:${Math.round(moverActivo.position.y)} Z:${Math.round(moverActivo.position.z)}`;
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});