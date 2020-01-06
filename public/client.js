import * as idbKeyval from 'https://cdn.jsdelivr.net/npm/idb-keyval@3/dist/idb-keyval.mjs'
import cookies from 'https://cdn.jsdelivr.net/npm/js-cookie@beta/dist/js.cookie.min.mjs'

const editor = document.querySelector('textarea')
const status = document.querySelector('.status')
const rtf = new Intl.RelativeTimeFormat('en', { style: 'short' })

editor.placeholder = `1. Open this same url on another device. \n\n2. Type something here ...\n\n3. Try turning off the internet.`

fetch('/data')
  .then(res => res.json())
  .then(data => {
    editor.value = data.text
    updateStatus(data.updatedAt)
  })

const debouncedSync = debounce(() => {
  status.innerText = '🔄 Saving...'

  fetch('/data', {
    method: 'PUT',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      text: editor.value,
      updatedAt: Date.now()
    })
  })
    .then(() => {
      status.innerText = '✔ All changes have been synced!'
    })
    .catch(() => {
      status.innerText = '⚡ Changes saved locally to be sync later.'
    })
}, 1000)

editor.addEventListener('input', debouncedSync)


navigator.serviceWorker.ready.then(sw => {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data === 'refresh-content') {
      idbKeyval.get('local-data').then(newData => {
        editor.value = newData.text
        updateStatus(newData.updatedAt)
      })
    }
  })
})


if (!localStorage.getItem('subscribed')) {
  getPushManagerSubscription().then((pushSubscription) => {
    fetch('/add-device-to-sync-list', {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify(pushSubscription),
    })
      .then(() => localStorage.setItem('subscribed', 'true'))
  })
}

const publicVapidKey = 'BPGI01qVlnnMAoRHZ6dXVLkr2exNdpvH1Wcbk2Eb17yW40yTxN8MJLTBTO5UeJ974oe_DW8glOBCPlf32ibxNDg'

async function getPushManagerSubscription() {
  const swRegistration = await navigator.serviceWorker.ready
  let subscription = await swRegistration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    })
  }

  return subscription.toJSON()
}

// Boilerplate borrowed from https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function updateStatus (updatedAt) {
  if (updatedAt === null) return;

  const minutesDiff = Math.round((Date.now() - updatedAt) / 1000 / 60)
  let sttsText;

  if (minutesDiff === 0) sttsText = 'just now'
  else sttsText = rtf.format(-minutesDiff, 'minute')

  status.innerText = `Last edited at ${sttsText}.`
}

function debounce (fn, ms = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.call(this, ...args), ms)
  }
}

void function generateDeviceId () {
  const savedDeviceId = cookies.get('deviceId')
  if (!savedDeviceId) {
    const newDeviceId = Date.now() + Math.random().toString(36).substr(2, 9)
    cookies.set('deviceId', newDeviceId, { path: '/' })
  }
}()
