# blea2mqtt
Send BLE sensors data to MQTT

A service to read Bluetooth low energy sensors in nodejs.

## Required
 - nodejs (`brew install node` or `apt install nodejs`)
 - a bluetooth modem capable of BLE


## Getting started

Before running this, keep in mind that this was tested with
ubuntu and macOS in mind.

To run this in macOS:

Go to `System Preferences` > `Security & Privacy` > `Privacy (tab)` > `Bluetooth` 
and add your terminal of choice to the list of allowed apps.


To run this in ubuntu/other linux distro:
```shell
./setup.sh
```

First, configure your mqtt server
```shell
cp .env.example .env
vim .env
```


To install dependencies run the service, just:

```sh
yarn && yarn start
```

## Project wishlist

 - [ ] Docker image

 - [ ] Docker Compose with full example

 - [ ] Prometheus exporter
