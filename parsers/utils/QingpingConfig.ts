// Device type dictionary
// {device type code: device name}
export const qpTypes: Map<number, string> = new Map([
    [0x01, 'CGG1'],
    [0x07, 'CGG1'],
    [0x09, 'CGP1W'],
    [0x0c, 'CGD1'],
    [0x10, 'CGDK2'] // tested with this
])

export const EventTypes = {
    'temperatureAndHumidity': 0x01,
    'battery': 0x02,
    'pressure': 0x07
}
