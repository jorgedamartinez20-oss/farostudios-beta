-- Planificación de contenido, recordatorios y avisos a clientes (Faro Studios / Faro Academy)
-- Solo el administrador puede leer o cambiar estas tablas.

create table if not exists public.contenido (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  titulo text not null,
  cuenta text not null default 'studios' check (cuenta in ('studios','academy','davissimo')),
  pilar text check (pilar in ('autoridad','locucion','escenas','servicios','venta','comunidad')),
  formato text check (formato in ('carrusel_yo','carrusel_canva','camara','reel_sin_cara','reel_existente','escena','otro')),
  sesion text,                -- G1, G2… (sesión de grabación a la que pertenece)
  hito text,                  -- feriado / efeméride
  descripcion text, hook text, guion text, cta text,
  tarea text, story text, notas text,
  c_guion boolean not null default false,
  c_grabado boolean not null default false,
  c_listo boolean not null default false,        -- editado / diseñado
  c_tarea boolean not null default false,
  c_story boolean not null default false,
  c_publicado boolean not null default false,
  archivo_final text,         -- ruta en Materiales (R2) o enlace
  entregado_en timestamptz,   -- cuando Claude entregó el archivo final
  descargado_en timestamptz,  -- cuando David lo descargó
  publicado_en timestamptz,
  url_publicacion text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists contenido_fecha_idx on public.contenido (fecha);

create table if not exists public.contenido_sesiones (
  codigo text primary key,
  fecha_ini date not null, fecha_fin date not null,
  prepara text, hecha boolean not null default false, hecha_en timestamptz
);
create table if not exists public.contenido_material (
  id uuid primary key default gen_random_uuid(),
  fecha_limite date not null, titulo text not null,
  entregado boolean not null default false, entregado_en timestamptz
);
create table if not exists public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'otro' check (tipo in ('sat','pago','cliente','contenido','otro')),
  recurrencia text not null default 'mensual' check (recurrencia in ('una_vez','mensual','trimestral','anual')),
  fecha date,                 -- solo para "una_vez"
  dia integer,                -- día del mes (0 = último día del mes)
  mes integer,                -- anual: mes (1-12) · trimestral: primer mes del ciclo (1-3)
  aviso_dias integer not null default 5,
  hecho_periodo text,         -- último periodo cumplido (p. ej. 2026-10)
  activo boolean not null default true,
  nota text,
  creado timestamptz not null default now()
);
create table if not exists public.avisos_clientes (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null, telefono text, plantilla text, mensaje text,
  canal text not null default 'whatsapp',
  creado timestamptz not null default now()
);
alter table public.cl_clientes add column if not exists whatsapp text;

