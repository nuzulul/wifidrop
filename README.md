# WIFIDrop

Instant WIFI Drop P2P Large File Transfer.

WIFIDrop is an easy-to-use progressive web app (PWA) that allows users to transfer files between devices on the same network. Files are transferred securely peer-to-peer via WebRTC without any intermediary servers. This works by leveraging existing public protocole for signaling such as Torrent, Nostr and MQTT. Therefore this application can be run on any static hosting.

![WIFIDrop](screenshot.jpeg)

## Features

* ✅ No need to create an account or register.
* ✅ Automatically discover devices on the same network
* ✅ Share large files between devices
* ✅ Share clipboard between devices

## Try it out!

* Go to a deployed WIFIDrop web app [https://wifidrop.js.org](https://wifidrop.js.org)
* Open the app on another device on the same network
* Both your devices should show up
* Now start sharing some files

## Development

```
git clone https://github.com/nuzulul/wifidrop.git
npm install
npm start
```

## Production

```
npm run build
```

## License

MIT

## Maintainers

[Nuzulul Zulkarnain](https://github.com/nuzulul)