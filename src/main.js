//! Copyright Nuzulul Zulkarnain. Released under The MIT License.
//! WIFIDrop -- https://github.com/nuzulul/wifidrop

import './style.css'
import wifidropLogo from '/icon-512.png'
import fileLogo from './file.svg'
import { setupDrop } from './drop.js'
import {KVStorage} from 'kv-storage'
import {generateName,waitForElm,base32,base32hex,getSizeUnit,webrtcgarbagecollector,generatekey} from './utils.js'
import webconnect from 'webconnect'
import * as config from  './config.js'

let me = {}
let peers = new Map()
let files = new Map()
let nonces = new Map()
let myid = ''
let usednonce = []
let clipboard = new Map()
let dbMe
let dbBio
let dbHistory
let connect
let sendstream = new Map()
let sendtime = new Map()
let sendpercent = new Map()
let receivestream = new Map()
let isbusy = new Map()
let writableStream = new Map()
let largesupport = false
const forcewarning = config.CONFIG_FORCE_WARNING
const largelimit = config.CONFIG_LARGE_LIMIT

//detect feature
if(typeof showOpenFilePicker === typeof Function && typeof showSaveFilePicker === typeof Function){
	largesupport = true
}

//largesupport = false

document.querySelector('#app').innerHTML = `
  <span id="loader" style="display:block;"><div class="loading">Loading&#8230;</div></span>
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
			<div class="radar">

				<svg id="radar-circle">
				  <circle cx="50%" cy="50%" r="0" fill-opacity="0" stroke="blue" stroke-width="2px" stroke-opacity="1">
					<animate attributeName="r" from="0" to="75" dur="3s" repeatCount="indefinite" />
					<animate attributeName="stroke-opacity" from="1" to="0" dur="3s" repeatCount="indefinite"></animate>
				  </circle>
				  
				  <circle cx="50%" cy="50%" r="0" fill-opacity="0" stroke="blue" stroke-width="2px" stroke-opacity="1">
					<animate attributeName="r" from="0" to="75" dur="3s" repeatCount="indefinite" begin="0.75s" />
					<animate attributeName="stroke-opacity" from="1" to="0" dur="3s" repeatCount="indefinite" begin="0.75s"></animate>
				  </circle>
				  
				  <circle cx="50%" cy="50%" r="0" fill-opacity="0" stroke="blue" stroke-width="2px" stroke-opacity="1">
					<animate attributeName="r" from="0" to="75" dur="3s" repeatCount="indefinite" begin="1.5s" />
					<animate attributeName="stroke-opacity" from="1" to="0" dur="3s" repeatCount="indefinite" begin="1.5s"></animate>
				  </circle>
				  
				  <circle cx="50%" cy="50%" r="5" fill="#C1D82F" stroke="#979797"></circle>
				</svg>

			</div>
		</div>	
	</div>
	<div class="attribution">
		<p>WIFIDrop - Local peer-to-peer file transfer via WIFI</p>
		<p><a target="_blank" href="https://github.com/nuzulul/wifidrop"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16"> <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/> </svg> Open Source</a></p>
	</div>
  </div>
`

const dropCallback = (data,largedisabled)=>{
	//console.log(data);
	const filesid = myid+new Date().getTime().toString() + Math.floor(Math.random() * 1000000)
	files.set(filesid,data)
	if(largedisabled){
		largesupport = false
	}
	setTimeout(()=>{
		fOpenPeers(filesid)
	},500)
}

setupDrop(document.querySelector('#drop'),largesupport,dropCallback)

navigator.serviceWorker.addEventListener('message', function (e) {
	console.log('message',e)
	const url = new URL(window.location.href)
    if (url.searchParams.has('receiving-file-share')) {
        const files = e.data.files
		dropCallback(files,true)
    }
})


