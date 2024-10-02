import './style.css'
import wifidropLogo from './wifidrop.svg'
import { setupDrop } from './drop.js'
import {KVStorage} from 'kv-storage'
import {generateName} from './utils.js'

let me = {}

document.querySelector('#app').innerHTML = `
  <div>
    <a href="/">
      <img src="${wifidropLogo}" class="logo vanilla" alt="WIFIDrop logo" /><h1 class="logo-text">WIFIDrop</h1>
    </a>
    
    <div class="frame">
      <button id="drop" type="button">Drop a file or click to select a file</button>
    </div>
	
	<div class="peers">
		<div class="peer me">
			<div class="device"></div>
			<div class="device-name">DEVICE</div>
		</div>
		<div class="peer">
			<div class="device"></div>
			<div class="device-name">DEVICE</div>
		</div>
		<div class="peer">
			<div class="device"></div>
			<div class="device-name">DEVICE</div>
		</div>	
	</div>
  </div>
`

setupDrop(document.querySelector('#drop'))

const dbMe = await KVStorage({
	runtime:'browser',
	storageName:'wifidropdbMe'
})

const dbBio = await KVStorage({
	runtime:'browser',
	storageName:'wifidropdbBio'
})

const dbHistory = await KVStorage({
	runtime:'browser',
	storageName:'wifidropdHistory'
})

const meList = await dbMe.list()
if(meList.keys.length == 0){
	const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
		{
			name: "ECDSA",
			namedCurve: "P-384",
		},
		true,
		["sign", "verify"] 
	);
	const jwkpublicKey = await window.crypto.subtle.exportKey("jwk", publicKey)
	const jwkprivateKey = await window.crypto.subtle.exportKey("jwk", privateKey)
	me.jwkpublicKey = jwkpublicKey
	me.jwkprivateKey = jwkprivateKey
	const strpublicKey = JSON.stringify(jwkpublicKey)
	me.publicKey = strpublicKey
	await dbMe.put('publicKey',strpublicKey)
	await dbMe.put('privateKey',JSON.stringify(jwkprivateKey))
	const name = generateName()
	me.name = name
	await dbMe.put('name',name)
	const id = btoa(strpublicKey)
	me.id = id
	var randomColor = Math.floor(Math.random()*16777215).toString(16);
	await dbMe.put('color',randomColor)
	me.color = randomColor
}else{
	const publicKey = await dbMe.get('publicKey')
	const jwkpublicKey = JSON.parse(publicKey)
	const privateKey = await dbMe.get('privateKey')
	const jwkprivateKey = JSON.parse(privateKey)
	me.jwkpublicKey = jwkpublicKey
	me.jwkprivateKey = jwkprivateKey
	me.publicKey = publicKey
	const name = await dbMe.get('name')
	me.name = name
	const id = btoa(publicKey)
	me.id = id
	const color = await dbMe.get('color')
	me.color = color
}

function updateMe(){
	document.querySelector('.peer.me .device-name').innerHTML = me.name
	document.querySelector('.peer.me .device').innerHTML = `
		<img class="device-avatar" src="https://blobcdn.com/blob.svg?seed=${me.name}&fill=${me.color}&extraPoints=9">
	`
}

updateMe()