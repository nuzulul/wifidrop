import './style.css'
import wifidropLogo from './wifidrop.svg'
import { setupDrop } from './drop.js'
import {KVStorage} from 'kv-storage'
import {generateName} from './utils.js'
import webconnect from 'webconnect'
import * as config from  './config.js'

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
	document.querySelector('.peer.me .device-name').innerHTML = 'Me : '+me.name
	document.querySelector('.peer.me .device').innerHTML = `
		<img class="device-avatar" src="https://blobcdn.com/blob.svg?seed=${me.id}&fill=${me.color}&extraPoints=9">
	`
}

updateMe()



const stunurls = config.CONFIG_WEBRTC_STUN_URLS
const stunurlsbackup = config.CONFIG_WEBRTC_STUN_URLS_BACKUP

const turnurls = atob(config.CONFIG_WEBRTC_TURN_HOST)
const turnusername = atob(config.CONFIG_WEBRTC_TURN_USER)
const turncredential = atob(config.CONFIG_WEBRTC_TURN_PWD)

const turnurlsbackup = atob(config.CONFIG_WEBRTC_TURN_HOST_BACKUP)
const turnusernamebackup = atob(config.CONFIG_WEBRTC_TURN_USER_BACKUP)
const turncredentialbackup = atob(config.CONFIG_WEBRTC_TURN_PWD_BACKUP)

async function checkice(stunurls,turnurls,turnusername,turncredential,time){
	return new Promise((resolve)=>{
		
		let stun = false
		let turn = false
		
		const timeout = setTimeout(()=>{
			let ice = []
			ice.push(stun)
			ice.push(turn)
			resolve(ice)
		},time)
		
		function check(){
			if(stun && turn){
				let ice = []
				ice.push(stun)
				ice.push(turn)
				clearTimeout(timeout)
				resolve(ice)
			}
		}
		
		//test ice servers
		
		const iceServers = [
			{
				urls: stunurls
			},
			{
				urls: turnurls, 
				username: turnusername, 
				credential: turncredential
			}
		];

		const pc = new RTCPeerConnection({
			iceServers
		});

		pc.onicecandidate = (e) => {
			if (!e.candidate) return;

			//console.log(e.candidate.candidate);
			//console.log(e.candidate);

			// stun works
			if(e.candidate.type == "srflx"){
				//console.log('publicip',e.candidate.address);
				//console.log('publicport',e.candidate.port);
				//console.log('candidate',e.candidate);
				me.address = e.candidate.address
				me.priority = e.candidate.priority
				stun = 	{
							urls: stunurls
						}
				check()
			}

			// turn works
			if(e.candidate.type == "relay"){
				turn =  {
							urls: turnurls, 
							username: turnusername, 
							credential: turncredential
						}
				check()
			}
		};

		pc.onicecandidateerror = (e) => {
			console.debug(e);
		};

		pc.createDataChannel('webpeerjs');
		pc.createOffer().then(offer => pc.setLocalDescription(offer));
	})
}

let ice = []

ice = await checkice(stunurls,turnurls,turnusername,turncredential,5000)

//console.log(ice)

//recheck ice
if(!ice[0] && !ice[1]){
	ice = await checkice(stunurlsbackup,turnurlsbackup,turnusernamebackup,turncredentialbackup,5000)
}else if (ice[0] && !ice[1]){
	ice = await checkice(stunurls,turnurlsbackup,turnusernamebackup,turncredentialbackup,5000)
}else if (!ice[0] && ice[1]){
	ice = await checkice(stunurlsbackup,turnurls,turnusername,turncredential,5000)
}

//console.log(ice)

//final ice remove false value
ice.forEach(function(value, index) {
  if(!value){
	  this.splice(index, 1)
  }
}, ice);

console.log('ice',ice)
//console.log('me',me)


const connect = webconnect({
	appName:"WIFIDrop",
	channelName:"WIFIDropRoom",
	connectPassword:me.address+me.priority,
	iceConfiguration:{config:{iceServers:ice}}
})
connect.onConnect(async(attribute)=>{
	console.log("Connect",attribute)
	connect.Send("hello",{connectId:attribute.connectId})
	console.log(await connect.Ping({connectId:attribute.connectId}))
	connect.getConnection((attribute)=>{
		console.log("Connection",attribute)
	})
})
connect.onDisconnect((attribute)=>{
	console.log("Disconnect",attribute)
})

connect.onReceive((data,attribute) =>{
	console.log(data,attribute)
})