void async function main() {

	dbMe = await KVStorage({
		runtime:'browser',
		storageName:'wifidropdbMe'
	})

	dbBio = await KVStorage({
		runtime:'browser',
		storageName:'wifidropdbBio'
	})

	dbHistory = await KVStorage({
		runtime:'browser',
		storageName:'wifidropdbHistory'
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
		if(randomColor.length < 6)randomColor = '000000';
		await dbMe.put('color',randomColor)
		me.color = randomColor
		const skipconfirmation = false
		await dbMe.put('skipconfirmation',skipconfirmation)
		const key = generatekey(strpublicKey)
		me.key = key
	}else{
		const strpublicKey = await dbMe.get('publicKey')
		const jwkpublicKey = JSON.parse(strpublicKey)
		const strprivateKey = await dbMe.get('privateKey')
		const jwkprivateKey = JSON.parse(strprivateKey)
		me.jwkpublicKey = jwkpublicKey
		me.jwkprivateKey = jwkprivateKey
		me.publicKey = strpublicKey
		const name = await dbMe.get('name')
		me.name = name
		const id = btoa(strpublicKey)
		me.id = id
		const color = await dbMe.get('color')
		me.color = color
		const key = generatekey(strpublicKey)
		me.key = key
	}

	var randomColor = Math.floor(Math.random()*16777215).toString(16);
	if(randomColor.length < 6)randomColor = '000000';
	me.varian = randomColor
	
	fUpdateMe()
	fHistory()

	//////////////////////connection///////////////////////////////////////////////////////////
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
	
	//const timezone = new Date().getTimezoneOffset()
	//let password = me.address+timezone
	let password = 'Tb5xazDnJy9GryD7mQnjSOmT8EL4bAkzG5WR84B7jPTX2S52J64UbtU7JRj8XBCn-'+me.address
	//let password = 'wifidropglobal'
	
	/*try{
		const ip = await fetch('https://get.geojs.io/v1/ip/geo.json')
		const json = await ip.json()	
		password += json.latitude+json.longitude
	}catch(e){}*/


	connect = webconnect({
		appName:"WIFIDrop",
		channelName:"WIFIDropRoom",
		//connectPassword:me.address+me.priority,
		connectPassword:password,
		iceConfiguration:{config:{iceServers:ice}}
	})
	connect.getMyId((attribute) => {
		myid = attribute.connectId
		fUpdateMe()
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
		//console.log("Disconnect",attribute)
		fDeletePeer(attribute.connectId)
		fStopAction(attribute.connectId)
	})

	connect.onReceive((data,attribute) =>{
		//console.log(data,attribute)
		if(attribute.metadata == undefined){
			fParseData(data,attribute)
		}else{
			fReceiveData(data,attribute)
		}
	})
	connect.onReceiveProgress((attribute) => {
		//console.log(`Receiving progress : ${attribute.percent} from ${attribute.connectId} metadata ${attribute.metadata}`)
		if(attribute.metadata != undefined){
			fReceiveFileProgress(attribute)
		}
	})
	connect.onSendProgress((attribute) => {
		//console.log(`Sending progress : ${attribute.percent} to ${attribute.connectId}`)
		//console.log('attribute',attribute)
		if(attribute.metadata != undefined){
			fSendFileProgress(attribute)
		}
	})
	//////////////////////connection///////////////////////////////////////////////////////////


}()

async function fHistory(){
	const fileHistory = await dbHistory.list()
	let his = []
	for(const key of fileHistory.keys){
		const item = await dbHistory.get(key)
		his.push(item)
	}
	his.sort((a,b)=>{return a.time - b.time})
	for(const item of his){
		const peer = await dbBio.get(item.author)
		const fileid = item.fileid
		const time = item.time
		const send = item.send
		const complete = item.complete
		const file = {size:item.size,name:item.name}
		fAddExplorerFile(peer,file,fileid,time,send,complete)
		
	}
}


function fGenerateAvatar(seed,color){
	const url = `https://blobcdn.com/blob.svg?seed=${fSafe(seed)}&fill=${fSafe(color)}&extraPoints=9`
	return url
}

function fUpdateMe(){
	const avatar = fGenerateAvatar(me.id,me.varian)
	document.querySelector('.peer.me .device-name').innerHTML = `<span class="varian" style="border:2px solid #${fSafe(me.varian)};background:#${me.varian};"></span>`+me.name
	document.querySelector('.peer.me .device').innerHTML = `
		<img class="device-avatar" src="${avatar}">
	`
}






function fSendMyBio(connectId){
	const mybio = {command:'announce',data:{name:me.name,color:me.color,varian:me.varian}}
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
	
	json.data.jwkpublicKey = me.jwkpublicKey
	
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
	
	let encodeddata = enc.encode(JSON.stringify(json))	
	
	connect.Send(encodeddata,{connectId})
}

async function fParseData(data,attribute){
	//console.log('data1',data,attribute)
	//console.log('type',typeof data)
	
	if (typeof data === 'object'){
		const dec = new TextDecoder()
		data = dec.decode(data)
	}
	//console.log('data2',data,attribute)
	
	//if (typeof data !== 'string') return
	const json = JSON.parse(data)
	
	//const json = data
	//console.log('json',json)
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
			fUpdatePeer(connectId,json.data)
		}else{
			//new
			fAddNewPeer(connectId,json.data)
		}
	}
	else if(json.command == 'offer'){
		const offer = json.data
		fAnswerFile(attribute.connectId,json.data)
	}
	else if(json.command == 'answer'){
		const value = json.data.value
		if(value){
			fAcceptAnswer(attribute.connectId,json.data)
		}else{
			fDeclineAnswer(attribute.connectId,json.data)
		}
	}
	else if(json.command == 'clipboard'){
		const clip = json.data.clip
		clipboard.set(connectId,clip)
		if(document.querySelector('.clipboard.clipboard-'+connectId)){
			document.querySelector('.clipboard .message .content #clipboard').value = clip
		}
	}
	else if(json.command == 'state'){
		fStateFile(attribute.connectId,json.data)
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

	//get connection type
	const interval = setInterval(()=>{
		connect.getConnection(async (attribute)=>{
			//console.log('atribute',attribute)
			const rtc = attribute.connections[connectId]
			//console.log('rtc',rtc)
				if(rtc){
					const type = await rtctype()
					//console.log('type',type)
					let peer = peers.get(connectId)
					peer.type = type
					peers.set(connectId,peer)
					fUpdateType(connectId)
					clearInterval(interval)
				}
			
			
			async function rtctype(){
				const stats = await rtc.getStats();
				if(stats){
					let selectedPairId = null;
					for(const [key, stat] of stats){
						if(stat.type == "transport"){
							selectedPairId = stat.selectedCandidatePairId;
							break;
						}
					}
					let candidatePair = stats.get(selectedPairId);
					if(!candidatePair){
						for(const [key, stat] of stats){
							if(stat.type == "candidate-pair" && stat.selected){
								candidatePair = stat;
								break;
							}
						}
					}

					if(candidatePair){
						for(const [key, stat] of stats){
							if(key == candidatePair.remoteCandidateId){
								return stat.candidateType;
							}
						}
					}
				}
			}

		})
	},1000)
	
	
	//add to idb dbBio
	const key = generatekey(publicKey)
	await dbBio.put(key,peer)
	
	//add to ui
	const avatar = fGenerateAvatar(peer.id,peer.varian)
	const type = peer.type ? peer.type : 'none'
	const el = `
		<div class="peer peer-${connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name"><span class="varian ${type}" style="border:2px solid #${fSafe(peer.varian)};"></span>${fSafe(peer.name)}</div>
		</div>
	`
	document.querySelector('.peers .peer.me').insertAdjacentHTML("afterend",el)
	
	//add to send to list
	if(document.querySelector('.sendto-list') != null){
		fAddSendToList(peer,window.currentfilesid)
	}

	document.querySelector('.peers .peer-'+connectId).addEventListener("click",()=>{
		//fOpenCliboard(data)
		fDialogClipboard(connectId)
	})
}

function fUpdateType(connectId){
	const peer = peers.get(connectId)
	const type = peer.type
	const nodeList = document.querySelectorAll('.peer.peer-'+connectId+' .varian')
	for(const node of nodeList){
		node.classList.remove("none")
		node.classList.add(type)
	}	
}

