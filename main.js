import './style.css'
import wifidropLogo from './wifidrop.svg'
import fileLogo from './file.svg'
import { setupDrop } from './drop.js'
import {KVStorage} from 'kv-storage'
import {generateName,waitForElm,base32,base32hex,getSizeUnit} from './utils.js'
import webconnect from 'webconnect'
import * as config from  './config.js'

let me = {}
let peers = new Map()

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
	</div>
  </div>
`

const dropCallback = (files)=>{
	console.log(files);
	window.files = files
	setTimeout(()=>{
		fOpenPeers(files)
	},500)
}

setupDrop(document.querySelector('#drop'),dropCallback)



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

function fGenerateAvatar(seed,color){
	const url = `https://blobcdn.com/blob.svg?seed=${fSafe(seed)}&fill=${fSafe(color)}&extraPoints=9`
	return url
}

function fUpdateMe(){
	const avatar = fGenerateAvatar(me.id,me.color)
	document.querySelector('.peer.me .device-name').innerHTML = 'Me : '+me.name
	document.querySelector('.peer.me .device').innerHTML = `
		<img class="device-avatar" src="${avatar}">
	`
}

fUpdateMe()



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

//console.log('ice',ice)
//console.log('me',me)


const connect = webconnect({
	appName:"WIFIDrop",
	channelName:"WIFIDropRoom",
	connectPassword:me.address+me.priority,
	iceConfiguration:{config:{iceServers:ice}}
})
connect.onConnect(async(attribute)=>{
	//console.log("Connect",attribute)
	//connect.Send("hello",{connectId:attribute.connectId})
	//console.log(await connect.Ping({connectId:attribute.connectId}))
	connect.getConnection((attribute)=>{
		//console.log("Connection",attribute)
	})
	fSendMyBio(attribute.connectId) 
})
connect.onDisconnect((attribute)=>{
	console.log("Disconnect",attribute)
	fDeletePeer(attribute.connectId)
})

connect.onReceive((data,attribute) =>{
	//console.log(data,attribute)
	fParseData(data,attribute)
})

function fSendMyBio(connectId){
	const mybio = {command:'announce',data:{jwkpublicKey:me.jwkpublicKey,name:me.name,color:me.color}}
	 fSendData(mybio,connectId)
}

async function importPrivateKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign"],
  );
}

async function importPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["verify"],
  );
}

async function fSendData(json,connectId){
	
	const privateKey = await importPrivateKey(me.jwkprivateKey)
	
	//sign
	let enc = new TextEncoder()
	let encoded = enc.encode(JSON.stringify(json.data))
    const signature = await window.crypto.subtle.sign(
		{
			name: "ECDSA",
			hash: {name: "SHA-384"},
		},
		privateKey,
		encoded
    );
	const sign = Array.from(new Uint8Array(signature))
	json.sign = sign
	
	connect.Send(JSON.stringify(json),{connectId})
}

async function fParseData(data,attribute){
	const json = JSON.parse(data)
	const jwkpublicKey = json.data.jwkpublicKey
	const publicKey = await importPublicKey(jwkpublicKey)
	const signature = new Uint8Array(json.sign).buffer
	let enc = new TextEncoder()
	let encoded = enc.encode(JSON.stringify(json.data))
    let result = await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: {name: "SHA-384"},
      },
      publicKey,
      signature,
      encoded
    )
	if(!result)return
	
	const connectId = attribute.connectId
	const metadata = attribute.metadata
	if(json.command == 'announce'){
		if(peers.has(connectId)){
			//update
		}else{
			//new
			fAddNewPeer(connectId,json.data)
		}
	}
}

async function fAddNewPeer(connectId,data){
	//add to peers
	let peer = data
	const publicKey = JSON.stringify(data.jwkpublicKey)
	const id = btoa(publicKey)
	peer.id = id
	peer.connectId = connectId
	peers.set(connectId,peer)
	
	//add to idb dbBio
	const key = base32hex.encode(publicKey)
	await dbBio.put(key,JSON.stringify(peers))
	
	//add to ui
	const avatar = fGenerateAvatar(peer.id,peer.color)
	const el = `
		<div class="peer peer-${connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name">${fSafe(peer.name)}</div>
		</div>
	`
	document.querySelector('.peers').innerHTML += el
	
	//add to send to list
	if(document.querySelector('.sendto-list') != null){
		fAddSendToList(peer)
	}
}

