// original source: https://github.com/hannseman/homebridge-mi-hygrothermograph/blob/master/lib/scanner.js
// under MIT license, copyright of hannseman
import crypto from 'crypto';

export const SERVICE_DATA_UUIDS = ['fe95'];
export const PARSER_NAME = 'xiaomi';

// Device type dictionary
// {device type code: device name}
const xiaomiTypes = {
  0x01aa: 'LYWSDCGQ', // developed with these, so they should work ok
  0x045b: 'LYWSD02',
  0x055b: 'LYWSD03MMC', // does not broadcast temp & humidity, needs ATC custom firmware
  0x0098: 'HHCCJCY01',
  0x03bc: 'GCLS002',
  0x015d: 'HHCCPOT002',
  0x040a: 'WX08ZM',
  0x098b: 'MCCGQ02HL',
  0x0083: 'YM-K1501',
  0x0113: 'YM-K1501EU',
  0x045c: 'V-SK152',
  0x0863: 'SJWS01LM',
  0x07f6: 'MJYD02YL',
  0x03dd: 'MUE4094RT',
  0x0a8d: 'RTCGQ02LM',
  0x00db: 'MMC-T201-1',
  0x0489: 'M1S-T500',
  0x0c3c: 'CGC1',
  0x0576: 'CGD1',
  0x066f: 'CGDK2',
  0x0347: 'CGG1',
  0x0b48: 'CGG1-ENCRYPTED',
  0x03d6: 'CGH1',
  0x0a83: 'CGPR1',
  0x06d3: 'MHO-C303',
  0x0387: 'MHO-C401',
  0x02df: 'JQJCY01YM',
  0x0997: 'JTYJGD03MI',
  0x1568: 'K9B-1BTN',
  0x1569: 'K9B-2BTN',
  0x0dfd: 'K9B-3BTN',
  0x07bf: 'YLAI003',
  0x0153: 'YLYK01YL',
  0x068e: 'YLYK01YL-FANCL',
  0x04e6: 'YLYK01YL-VENFAN',
  0x03bf: 'YLYB01YL-BHFRC',
  0x03b6: 'YLKG07YL/YLKG08YL',
  0x069e: 'ZNMS16LM',
  0x069f: 'ZNMS17LM'
};

const FrameControlFlags = {
  isFactoryNew: 1 << 0,
  isConnected: 1 << 1,
  isCentral: 1 << 2,
  isEncrypted: 1 << 3,
  hasMacAddress: 1 << 4,
  hasCapabilities: 1 << 5,
  hasEvent: 1 << 6,
  hasCustomData: 1 << 7,
  hasSubtitle: 1 << 8,
  hasBinding: 1 << 9
};

const CapabilityFlags = {
  connectable: 1 << 0,
  central: 1 << 1,
  secure: 1 << 2,
  io: (1 << 3) | (1 << 4)
};

// https://iot.mi.com/new/doc/embedded-development/ble/object-definition
const EventTypes = {
  // basic events
  connection: 0x0001,
  pairing: 0x0002,

  // base supported events
  temperature: 0x1004,
  humidity: 0x1006,
  illuminance: 0x1007,
  moisture: 0x1008,
  soilConductivity: 0x1009,
  formaldehyde: 0x1010, // not supported
  switch: 0x1012, // not supported
  consumable: 0x1012, // consumable, in percentage, not supported
  moisture2: 0x1014, // not supported
  smoke: 0x1015, // not supported
  motion2: 0x1017, // not supported
  lightIntensity: 0x1018, // not supported
  door: 0x1019, // not supported
  battery: 0x100a,
  temperatureAndHumidity: 0x100d,

  // not supported by this lib
  motion: 0x0003,
  fingerprint: 0x0006,
  toothbrush: 0x0010,
  lock: 0x000b,
  moveWithLight: 0x000f,
  remote: 0x1001,
  bodyTemperature: 0x2000
};

export class Parser {
  constructor(buffer, bindKey = null) {
    this.baseByteLength = 5;
    if (buffer == null) {
      throw new Error('A buffer must be provided.');
    }
    this.buffer = buffer;
    if (buffer.length < this.baseByteLength) {
      throw new Error(`Service data length must be >= 5 bytes. ${JSON.stringify(buffer)}`);
    }
    this.bindKey = bindKey;
  }

  parse() {
    this.frameControl = this.parseFrameControl();
    this.version = this.parseVersion();
    this.productId = this.parseProductId();
    this.frameCounter = this.parseFrameCounter();
    this.macAddress = this.parseMacAddress();
    this.capabilities = this.parseCapabilities();

    if (this.frameControl.isEncrypted) {
      this.decryptPayload();
    }

    this.eventType = this.parseEventType();
    this.eventLength = this.parseEventLength();
    this.event = this.parseEventData();

    return {
      parser: PARSER_NAME,
      frameControl: this.frameControl,
      eventLength: this.eventLength,
      macAddress: this.macAddress,
      version: this.version,
      info: {
        event: this.event,
        deviceType: this.productId,
        frameCounter: this.frameCounter,
        eventType: this.eventType
        // capabilities: this.capabilities,
      }
      //version: this.version
    };
  }

