/* 饮食记录 · 极简离线缓存：网络优先，跨域 API 不缓存 */
const CACHE = "dietlog-v21";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
                "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 不缓存跨域 API（识图 / 同步）—— 交给浏览器直连
  if (url.origin !== location.origin) return;
  // HTML 导航必须绕开 HTTP 缓存：GitHub Pages 给 HTML 设了 max-age=600，
  // 否则推送新版本后最长 10 分钟仍可能拿到旧页面。
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  e.respondWith(
    fetch(req, isHTML ? { cache:"no-store" } : undefined).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
