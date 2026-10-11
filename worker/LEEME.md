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

## Pendiente (siguiente etapa)
- Portales de alumnos, docentes y clientes: descargar desde R2 con enlaces temporales según lo que Supabase les permita ver.
- Dominio propio (por ejemplo `archivos.farostudios.net`) cuando el DNS del dominio pase a Cloudflare.
- Vencimiento automático de entregas (la fecha vive en Supabase; un proceso diario borra lo vencido).