function fDialogClipboard(connectId){
		
		const para = document.createElement("div");
		para.innerHTML = `
			<div class="dialog clipboard clipboard-${fSafe(connectId)}">
				<div id="parax" style="display:block;"><span style="font-size:30px;color:#fff;">X</span></div>
				<div class="message">
					<div class="title"><div class="device-name" style="padding:10px 10px;">title</div></div>
					<div class="content" >
						<textarea id="clipboard" name="clipboard" rows="10" cols="30"></textarea>
					</div>
					<div class="footer">
						<button class="save">SAVE</button>
						<button class="copy">COPY</button>
					</div>
				</div>
		</div>`;
		  
		document.body.appendChild(para);
		  
		document.querySelector('.clipboard #parax').addEventListener("click",()=>{
			para.remove(); 
		})
		
		const peer = peers.get(connectId)
		const type = peer.type ? peer.type : 'none'
		document.querySelector('.clipboard .message .title div').innerHTML = `<span class="varian ${type}" style="border:2px solid #${fSafe(peer.varian)};"></span>${fSafe(peer.name)}'s clipboard`
		document.querySelector('.clipboard .message .content #clipboard').value = clipboard.has(connectId)?clipboard.get(connectId):''
		
		document.querySelector('.clipboard .message .footer .save').addEventListener("click",()=>{
			const clip = document.querySelector('.clipboard .message .content #clipboard').value
			const json = {command:'clipboard',data:{clip}}
			clipboard.set(connectId,clip)
			fSendData(json,connectId)
			//para.remove();
			const check = `
				<span class="check">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
					  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
					</svg>		
				</span>`
			const el = '.clipboard .message .footer .save'
			document.querySelector(el).insertAdjacentHTML("afterbegin",check)
			setTimeout(()=>{
				if(document.querySelector(el+' .check'))document.querySelector(el+' .check').remove()
			},3000)
		})
		document.querySelector('.clipboard .message .footer .copy').addEventListener("click",()=>{
				const clip = document.querySelector('.clipboard .message .content #clipboard').value
				navigator.clipboard.writeText(clip).then(() => {
				  //console.log('Content copied to clipboard');
				  /* Resolved - text copied to clipboard successfully */
					const check = `
						<span class="check">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
							  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
							</svg>		
						</span>`
					const el = '.clipboard .message .footer .copy'
					document.querySelector(el).insertAdjacentHTML("afterbegin",check)
					setTimeout(()=>{
						if(document.querySelector(el+' .check'))document.querySelector(el+' .check').remove()
					},3000)
				},() => {
				  //console.error('Failed to copy');
				  /* Rejected - text failed to copy to the clipboard */
				});		

		})
}

async function fUpdatePeer(connectId,data){
	let peer = peers.get(connectId)
	peer.name = data.name
	peers.set(connectId,peer)
	const nodeList = document.querySelectorAll('.peer.peer-'+connectId+' .device-name')
	for(const node of nodeList){
		node.innerText = peer.name
	}
}

