const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const { resolve } = require('path')
const webpush = require('web-push')

let data = {
  text: '',
  updatedAt: null,
}
let devices = []


const app = express()
app.use(bodyParser.json())
app.use(cookieParser())
app.use(express.static(resolve(__dirname, 'public')))

// ⚠ UNSAFE! Just to keep the example simple
// @see https://www.npmjs.com/package/web-push
const publicVapidKey = 'BPGI01qVlnnMAoRHZ6dXVLkr2exNdpvH1Wcbk2Eb17yW40yTxN8MJLTBTO5UeJ974oe_DW8glOBCPlf32ibxNDg'
const privateVapidKey = '08qLt4_GCuCQ9w4f4U3Ydqnb7L78rOL-eM8q1dVt1z0'
webpush.setVapidDetails('mailto:example@gmail.com', publicVapidKey, privateVapidKey)


app.get('/data', (req, res) => {
  return res.json(data)
})

app.put('/data', async (req, res) => {
  const currentDeviceId = req.cookies.deviceId
  data = req.body

  const sendSyncToAllUserDevices = Promise.all(devices.map(device => {
    // Don't send back to device that sent
    if (device.deviceId === currentDeviceId) return Promise.resolve();

    try {
      const payload = JSON.stringify({ tag: 'sync', data })
      return webpush.sendNotification(device, payload)
    } catch(err) {
      return Promise.resolve()
    }
  }))
  await sendSyncToAllUserDevices

  return res.sendStatus(200)
})

app.post('/add-device-to-sync-list', (req, res) => {
  const { deviceId } = req.cookies
  const devicePushSubscription = req.body

  devices.push({
    ...devicePushSubscription,
    deviceId,
  })
  return res.sendStatus(200)
})


const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`READY ON PORT ${port}!`)
})