function fSafe(data){
	return data
}

function fDeletePeer(connectId){
	peers.delete(connectId)
	document.querySelector('.peers .peer.peer-'+connectId).remove()
	if(document.querySelector('.sendto-list') != null){
		document.querySelector('.sendto-list .peer.peer-'+connectId).remove()
		if(peers.size == 0){
			fInfoNoPeers()
		}
	}
}

function fOpenPeers(files){
  const para = document.createElement("div");
  para.innerHTML = '<div class="sendto"><div id="parax"><span style="font-size:30px;color:#fff;">X</span></div><div  class="popup"><div class="title"><div style="padding:10px 10px;">1 File</div></div><div class="scroller sendto-list" ></div></div></div>';
  
  document.body.appendChild(para);
  
  document.querySelector('#parax').addEventListener("click",()=>{
    para.remove(); 
  })

	if(peers.size > 0){
		  peers.forEach((peer)=>{
			  fAddSendToList(peer,files)
		  })
	}else{
		fInfoNoPeers()
	}
}

function fInfoNoPeers(){
	document.querySelector('.sendto-list').innerHTML = '<div class="infonopeers" style="padding:15px 15px;">No other devices connected to WIFIDrop on the same network ...</div>'
}

function fAddSendToList(peer,files){
	//console.log(peer)
	if(document.querySelector('.infonopeers') != null){
		document.querySelector('.infonopeers').remove()
	}
	const avatar = fGenerateAvatar(peer.id,peer.color)
	const el = `
		<div class="peer peer-${peer.connectId}" data-peer="${peer.connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name">${fSafe(peer.name)}</div>
		</div>
	`
	
	document.querySelector('.sendto-list').innerHTML += el
	
	document.querySelector('.sendto-list .peer.peer-'+peer.connectId).style.display = "none"
	
	setTimeout((files)=>{
		document.querySelector('.sendto-list .peer.peer-'+peer.connectId).addEventListener("click",()=>{ 
			
			fSendFile(peer,files)
		})
		document.querySelector('.sendto-list .peer.peer-'+peer.connectId).style.display = "block"
		
		const scroller = document.querySelector('.scroller')
		scroller.scrollTop = scroller.scrollHeight

	},1000)

	/*waitForElm('.sendto-list .peer.peer-'+peer.connectId).then((elm) => {
		console.log(elm.textContent)
		elm.addEventListener("click",()=>{ 
			console.log('click')
			fSendFile(peer,files)
		})
		
	});*/

}

function fSendFile(peer,files){
	showexplorer()
	files = window.files
	for(const file of files){
		const time = (new Date()).getTime()
		const fileid = file.size.toString()+time.toString()
		console.log('send',fileid)
		
		setTimeout(()=>{
			fAddExplorerFile(peer,file,fileid,time,true)
		},1000)
	}
}

//HISTORY files
const explorer = document.createElement("div");
explorer.innerHTML = '<div class="explorer"><div id="explorerx"><span style="font-size:30px;color:#fff;">X</span></div><div  class="popup"><div class="title"><div style="padding:10px 10px;">Files</div></div><div class="scroller files" ></div></div></div>';

document.body.appendChild(explorer);

document.querySelector('#explorerx').addEventListener("click",()=>{
	//explorer.style.display = "none" 
	document.querySelector('.explorer').style.display = "none"
})

function showexplorer(){
	document.querySelector('.sendto').remove()
	setTimeout(()=>{
		document.querySelector('.explorer').style.display = "flex"
	},1000)
}

function fAddExplorerFile(peer,file,fileid,time,send){
	const unit = getSizeUnit(file.size)
	const note = send ? 'You sent to ':'Send by '
	let item = `
		<div class="file file-${fileid}">
			<div class="icon"><div style="width:50px;height:50px"><img src="${fileLogo}"></div></div>
			<div class="loader"><div style="width:50px;height:50px"><div class="progress">0%</div></div></div>
			<div class="body">
				<div class="name">${file.name}</div>
				<div class="meta"><span class="size">${unit}</span> | <span class="note">${note}</span> <span class="to">${peer.name}</span></div> 
			</div>
			
		</div>
	`
	document.querySelector('.explorer .files').innerHTML += item
	const scroller = document.querySelector('.scroller')
	scroller.scrollTop = scroller.scrollHeight
}
