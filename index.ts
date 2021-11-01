import dotenv from 'dotenv';
import mqtt from 'mqtt';

import noble from '@abandonware/noble'

import _ from 'lodash';
import {Peripheral} from '@abandonware/noble';
import {MiParser} from "./parsers/MiParser";
import {QingpingParser} from "./parsers/QingpingParser";

const parsers: Array<ParserProvider> = [new MiParser, new QingpingParser];

dotenv.config();

const topic = process.env.MQTT_TOPIC || 'ble_sensors';
const machineName = process.env.MACHINE_NAME || 'needsNameInConfig';

const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOSTNAME}`, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
});

function decodeData(peripheral: Peripheral) {
    if (!peripheral.advertisement.serviceData) return;

    peripheral.advertisement.serviceData.forEach((iter) => {
        if (!iter) return;
        try {
            let parser = parsers.find(
                parserProvider =>
                    _.includes(parserProvider.serviceDataUuids, iter.uuid.toLowerCase()))
            if (!parser) return;

            const result = parser.parse(iter.data)
            if (!result) return;

            let wrappedResult: { result: any; macAddress: any; rssi: number; parser: any; deviceType: string, receivedFrom: string };

            wrappedResult = {
                macAddress: result.macAddress,
                rssi: peripheral.rssi,
                receivedFrom: machineName,
                parser: result.parser,
                deviceType: result.deviceType,
                result: result.info
            };

            console.info('PUB:', wrappedResult.macAddress, result.info);
            mqttClient.publish(topic, JSON.stringify(wrappedResult));
        } catch (error) {
            console.error(error);
        }
    });
}

function onDiscovery(peripheral: Peripheral): void {
    // peripheral.rssi                             - signal strength
    // peripheral.address                          - MAC address
    // peripheral.advertisement.localName          - device's name
    // peripheral.advertisement.manufacturerData   - manufacturer-specific data
    // peripheral.advertisement.serviceData        - normal advertisement service data
    // ignore devices with no manufacturer data
    if (!peripheral.advertisement.serviceData) return;
    // output what we have

    decodeData(peripheral);

    if (process.env.BLE_DEBUG == 'true') {
        console.debug(
            peripheral.address || 'no-address-yet',
            JSON.stringify(peripheral.advertisement.localName || peripheral.address || 'no-name'),
            peripheral.rssi,
            signalStrengthPercentage(peripheral.rssi)
        );
    }
}

noble.on('warning', (warning: String) => console.warn(warning));
noble.on('discover', onDiscovery);

noble.on('stateChange', function (state: String) {
    if (state != 'poweredOn') return;
    console.log('🚀 Starting BLE scan...');
    noble.startScanning([], true);
});

// bluetooth lib start / stop events
noble.on('scanStart', () => console.log('BLE Scanning started.'));
noble.on('scanStop', function () {
    console.log('BLE Scanning stopped.');
    mqttClient.end();
});

function signalStrengthBars(rssi: number): String {
    let bars = '▂▄▆█';
    if (rssi >= -65) {
        // strong
        return bars;
    }

    if (rssi >= -73) {
        // good
        return bars.substr(0, 3);
    }

    if (rssi >= -80) {
        return bars.substr(0, 2);
    }

    if (rssi >= -94) {
        return bars.substr(0, 1);
    }

    return '─';
}

function signalStrengthPercentage(rssi: number): String {
    // Quality as percentage max -40 min -110
    return (((rssi + 110) * 10) / 7).toFixed(0) + '%';
}
