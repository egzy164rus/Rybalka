/* Сервис-воркер «Тихой заводи»: игра остаётся доступной без интернета.
   Стратегия: сеть → кэш (network-first) для страницы, чтобы обновления прилетали сразу,
   и «сначала кэш» для иконок и манифеста. */
const VERSION = "rybalka-7.1.2";
const CORE = [
  "./",
  "index.html",
  "rybalka.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-192.png",
  "icon-maskable-512.png",
  "icon-120.png",
  "icon-152.png",
  "icon-167.png",
  "icon-180.png",
  "favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // кэшируем по одному: отсутствующий файл не должен ломать установку
    await Promise.all(CORE.map(async (url) => {
      try { await cache.add(new Request(url, { cache: "reload" })); } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // чужие домены не трогаем

  // иконки и манифест — из кэша, с фоновым обновлением
  if (/\.(png|jpg|jpeg|webmanifest|ico)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // страница игры: сначала сеть (свежая версия), при обрыве — кэш
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      // любой переход без сети открывает сохранённую игру
      const shell = await cache.match("index.html") || await cache.match("rybalka.html") || await cache.match("./");
      if (shell) return shell;
      return new Response("Нет сети. Открой игру, когда появится интернет — дальше она работает офлайн.",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});

// кнопка «обновить» из игры (необязательно)
self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});
