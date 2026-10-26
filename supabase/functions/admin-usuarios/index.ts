// Faro · usuarios del panel de administración.
// Crea usuarios, cambia contraseñas y quita usuarios. SOLO responde al director.
// No guarda ni registra contraseñas: Supabase las conserva únicamente como huella (hash).
// verify_jwt está apagado a propósito: la sesión se valida aquí con auth.getUser() y se exige
// que el correo sea el del director (el gateway no valida bien las sesiones con llaves asimétricas).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DIRECTOR = "reservas@farostudios.net";
const DOMINIO = "@acceso.farostudios.net";
const PERMISOS = ["agenda", "contenido", "clientes", "academy", "academy_accesos", "academy_facturas", "metricas", "subir_material", "ver_archivos"];
const ORIGENES = [
  "https://jorgedamartinez20-oss.github.io",
  "https://farostudios.net",
  "https://www.farostudios.net",
  "https://workspace.farostudios.net",
  "null",
  "http://localhost:8000",
  "http://localhost:3000",
];

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const claveOk = (c: unknown): c is string => typeof c === "string" && c.length >= 8 && c.length <= 72;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const llave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("ADMIN_SECRET_KEY") ?? "";

  // comprobación de estado: solo dice si el servidor tiene lo necesario (no revela nada secreto)
  if (req.method === "GET") return json(req, { ok: true, llave: !!llave, url: !!url });
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);
  if (!url || !llave) return json(req, { error: "Falta configurar la llave del servidor." }, 500);

  const admin = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) solo el director, validado contra el servidor de Auth
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(req, { error: "Sin sesión" }, 401);
  const { data: quien, error: eAuth } = await admin.auth.getUser(token);
  if (eAuth || !quien?.user) return json(req, { error: "Sesión no válida" }, 401);
  if ((quien.user.email ?? "").toLowerCase() !== DIRECTOR) return json(req, { error: "Solo el director puede hacer esto." }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "Datos inválidos" }, 400); }
  const accion = String(b.accion ?? "");

  // 2) crear usuario del equipo con sus permisos
  if (accion === "crear") {
    const usuario = String(b.usuario ?? "").trim().toLowerCase();
    const nombre = String(b.nombre ?? "").trim().slice(0, 80);
    const etiqueta = String(b.etiqueta ?? "").trim().slice(0, 40) || null;
    const permisos = Array.isArray(b.permisos)
      ? [...new Set(b.permisos.map(String))].filter((p) => PERMISOS.includes(p))
      : [];
    let enlace = String(b.enlace ?? "").trim();
    if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(usuario)) return json(req, { error: "El usuario solo puede tener letras minúsculas sin acento, números, punto, guion o guion bajo (mínimo 3)." }, 400);
    if (!nombre) return json(req, { error: "Escribe el nombre de la persona." }, 400);
    if (!claveOk(b.clave)) return json(req, { error: "La contraseña necesita al menos 8 caracteres." }, 400);
    if (enlace) {
      try { const u = new URL(enlace); if (u.protocol !== "https:") throw 0; enlace = u.href; }
      catch { return json(req, { error: "El enlace de OneDrive debe empezar con https://" }, 400); }
    }
    if (!permisos.includes("subir_material")) enlace = "";

    const { data, error } = await admin.auth.admin.createUser({
      email: usuario + DOMINIO,
      password: b.clave as string,
      email_confirm: true,
      user_metadata: { nombre, equipo: true },
    });
    if (error || !data?.user) {
      const t = error?.message ?? "";
      return json(req, { error: /already|registered|exists/i.test(t) ? "Ese usuario ya existe. Elige otro nombre de usuario." : (t || "No se pudo crear el usuario.") }, 400);
    }
    const uid = data.user.id;
    const { error: e2 } = await admin.from("admin_equipo").insert({
      user_id: uid, usuario, nombre, etiqueta, permisos, enlace_subida: enlace || null,
    });
    if (e2) {
      await admin.auth.admin.deleteUser(uid); // no dejar cuentas a medias
      return json(req, { error: /duplicate|unique/i.test(e2.message) ? "Ese usuario ya está en uso." : "No se pudieron guardar los permisos: " + e2.message }, 400);
    }
    return json(req, { ok: true, user_id: uid });
  }

  // 3) nueva contraseña (solo cuentas del equipo o del portal; nunca la del director)
  if (accion === "clave") {
    const id = String(b.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(req, { error: "Cuenta no válida." }, 400);
    if (!claveOk(b.clave)) return json(req, { error: "La contraseña necesita al menos 8 caracteres." }, 400);
    const [a, c] = await Promise.all([
      admin.from("admin_equipo").select("user_id").eq("user_id", id).maybeSingle(),
      admin.from("ac_cuentas").select("user_id").eq("user_id", id).maybeSingle(),
    ]);
    if (!a.data && !c.data) return json(req, { error: "Esa cuenta no pertenece al equipo ni al portal." }, 404);
    const { error } = await admin.auth.admin.updateUserById(id, { password: b.clave as string });
    if (error) return json(req, { error: error.message || "No se pudo cambiar la contraseña." }, 400);
    return json(req, { ok: true });
  }

  // 4) quitar usuario del equipo por completo (borra su acceso, no solo sus permisos)
  if (accion === "quitar") {
    const id = String(b.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(req, { error: "Cuenta no válida." }, 400);
    const a = await admin.from("admin_equipo").select("user_id").eq("user_id", id).maybeSingle();
    if (!a.data) return json(req, { error: "Ese usuario no es del equipo." }, 404);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json(req, { error: error.message || "No se pudo quitar." }, 400);
    await admin.from("admin_equipo").delete().eq("user_id", id);
    return json(req, { ok: true });
  }

  return json(req, { error: "Acción no reconocida." }, 400);
});
