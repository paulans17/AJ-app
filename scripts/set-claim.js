/**
 * Asigna el custom claim `departamento` a una cuenta real de Firebase Auth
 * (email/contraseña), para que entre en modo Admin dentro de la PWA
 * (docs/DECISIONS.md D4/D12) o en el panel /admin de la web (D2).
 *
 * Se ejecuta a mano, nunca se despliega (docs/ARCHITECTURE.md, "Scripts de
 * administración locales").
 *
 * Requisitos:
 *   - Node.js + `npm install firebase-admin` en scripts/ (o en la raíz del repo).
 *   - scripts/serviceAccountKey.json (clave de cuenta de servicio del
 *     proyecto alfiljuvenil-protocolo, ya generada — ver PROJECT_SETUP.md
 *     paso 4). NUNCA se sube a git (.gitignore ya la protege).
 *
 * Uso:
 *   node scripts/set-claim.js <email> <departamento>
 *   node scripts/set-claim.js pau@alfiljuvenil.es informatica
 */

const path = require('path');
const admin = require('firebase-admin');

const DEPARTAMENTOS_ADMIN = ['informatica', 'presidencia'];

function main() {
  const [, , email, departamento] = process.argv;

  if (!email || !departamento) {
    console.error('Uso: node scripts/set-claim.js <email> <departamento>');
    console.error(`<departamento> debe ser uno de: ${DEPARTAMENTOS_ADMIN.join(', ')}`);
    process.exit(1);
  }
  if (!DEPARTAMENTOS_ADMIN.includes(departamento)) {
    console.error(`Departamento inválido: "${departamento}". Debe ser uno de: ${DEPARTAMENTOS_ADMIN.join(', ')}`);
    process.exit(1);
  }

  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  let serviceAccount;
  try {
    serviceAccount = require(keyPath);
  } catch (e) {
    console.error(`No se encuentra ${keyPath}.`);
    console.error('Genera la clave en Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada, y guárdala ahí (ver docs/PROJECT_SETUP.md paso 4).');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  admin.auth().getUserByEmail(email)
    .then((user) => admin.auth().setCustomUserClaims(user.uid, { departamento }).then(() => user))
    .then((user) => {
      console.log(`✓ Custom claim departamento="${departamento}" asignado a ${email} (uid ${user.uid}).`);
      console.log('El usuario debe cerrar sesión y volver a entrar (o esperar a que el SDK refresque el token) para que el claim tenga efecto.');
      process.exit(0);
    })
    .catch((err) => {
      if (err.code === 'auth/user-not-found') {
        console.error(`No existe ninguna cuenta de Firebase Auth con el email ${email}.`);
        console.error('Créala primero en Authentication → Users → Add user (o reutiliza la del panel /admin de la web si el proyecto es el mismo — ver docs/DECISIONS.md D2).');
      } else {
        console.error('Error al asignar el custom claim:', err.message);
      }
      process.exit(1);
    });
}

main();
