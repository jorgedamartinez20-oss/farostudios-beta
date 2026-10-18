// Faro · avisos push al teléfono y a la computadora del director.
// Dos formas de llamarla:
//   1) La base de datos y el servicio de archivos, con la cabecera x-push-secret (reservas, cotizaciones, resumen diario).
//   2) El propio director desde el Workspace (botón "Enviar prueba"), con su sesión.
// verify_jwt está apagado a propósito: aquí se valida el secreto o la sesión del director.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const DIRECTOR = "reservas@farostudios.net";
const ORIGENES = [
  "https://jorgedamartinez20-oss.github.io",
  "https://farostudios.net",
  "https://www.farostudios.net",
];

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

// compara sin revelar dónde falla
function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const hoyGT = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10); // Guatemala = UTC-6 todo el año
const corto = (t: unknown, n = 90) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);

type Aviso = { title: string; body: string; tag?: string; url?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const llave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("ADMIN_SECRET_KEY") ?? "";
  const secreto = Deno.env.get("PUSH_SECRET") ?? "";
  const vapidPub = Deno.env.get("VAPID_PUBLIC") ?? "";
  const vapidPriv = Deno.env.get("VAPID_PRIVATE") ?? "";
  if (!url || !llave || !vapidPub || !vapidPriv) return json(req, { error: "Falta configurar las llaves del servidor." }, 500);
  const sb = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json(req, { error: "Datos inválidos" }, 400); }
  const tipo = String(b.tipo ?? "");

  // ---- quién llama ----
  const dado = req.headers.get("x-push-secret") ?? "";
  const porSecreto = !!secreto && !!dado && iguales(dado, secreto);
  if (!porSecreto) {
    if (tipo !== "prueba") return json(req, { error: "No autorizado" }, 401);
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(req, { error: "Sin sesión" }, 401);
    const { data: q, error: e } = await sb.auth.getUser(token);
    if (e || !q?.user || (q.user.email ?? "").toLowerCase() !== DIRECTOR) return json(req, { error: "Solo el director" }, 403);
  }

  // ---- qué avisar ----
  let aviso: Aviso;
  const d = (b.data ?? {}) as Record<string, any>;
  if (tipo === "prueba") {
    aviso = { title: "Faro Workspace", body: "Las notificaciones funcionan en este aparato.", tag: "prueba" };
  } else if (tipo === "reserva") {
    const hora = d.hora ? String(d.hora).slice(0, 5) : "";
    aviso = { title: "📅 Nueva reserva", body: [corto(d.nombre, 40), corto(d.categoria, 40), [d.fecha, hora].filter(Boolean).join(" ")].filter(Boolean).join(" · "), tag: "reserva-" + (d.id ?? "") };
  } else if (tipo === "cotizacion") {
    aviso = { title: "💬 Nueva cotización", body: [corto(d.nombre, 40), corto(d.categoria, 40), corto(d.ciudad, 30)].filter(Boolean).join(" · "), tag: "cot-" + (d.id ?? "") };
  } else if (tipo === "solicitud") {
    aviso = { title: "🖨️ Solicitud de impresiones", body: [corto(d.cliente, 40), `${d.cantidad ?? 0} impresión(es)`, d.total ? `Q${d.total}` : ""].filter(Boolean).join(" · "), tag: "sol-" + (d.id ?? "") };
  } else if (tipo === "resena") {
    aviso = { title: "⭐ Nueva reseña", body: [corto(d.nombre, 40), "★".repeat(Number(d.estrellas) || 0), corto(d.texto, 80)].filter(Boolean).join(" · "), tag: "res-" + (d.id ?? "") };
  } else if (tipo === "descarga") {
    aviso = { title: "⬇️ Descargaron un archivo", body: corto(d.archivo, 120), tag: "descarga" };
  } else if (tipo === "resumen") {
    const hoy = hoyGT();
    const [pub, ses, pro, cot] = await Promise.all([
      sb.from("contenido").select("titulo,cuenta").eq("fecha", hoy).eq("c_publicado", false),
      sb.from("agenda").select("nombre,hora,categoria").eq("fecha", hoy).neq("estado", "cancelada").order("hora"),
      sb.from("prospectos").select("empresa").lte("proximo_seguimiento", hoy).not("estado", "in", "(ganado,perdido)"),
      sb.from("cotizaciones").select("id").eq("estado", "nueva"),
    ]);
    const L: string[] = [];
    const p = pub.data ?? [], s = ses.data ?? [], r = pro.data ?? [], c = cot.data ?? [];
    if (p.length) L.push("📝 Publicar hoy: " + p.slice(0, 3).map((x: any) => corto(x.titulo, 40)).join(" · ") + (p.length > 3 ? ` (+${p.length - 3})` : ""));
    if (s.length) L.push("📅 Hoy: " + s.slice(0, 3).map((x: any) => `${String(x.hora ?? "").slice(0, 5)} ${corto(x.nombre, 24)}`.trim()).join(" · "));
    if (r.length) L.push(`📇 ${r.length} prospecto(s) por dar seguimiento`);
    if (c.length) L.push(`💬 ${c.length} cotización(es) sin responder`);
    aviso = { title: "Buen día · tu día en Faro", body: L.length ? L.join("\n") : "Nada pendiente para hoy.", tag: "resumen" };
  } else {
    return json(req, { error: "Tipo desconocido" }, 400);
  }

  // ---- enviar a todos los aparatos suscritos ----
  webpush.setVapidDetails("mailto:" + DIRECTOR, vapidPub, vapidPriv);
  const { data: subs, error } = await sb.from("push_subs").select("endpoint,p256dh,auth");
  if (error) return json(req, { error: "No se pudo leer las suscripciones" }, 500);
  const carga = JSON.stringify({ ...aviso, url: aviso.url ?? "admin.html" });
  let enviados = 0, quitados = 0, fallos = 0;
  await Promise.all((subs ?? []).map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: "high" });
      enviados++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) { quitados++; await sb.from("push_subs").delete().eq("endpoint", s.endpoint); }
      else fallos++;
    }
  }));
  return json(req, { ok: true, aparatos: (subs ?? []).length, enviados, quitados, fallos });
});
