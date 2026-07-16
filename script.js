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

// Datos para la ventana de información (puedes reemplazar las URLs con imágenes locales si lo deseas)
const baseDeDatosAstros = {
    "Sol": { desc: "La estrella en el centro de nuestro sistema solar. Compuesta principalmente de hidrógeno y helio.", img: "https://upload.wikimedia.org/wikipedia/commons/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg" },
    "Mercurio": { desc: "El planeta más cercano al Sol y el más pequeño del Sistema Solar.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg" },
    "Venus": { desc: "El segundo planeta. Tiene una atmósfera densa que atrapa el calor en un efecto invernadero extremo.", img: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg" },
    "Tierra": { desc: "Nuestro hogar, el tercer planeta desde el Sol y el único conocido que alberga vida.", img: "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg" },
    "Marte": { desc: "El planeta rojo. Conocido por sus enormes volcanes y cañones.", img: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg" },
    "Júpiter": { desc: "El gigante gaseoso más grande del Sistema Solar.", img: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg" },
    "Saturno": { desc: "Famoso por su prominente sistema de anillos compuestos de hielo y roca.", img: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg" },
    "Urano": { desc: "El gigante de hielo que gira de lado. Tiene un tenue color azul verdoso.", img: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg" },
    "Neptuno": { desc: "El planeta más lejano, oscuro y frío, azotado por vientos supersónicos.", img: "https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg" },
    "Plutón": { desc: "Planeta enano ubicado en el cinturón de Kuiper.", img: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Pluto_in_True_Color_-_High-Res.jpg" },
    "Voyager 1": { desc: "Sonda espacial lanzada en 1977. Es el objeto creado por humanos más alejado de la Tierra.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Voyager_spacecraft_model.png" },
    "Voyager 2": { desc: "Hermana de la Voyager 1, es la única sonda que ha visitado Urano y Neptuno.", img: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Voyager_spacecraft_model.png" }
};

// ==========================================
// 2. CREACIÓN DEL SISTEMA SOLAR, ÓRBITAS Y ASTEROIDES
// ==========================================
const sunGeo = new THREE.SphereGeometry(120, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 }); 
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = "Sol";
scene.add(sun);
objetosInteractivos.push(sun);
crearEtiquetaHTML("Sol", sun);

const sunLight = new THREE.PointLight(0xffffff, 2, 50000);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x222222)); 

const datosPlanetas = [
    { nombre: 'Mercurio', radio: 8, distancia: 300, color: 0x888888, velocidad: 0.01 },
    { nombre: 'Venus', radio: 15, distancia: 450, color: 0xe3bb76, velocidad: 0.007 },
    { nombre: 'Tierra', radio: 16, distancia: 650, color: 0x2233ff, velocidad: 0.005, 
      lunas: [{nombre: 'Luna', radio: 4, distancia: 35, color: 0xaaaaaa, velocidad: 0.05}] },
    { nombre: 'Marte', radio: 10, distancia: 850, color: 0xc1440e, velocidad: 0.004 },
    { nombre: 'Júpiter', radio: 45, distancia: 1300, color: 0xb07f35, velocidad: 0.002 },
    { nombre: 'Saturno', radio: 38, distancia: 1800, color: 0xe2bf7d, velocidad: 0.0009, tieneAnillos: true },
    { nombre: 'Urano', radio: 25, distancia: 2300, color: 0x4b70dd, velocidad: 0.0004 },
    { nombre: 'Neptuno', radio: 24, distancia: 2800, color: 0x274687, velocidad: 0.0001 },
    { nombre: 'Plutón', radio: 4, distancia: 3300, color: 0xaabbcc, velocidad: 0.00005 }
];

const planetasMallas = [];
const materialOrbita = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });

datosPlanetas.forEach((datos) => {
    // Generar línea de Órbita
    const curvaOrbita = new THREE.EllipseCurve(0, 0, datos.distancia, datos.distancia, 0, 2 * Math.PI, false, 0);
    const puntosOrbita = curvaOrbita.getPoints(100);
    const geoOrbita = new THREE.BufferGeometry().setFromPoints(puntosOrbita);
    const lineaOrbita = new THREE.Line(geoOrbita, materialOrbita);
    lineaOrbita.rotation.x = Math.PI / 2;
    scene.add(lineaOrbita);

    // Generar Planeta
    const pivote = new THREE.Object3D();
    scene.add(pivote);

    const geo = new THREE.SphereGeometry(datos.radio, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color: datos.color, shininess: 10 });
    const malla = new THREE.Mesh(geo, mat);
    malla.position.set(datos.distancia, 0, 0);
    malla.name = datos.nombre;
    pivote.add(malla);
    
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
            lunaPivote.add(lunaMalla);
            crearEtiquetaHTML(lunaDatos.nombre, lunaMalla);
            lunasMallas.push({ pivote: lunaPivote, velocidad: lunaDatos.velocidad });
        });
    }

    if (datos.tieneAnillos) {
        const anilloGeo = new THREE.RingGeometry(datos.radio + 10, datos.radio + 35, 32);
        const anilloMat = new THREE.MeshBasicMaterial({ color: 0xa68553, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const anillo = new THREE.Mesh(anilloGeo, anilloMat);
        anillo.rotation.x = Math.PI / 2;
        malla.add(anillo);
    }

    planetasMallas.push({ pivote: pivote, malla: malla, velocidad: datos.velocidad, lunasMallas: lunasMallas });
});

