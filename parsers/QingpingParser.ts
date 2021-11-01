import {EventTypes, qpTypes} from "./utils/QingpingConfig";

export class QingpingParser implements ParserProvider {

    public parserName: string = 'qingping';
    public serviceDataUuids: Array<string> = ['fff9', 'fdcd'];

    private readonly baseByteLength: number = 5;

    parse(buffer: Buffer): ParserResult | null {
        if (buffer == null) {
            throw new Error('A buffer must be provided.');
        }
        if (buffer.length < this.baseByteLength) {
            throw new Error(`Service data length must be >= 5 bytes. ${JSON.stringify(buffer)}`);
        }

        const z: ParserResult = {
            eventLength: 0,
            macAddress: this.parseMacAddress(buffer),
            parser: this.parserName,
            deviceType: this.parseDeviceType(buffer),
            version: null,
            info: this.parseEventData(buffer)
        }
        return z    }

    parseDeviceType(buffer: Buffer) : string {
        let deviceId = buffer.readUInt8(1);
        return qpTypes.get(deviceId) || deviceId.toString();
    }

    parseMacAddress(buffer: Buffer) : string {
        const macBuffer = buffer.slice(2, 8);
        return Buffer.from(macBuffer).reverse().toString('hex');
    }

    toString(buffer: Buffer) : string {
        return buffer.toString('hex');
    }
    parseEventId(buffer: Buffer) : number {
        return buffer.readUInt8(8);
    }
    parseEventData(buffer: Buffer) : Object {
        let dataPosition = 10;
        let eventId = this.parseEventId(buffer)
        //let eventSize = this.buffer.readUInt8(xDataPoint - 1)
        switch (eventId) {
            case EventTypes.temperatureAndHumidity: // temperature & humidity
                const temperature = buffer.readInt16LE(dataPosition) / 10;
                const humidity = buffer.readUInt16LE(dataPosition + 2) / 10;
                return { temperature: temperature, humidity: humidity };
            case EventTypes.battery:
                return { battery: buffer.readUInt8(dataPosition) };
            case EventTypes.pressure:
                return { pressure: buffer.readUInt16LE(dataPosition) };
            default:
                return { unknownData: true };
        }
    }
}