function escapehtmloldbrowser(s) {
    let lookup = {
        '&': "&amp;",
        '"': "&quot;",
        '\'': "&apos;",
        '<': "&lt;",
        '>': "&gt;"
    };
    return s.replace( /[&"'<>]/g, c => lookup[c] );
}

function fSafe(unsafe){
	unsafe = String(unsafe);
	var data = escapehtmloldbrowser(unsafe);
	return data;
}

function fDeletePeer(connectId){
	peers.delete(connectId)
	if(document.querySelector('.peers .peer.peer-'+connectId))document.querySelector('.peers .peer.peer-'+connectId).remove()
	if(document.querySelector('.sendto-list') != null){
		document.querySelector('.sendto-list .peer.peer-'+connectId).remove()
		if(peers.size == 0){
			fInfoNoPeers()
		}
	}
}

function fStopAction(connectId){
	//change color file to red on disconnect
	const nodeList = document.querySelectorAll('.file.connect-'+connectId)
	for(const node of nodeList){
		const complete = node.dataset.complete
		if(complete !== '100'){
			node.style.backgroundColor = '#b81127';
			node.children[2].children[1].children[0].innerHTML = 'Failed'
		}

	}
	//remove clipboard on disconnect
	if(document.querySelector('.clipboard.clipboard-'+connectId)){
		document.querySelector('.clipboard.clipboard-'+connectId).remove()
	}
}

async function fOpenPeers(filesid){
	
	let datafiles = files.get(filesid)
	
	const length = datafiles.length
	let size = 0
	for(const fileraw of datafiles){
		const file = largesupport ? await fileraw.getFile() : fileraw
		size += file.size
	}
	
  const para = document.createElement("div");
  para.innerHTML = `<div class="dialog sendto"><div id="parax"><span style="font-size:30px;color:#fff;">X</span></div><div class="popup"><div class="title"><div style="padding:10px 10px;">Send ${fSafe(length)} file(s) of ${getSizeUnit(fSafe(size))} to ...</div></div><div class="scroller sendto-list" ></div></div></div>`;
  
  document.body.appendChild(para);
  
  document.querySelector('.sendto #parax').addEventListener("click",()=>{
    para.remove(); 
  })
	
	window.currentfilesid = filesid
	if(peers.size > 0){
		  
		  peers.forEach((peer)=>{
			  
			  fAddSendToList(peer,filesid)
		  })
	}else{
		fInfoNoPeers()
	}
}

function fInfoNoPeers(){
	document.querySelector('.sendto-list').innerHTML = '<div class="infonopeers" style="padding:15px 15px;">Waiting for other devices connected to WIFIDrop on the same network ...</div>'
}

function fAddSendToList(peer,filesid){
	//console.log(peer)
	if(document.querySelector('.infonopeers') != null){
		document.querySelector('.infonopeers').remove()
	}
	const avatar = fGenerateAvatar(peer.id,peer.varian)
	const type = peer.type ? peer.type : 'none'
	const el = `
		<div class="peer peer-${peer.connectId}" data-peer="${peer.connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name"><span class="varian ${type}" style="border:2px solid #${fSafe(peer.varian)};"></span>${fSafe(peer.name)}</div>
		</div>
	`
	
	document.querySelector('.sendto-list').innerHTML += el
	
	document.querySelector('.sendto-list .peer.peer-'+peer.connectId).style.display = "none"
	
	setTimeout(()=>{
		document.querySelector('.sendto-list .peer.peer-'+peer.connectId).addEventListener("click",()=>{ 
			
			fOfferFile(peer,filesid)
		})
		document.querySelector('.sendto-list .peer.peer-'+peer.connectId).style.display = "block"
		
		const scroller = document.querySelector('.scroller')
		scroller.scrollTop = scroller.scrollHeight

	},1000)

	/*waitForElm('.sendto-list .peer.peer-'+peer.connectId).then((elm) => {
		console.log(elm.textContent)
	});*/

}

async function fOfferFile(peer,filesid,isforce){

	let datafiles = files.get(filesid)
	
	const length = datafiles.length
	let large = false
	let size = 0
	for(const fileraw of datafiles){
		const file = largesupport ? await fileraw.getFile() : fileraw
		size += file.size
	}
	if(size > largelimit){
		large = true
	}
	
	if(document.querySelector('.sendto'))document.querySelector('.sendto').remove()
	
	const para = document.createElement("div");
	para.innerHTML = `<div class="dialog offer offer-${filesid}"><div id="parax" style="display:block;"><span style="font-size:30px;color:#fff;">X</span></div><div class="message"><div class="title"><div style="padding:10px 10px;">Waiting confirmation</div></div><div class="content" >You want to send  ${fSafe(length)} file(s) of ${getSizeUnit(fSafe(size))} to ${fSafe(peer.name)} ...</div></div></div>`;
	  
	document.body.appendChild(para);
	  
	document.querySelector('.offer.offer-'+filesid+' #parax').addEventListener("click",()=>{
		para.remove(); 
	})
	
	if(!largesupport && large && isforce == undefined){
		
		if(forcewarning){
			const msg = `Your device doesn't support large transfer (${getSizeUnit(fSafe(largelimit))})`
			
			const check = `
				<span class="check" style="padding:10px 10px;color:red;display:inline-block">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-x-fill" viewBox="0 0 16 16">
					  <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M6.854 6.146 8 7.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 8l1.147 1.146a.5.5 0 0 1-.708.708L8 8.707 6.854 9.854a.5.5 0 0 1-.708-.708L7.293 8 6.146 6.854a.5.5 0 1 1 .708-.708"/>
					</svg>
					<span class="msg">${msg}</span>
					<div class="footer" style="display:none">
						<p>Caution ! Legacy FORCE large transfer!</p>
						<button class="force" >TRY FORCE TRANSFER</button>
					</div>
				</span>`
			const el = '.offer .message .content'
			document.querySelector(el).insertAdjacentHTML("beforeend",check)
			document.querySelector(el+' .check .footer .force').addEventListener("click",()=>{
				isforce = true
				if(document.querySelector('.offer.offer-'+filesid)){
					document.querySelector('.offer.offer-'+filesid).remove()
				}
				fOfferFile(peer,filesid,isforce)
			})
			setTimeout(()=>{
				document.querySelector(el+' .check .footer').style.display = 'block'
			},2000)
			return;
		}else{
			if(document.querySelector('.offer.offer-'+filesid)){
				document.querySelector('.offer.offer-'+filesid).remove()
			}
			isforce = true
			fOfferFile(peer,filesid,isforce)
			return
		}
	}

	let namefiles = []
	for(const fileraw of datafiles){
		const file = largesupport ? await fileraw.getFile() : fileraw
		const name = file.name
		const size = file.size
		const type = file.type
		const time = (new Date()).getTime()
		const fileid = file.size.toString()+time.toString()+ Math.floor(Math.random() * 1000000)
		const item = {name,size,type,fileid}
		namefiles.push(item)
	}
	
	const force = isforce ? true : false
	const offer = {command:'offer',data:{length,size,filesid,namefiles,large,force}}
	 fSendData(offer,peer.connectId)

}

async function fAnswerFile(connectId,data){
	if(peers.has(connectId)){
		
		const peer = peers.get(connectId)
		
		const isforce = data.force
		const force = isforce ? true : false
		
		if(!largesupport && data.size > largelimit && !force){
			const filesid = data.filesid
			const answer = {command:'answer',data:{value:false,filesid,largelimit:true}}
			fSendData(answer,connectId)
			return
		}
		
		const skipconfirmation = await dbMe.get('skipconfirmation')
		
		if(skipconfirmation){
			fSendAccept(data,connectId)
			return
		}
		
		let list = '<ul>'
		for(const namefile of data.namefiles){
			const item = `<li>${fSafe(namefile.name)}</li>`
			list += item
		}
		list += '</ul>'
		
		const para = document.createElement("div");
		para.innerHTML = `
			<div class="dialog answer answer-${data.filesid}">
				<div id="parax" style="display:none;"><span style="font-size:30px;color:#fff;">X</span></div>
				<div class="message">
					<div class="title"><div style="padding:10px 10px;">Confirmation</div></div>
					<div class="content" style="width:100%;">
						<div class="profile" style="display:flex;justify-content: center;align-items: center;margin-bottom:10px;"></div>
						<div style="padding:10px 10px;">${peer.name} wants to send you ${fSafe(data.length)} file(s) of ${getSizeUnit(fSafe(data.size))}</div>
						<div style="max-height:125px;max-width:90%;overflow:scroll;">${list}</div>
					</div>
					<div class="footer">
						<button class="decline">DECLINE</button>
						<button class="accept">ACCEPT</button>
					</div>
				</div>
		</div>`;
		  
		document.body.appendChild(para);

		//add avatar
		const avatar = fGenerateAvatar(peer.id,peer.varian)
		const type = peer.type ? peer.type : 'none'
		const el = `
			<div class="peer peer-${peer.connectId}" data-peer="${peer.connectId}">
				<div class="device"><img class="device-avatar" src="${avatar}"></div>
				<div class="device-name"><span class="varian ${type}" style="border:2px solid #${fSafe(peer.varian)};"></span>${fSafe(peer.name)}</div>
			</div>
		`
		
		document.querySelector('.answer.answer-'+data.filesid+' .message .content .profile').innerHTML = el		
		  
		document.querySelector('.answer.answer-'+data.filesid+' #parax').addEventListener("click",()=>{
			para.remove(); 
		})

		document.querySelector('.answer.answer-'+data.filesid+' .decline').addEventListener("click",()=>{
			para.remove(); 
			const filesid = data.filesid
			const answer = {command:'answer',data:{value:false,filesid}}
			fSendData(answer,connectId)
		})

		document.querySelector('.answer.answer-'+data.filesid+' .accept').addEventListener("click",()=>{
			para.remove(); 
			fSendAccept(data,connectId)
		})
	}
}

async function fSendAccept(data,connectId){
	
	let nonce = []
	
	for(const namefile of data.namefiles){
		const time = (new Date()).getTime()
		let nonceid = btoa(namefile.name+namefile.size+namefile.size.toString()+time.toString()+ Math.floor(Math.random() * 1000000))
		nonce.push(nonceid)
		const noncedata = {nonceid,connectId,...namefile}
		nonces.set(nonceid,noncedata)
	}
	
	const filesid = data.filesid
	const namefiles = data.namefiles
	const large = data.large
	const force = data.force

	if(large && !force){
		for(const namefile of namefiles){
			const fileid = namefile.fileid
			receivestream.set(fileid,0)
			  let draftHandle = await showSaveFilePicker({suggestedName: namefile.name});
			  try {
					const writableStreamRaw = await draftHandle.createWritable();
					writableStream.set(fileid,writableStreamRaw)
			  }
			  catch (error) { // if user rejects
					console.error(error)
					return
			  }
		}
	}
	
	if(large && force){
		for(const namefile of namefiles){
			const fileid = namefile.fileid
			const name = namefile.name
			const size = namefile.size
			receivestream.set(fileid,0)
			
			await new Promise(async (resolve)=>{
				const [url, writer] = await promptSave(name, size);
				writableStream.set(fileid,writer)
				setTimeout(()=>{
					resolve()
				},1000)
			})
			
			/*const numChunks = 10;
			const chunk = new Uint8Array(Array(20).fill(97)); // 97 (20 times) == "aaaaaaaaaaaaaaaaaaaa"
			const headers = {"Content-Length": (numChunks * chunk.length).toString()};

			
				const [url, writer] = await promptSave(name, (numChunks * chunk.length));
				console.log(url,writer)
				for (const i of [...Array(numChunks).keys()]) {
					writer.write(chunk);
					i === (numChunks - 1) ? writer.close() : await new Promise(rs => setTimeout(rs, 1000));
				}
				writer.close();
			*/

		}
	}

	const answer = {command:'answer',data:{value:true,filesid,namefiles,large,nonce,force}}
	fSendData(answer,connectId)

}

function fAcceptAnswer(connectId,data){
	if(document.querySelector('.offer.offer-'+data.filesid)){
		document.querySelector('.offer.offer-'+data.filesid).remove()
	}
	fSendFile(connectId,data)
}

function fDeclineAnswer(connectId,data){
	const filesid = data.filesid
	if(data.largelimit && !forcewarning){
		document.querySelector('.offer.offer-'+data.filesid).remove()
		let peer = peers.get(connectId)
		peer.force = true
		fOfferFile(peer,filesid,true)
	}else{
		if(document.querySelector('.offer.offer-'+data.filesid)){
			let msg = "Destination device decline"
			if(data.largelimit){
				msg = `Destination device doesn't support large transfer (${getSizeUnit(fSafe(largelimit))})`
			}
			const check = `
				<span class="check" style="padding:10px 10px;color:red;display:inline-block">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-x-fill" viewBox="0 0 16 16">
					  <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M6.854 6.146 8 7.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 8l1.147 1.146a.5.5 0 0 1-.708.708L8 8.707 6.854 9.854a.5.5 0 0 1-.708-.708L7.293 8 6.146 6.854a.5.5 0 1 1 .708-.708"/>
					</svg>
					<span class="msg">${msg}</span>
					<div class="footer" style="display:none">
						<p>Caution ! Legacy FORCE large transfer!</p>
						<button class="force" >TRY FORCE TRANSFER</button>
					</div>
				</span>`
			const el = '.offer .message .content'
			document.querySelector(el).insertAdjacentHTML("beforeend",check)
			document.querySelector(el+' .check .footer .force').addEventListener("click",()=>{
				let peer = peers.get(connectId)
				peer.force = true
				if(document.querySelector('.offer.offer-'+filesid)){
					document.querySelector('.offer.offer-'+filesid).remove()
				}
				fOfferFile(peer,filesid,true)
			})
			setTimeout(()=>{
				document.querySelector(el+' .check .footer').style.display = 'block'
				if(!data.largelimit){
					document.querySelector('.offer.offer-'+data.filesid).remove()
					if(document.querySelector(el+' .check'))document.querySelector(el+' .check').remove()
				}
			},2000)
		}
	}
}

async function fSendFile(connectId,data){
	showexplorer()
	const filesid = data.filesid
	const large = data.large
	const nonce = data.nonce
	const force = data.force
	const namefiles = data.namefiles
	const peer = peers.get(connectId)
	const publicKey = JSON.stringify(peer.jwkpublicKey)
	const key = generatekey(publicKey)
	const send = true
	const complete = 'start'
	let datafiles = files.get(filesid)
		
	for(const fileraw of datafiles){
		const file = largesupport ? await fileraw.getFile() : fileraw
		const name = file.name
		const fileid = namefiles.find((item)=>item.name == name).fileid
		const nonceid = nonce.shift()
		const time = (new Date()).getTime()
		
		setTimeout(async ()=>{
			fAddExplorerFile(peer,file,fileid,time,send,complete)
			
			if(!large){
				sendstream.set(fileid,0)
				sendpercent.set(fileid,0)
				sendtime.set(fileid,(new Date()).getTime())
				let reader = new FileReader();
				reader.onload = function() {
					let arrayBuffer = this.result
					const attribute = {connectId,metadata:{fileid,name:file.name, type: file.type,size:file.size,nonceid,large}}
					connect.Send(arrayBuffer,attribute)
				}
				reader.readAsArrayBuffer(file);	
			}
			
			if(large && !force){
				sendstream.set(fileid,0)
				sendtime.set(fileid,(new Date()).getTime())
				isbusy.set(fileid,false)
				let filestream = file.stream()
				filestream.pipeTo(new WritableStream({
					async write(chunk, controller) {
						return new Promise((resolve, reject) => {
							// now we get chunk (s)
							//console.log('chunk',chunk.byteLength)
							const chuncksize = chunk.byteLength
							const attribute = {connectId,metadata:{fileid,name:file.name, type: file.type,size:file.size,nonceid,large,chuncksize}}
							connect.Send(chunk,attribute)
							let interval = setInterval(()=>{
								if(!isbusy.get(fileid)){
									isbusy.set(fileid,true)
									clearInterval(interval)
									resolve()
								}
							},10)
						})
					},
					close() {
						//const state = {command:'state',data:{fileid,state:'finished'}}
						//fSendData(state,connectId)
					}
				})
				)
			}
			
			if(large && force){
				sendstream.set(fileid,0)
				sendtime.set(fileid,(new Date()).getTime())
				isbusy.set(fileid,false)
				  const chunkSize = 1 * 1024 * 1024; // 10 MB
				  const totalChunks = Math.ceil(file.size / chunkSize);
				  let startByte = 0;
				  for (let i = 1; i <= totalChunks; i++) {
					const endByte = Math.min(startByte + chunkSize, file.size);
					const chunk = file.slice(startByte, endByte);
					await new Promise((resolve, reject) => {
							let fr = new FileReader()
							fr.onload = function () {
								isbusy.set(fileid,true)
								
								let arrayBuffer = this.result 
								const chuncksize = arrayBuffer.byteLength
								//console.log('chuncksize',chuncksize)
								const attribute = {connectId,metadata:{fileid,name:file.name, type: file.type,size:file.size,nonceid,large,force,chuncksize,i}}
								connect.Send(chunk,attribute)
								
								let interval = setInterval(()=>{
									if(!isbusy.get(fileid)){
										
										clearInterval(interval)
										resolve()
									}
								},10)
							}
							fr.readAsArrayBuffer(chunk)
					})
					startByte = endByte;
				  }
				  //console.log('Upload complete');
			}
			
		},500)
	}
	
}

async function fStateFile(connectId,data){
	const fileid = data.fileid
	const state = data.state
	if(state === 'finished'){
		await writableStream.close()
	}
	else if (state === 'next'){
		isbusy.set(fileid,false)
	}
}

async function fReceiveFileProgress(attribute){
	const connectId = attribute.connectId
	const peer = peers.get(connectId)
	const publicKey = JSON.stringify(peer.jwkpublicKey)
	const key = generatekey(publicKey)
	const percent = attribute.percent
	const metadata = attribute.metadata
	const fileid = metadata.fileid
	const name = metadata.name
	const size = metadata.size
	const type = metadata.type
	const large = metadata.large
	const force = metadata.force
	const nonceid = metadata.nonceid
	if(!nonces.has(nonceid))return
	const noncedata = nonces.get(nonceid)
	const time = (new Date()).getTime()
	const send = false
	const complete = Math.floor(percent*100)
	const file = {name,size}
	
	if(!large){
		const cachepercent = sendpercent.get(fileid)
		if(percent == cachepercent)return
		sendpercent.set(fileid,percent)
		let currentsize =  (percent)*size
		const chuncksize = Math.floor(currentsize-sendstream.get(fileid))
		sendstream.set(fileid,currentsize)
		const bitrate = Math.floor((1/((time-sendtime.get(fileid))/1000))*(chuncksize))
		sendtime.set(fileid,time)
		const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
		if(!document.querySelector('.file.file-'+fileid)){
			if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
			showexplorer()
			fAddExplorerFile(peer,file,fileid,time,send,complete)
		}else{
			document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
			document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
		}
		
		if(percent == 1){
			//save to dbHistory
			const item = {author:key,fileid,time,name,size,send,complete}
			await dbHistory.put(fileid,item)
			
			document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
			
			//change background colour
			document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
			document.querySelector('.file.file-'+fileid).dataset.complete = complete
			fDeleteNonce(nonceid)
		}
	}
	
	if(large && !force){
		
		if(percent < 0.1){
			if(!document.querySelector('.file.file-'+fileid)){
				if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
				showexplorer()
				fAddExplorerFile(peer,file,fileid,time,send,complete)
			}
		}

		const chuncksize = metadata.chuncksize
		if(percent == 1){
			let currentsize = receivestream.get(fileid)+chuncksize
			receivestream.set(fileid,currentsize)
			const currentcomplete = (currentsize/size)*100
			const complete = Math.floor(currentcomplete)
			const bitrate = Math.floor((1/((time-sendtime.get(fileid))/1000))*(chuncksize))
			sendtime.set(fileid,time)
			const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
			
			if(!document.querySelector('.file.file-'+fileid)){
				if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
				showexplorer()
				fAddExplorerFile(peer,file,fileid,time,send,complete)
			}else{
				document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
			}			
			
			if(currentcomplete == 100){
				//save to dbHistory
				const item = {author:key,fileid,time,name,size,send,complete}
				await dbHistory.put(fileid,item)
				
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
				
				//change background colour
				document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
				document.querySelector('.file.file-'+fileid).dataset.complete = complete
				fDeleteNonce(nonceid)
				const writableStreamRaw = writableStream.get(fileid)
				await writableStreamRaw.close()
			}
		}
	}

	if(large && force){
		
		if(percent < 0.1){
			if(!document.querySelector('.file.file-'+fileid)){
				if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
				showexplorer()
				fAddExplorerFile(peer,file,fileid,time,send,complete)
			}
		}

		const chuncksize = metadata.chuncksize
		if(percent == 1){
			let currentsize = receivestream.get(fileid)+chuncksize
			receivestream.set(fileid,currentsize)
			const currentcomplete = (currentsize/size)*100
			const complete = Math.floor(currentcomplete)
			const bitrate = Math.floor((1/((time-sendtime.get(fileid))/1000))*(chuncksize))
			sendtime.set(fileid,time)
			const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
			
			if(!document.querySelector('.file.file-'+fileid)){
				if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
				showexplorer()
				fAddExplorerFile(peer,file,fileid,time,send,complete)
			}else{
				document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
			}			
			
			if(currentcomplete == 100){
				//save to dbHistory
				const item = {author:key,fileid,time,name,size,send,complete}
				await dbHistory.put(fileid,item)
				
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
				
				//change background colour
				document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
				document.querySelector('.file.file-'+fileid).dataset.complete = complete
				fDeleteNonce(nonceid)
				const writer = writableStream.get(fileid)
				await writer.close()
			}
		}
	}
	
}

async function fReceiveData(data,attribute){
	//console.log('chunk',data.byteLength)
	const connectId = attribute.connectId
	const metadata = attribute.metadata
	const name = metadata.name
	const size = metadata.size
	const type = metadata.type
	const large = metadata.large
	const force = metadata.force
	const fileid = metadata.fileid
	const nonceid = metadata.nonceid
	if(!nonces.has(nonceid))return
	const noncedata = nonces.get(nonceid)
	if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
	
	if(!large){
		  let blob1 = new Blob([new Uint8Array(data)],{type:attribute.metadata.type})

		  const aElement = document.createElement('a');
		  aElement.setAttribute('download', attribute.metadata.name);
		  const href = URL.createObjectURL(blob1);
		  aElement.setAttribute('href', href);
		  aElement.setAttribute('target', '_blank');
		  aElement.click();
		  URL.revokeObjectURL(href);
		  fDeleteNonce(nonceid)
	}
	
	if(large && !force){
		if (data.byteLength || data.size){
			const writableStreamRaw = writableStream.get(fileid)
			await writableStreamRaw.write(data)
			//const state = {command:'state',data:{fileid,state:'next'}}
			//fSendData(state,connectId)
		}
	}

	if(large && force){
		if (data.byteLength || data.size){
			const writer = writableStream.get(fileid)
			await writer.write(data)
			//const state = {command:'state',data:{fileid,state:'next'}}
			//fSendData(state,connectId)
		}
	}
	
}

function fDeleteNonce(nonceid){
	if(usednonce.includes(nonceid)){
		setTimeout(()=>{nonces.delete(nonceid)},100)
	}else{
		usednonce.push(nonceid)
	}
}

async function fSendFileProgress(attribute){
	const connectId = attribute.connectId
	const peer = peers.get(connectId)
	const publicKey = JSON.stringify(peer.jwkpublicKey)
	const key = generatekey(publicKey)
	const metadata = attribute.metadata
	const fileid = metadata.fileid
	const name = metadata.name
	const size = metadata.size
	const large = metadata.large
	const force = metadata.force
	const time = (new Date()).getTime()
	const percent = attribute.percent 
	const complete = Math.floor(percent*100)
	const send = true
	
	if(!large){
		const cachecomplete = sendpercent.get(fileid)
		if(complete == cachecomplete)return
		const lasttime = sendtime.get(fileid)
		if(time == lasttime && complete != 100)return
		sendpercent.set(fileid,complete)
		let currentsize =  Math.floor(percent*size)
		let last = sendstream.get(fileid)
		const chuncksize = currentsize-last
		sendstream.set(fileid,currentsize)
		const bitrate = Math.floor((1/((time-lasttime)/1000))*(chuncksize))
		sendtime.set(fileid,time)
		const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
		//console.log(`percent ${percent},time ${time},lasttime ${lasttime},complete ${complete},last ${last},size ${size},currentsize ${currentsize},chuncksize ${chuncksize},bitrate ${bitrate},elapsed ${elapsed}`)
		document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
		document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
		if(percent == 1){
			//save to dbHistory
			const item = {author:key,fileid,time,name,size,send,complete}
			await dbHistory.put(fileid,item)
			
			document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
			
			//change background colour
			document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
			document.querySelector('.file.file-'+fileid).dataset.complete = complete
		}
	}
	
	if(large && !force){
		const chuncksize = metadata.chuncksize
		if(percent == 1){
			isbusy.set(fileid,false)
			let currentsize = sendstream.get(fileid)+chuncksize
			sendstream.set(fileid,currentsize)
			const currentcomplete = (currentsize/size)*100
			const complete = Math.floor(currentcomplete)
			const bitrate = Math.floor((1/((time-sendtime.get(fileid))/1000))*(chuncksize))
			sendtime.set(fileid,time)
			const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
			document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
			document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
			if(currentcomplete == 100){
				//save to dbHistory
				const item = {author:key,fileid,time,name,size,send,complete}
				await dbHistory.put(fileid,item)
				
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
				
				//change background colour
				document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
				document.querySelector('.file.file-'+fileid).dataset.complete = complete
			}
		}
	}
	
	if(large && force){
		const chuncksize = metadata.chuncksize
		if(percent == 1){
			isbusy.set(fileid,false)
			let currentsize = sendstream.get(fileid)+chuncksize
			sendstream.set(fileid,currentsize)
			const currentcomplete = (currentsize/size)*100
			const complete = Math.floor(currentcomplete)
			const bitrate = Math.floor((1/((time-sendtime.get(fileid))/1000))*(chuncksize))
			sendtime.set(fileid,time)
			const elapsed = Math.floor(((size-currentsize)/bitrate)*1000)
			document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
			document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${timeLeft(elapsed)} - ${getSizeUnit(bitrate)}/s - ${getSizeUnit(currentsize)}/${getSizeUnit(size)}`
			if(currentcomplete == 100){
				//save to dbHistory
				const item = {author:key,fileid,time,name,size,send,complete}
				await dbHistory.put(fileid,item)
				
				document.querySelector('.file.file-'+fileid+' .size').innerHTML = `${getSizeUnit(size)}`
				
				//change background colour
				document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
				document.querySelector('.file.file-'+fileid).dataset.complete = complete
			}
		}
	}
	
}

function timeLeft(elapsed) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    if (elapsed < msPerMinute) {
         return Math.round(elapsed/1000) + ' s left';   
    }

    else if (elapsed < msPerHour) {
         return Math.round(elapsed/msPerMinute) + ' m left';   
    }

    else if (elapsed < msPerDay ) {
         return Math.round(elapsed/msPerHour ) + ' h left';   
    }

    else if (elapsed < msPerMonth) {
        return 'approximately ' + Math.round(elapsed/msPerDay) + ' d left';   
    }

    else if (elapsed < msPerYear) {
        return 'approximately ' + Math.round(elapsed/msPerMonth) + ' mo left';   
    }

    else {
        return 'approximately ' + Math.round(elapsed/msPerYear ) + ' y left';   
    }
}

//HISTORY files
const explorer = document.createElement("div");
explorer.innerHTML = `
	<div class="dialog explorer">
		<div id="explorerx"><span style="font-size:30px;color:#fff;">X</span></div>
		<div  class="popup">
			<div class="title">
				<div style="padding:10px 10px;">
					Files 
					<span class="options" style="float:right;cursor:pointer;">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
						  <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/>
						</svg>
					</span>
				</div>
			</div>
			<div class="scroller files" ></div>
		</div>
	</div>`

document.body.appendChild(explorer);

document.querySelector('#explorerx').addEventListener("click",()=>{
	document.querySelector('.explorer').style.display = "none"
})
document.querySelector('.peers .peer.me').addEventListener("click",()=>{
	showexplorer()
})
if(window.location.href.indexOf("localhost") == -1){
	/*document.querySelector('body').addEventListener("contextmenu",(e)=>{
		e.preventDefault()
		showexplorer()
	})*/
}

document.querySelector('.explorer .popup .title .options').addEventListener("click",()=>{
	fOpenOptions()
})

async function fOpenOptions(){
	
	const skipconfirmation = await dbMe.get('skipconfirmation')
	
	let checkboxskipconfirmation = ''
	if(skipconfirmation){
		checkboxskipconfirmation = 'checked'
	}
	
	const para = document.createElement("div");
	para.innerHTML = `
	<div class="dialog options">
		<div id="parax" style="display:block;"><span style="font-size:30px;color:#fff;">X</span></div>
		<div class="message">
			<div class="title">
				<div style="padding:10px 10px;">Settings</div>
			</div>
			<div class="content" >
				<div class="item cache">
					<span>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
					  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
					  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
					</svg>
					</span>
					<span>Clear cache </span>
				</div>
				<div class="item skipconfirmation">
					<input type="checkbox" id="skipconfirmation" name="skipconfirmation" value="skipconfirmation" ${checkboxskipconfirmation}>
					<label for="skipconfirmation"> Auto accept download</label>
				</div>
				<div class="item alias">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-laptop" viewBox="0 0 16 16">
					  <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2zM0 12.5h16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5"/>
					</svg>					
					<label for="alias">Change alias:</label>
					<input style="border:none" type="text" id="alias" name="alias" value="${me.name}">
				</div>
				<div class="item downloads" >
					<p>WIFIDrop Platforms :</p>
					<a target="_blank" href="https://wifidrop.js.org"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-browser-chrome" viewBox="0 0 16 16">   <path fill-rule="evenodd" d="M16 8a8 8 0 0 1-7.022 7.94l1.902-7.098a3 3 0 0 0 .05-1.492A3 3 0 0 0 10.237 6h5.511A8 8 0 0 1 16 8M0 8a8 8 0 0 0 7.927 8l1.426-5.321a3 3 0 0 1-.723.255 3 3 0 0 1-1.743-.147 3 3 0 0 1-1.043-.7L.633 4.876A8 8 0 0 0 0 8m5.004-.167L1.108 3.936A8.003 8.003 0 0 1 15.418 5H8.066a3 3 0 0 0-1.252.243 2.99 2.99 0 0 0-1.81 2.59M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/> </svg> Online</a></br> 
					<a target="_blank" href="https://play.google.com/store/apps/details?id=org.js.wifidrop"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-android" viewBox="0 0 16 16">   <path d="M2.76 3.061a.5.5 0 0 1 .679.2l1.283 2.352A8.9 8.9 0 0 1 8 5a8.9 8.9 0 0 1 3.278.613l1.283-2.352a.5.5 0 1 1 .878.478l-1.252 2.295C14.475 7.266 16 9.477 16 12H0c0-2.523 1.525-4.734 3.813-5.966L2.56 3.74a.5.5 0 0 1 .2-.678ZM5 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2m6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/> </svg> Android</a> </br>
					<a target="_blank" href="https://apps.microsoft.com/detail/9MVN98K4BBWC"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-windows" viewBox="0 0 16 16">   <path d="M6.555 1.375 0 2.237v5.45h6.555zM0 13.795l6.555.933V8.313H0zm7.278-5.4.026 6.378L16 16V8.395zM16 0 7.33 1.244v6.414H16z"/> </svg> Windows</a> </br>
					<a target="_blank" href="https://github.com/nuzulul/wifidrop"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-code-square" viewBox="0 0 16 16">   <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>   <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0m2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0"/> </svg> Self-hosted</a> 					
				</div>
				<div class="item about">
					<p>About :</p>
					WIFIDrop &copy; 2024 - <a href="https://narojil.my.id" target="_blank">Narojil Studio</a></br>
					Developed by <a href="https://github.com/nuzulul" target="_blank">Nuzulul Zulkarnain</a></br>
					Made in Indonesia
				</div>
			</div>
		</div>
	</div>`;
	  
	document.body.appendChild(para);
	  
	document.querySelector('.options #parax').addEventListener("click",()=>{
		para.remove(); 
	})	

	document.querySelector('.options .content .cache').addEventListener("click",async ()=>{
		await dbBio.clear()
		await dbHistory.clear()
		const nodeList = document.querySelectorAll(".explorer .files .file")
		for(const node of nodeList){
			node.remove()
		}
		const el = `
			<span class="cachecheck">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
				  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
				</svg>		
			</span>
		`
		document.querySelector('.options .content .cache span').insertAdjacentHTML("afterend",el)
		setTimeout(()=>{
			if(document.querySelector('.options .content .cache .cachecheck'))document.querySelector('.options .content .cache .cachecheck').remove()
		},3000)
	})

	document.querySelector('.options .content .skipconfirmation').addEventListener("click",async ()=>{
		const data = document.querySelector('.options .content .skipconfirmation #skipconfirmation')
		await dbMe.put('skipconfirmation',data.checked)
	})	

    var alias = document.getElementById("alias");
    alias.addEventListener("keypress", async function(event) {
      if (event.key === "Enter") {
			event.preventDefault();
			const el = `
				<span class="check">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
					  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
					</svg>		
				</span>
			`        
			document.querySelector('.options .content .alias #alias').blur()
			document.querySelector('.options .content .alias svg').insertAdjacentHTML("afterend",el)
			setTimeout(()=>{
				if(document.querySelector('.options .content .alias .check'))document.querySelector('.options .content .alias .check').remove()
			},3000)
			const name = document.querySelector('.options .content .alias #alias').value
			me.name = name
			await dbMe.put('name',name)
			fUpdateMe()
			for(const peer of peers){
				const connectId = peer[0]
				fSendMyBio(connectId)
			}
      }
    });
}



function showexplorer(){
	//document.querySelector('.sendto').remove()
	setTimeout(()=>{
		document.querySelector('.explorer').style.display = "flex"
		const scroller = document.querySelector('.scroller')
		scroller.scrollTop = scroller.scrollHeight
	},200)

}

function fAddExplorerFile(peer,file,fileid,time,send,complete){
	
	const unit = getSizeUnit(file.size)
	const note = send ? 'You sent to ':'Sent by '
	let progress = '0%'
	if(complete === 'start'){
	}
	else if(complete === 'finish'){
	}
	else{
		progress = complete+'%'
	}
	let background = ''
	if(complete === 'finish' || complete == 100){
		background = 'background:#bec4cf;'
	}
	let item = `
		<div class="file file-${fileid} connect-${peer.connectId}" data-complete="${complete}" style="${background}">
			<div class="icon"><div style="width:50px;height:50px"><img src="${fileLogo}"></div></div>
			<div class="loader"><div style="width:50px;height:50px"><div class="progress">${progress}</div></div></div>
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

if(window.location.href.indexOf("localhost") == -1){
	window.addEventListener('error', (event) => {
	  // An uncaught exception occurred. It will be logged in the console.
	  event.preventDefault();
	  
	  // Get the error properties from the error event object
	  const { message, filename, lineno, colno, error } = event;
	  
	  // Output, if desired.
	  //console.log('Captured uncaught exception:', message, filename, lineno, colno, error.stack);
	  
	});

	window.addEventListener('unhandledrejection', (event) => {
	  // code for handling the unhandled rejection
	  // the event object has two special properties:
	  
	  // [object Promise] - The JavaScript Promise that was rejected.
	  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent/promise
	  //console.log(event.promise); 
	  
	  // Error: Whoops! - A value or Object indicating why the promise was rejected, as passed to Promise.reject().
	  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent/reason
	  //console.log(event.reason); 

	  // Prevent the default handling (such as outputting the error to the console)
	  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event#preventing_default_handling
	  event.preventDefault();
	});
}

webrtcgarbagecollector()


document.getElementById("loader").style.display = "none"


////////serviceworker////////////////////////////////////////////////////////////////////////////////
if (typeof navigator.serviceWorker !== 'undefined') {
    navigator.serviceWorker.register('sw.js')
}
/////////////////////////////////////////////////////////////////////////////////////////////////////