// Cinturón de Asteroides (Entre Marte y Júpiter: distancias ~950 a 1150)
const astGeo = new THREE.BufferGeometry();
const astMat = new THREE.PointsMaterial({ color: 0x999999, size: 1.5, sizeAttenuation: true });
const astVertices = [];
for (let i = 0; i < 4000; i++) {
    const radioCinturon = 950 + (Math.random() * 200);
    const theta = Math.random() * Math.PI * 2;
    const yDisp = (Math.random() - 0.5) * 40; // Dispersión vertical
    astVertices.push(radioCinturon * Math.cos(theta), yDisp, radioCinturon * Math.sin(theta));
}
astGeo.setAttribute('position', new THREE.Float32BufferAttribute(astVertices, 3));
const cinturonAsteroides = new THREE.Points(astGeo, astMat);
scene.add(cinturonAsteroides);

// Voyager 1 y 2
function crearSonda(nombre, xPos, zPos) {
    const sondaGroup = new THREE.Group();
    // Cuerpo y Antena básica
    const cuerpoGeo = new THREE.BoxGeometry(4, 4, 4);
    const cuerpoMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    sondaGroup.add(new THREE.Mesh(cuerpoGeo, cuerpoMat));
    
    const platoGeo = new THREE.CylinderGeometry(5, 0, 2, 16);
    const platoMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const plato = new THREE.Mesh(platoGeo, platoMat);
    plato.rotation.x = Math.PI / 2;
    plato.position.z = 3;
    sondaGroup.add(plato);

    sondaGroup.position.set(xPos, 50, zPos);
    sondaGroup.name = nombre;
    scene.add(sondaGroup);
    
    // Esfera invisible más grande para hacer clic fácilmente
    const hitBox = new THREE.Mesh(new THREE.SphereGeometry(20, 8, 8), new THREE.MeshBasicMaterial({visible: false}));
    hitBox.name = nombre;
    sondaGroup.add(hitBox);

    objetosInteractivos.push(hitBox);
    crearEtiquetaHTML(nombre, sondaGroup);
    return sondaGroup;
}
const voyager1 = crearSonda("Voyager 1", 3800, -1000);
const voyager2 = crearSonda("Voyager 2", 3600, 1500);

// ==========================================
// 3. CONSTELACIONES Y ESTRELLAS
// ==========================================
const constelacionesGrupo = new THREE.Group();
scene.add(constelacionesGrupo);

const starGeo = new THREE.BufferGeometry();
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.4 });
const starVertices = [];
for (let i = 0; i < 20000; i++) {
    const radius = 8000 + Math.random() * 15000;
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
// 4. NAVEGACIÓN Y CONTROLES
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
let configSensibilidadJoy = 12; // Nuevo multiplicador para el joystick
let configAceleracion = 0.15;
let velocidad = 0;
let menuAbierto = false; 

const raycaster = new THREE.Raycaster();
const raton = new THREE.Vector2();
let objetivoViaje = null;

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
    const data = baseDeDatosAstros[nombreAstro] || { desc: "Objeto astronómico desconocido.", img: "https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg" };
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

// Joystick Analógico (Dirección)
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

// Botones A/B (Aceleración)
const btnAvanzarDOM = document.getElementById('btn-avanzar');
const btnRetrocederDOM = document.getElementById('btn-retroceder');
if(btnAvanzarDOM) {
    btnAvanzarDOM.addEventListener('touchstart', (e) => { e.preventDefault(); btnAvanzarFijo = true; cancelarViaje(); });
    btnAvanzarDOM.addEventListener('touchend', (e) => { e.preventDefault(); btnAvanzarFijo = false; });
    btnRetrocederDOM.addEventListener('touchstart', (e) => { e.preventDefault(); btnRetrocederFijo = true; cancelarViaje(); });
    btnRetrocederDOM.addEventListener('touchend', (e) => { e.preventDefault(); btnRetrocederFijo = false; });
}

// --- LÓGICA RATÓN/TECLADO ---
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
        mostrarVentanaInfo(objetivoViaje.name);
    }
});

// Menú y Tour
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
const planetasTour = ['Sol', 'Mercurio', 'Venus', 'Tierra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno', 'Plutón', 'Voyager 1', 'Voyager 2'];
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
    objetivoViaje = objetosInteractivos.find(obj => obj.name === activas[tourIndex].value);
    if(objetivoViaje) mostrarVentanaInfo(objetivoViaje.name);
    contadorTour = 0;
}

// ==========================================
// 5. CICLO DE ANIMACIÓN
// ==========================================
const tempV = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    planetasMallas.forEach((p) => {
        p.pivote.rotation.y += p.velocidad; p.malla.rotation.y += 0.01;         
        p.lunasMallas.forEach(l => l.pivote.rotation.y += l.velocidad);
    });
    
    cinturonAsteroides.rotation.y -= 0.0005;

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
            const distSegura = Math.max(radio * 4, 30);
            const ideal = posDest.clone().add(new THREE.Vector3(distSegura, distSegura*0.3, distSegura));
            moverActivo.position.lerp(ideal, 0.04);
            moverActivo.lookAt(posDest);
        } else {
            // Se utiliza la nueva sensibilidad del Joystick Digital
            let factorGiro = touchActive ? configSensibilidadJoy : 1;
            let finalLookX = (joyX !== 0) ? joyX : mouseX;
            let finalLookY = (joyY !== 0) ? joyY : mouseY;

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