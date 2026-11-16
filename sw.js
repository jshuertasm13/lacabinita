/* La Cabinita: guarda la app y las plantillas en el equipo para que funcione sin internet.
   Cambia VERSION cada vez que subas una versión nueva de index.html. */
var VERSION = "lacabinita-v1";
var CORE = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== VERSION && k.indexOf("lacabinita-") === 0 && k !== "lacabinita-plantillas") return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var isTemplate = url.origin === location.origin && url.pathname.indexOf("/plantillas/") >= 0;
  var isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  var isPage = req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));

  if (isPage) {
    /* la página: primero internet (para recibir cambios), si no hay, la copia guardada */
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put("index.html", copy); });
      return res;
    }).catch(function () { return caches.match("index.html"); }));
    return;
  }
  if (isTemplate || isFont || url.origin === location.origin) {
    /* plantillas, letras e íconos: primero la copia guardada */
    var bucket = isTemplate ? "lacabinita-plantillas" : VERSION;
    e.respondWith(caches.open(bucket).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
          return res;
        });
      });
    }));
  }
});
