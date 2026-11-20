// Service worker do PWA.
// - Nunca guarda dados do Supabase (outras origens passam direto pela rede).
// - Páginas: tenta a rede primeiro; sem internet, abre a última versão salva.
// - Arquivos do build (/assets, /icons): servidos do cache e atualizados em segundo plano.
const CACHE = 'patrimonio-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copia))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const rede = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        })
        .catch(() => cached)
      return cached || rede
    })
  )
})
