## blea2mqtt
Send BLE sensors data to MQTT

Why transmit this to mqtt? 
 - We may need several bluetooth radios to get decent coverage, as BLE is not a mesh network.
 - We decode the data locally, to save on data sent to mqtt. There are a lot more devices that may broadcast BLE signals and this is a problem if you live in an apartment.

A service to read Bluetooth low energy sensors in nodejs.

### Requirements
 - nodejs v12+ (`brew install node` or [using nvm](ttps://github.com/nvm-sh/nvm#install--update-script))
 - `yarn` (`npm i -g yarn`)
 - a Bluetooth modem capable of BLE

### Devices tested & working with this project

 - `LYWSDCGQ` Mi Thermohygrometer, powered by 1xAAA
 - `HHCCJCY01` Mi Flora, also available from a lot of other brands, powered by 1xCR2032
 - `CGDK2`, a newer version of the Mi Thermohygrometer, powered by 1xCR2430
   - For this device to broadcast useful data, a pair to the official `Qingping+` app was needed


### Getting started

Before running this, keep in mind that this was tested with
ubuntu and macOS in mind.

To run this in macOS:

Go to `System Preferences` > `Security & Privacy` > `Privacy (tab)` > `Bluetooth` 
and add your terminal of choice to the list of allowed apps.


To run this in ubuntu/other gnu/linux distro:
```shell
./setup.sh
```

First, configure your mqtt server
```shell
cp .env.example .env
vim .env
```

There are a few things to configure in the `.env` file:

| Variable      | Description          |
| ------------- | -------------------- |
| MQTT_HOSTNAME | Mqtt server location |
| MQTT_USERNAME | Mqtt server user     |
| MQTT_PASSWORD | Mqtt server password for the given user |
| MQTT_TOPIC    | Mqtt topic to publish information |
| MACHINE_NAME  | Name your data collection node |
| BLE_DEBUG     | Shows extra data (all ble broadcasts) |


To install dependencies run the service, just:

```shell
yarn && yarn start
```

### Project wishlist

 - [ ] Docker image

 - [ ] Docker Compose with full example

 - [ ] Prometheus exporter
