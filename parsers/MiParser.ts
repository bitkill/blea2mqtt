import crypto from "crypto"
import {
    CapabilityFlags,
    EventTypes,
    FrameControl,
    FrameControlFlags,
    XiaomiDeviceCapabilities,
    xiaomiTypes
} from "./utils/XiaomiConfig";


export class MiParser implements ParserProvider {

    // parser info
    public parserName: string = "xiaomi";
    public serviceDataUuids: Array<string> = ['fe95'];

    // cryptographic key
    private bindKey: string | null;
    private readonly baseByteLength: number = 5;

    constructor(bindKey = null) {
        this.bindKey = bindKey;
    }

    public parse(buffer: Buffer): ParserResult | null {
        // check length
        if (buffer.length < this.baseByteLength) {
            throw new Error(`Service data length must be >= 5 bytes. ${JSON.stringify(buffer)}`);
        }

        let frameControl = this.parseFrameControl(buffer)
        if (frameControl.isEncrypted) {
            let decrypted = this.decryptPayload(buffer, frameControl);
            if (decrypted == null) {
                console.warn("Caught encrypted event, could not decode")
                return null
            }
            buffer = decrypted
        }

        const z: ParserResult = {
            eventLength: 0,
            macAddress: this.parseMacAddress(buffer, frameControl),
            parser: this.parserName,
            version: this.parseVersion(buffer).toString(),
            info: this.parseEventData(buffer, frameControl)
        }
        return z
    }

    parseFrameControl(buffer: Buffer): FrameControl {
        const frameControl = buffer.readUInt16LE(0);
        return <FrameControl>Object.keys(FrameControlFlags).reduce((map, flag: string) => {
            // @ts-ignore
            map[flag] = (frameControl & FrameControlFlags[flag]) !== 0;
            return map;
        }, {});
    }

    parseVersion(buffer: Buffer): number {
        return buffer.readUInt8(1) >> 4;
    }

    parseProductId(buffer: Buffer): string {
        let productId = buffer.readUInt16LE(2);
        return xiaomiTypes.get(productId) || productId.toString();
    }

    parseFrameCounter(buffer: Buffer): number {
        return buffer.readUInt8(4);
    }

    parseMacAddress(buffer: Buffer, frameControl: FrameControl): string | null {
        if (!frameControl.hasMacAddress) {
            return null;
        }
        const macBuffer = buffer.slice(this.baseByteLength, this.baseByteLength + 6);
        return Buffer.from(macBuffer).reverse().toString('hex');
    }

    capabilityOffset(buffer: Buffer, frameControl: FrameControl): number {
        if (!frameControl.hasMacAddress) {
            return this.baseByteLength;
        }
        return 11;
    }

    parseCapabilities(buffer: Buffer, frameControl: FrameControl): XiaomiDeviceCapabilities | null {
        if (!frameControl.hasCapabilities) {
            return null;
        }
        const capabilities = buffer.readUInt8(this.capabilityOffset(buffer, frameControl));
        return <XiaomiDeviceCapabilities><unknown>Object.keys(CapabilityFlags)
            .reduce((map, flag) => {
                // @ts-ignore
                map.set(flag, (capabilities & CapabilityFlags.get(flag)) !== 0);
                return map;
            }, new Map<string, boolean>());
    }

    eventOffset(frameControl: FrameControl): number {
        let offset = this.baseByteLength;
        if (frameControl.hasMacAddress) {
            offset = 11;
        }
        if (frameControl.hasCapabilities) {
            offset += 1;
        }

        return offset;
    }

    parseEventType(buffer: Buffer, eventOffset: number): number {
        return buffer.readUInt16LE(eventOffset);
    }

    parseEventLength(buffer: Buffer, frameControl: FrameControl, eventOffset: number): number {
        if (!frameControl.hasEvent) {
            return 0;
        }
        return buffer.readUInt8(eventOffset + 2);
    }