  parseFrameControl() {
    const frameControl = this.buffer.readUInt16LE(0);
    return Object.keys(FrameControlFlags).reduce((map, flag) => {
      map[flag] = (frameControl & FrameControlFlags[flag]) !== 0;
      return map;
    }, {});
  }

  parseVersion() {
    return this.buffer.readUInt8(1) >> 4;
  }

  parseProductId() {
    let productId = this.buffer.readUInt16LE(2);
    return xiaomiTypes[productId] || productId;
  }

  parseFrameCounter() {
    return this.buffer.readUInt8(4);
  }

  parseMacAddress() {
    if (!this.frameControl.hasMacAddress) {
      return null;
    }
    const macBuffer = this.buffer.slice(this.baseByteLength, this.baseByteLength + 6);
    return Buffer.from(macBuffer).reverse().toString('hex');
  }

  get capabilityOffset() {
    if (!this.frameControl.hasMacAddress) {
      return this.baseByteLength;
    }
    return 11;
  }

  parseCapabilities() {
    if (!this.frameControl.hasCapabilities) {
      return null;
    }
    const capabilities = this.buffer.readUInt8(this.capabilityOffset);
    return Object.keys(CapabilityFlags).reduce((map, flag) => {
      map[flag] = (capabilities & CapabilityFlags[flag]) !== 0;
      return map;
    }, {});
  }

  get eventOffset() {
    let offset = this.baseByteLength;
    if (this.frameControl.hasMacAddress) {
      offset = 11;
    }
    if (this.frameControl.hasCapabilities) {
      offset += 1;
    }

    return offset;
  }

  parseEventType() {
    // if (!this.frameControl.hasEvent) {
    //   return null
    // }
    return this.buffer.readUInt16LE(this.eventOffset);
  }

  parseEventLength() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    return this.buffer.readUInt8(this.eventOffset + 2);
  }

  decryptPayload() {
    const msgLength = this.buffer.length;
    const eventLength = msgLength - this.eventOffset;

    if (eventLength < 3) {
      return;
    }
    if (this.bindKey == null) {
      throw Error('Sensor data is encrypted. Please configure a bindKey.');
    }

    const encryptedPayload = this.buffer.slice(this.eventOffset, msgLength);

    const nonce = Buffer.concat([
      this.buffer.slice(5, 11), //mac_reversed
      this.buffer.slice(2, 4), //device_type
      this.buffer.slice(4, 5), //frame_cnt
      encryptedPayload.slice(-7, -4) //ext_cnt
    ]);

    const decipher = crypto.createDecipheriv(
      'aes-128-ccm',
      Buffer.from(this.bindKey, 'hex'), //key
      nonce, //iv
      { authTagLength: 4 }
    );

    const ciphertext = encryptedPayload.slice(0, -7);

    decipher.setAuthTag(encryptedPayload.slice(-4));
    decipher.setAAD(Buffer.from('11', 'hex'), {
      plaintextLength: ciphertext.length
    });

    const receivedPlaintext = decipher.update(ciphertext);

    decipher.final();

    this.buffer = Buffer.concat([this.buffer.slice(0, this.eventOffset), receivedPlaintext]);
  }

  parseEventData() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    switch (this.eventType) {
      case EventTypes.pairing: {
        return { tryingToPair: true };
      }
      case EventTypes.temperature: {
        return this.parseTemperatureEvent();
      }
      case EventTypes.humidity: {
        return this.parseHumidityEvent();
      }
      case EventTypes.battery: {
        return this.parseBatteryEvent();
      }
      case EventTypes.temperatureAndHumidity: {
        return this.parseTemperatureAndHumidityEvent();
      }
      case EventTypes.illuminance: {
        return this.parseIlluminanceEvent();
      }
      case EventTypes.soilConductivity: {
        return this.parseConductivity();
      }
      case EventTypes.moisture: {
        return this.parseMoistureEvent();
      }
      default: {
        return {
          unrecognizedEventType: this.eventType
        };
        // throw new Error(
        //   `Unknown event type: ${this.eventType}. ${this.toString()}`
        // )
      }
    }
  }

  parseTemperatureEvent() {
    return {
      temperature: this.buffer.readInt16LE(this.eventOffset + 3) / 10
    };
  }

  parseHumidityEvent() {
    return {
      humidity: this.buffer.readUInt16LE(this.eventOffset + 3) / 10
    };
  }

  parseBatteryEvent() {
    return {
      battery: this.buffer.readUInt8(this.eventOffset + 3)
    };
  }

  parseTemperatureAndHumidityEvent() {
    const temperature = this.buffer.readInt16LE(this.eventOffset + 3) / 10;
    const humidity = this.buffer.readUInt16LE(this.eventOffset + 5) / 10;
    return { temperature, humidity };
  }

  parseIlluminanceEvent() {
    return {
      illuminance: this.buffer.readUIntLE(this.eventOffset + 3, 3)
    };
  }

  parseConductivity() {
    return {
      fertility: this.buffer.readInt16LE(this.eventOffset + 3)
    };
  }

  parseMoistureEvent() {
    return {
      moisture: this.buffer.readInt8(this.eventOffset + 3)
    };
  }

  toString() {
    return this.buffer.toString('hex');
  }
}
