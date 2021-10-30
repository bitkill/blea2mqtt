// Device type dictionary
// {device type code: device name}
export const xiaomiTypes: Map<number, string> = new Map([
    [0x01aa, 'LYWSDCGQ'], // developed with these, so they should work ok
    [0x045b, 'LYWSD02'],
    [0x055b, 'LYWSD03MMC'], // does not broadcast temp & humidity, needs ATC custom firmware
    [0x0098, 'HHCCJCY01'],
    [0x03bc, 'GCLS002'],
    [0x015d, 'HHCCPOT002'],
    [0x040a, 'WX08ZM'],
    [0x098b, 'MCCGQ02HL'],
    [0x0083, 'YM-K1501'],
    [0x0113, 'YM-K1501EU'],
    [0x045c, 'V-SK152'],
    [0x0863, 'SJWS01LM'],
    [0x07f6, 'MJYD02YL'],
    [0x03dd, 'MUE4094RT'],
    [0x0a8d, 'RTCGQ02LM'],
    [0x00db, 'MMC-T201-1'],
    [0x0489, 'M1S-T500'],
    [0x0c3c, 'CGC1'],
    [0x0576, 'CGD1'],
    [0x066f, 'CGDK2'],
    [0x0347, 'CGG1'],
    [0x0b48, 'CGG1-ENCRYPTED'],
    [0x03d6, 'CGH1'],
    [0x0a83, 'CGPR1'],
    [0x06d3, 'MHO-C303'],
    [0x0387, 'MHO-C401'],
    [0x02df, 'JQJCY01YM'],
    [0x0997, 'JTYJGD03MI'],
    [0x1568, 'K9B-1BTN'],
    [0x1569, 'K9B-2BTN'],
    [0x0dfd, 'K9B-3BTN'],
    [0x07bf, 'YLAI003'],
    [0x0153, 'YLYK01YL'],
    [0x068e, 'YLYK01YL-FANCL'],
    [0x04e6, 'YLYK01YL-VENFAN'],
    [0x03bf, 'YLYB01YL-BHFRC'],
    [0x03b6, 'YLKG07YL/YLKG08YL'],
    [0x069e, 'ZNMS16LM'],
    [0x069f, 'ZNMS17LM']
]);

export const FrameControlFlags = {
    'isFactoryNew': 1 << 0,
    'isConnected': 1 << 1,
    'isCentral': 1 << 2,
    'isEncrypted': 1 << 3,
    'hasMacAddress': 1 << 4,
    'hasCapabilities': 1 << 5,
    'hasEvent': 1 << 6,
    'hasCustomData': 1 << 7,
    'hasSubtitle': 1 << 8,
    'hasBinding': 1 << 9,
};

export type FrameControl = typeof FrameControlFlags

export const CapabilityFlags = {
    'connectable': 1 << 0,
    'central': 1 << 1,
    'secure': 1 << 2,
    'io': (1 << 3) | (1 << 4),
};

export type XiaomiDeviceCapabilities = typeof CapabilityFlags

// https://iot.mi.com/new/doc/embedded-development/ble/object-definition
export const EventTypes = {
    // basic events
    'connection': 0x0001,
    'pairing': 0x0002,

    // base supported events
    'temperature': 0x1004,
    'humidity': 0x1006,
    'illuminance': 0x1007,
    'moisture': 0x1008,
    'soilConductivity': 0x1009,
    'formaldehyde': 0x1010, // not supported
    'switch': 0x1012, // not supported
    'consumable': 0x1012, // consumable, in percentage, not supported
    'moisture2': 0x1014, // not supported
    'smoke': 0x1015, // not supported
    'motion2': 0x1017, // not supported
    'lightIntensity': 0x1018, // not supported
    'door': 0x1019, // not supported
    'battery': 0x100a,
    'temperatureAndHumidity': 0x100d,

    // not supported by this lib
    'motion': 0x0003,
    'fingerprint': 0x0006,
    'toothbrush': 0x0010,
    'lock': 0x000b,
    'moveWithLight': 0x000f,
    'remote': 0x1001,
    'bodyTemperature': 0x2000,
}