    decryptPayload(buffer: Buffer, frameControl: FrameControl): Buffer | null {
        const eventOffset = this.eventOffset(frameControl)
        const msgLength = buffer.length;
        const eventLength = msgLength - eventOffset;

        if (eventLength < 3) {
            return null;
        }
        if (this.bindKey == null) {
            throw Error('Sensor data is encrypted. Please configure a bindKey.');
        }

        const encryptedPayload = buffer.slice(eventOffset, msgLength);

        const nonce = Buffer.concat([
            buffer.slice(5, 11), //mac_reversed
            buffer.slice(2, 4), //device_type
            buffer.slice(4, 5), //frame_cnt
            encryptedPayload.slice(-7, -4) //ext_cnt
        ]);

        const decipher = crypto.createDecipheriv(
            'aes-128-ccm',
            Buffer.from(this.bindKey, 'hex'), //key
            nonce, //iv
            {authTagLength: 4}
        );

        const ciphertext = encryptedPayload.slice(0, -7);

        decipher.setAuthTag(encryptedPayload.slice(-4));
        decipher.setAAD(Buffer.from('11', 'hex'), {
            plaintextLength: ciphertext.length
        });

        const receivedPlaintext = decipher.update(ciphertext);

        decipher.final();

        return Buffer.concat([buffer.slice(0, eventOffset), receivedPlaintext]);
    }

    parseEventData(buffer: Buffer, frameControl: FrameControl) : Object {
        if (!frameControl.hasEvent) {
            return {};
        }
        let eventOffset = this.eventOffset(frameControl)
        let eventType = this.parseEventType(buffer, eventOffset)

        switch (eventType) {
            case EventTypes.connection: {
                return {eventType: eventType, tryingToConnect: true};
            }
            case EventTypes.pairing: {
                return {eventType: eventType, tryingToPair: true};
            }
            case EventTypes.temperature: {
                return {eventType: eventType, ...this.parseTemperatureEvent(buffer, eventOffset)};
            }
            case EventTypes.humidity: {
                return {eventType: eventType, ...this.parseHumidityEvent(buffer, eventOffset)};
            }
            case EventTypes.battery: {
                return {eventType: eventType, ...this.parseBatteryEvent(buffer, eventOffset)};
            }
            case EventTypes.temperatureAndHumidity: {
                return {eventType: eventType, ...this.parseTemperatureAndHumidityEvent(buffer, eventOffset)};
            }
            case EventTypes.illuminance: {
                return {eventType: eventType, ...this.parseIlluminanceEvent(buffer, eventOffset)};
            }
            case EventTypes.soilConductivity: {
                return {eventType: eventType, ...this.parseConductivity(buffer, eventOffset)};
            }
            case EventTypes.moisture: {
                return {eventType: eventType, ...this.parseMoistureEvent(buffer, eventOffset)};
            }
            default: {
                return {
                    eventType: eventType, unrecognizedEvents: true
                };
                // throw new Error(
                //   `Unknown event type: ${this.eventType}. ${this.toString()}`
                // )
            }
        }
    }

    parseTemperatureEvent(buffer: Buffer, eventOffset: number): Object {
        return {
            temperature: buffer.readInt16LE(eventOffset + 3) / 10
        };
    }

    parseHumidityEvent(buffer: Buffer, eventOffset: number): Object {
        return {
            humidity: buffer.readUInt16LE(eventOffset + 3) / 10
        };
    }

    parseBatteryEvent(buffer: Buffer, eventOffset: number): Object {
        return {
            battery: buffer.readUInt8(eventOffset + 3)
        };
    }

    parseTemperatureAndHumidityEvent(buffer: Buffer, eventOffset: number): Object {
        const temperature = buffer.readInt16LE(eventOffset + 3) / 10;
        const humidity = buffer.readUInt16LE(eventOffset + 5) / 10;
        return {temperature, humidity};
    }

    parseIlluminanceEvent(buffer: Buffer, eventOffset: number): Object {
        return {
            illuminance: buffer.readUIntLE(eventOffset + 3, 3)
        };
    }

    parseConductivity(buffer: Buffer, eventOffset: number): Object {
        return {
            fertility: buffer.readInt16LE(eventOffset + 3)
        };
    }

    parseMoistureEvent(buffer: Buffer, eventOffset: number): Object {
        return {
            moisture: buffer.readInt8(eventOffset + 3)
        };
    }

    toString(buffer: Buffer, eventOffset: number): string {
        return buffer.toString('hex');
    }

}
