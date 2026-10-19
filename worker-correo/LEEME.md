# Servicio de correo de Faro (Worker `faro-correo`)

Conecta la pestaña **Correo** del Faro Workspace con tu correo de iCloud+ (`info@`, `producciones@` y `academia@farostudios.net`).
Todo se hace desde el navegador: no necesitas instalar nada en tu computadora.

```
🖥️ Faro Workspace (pestaña Correo)
        │  solo entra el director con su sesión
        ▼
⚙️ Worker "faro-correo" en Cloudflare  ← guarda la contraseña de app como secreto
        │  IMAP 993 (leer) · SMTP 587 (enviar)
        ▼
📬 iCloud Mail  (imap.mail.me.com · smtp.mail.me.com)
```

## Instalación (una sola vez, unos 10 minutos)

### 1. 🔑 Crea la contraseña de app en Apple
1. Entra a **account.apple.com** con tu Apple Account.
2. **Inicio de sesión y seguridad → Contraseñas de apps → ＋**.
3. Nómbrala `Faro Workspace` y **cópiala** (se ve una sola vez). Tiene el formato `xxxx-xxxx-xxxx-xxxx`.

### 2. ⚙️ Crea el Worker en Cloudflare
1. **dash.cloudflare.com → Workers & Pages → Create → Create Worker**.
2. Ponle el nombre exacto **`faro-correo`** y toca **Deploy** (con el código de ejemplo, no importa).
3. Toca **Edit code**. Borra todo lo que hay, pega el contenido de `worker-correo/index.js` de este repositorio y toca **Deploy**.
   - En GitHub: abre `worker-correo/index.js` y usa el botón **Copy raw file**.

### 3. 🔐 Guarda los dos secretos
En el Worker: **Settings → Variables and Secrets → Add**. Crea dos variables de tipo **Secret** (no "Text"):

| Nombre | Valor |
|---|---|
| `ICLOUD_USUARIO` | tu dirección principal de iCloud, la que termina en `@icloud.com` |
| `ICLOUD_CLAVE` | la contraseña de app del paso 1 |

Toca **Deploy** para que los tome.

### 4. ✅ Comprueba
1. Abre el Workspace → **Correo**.
2. Debe aparecer el aviso verde **“Conectado al correo de iCloud”** y tus correos reales.
3. Toca **Probar envío**: verifica que iCloud acepta enviar. Luego manda un correo a ti mismo.

Si la dirección del Worker no es `https://faro-correo.jorgedamartinez20.workers.dev`, en la pestaña Correo toca **Dirección del servicio** y pega la que aparece en *Settings → Domains & Routes*.

## Si algo falla (el aviso rojo dice el motivo)

| Mensaje | Qué hacer |
|---|---|
| No se pudo comunicar con el servicio | El Worker no está publicado o se llama distinto a `faro-correo`. |
| Faltan los secretos ICLOUD_USUARIO e ICLOUD_CLAVE | Revisa el paso 3 (que sean tipo **Secret** y que hiciste **Deploy**). |
| iCloud no aceptó el usuario o la contraseña de app | Crea otra contraseña de app. Revisa que `ICLOUD_USUARIO` sea tu dirección `@icloud.com` completa. |
| Sin permiso / vuelve a iniciar sesión | Cierra sesión del Workspace y entra de nuevo. |

## Qué hace y qué no (por ahora)
- ✅ Leer bandeja, abrir correos, buscar, destacar, marcar no leído, archivar, eliminar, responder, reenviar y redactar desde `info@`, `producciones@` o `academia@`.
- ✅ Los correos enviados quedan también en **Enviados** de iCloud (se ven en Apple Mail).
- ✅ Los borradores se guardan **en el navegador** donde los escribes (no en iCloud).
- ⏳ Los adjuntos se **listan** pero no se descargan ni se pueden adjuntar al enviar: eso por ahora se hace en Apple Mail.
- ⏳ Cada correo se muestra suelto, sin agrupar la conversación.
- 🔒 Solo el director (`reservas@farostudios.net`) puede usar el correo real. Aunque otro usuario del equipo tenga el permiso “Correo”, el servicio no lo deja entrar: tu contraseña de iCloud nunca se comparte.

## Seguridad
- La contraseña de app vive solo como secreto del Worker; nunca está en el código, en GitHub ni en el navegador.
- Cada petición valida tu sesión contra Supabase (y el código de 2 pasos si lo tienes activado), igual que el Worker de archivos.
- Si algún día quieres cortar el acceso: en Apple, borra la contraseña de app `Faro Workspace`. Deja de funcionar al instante.

## Notas técnicas
- Cloudflare bloquea solo el puerto 25; el 587 (SMTP de iCloud) y el 993 (IMAP) funcionan. Supabase Edge Functions bloquea el 587, por eso este servicio vive en Cloudflare.
- Cada acción abre una conexión nueva a iCloud. Si algún día iCloud limitara inicios de sesión muy seguidos, el Workspace se actualiza solo cada 90 segundos como máximo.
- En el plan gratuito de Cloudflare cada petición tiene un límite de proceso muy corto. Se lee como máximo el inicio de cada correo (300 KB) para no pasarse. Si ves “Exceeded CPU”, abre el correo en Apple Mail o sube al plan de pago.
- Pruebas (no usan iCloud ni tu cuenta, son servidores simulados): `node worker-correo/test/prueba.mjs`.
