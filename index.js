import dotenv from 'dotenv'
import mqtt from 'mqtt'
import * as nobleModule from '@abandonware/noble'
import * as MiParser from './parsers/mi_parser.js'
import * as QPParser from './parsers/qingping_parser.js'
import _ from 'lodash'

const noble = nobleModule.default

const parsers = [
  MiParser,
  QPParser
]

dotenv.config()

const topic = process.env.MQTT_TOPIC || 'ble_sensors'
const machineName = process.env.MACHINE_NAME || 'needsNameInConfig'

const publishTopic = topic + '/' + machineName

const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOSTNAME}`, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
})

function decodeData (peripheral) {
  if (!peripheral.advertisement.serviceData) return
  //console.log(peripheral.advertisement.serviceUuids)
  const {advertisement: {serviceData} = {}, id, address} = peripheral || {}

  serviceData.forEach((iter) => {
    if (!iter) return
    try {

      let result = parsers.reduce((a, rootParser) => {
        if (_.includes(rootParser.SERVICE_DATA_UUIDS, iter.uuid.toLowerCase())) {
          return new rootParser.Parser(iter.data).parse()
        }
        return a
      }, null)

      if (!result) return

      let wrappedResult = {
        macAddress: result.macAddress,
        rssi: peripheral.rssi,
        receivedFrom: machineName,
        parser: result.parser,
        result: result.info
      }

      console.info("PUB:", wrappedResult.macAddress, result.info)
      mqttClient.publish(
        topic,
        JSON.stringify(wrappedResult)
      )
    } catch (error) {
      console.error(error)
    }
  })
}

function onDiscovery (peripheral) {
  // peripheral.rssi                             - signal strength
  // peripheral.address                          - MAC address
  // peripheral.advertisement.localName          - device's name
  // peripheral.advertisement.manufacturerData   - manufacturer-specific data
  // peripheral.advertisement.serviceData        - normal advertisement service data
  // ignore devices with no manufacturer data
  if (!peripheral.advertisement.serviceData) return
  // output what we have

  decodeData(peripheral)

  if (process.env.BLE_DEBUG == 'true') {
    console.debug(
      peripheral.address || 'no-address-yet',
      JSON.stringify(peripheral.advertisement.localName || peripheral.address || 'no-name'),
      peripheral.rssi,
      signalStrengthPercentage(peripheral.rssi)
    )
  }
}

noble.on('warning', (warning) => console.warn(warning))
noble.on('discover', onDiscovery)

noble.on('stateChange', function (state) {
  if (state != 'poweredOn') return
  console.log('🚀 Starting BLE scan...')
  noble.startScanning([], true)
})

// bluetooth lib start / stop events
noble.on('scanStart', function () { console.log('BLE Scanning started.') })
noble.on('scanStop', function () {
  console.log('BLE Scanning stopped.')
  mqttClient.end()
})

function signalStrengthBars (rssi) {
  let bars = '▂▄▆█'
  if (rssi >= -65) {
    // strong
    return bars
  }

  if (rssi >= -73) {
    // good
    return bars.substr(0, 3)
  }

  if (rssi >= -80) {
    return bars.substr(0, 2)
  }

  if (rssi >= -94) {
    return bars.substr(0, 1)
  }

  return '─'
}

function signalStrengthPercentage (rssi) {
  // Quality as percentage max -40 min -110
  return ((rssi + 110) * 10 / 7).toFixed(0) + '%'
}
