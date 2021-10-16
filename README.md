# blea2mqtt
Send BLE sensors data to MQTT

A service to read Bluetooth low energy sensors in nodejs.


## Getting started

Before running this, keep in mind that this was tested with
ubuntu and mac os in mind.

To run this in mac os:

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

## Project whishlist

 - [ ] Docker image

 - [ ] Docker Compose with full example

 - [ ] Prometheus exporter
