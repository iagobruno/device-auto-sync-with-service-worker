importScripts('https://cdn.jsdelivr.net/npm/idb-keyval@3/dist/idb-keyval-iife.min.js')

const OFFLINE_CACHE = 'offline-cache'
const localData = 'local-data'

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      precacheAssets(),
      getDataFromServer().then(data => idbKeyval.set(localData, data))
    ])
    .then(self.skipWaiting)
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', async (event) => {
  const { request } = event
  const { method, url, headers } = request.clone()
  const bypassForNetwork = await headers.has('Ignore-Service-Worker')

  if (bypassForNetwork) {
    return event.respondWith(fetch(request))
  }

  if (url.includes('/data')) {
    if (method === 'GET') {
      return event.respondWith(getDataFromServerFirstElseCache())
    }
    else if (method === 'PUT') {
      return event.respondWith(trySyncWithServer(request))
    }
    else {
      return event.respondWith(fetch(request))
    }
  }
  // Other requests...
  else if (method === 'GET') {
    return event.respondWith(fromAssetsCache(request))
  }
  else {
    return event.respondWith(fetch(request))
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'data-sync') {
    event.waitUntil(
      idbKeyval.get(localData).then(sendDataToServer)
    )
  }
})

self.addEventListener('push', (event) => {
  const { tag, data: newData } = event.data.json()

  if (tag === 'sync') {
    event.waitUntil(
      idbKeyval.set(localData, newData)
      .then(() => sendMessageToAllTabs('refresh-content'))
    )
  }
})


async function precacheAssets() {
  const cache = await caches.open(OFFLINE_CACHE)

  return cache.addAll([
    '/',
    './client.js',
    './styles.css',
    'https://cdn.jsdelivr.net/npm/idb-keyval@3/dist/idb-keyval.mjs',
    'https://cdn.jsdelivr.net/npm/idb-keyval@3/dist/idb-keyval-iife.min.js',
    'https://cdn.jsdelivr.net/npm/js-cookie@beta/dist/js.cookie.min.mjs',
  ])
}

async function fromAssetsCache(request) {
  const cache = await caches.open(OFFLINE_CACHE).then(cache => cache.match(request))

  if (!cache) return Promise.reject('no-cache')
  else return cache
}

async function getLocalData() {
  const data = await idbKeyval.get(localData)

  return new MockJsonResponse(data)
}

function getDataFromServerFirstElseCache() {
  return getDataFromServer()
    .then(async (data) => {
      await idbKeyval.set(localData, data)
      return new MockJsonResponse(data)
    })
    .catch(() => getLocalData())
}

async function trySyncWithServer(request) {
  const newData = await request.clone().json()

  await idbKeyval.set(localData, newData)

  return sendDataToServer(newData)
    .catch(async (err) => {
      // Try sync again when device reconnects.
      await self.registration.sync.register('data-sync')
      return new Response()
    })
}

function sendDataToServer(data) {
  return fetch('/data', {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      'Ignore-Service-Worker': 'yes'
    },
    body: JSON.stringify(data)
  })
}

async function getDataFromServer() {
  return await fetch('/data', {
    headers: { 'Ignore-Service-Worker': 'yes' },
  })
    .then(res => res.json())
}

function sendMessageToAllTabs(data) {
  return clients.matchAll({ type: 'window' }).then(tabs => {
    tabs.forEach(tab => {
      tab.postMessage(data)
    })
  })
}

function MockJsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Mock-Response': 'yes'
    }
  })
}