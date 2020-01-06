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
  event.waitUntil(
    self.clients.claim()
  )
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
      return event.respondWith(getLocallyData())
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
    return event.respondWith(fromCache(request))
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
    console.log('SYNC EVENT!')
  }
})

self.addEventListener('push', (event) => {
  const { tag, data: newData } = event.data.json()

  if (tag === 'sync') {
    event.waitUntil(
      idbKeyval.set(localData, newData)
      .then(() => sendMessageToAllTabs('refresh-content'))
    )
    console.log('SYNC PUSH RECEIVED!')
  }
})


async function precacheAssets() {
  const cache = await caches.open(OFFLINE_CACHE)

  return cache.addAll([
    '/',
    './client.js',
    './styles.css',
    'https://cdn.jsdelivr.net/npm/idb-keyval@3/dist/idb-keyval.mjs',
    'https://cdn.jsdelivr.net/npm/js-cookie@beta/dist/js.cookie.min.mjs'
  ])
}

async function fromCache(request) {
  const cache = await caches.open(OFFLINE_CACHE)

  return cache.match(request)
    .then(matching => {
      return matching || Promise.reject('no-cache')
    })
}

async function getLocallyData() {
  let data = await idbKeyval.get(localData)

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Mock-Response': 'yes'
    }
  })
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

function getDataFromServer() {
  return fetch('/data').then(res => res.json())
}

async function sendMessageToAllTabs(data) {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => {
    client.postMessage(data)
  })
  return;
}