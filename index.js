import dotenv from "dotenv"
import mqtt from "mqtt"
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

const publishTopic = process.env.MQTT_TOPIC || "ble_sensors"

const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOSTNAME}`, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
})

function decodeData (peripheral) {
  if (!peripheral.advertisement.serviceData) return
  //console.log(peripheral.advertisement.serviceUuids)
  const {advertisement: {serviceData} = {}, id, address} = peripheral || {}

  if (peripheral.advertisement.localName == "Qingping Temp & RH Lite") {
    console.log(JSON.stringify(serviceData))
  }

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

        mqttClient.publish(
          publishTopic + '/' + result.parser + '/' + result.macAddress,
          JSON.stringify(result)
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
  console.log(
    peripheral.address,
    JSON.stringify(peripheral.advertisement.localName),
    (peripheral.rssi)
  )
  decodeData(peripheral)
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
