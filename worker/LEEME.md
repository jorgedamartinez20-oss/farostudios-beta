# Servicio de archivos de Faro (Cloudflare Worker + R2)

Guarda, lista y entrega los archivos. **Los datos (quién es quién) siguen en Supabase**; aquí solo viven los archivos.

## Buckets (ya creados)
- `faro-privado`: Faro Studios y Faro Academy. Sin acceso público; solo se abre con enlaces temporales.
- `faro-publico`: imágenes, audios y PDFs del landing (enlace permanente).

## Estructura de carpetas (única definición: `src/index.js`)

```
faro-privado/
├─ faro-studios/
│   ├─ agencias/<agencia>/archivo          (sin subcarpetas por ahora)
│   ├─ corporativo/<empresa>/archivo
│   └─ clientes-individuales/<cliente>/archivo
└─ faro-academy/
    ├─ ingles/   contenido-de-clase · material-didactico · videos · ejercicios · clases
    │            alumnos/<alumno>/…  (lo que sube el alumno)
    │            docentes/<docente>/… (lo que sube el docente)
    └─ musica/   (igual que inglés)
└─ documentos/   (solo el director · pestaña Documentos del admin)
    ├─ catalogos · afiches · datos-de-cuenta · otros     (archivos sueltos)
    └─ sat/<año>/archivo                                 (por año)

faro-publico/
└─ landing/  fotos-studios · portafolio · producciones-musicales · recursos-gratis · catalogo · academy-fotos
```

Las carpetas por persona (`<agencia>`, `<alumno>`…) se crean cuando se da de alta a esa persona o al subirle el primer archivo.
El servicio rechaza cualquier archivo que quede fuera de esta estructura.

## Publicarlo (una sola vez, desde tu computadora con Node instalado)

1. Abre una terminal dentro de esta carpeta (`worker`).
2. `npx wrangler login` (se abre el navegador; autoriza tu cuenta de Cloudflare).
3. `npx wrangler secret put FIRMA_SECRETO` y pega una frase larga y al azar (por ejemplo la que da `openssl rand -base64 32`). Sirve para firmar los enlaces temporales de descarga. No la compartas.
4. `npx wrangler deploy`. Al terminar te muestra la dirección: `https://faro-archivos.<tu-subdominio>.workers.dev`.
5. En el admin → pestaña **Materiales**: pega esa dirección, toca **Conectar** y luego **Preparar carpetas**.

Si cambia la dirección desde donde abres el admin, agrégala a `ORIGENES` en `wrangler.toml` y vuelve a ejecutar `npx wrangler deploy`.

## Cómo se protege
- Todo lo que sube, lista, borra o enlaza exige sesión del administrador (`reservas@farostudios.net`), validada contra Supabase en cada petición.
- Los archivos privados solo salen por enlaces firmados que vencen (1 hora por defecto, máximo 24 horas).
- `/pub/` solo sirve la carpeta `landing/` del bucket público; lo privado nunca sale por ahí.
- La llave `sb_publishable_…` de `wrangler.toml` es pública por diseño. El único secreto es `FIRMA_SECRETO`, que no está en el repositorio.

## Pruebas
`node test/prueba.mjs` (no necesita Cloudflare; simula R2 y Supabase).

## Descargas y estadísticas
Cada vez que alguien abre un enlace temporal se suma una descarga (o una reproducción si es vista en línea) en `_stats/descargas.json` dentro de `faro-privado`. El admin lo lee con `/api/stats` (solo administrador). Las vistas previas del propio admin no cuentan.

## Portal (alumnos, familias, docentes, equipo)
Rutas `/p/enlace`, `/p/subir` y `/p/borrar`. El servicio no decide quién puede qué: llama a la función `archivo_permiso(ruta, accion)` de Supabase con la sesión de la persona y la base responde sí o no. La carpeta de cada persona (`faro-academy/estudiantes/<nombre>-<id>/`, `faro-academy/docentes/…`, `faro-studios/clientes/…`) la genera la base de datos (columna `carpeta`).
Dentro de cada alumno: `material`, `respuestas`, `practicas`, `mis-archivos`, `diplomas`, `facturas`. Alumnos, familias y clientes nunca borran.

## Papelera general
Borrar no quita el archivo de R2: deja una marca en `_papelera/` y el archivo desaparece de listas y enlaces. En el admin (Archivos → Papelera general) se puede restaurar o eliminar de forma definitiva; lo que lleva más de 30 días se vacía con un botón.
Rutas del administrador: `/api/papelera`, `/api/restaurar`, `/api/purgar`, `/api/carpeta-persona`.

## Pendiente (siguiente etapa)
- Dominio propio (por ejemplo `archivos.farostudios.net`) cuando el DNS del dominio pase a Cloudflare.
- Vencimiento automático de entregas (la fecha vive en Supabase; un proceso diario borra lo vencido).
