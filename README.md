## blea2mqtt
Send BLE sensors data to MQTT

Why transmit this to mqtt? 
 - We may need several bluetooth radios to get decent coverage, as BLE is not a mesh network.
 - We decode the data locally, to save on data sent to mqtt. There are a lot more devices that may broadcast BLE signals and this is a problem if you live in an apartment.

A service to read Bluetooth low energy sensors in nodejs.

### Requirements
 - nodejs (`brew install node` or `apt install nodejs npm -y`)
 - `yarn` (`npm i -g yarn`)
 - a bluetooth modem capable of BLE


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
| MQTT_TOPIC    | Mqtt topic to publish information, includes the machine name |


To install dependencies run the service, just:

```shell
yarn && yarn start
```

### Project wishlist

 - [ ] Docker image

 - [ ] Docker Compose with full example

 - [ ] Prometheus exporter