do $$ declare t text; begin
  foreach t in array array['contenido','contenido_sesiones','contenido_material','recordatorios','avisos_clientes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "admin %1$s" on public.%1$I', t);
    execute format('create policy "admin %1$s" on public.%1$I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t);
  end loop;
end $$;
-- Datos iniciales: calendario Oct–Dic 2026 (solo cargar una vez)
insert into public.contenido (fecha,titulo,cuenta,pilar,formato,sesion,hito,descripcion,cta,tarea,story) values
('2026-10-03','Esto es Faro Studios','studios','servicios','carrusel_canva',null,null,'Manifiesto y presentación: video, foto, audio, ilustración y locución. Un slide por servicio con ícono.','Síguenos y guarda la publicación','Elegir 5 fotos B/N y montar el carrusel en Canva','Presenta la cuenta'),
('2026-10-04','Luz dura vs luz suave','studios','comunidad','carrusel_yo',null,null,'Duelo A vs B con diagrama: qué sombra deja cada una, cuándo usarla y con qué equipo.','Comenta A o B','Leer guiones de G1 y elegir ropa y parque para la escena','«Esto o esto»: luz dura o suave'),
('2026-10-05','Anatomía de la iluminación de 3 puntos','studios','autoridad','carrusel_yo',null,null,'Diagrama cenital: luz principal, de relleno y contraluz, con ángulos y distancias.','Guárdalo para tu próximo set','GRABAR G1: 3 errores a cámara, graduaciones y Escena 01 en el parque','Encuesta técnica'),
('2026-10-06','Video para empresas: 5 piezas que tu negocio necesita','studios','servicios','carrusel_canva',null,null,'Institucional, reels de producto, testimonios, cobertura de eventos y video de capacitación.','Escríbenos «EMPRESA» por mensaje','Editar el video de los 3 errores','Caja de preguntas: video para empresas'),
('2026-10-07','3 errores al hablar a cámara','studios','locucion','camara','G1',null,'Mirar la pantalla en vez del lente, hablar sin pausas y las muletillas. Cómo corregir cada uno en el momento.','Sigue para más tips de cámara','Editar el video de graduación','Reto: mira al lente 10 segundos'),
('2026-10-08','Dinámico, condensador o lavalier','studios','autoridad','carrusel_yo',null,null,'Anatomía de cada micrófono y guía rápida de cuál usar en entrevista, música, locución y exteriores.','¿Cuál usas tú? Coméntalo','Día de clases: solo publicar y responder','Quiz: ¿qué micrófono es?'),
('2026-10-09','Abrimos la temporada de graduaciones','studios','venta','camara','G1',null,'Tú a cámara: «Tu graduación pasa una vez». Sesión individual (Overture) o con familia (Prelude).','Escribe «GRADUACIÓN» para recibir paquetes','Leer guiones de G2 (sáb 10 – dom 11)','Cupos de graduación'),
('2026-10-10','Escena 01 · Caminata en el parque','studios','escenas','escena','G1',null,null,null,null,null),
('2026-10-11','Plantilla gratis: hoja de llamado','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-10-12','Guía de decisión: ¿qué lente usar?','studios','autoridad','camara','G2',null,null,null,null,null),
('2026-10-13','Así se ilumina un plato','studios','servicios','carrusel_yo',null,null,null,null,null,null),
('2026-10-14','Calienta tu voz en 2 minutos','studios','locucion','camara','G2',null,null,null,null,null),
('2026-10-15','De boceto a ilustración en 30 segundos','studios','autoridad','reel_sin_cara','G2',null,null,null,null,null),
('2026-10-16','Qué llevar a tu sesión de graduación','studios','venta','camara','G2',null,null,null,null,null),
('2026-10-17','Escena 02 · Ida al súper','studios','escenas','escena','G2',null,null,null,null,null),
('2026-10-18','Celular vs cámara: ¿cuándo contratar?','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-10-19','La regla de los 180° del obturador','studios','autoridad','camara','G3',null,null,null,null,null),
('2026-10-20','Colegios: graduación, anuario y video institucional','studios','servicios','camara','G3','Feriado · 20 oct',null,null,null,null),
('2026-10-21','Habla a cámara sin guion largo','studios','locucion','carrusel_yo',null,null,null,null,null,null),
('2026-10-22','Foley casero: 3 sonidos con objetos de cocina','studios','autoridad','reel_sin_cara','G3',null,null,null,null,null),
('2026-10-23','Paquetes de graduación: últimos cupos','studios','venta','camara','G3',null,null,null,null,null),
('2026-10-24','Escena 03 · Café de la mañana','studios','escenas','escena','G3',null,null,null,null,null),
('2026-10-25','Luz con propósito · «Sea la luz»','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-10-26','De LOG a look cinematográfico en 4 pasos','studios','autoridad','camara','G4',null,null,null,null,null),
('2026-10-27','Conciertos: foto, video y audio en una sola producción','studios','servicios','reel_existente',null,'27 oct · Patrimonio Audiovisual',null,null,null,null),
('2026-10-28','Cómo abrir un evento en 30 segundos','studios','locucion','camara','G4',null,null,null,null,null),
('2026-10-29','5 funciones de Procreate que te ahorran horas','studios','autoridad','carrusel_canva',null,null,null,null,null,null),
('2026-10-30','Bodas y eventos de fin de año','studios','venta','camara','G4',null,null,null,null,null),
('2026-10-31','Anatomía de una escena de suspenso','studios','escenas','carrusel_yo',null,null,null,null,null,null),
('2026-11-01','Cómo fotografiar los barriletes gigantes','studios','comunidad','carrusel_yo',null,'1 nov · Todos los Santos',null,null,null,null),
('2026-11-02','Lee tu histograma en 30 segundos','studios','autoridad','camara','G5',null,null,null,null,null),
('2026-11-03','Sesiones familiares de fin de año','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-11-04','Adiós a las muletillas','studios','locucion','camara','G5',null,null,null,null,null),
('2026-11-05','Mismo objeto, 3 luces distintas','studios','autoridad','reel_sin_cara','G5',null,null,null,null,null),
('2026-11-06','Abrimos agenda de sesiones navideñas','studios','venta','camara','G5',null,null,null,null,null),
('2026-11-07','Escena 04 · Lluvia en la ventana','studios','escenas','escena','G5',null,null,null,null,null),
('2026-11-08','Foto o video para tu evento: ¿cuál primero?','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-11-09','Entrevista con una sola cámara','studios','autoridad','camara','G6',null,null,null,null,null),
('2026-11-10','El video de fin de año de tu empresa','studios','servicios','carrusel_yo',null,null,null,null,null,null),
('2026-11-11','Locución comercial: 3 tonos de voz','studios','locucion','camara','G6',null,null,null,null,null),
('2026-11-12','Sonido en vivo para tu iglesia: 3 errores comunes','studios','autoridad','carrusel_yo',null,null,null,null,null,null),
('2026-11-13','Tu fiesta de empresa merece más que fotos con celular','studios','venta','camara','G6',null,null,null,null,null),
('2026-11-14','Detrás de cámara de mis escenas','studios','escenas','reel_existente',null,null,null,null,null,null),
('2026-11-15','Plantilla gratis: checklist de equipo para eventos','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-11-16','Fotografía deportiva: cómo congelar el movimiento','studios','autoridad','camara','G7',null,null,null,null,null),
('2026-11-17','Cobertura de torneos y equipos','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-11-18','Cuando algo sale mal en vivo','studios','locucion','camara','G7',null,null,null,null,null),
('2026-11-19','Armonía del color: 5 esquemas que funcionan','studios','autoridad','carrusel_yo',null,null,null,null,null,null),
('2026-11-20','Qué incluye una boda con Faro Studios','studios','venta','camara','G7',null,null,null,null,null),
('2026-11-21','Escena 05 · Domingo de iglesia','studios','escenas','escena','G7',null,null,null,null,null),
('2026-11-22','Lo que nadie te dice del videógrafo freelance','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-11-23','Cómo cotizar un video sin regalar tu trabajo','studios','autoridad','camara','G8',null,null,null,null,null),
('2026-11-24','Fotos de producto antes de Black Friday','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-11-25','Preséntate en 15 segundos','studios','locucion','camara','G8',null,null,null,null,null),
('2026-11-26','Antes y después: limpieza de audio','studios','autoridad','reel_sin_cara','G8',null,null,null,null,null),
('2026-11-27','Oferta Black Friday Faro Studios','studios','venta','camara','G8','Black Friday',null,null,null,null),
('2026-11-28','Escena 06 · Tráfico en la ciudad','studios','escenas','escena','G8',null,null,null,null,null),
('2026-11-29','Luz con propósito · ¿Por qué Faro?','studios','comunidad','carrusel_yo',null,'Primer domingo de Adviento',null,null,null,null),
('2026-11-30','Retratos con luces de Navidad','studios','autoridad','camara','G9',null,null,null,null,null),
('2026-12-01','Cenas y fiestas navideñas de empresa','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-12-02','Cómo dar un brindis o discurso de fin de año','studios','locucion','camara','G9',null,null,null,null,null),
('2026-12-03','Ilustración del nacimiento en Procreate','studios','autoridad','reel_sin_cara','G9',null,null,null,null,null),
('2026-12-04','Regala una sesión','studios','venta','camara','G9',null,null,null,null,null),
('2026-12-05','Escena 07 · Noche de edición','studios','escenas','escena','G9',null,null,null,null,null),
('2026-12-06','Fotografiar la Quema del Diablo con seguridad','studios','comunidad','carrusel_yo',null,'7 dic · Quema del Diablo',null,null,null,null),
('2026-12-07','Fotografía nocturna con fuego y poca luz','studios','autoridad','camara','G10','7 dic · Quema del Diablo',null,null,null,null),
('2026-12-08','Así es una sesión familiar navideña','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-12-09','5 tips para conducir una posada o evento navideño','studios','locucion','camara','G10',null,null,null,null,null),
('2026-12-10','Graba un villancico o alabanza en casa','studios','autoridad','carrusel_yo',null,null,null,null,null,null),
('2026-12-11','Últimas fechas de diciembre','studios','venta','camara','G10',null,null,null,null,null),
('2026-12-12','Escena 08 · Armando el nacimiento','studios','escenas','escena','G10',null,null,null,null,null),
('2026-12-13','Plantilla gratis: shot list para eventos navideños','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-12-14','Graba tu posada con el celular y que se vea bien','studios','autoridad','camara','G11','Empiezan las posadas',null,null,null,null),
('2026-12-15','Conciertos navideños, cultos y eventos de iglesia','studios','servicios','reel_existente',null,null,null,null,null,null),
('2026-12-16','Lectura bíblica en voz alta','studios','locucion','camara','G11',null,null,null,null,null),
('2026-12-17','Paleta navideña sin clichés','studios','autoridad','carrusel_yo',null,null,null,null,null,null),
('2026-12-18','Última semana para regalar una sesión','studios','venta','camara','G11',null,null,null,null,null),
('2026-12-19','Escena 09 · Antigua con luces navideñas','studios','escenas','escena','G11',null,null,null,null,null),
('2026-12-20','Luz con propósito · Juan 1:5','studios','comunidad','carrusel_yo',null,'4.º domingo de Adviento',null,null,null,null),
('2026-12-21','Cómo grabo mis escenas con poco equipo','studios','autoridad','camara','G12',null,null,null,null,null),
('2026-12-22','Así trabajamos: de la cotización a la entrega','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-12-23','Graba el saludo navideño de tu empresa','studios','locucion','camara','G12',null,null,null,null,null),
('2026-12-24','Feliz Navidad · Lucas 2:10-11','studios','comunidad','carrusel_yo',null,'Nochebuena',null,null,null,null),
('2026-12-25','Escena 10 · Nochebuena en familia','studios','escenas','escena','NB','Navidad · se graba la noche del 24',null,null,null,null),
('2026-12-26','Los errores que más vimos este año en video','studios','comunidad','carrusel_yo',null,null,null,null,null,null),
('2026-12-27','Mis escenas del año','studios','escenas','carrusel_canva',null,null,null,null,null,null),
('2026-12-28','Equipo mínimo para empezar en 2027','studios','autoridad','camara','G13',null,null,null,null,null),
('2026-12-29','Lo que hicimos en 2026','studios','servicios','carrusel_canva',null,null,null,null,null,null),
('2026-12-30','Reto de 30 días para hablar mejor en cámara','studios','locucion','camara','G13',null,null,null,null,null),
('2026-12-31','Agenda 2027 abierta','studios','venta','carrusel_yo',null,'Fin de año',null,null,null,null);
insert into public.contenido_sesiones (codigo,fecha_ini,fecha_fin,prepara) values
('G1','2026-10-05','2026-10-05','Precio especial de graduación si lo habrá · 2 o 3 retratos para insertar · Locación: parque cercano · ropa del personaje'),
('G2','2026-10-10','2026-10-11','Grabación de pantalla o cenital de tu dibujo · Permiso o súper con poca gente'),
('G3','2026-10-17','2026-10-18','Fotos o clips de eventos escolares para insertar · Grabadora o micrófono y 3 objetos · Fechas libres de la semana · Luz de ventana temprano'),
('G4','2026-10-24','2026-10-25','3 o 4 fotogramas LOG y su versión final · Fotos o clips de bodas para insertar'),
('G5','2026-10-31','2026-11-01','Un objeto bonito, una luz y un rebotador · Día de lluvia o agua con regadera'),
('G6','2026-11-07','2026-11-08','Micrófono de solapa, luz suave y los guiones de la semana'),
('G7','2026-11-14','2026-11-15','Un par de tomas en movimiento · Fotos o clips de bodas · Permiso de la iglesia para grabar'),
('G8','2026-11-21','2026-11-22','Un audio con ruido y su versión limpia · Definir la oferta · Tomas desde el carro como copiloto o estacionado'),
('G9','2026-11-28','2026-11-29','Luces navideñas y un modelo · Grabación de pantalla del iPad · Diseño y precio de la tarjeta de regalo'),
('G10','2026-12-05','2026-12-06','Fechas libres de diciembre · Nacimiento y luces navideñas'),
('G11','2026-12-12','2026-12-13','Grabar de noche en Antigua'),
('G12','2026-12-19','2026-12-20','Micrófono de solapa, luz suave y los guiones de la semana'),
('G13','2026-12-26','2026-12-27','Micrófono de solapa, luz suave y los guiones de la semana'),
('NB','2026-12-24','2026-12-24','Grabar la escena de Nochebuena en familia la noche del 24');
insert into public.contenido_material (fecha_limite,titulo) values
('2026-10-03','Fotos B/N de tus trabajos'),
('2026-10-09','Precio de graduación'),
('2026-10-11','Plantilla hoja de llamado'),
('2026-10-26','Fotogramas LOG + final'),
('2026-10-29','Capturas de Procreate'),
('2026-11-14','Clips detrás de cámara · permiso de tu iglesia'),
('2026-11-21','Oferta Black Friday'),
('2026-11-28','Tarjeta de regalo lista');
