interface ParserProvider {
    parserName: string,
    serviceDataUuids: Array<string>
    parse(buffer: Buffer) : ParserResult | null
}
