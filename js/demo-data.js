/* ============================================================
   Staff AJapp — DATOS DEMO (todo ficticio / supuesto)
   Edición supuesta: Curso de Protocolo XXII · 9-13 nov 2026
   Estructura idéntica al esquema Firestore real (FIRESTORE_SCHEMA.md),
   para que el paso de demo → Firebase sea solo cambiar el adaptador.
   ============================================================ */

const DEMO = (() => {
  // Generador pseudoaleatorio con semilla fija → la demo es siempre igual
  let seed = 20261109;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  /* ---------- config ---------- */
  const config = {
    edicion: 'XXII',
    nombreEdicion: 'Curso de Protocolo XXII (DEMO)',
    prefijoId: 'AJ2026-',
    contadorId: 40,
    maxPlazas: 130,
    // 80% de asistencia exigido para el título (ECTS)
    porcentajeMinimo: 0.8,
    timezone: 'Europe/Madrid'
  };

  /* ---------- staff (supuesto) ---------- */
  const staff = [
    { username: 'PalaInformatica',        nombreCompleto: 'Paula Navarro',        departamento: 'informatica',  activo: true }
  ];

  /* ---------- sesiones: 5 días, 14 medias ponencias (supuestas) ---------- */
  // Días: lunes 9 a viernes 13 de noviembre de 2026
  const fechasDia = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
  const defsSesiones = [
    // [dia, n, hora, nombre]
    [1, 1, '16:00', 'Apertura e Inauguración'],
    [1, 2, '17:15', 'Introducción al Protocolo Oficial'],
    [1, 3, '18:45', 'Historia y fundamentos del ceremonial'],
    [2, 1, '16:00', 'Protocolo en la Casa Real'],
    [2, 2, '17:15', 'Ordenación de banderas y precedencias'],
    [2, 3, '18:45', 'Protocolo diplomático e internacional'],
    [3, 1, '16:00', 'Protocolo empresarial'],
    [3, 2, '17:15', 'Organización integral de eventos'],
    [3, 3, '18:45', 'Comunicación y imagen institucional'],
    [4, 1, '16:00', 'Protocolo militar'],
    [4, 2, '17:15', 'Etiqueta y saber estar'],
    [4, 3, '18:45', 'Protocolo universitario'],
    [5, 1, '16:00', 'Mesa redonda: salidas profesionales'],
    [5, 2, '18:00', 'Clausura y Cena de Gala']
  ];

  // Estado supuesto: vamos por el día 3 → días 1-2 cerrados, D3_S1 activa
  const sesiones = defsSesiones.map(([dia, n, hora, nombre]) => {
    const id = `D${dia}_S${n}`;
    let estado = 'planificada';
    if (dia <= 2) estado = 'cerrada';
    if (id === 'D3_S1') estado = 'activa';
    return { id, nombre, dia, fecha: fechasDia[dia - 1], hora, capacidad: 130, estado, asistentesRegistrados: 0 };
  });

  /* ---------- inscripciones: 40 asistentes ficticios ---------- */
  const nombresM = ['Álvaro', 'Diego', 'Mario', 'Pablo', 'Adrián', 'Sergio', 'Iván', 'Rubén', 'Gonzalo', 'Marcos', 'Jaime', 'Víctor', 'Rodrigo', 'Andrés', 'Óscar'];
  const nombresF = ['Lucía', 'Paula', 'Carmen', 'Alba', 'Irene', 'Noelia', 'Claudia', 'Marina', 'Beatriz', 'Silvia', 'Natalia', 'Rocío', 'Teresa', 'Ángela', 'Inés'];
  const apellidos1 = ['Fernández', 'Martín', 'Sánchez', 'Gómez', 'Herrero', 'Velasco', 'Redondo', 'Calvo', 'Antolín', 'Pascual', 'Merino', 'Casado', 'Nieto', 'Sanz', 'Alonso', 'Iglesias', 'Domínguez', 'Aguado', 'Berrocal', 'Lozano'];
  const grados = ['Derecho', 'Periodismo', 'ADE', 'Publicidad y RR.PP.', 'Turismo', 'Ingeniería Informática', 'Comercio', 'Educación', 'Historia', 'Medicina'];
  const menus = ['Secreto al Pedro Ximénez con patatas', 'Merluza en salsa verde', 'Risotto de setas (vegetariano)'];
  const alergiasOpts = ['', '', '', '', '', 'Gluten', 'Lactosa', 'Frutos secos', ''];
  const letrasDNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

  const quitarAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  const inscripciones = [];
  for (let i = 1; i <= 40; i++) {
    const esF = rnd() < 0.5;
    const nombre = esF ? pick(nombresF) : pick(nombresM);
    const ape = `${pick(apellidos1)} ${pick(apellidos1)}`;
    const id = config.prefijoId + String(i).padStart(4, '0');
    const conCena = rnd() < 0.7;
    const numDni = 90000000 + Math.floor(rnd() * 900000);
    const anyo = 1999 + Math.floor(rnd() * 8); // nacidos 1999-2006
    inscripciones.push({
      id,
      nombre,
      apellidos: ape,
      apellidoOrden: quitarAcentos(ape).toLowerCase(),
      fechaNacimiento: `${anyo}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
      gradoActividades: pick(grados),
      menuCena: conCena ? pick(menus) : '',
      dni: `${numDni}${letrasDNI[numDni % 23]}`, // DNI ficticio con letra válida
      email: `${quitarAcentos(nombre).toLowerCase()}.${quitarAcentos(ape.split(' ')[0]).toLowerCase()}@demo.alfiljuvenil.com`,
      alergias: pick(alergiasOpts),
      modalidad: conCena ? 'curso_cena' : 'solo_curso',
      precio: conCena ? 90 : 65,
      estado: rnd() < 0.9 ? 'confirmado' : 'pendiente',
      tsInscripcion: `2026-10-${String(1 + Math.floor(rnd() * 25)).padStart(2, '0')}T12:00:00`,
      qrCode: id
    });
  }

  /* ---------- checkins supuestos de los días 1 y 2 (6 sesiones cerradas) ----------
     Perfiles de asistencia para que el dashboard tenga casos que enseñar:
     - la mayoría asiste a casi todo (0-1 faltas)
     - AJ2026-0007, 0015, 0023, 0031 → 2 faltas (EN RIESGO: una falta más y pierden el título)
     - AJ2026-0004, 0019, 0036      → 3+ faltas (CRÍTICO: por debajo del 80%)              */
  const cerradas = sesiones.filter((s) => s.estado === 'cerrada').map((s) => s.id);
  const enRiesgo = ['AJ2026-0007', 'AJ2026-0015', 'AJ2026-0023', 'AJ2026-0031'];
  const criticos = ['AJ2026-0004', 'AJ2026-0019', 'AJ2026-0036'];
  const staffScanners = staff.filter((s) => s.activo).map((s) => s.username);

  const checkins = [];
  let ckId = 1;
  inscripciones.forEach((a) => {
    if (a.estado !== 'confirmado') return; // los pendientes no asistieron
    let faltas = 0;
    if (criticos.includes(a.id)) faltas = 3;
    else if (enRiesgo.includes(a.id)) faltas = 2;
    else faltas = rnd() < 0.75 ? 0 : 1;
    // elige qué sesiones se salta
    const saltadas = [...cerradas].sort(() => rnd() - 0.5).slice(0, faltas);
    cerradas.forEach((sesId) => {
      if (saltadas.includes(sesId)) return;
      const ses = sesiones.find((s) => s.id === sesId);
      checkins.push({
        id: `ck${String(ckId++).padStart(4, '0')}`,
        sesionId: sesId,
        asistenteId: a.id,
        staffUsername: pick(staffScanners),
        metodo: rnd() < 0.9 ? 'qr' : 'manual',
        timestamp: `${ses.fecha}T${ses.hora}:00`
      });
    });
  });

  // Algunos ya escaneados en la sesión activa (D3_S1) para que el "en vivo" arranque con datos
  const yaEnActiva = inscripciones.filter((a) => a.estado === 'confirmado').slice(0, 12);
  yaEnActiva.forEach((a) => {
    checkins.push({
      id: `ck${String(ckId++).padStart(4, '0')}`,
      sesionId: 'D3_S1',
      asistenteId: a.id,
      staffUsername: pick(staffScanners),
      metodo: 'qr',
      timestamp: '2026-11-11T16:02:00'
    });
  });

  // contador denormalizado (igual que hará Firestore)
  sesiones.forEach((s) => {
    s.asistentesRegistrados = checkins.filter((c) => c.sesionId === s.id).length;
  });

  return { config, staff, sesiones, inscripciones, checkins };
})();
