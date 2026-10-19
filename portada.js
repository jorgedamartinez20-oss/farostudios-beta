/* Faro Studios · portadas de galería (módulo sin dependencias)
   Uso:
     FaroPortada.render(contenedor, cfg, {movimiento:true})
   opts = { movimiento:true (aplica el zoom out), boton:true (botón real #bver para la galería) }
   cfg = { estilo:'centro', titulo:'', fecha:'', src:'url de la foto',
           fx:0.5, fy:0.4,   // punto de la foto (0 a 1) que queda al centro del encuadre
           zoom:1,           // 1 a 3
           ov:0,             // oscuridad 0 a 70 (%), único control de oscurecer
           movimiento:true, // zoom out suave de 45 s al entrar
           pie:'' }          // texto pequeño inferior (en la galería: «24 fotografías · Galería privada»)
   El contenedor debe tener `container-type:size` y tamaño propio. La foto no se retoca, solo se recorta. */
(function (g) {
  'use strict';
  var ESTILOS = [
    ['centro', 'Centro', 0], ['izquierda', 'Izquierda', 0], ['novela', 'Novela', 1], ['vintage', 'Vintage', 1],
    ['marco', 'Marco', 0], ['raya', 'Raya', 0], ['divisor', 'Divisor', 0], ['diario', 'Diario', 1],
    ['sello', 'Sello', 1], ['contorno', 'Contorno', 0], ['dividido', 'Dividido', 1], ['etiqueta', 'Etiqueta', 0],
    ['album', 'Álbum', 1], ['borde', 'Borde', 1], ['clasico', 'Clásico', 1], ['ancla', 'Ancla', 0]
  ].map(function (e) { return { id: e[0], nombre: e[1], claro: !!e[2] }; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function estilo(id) { return ESTILOS.filter(function (e) { return e.id === id; })[0] || ESTILOS[0]; }

  var ro = typeof g.ResizeObserver === 'function' ? new g.ResizeObserver(function (es) {
    es.forEach(function (e) { var cv = e.target.parentNode; if (cv && cv._cfg) layout(cv, cv._cfg); });
  }) : null;

  function metricas(cv, cfg) {
    var ph = cv.querySelector('.fpf'), im = ph.querySelector('.fpi');
    var nw = im.naturalWidth, nh = im.naturalHeight, bw = ph.clientWidth, bh = ph.clientHeight;
    if (!nw || !bw || !bh) return null;
    var s = Math.max(bw / nw, bh / nh) * cfg.zoom;
    return { bw: bw, bh: bh, iw: nw * s, ih: nh * s };
  }
  function layout(cv, cfg) {
    var m = metricas(cv, cfg); if (!m) return;
    var im = cv.querySelector('.fpi');
    var l = clamp(m.bw / 2 - cfg.fx * m.iw, m.bw - m.iw, 0);
    var t = clamp(m.bh / 2 - cfg.fy * m.ih, m.bh - m.ih, 0);
    im.style.width = m.iw + 'px'; im.style.height = m.ih + 'px';
    im.style.left = l + 'px'; im.style.top = t + 'px';
    im.classList.add('fpok');
  }
  /* mantiene fx/fy dentro de lo que la foto puede cubrir (usar tras cambiar zoom o arrastrar) */
  function ajustar(cv, cfg) {
    var m = metricas(cv, cfg); if (!m) return;
    cfg.fx = clamp(cfg.fx, m.bw / 2 / m.iw, 1 - m.bw / 2 / m.iw);
    cfg.fy = clamp(cfg.fy, m.bh / 2 / m.ih, 1 - m.bh / 2 / m.ih);
  }
  /* mueve la foto dx,dy píxeles (arrastre) */
  function mover(cv, cfg, dx, dy) {
    var m = metricas(cv, cfg); if (!m) return;
    cfg.fx -= dx / m.iw; cfg.fy -= dy / m.ih; ajustar(cv, cfg);
  }
  function actualizar(cv, cfg) {
    cv._cfg = cfg;
    cv.style.setProperty('--ov', (cfg.ov / 100).toFixed(2));
    cv.querySelector('.fpt').textContent = cfg.titulo || 'Título';
    cv.querySelector('.fpd').textContent = cfg.fecha || '';
    cv.querySelector('.fpr').textContent = cfg.pie || 'Faro Studios';
    layout(cv, cfg);
  }
  function render(el, cfg, opts) {
    opts = opts || {};
    var viejo = el.querySelector('.fpf'); if (viejo && ro) ro.unobserve(viejo);
    var e = estilo(cfg.estilo);
    el.innerHTML = '<div class="fpc' + (e.claro ? ' fpl' : '') + '" data-s="' + e.id + '"><div class="fpf"><div class="fpz"><img class="fpi" alt="" draggable="false"></div></div>' +
      '<div class="fpx"><h3 class="fpt"></h3><p class="fpd"></p>' + (opts.boton ? '<button type="button" class="fpb" id="bver">Ver galería</button>' : '<span class="fpb">Ver galería</span>') + '</div><span class="fpr"></span></div>';
    var cv = el.firstChild, im = cv.querySelector('.fpi');
    cv._cfg = cfg;
    im.addEventListener('load', function () { layout(cv, cfg); });
    im.src = cfg.src;
    if (opts.movimiento && cfg.movimiento) cv.classList.add('fpg');
    actualizar(cv, cfg);
    if (ro) ro.observe(cv.querySelector('.fpf'));
    return cv;
  }
  g.FaroPortada = { estilos: ESTILOS, render: render, actualizar: actualizar, mover: mover, ajustar: ajustar, layout: layout };
})(window);
