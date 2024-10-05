import './style.css'
import wifidropLogo from './icon-512.png'
import fileLogo from './file.svg'
import { setupDrop } from './drop.js'
import {KVStorage} from 'kv-storage'
import {generateName,waitForElm,base32,base32hex,getSizeUnit} from './utils.js'
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
  </div>
`

const dropCallback = (data)=>{
	//console.log(data);
	const filesid = myid+new Date().getTime().toString() + Math.floor(Math.random() * 1000000)
	files.set(filesid,data)
	setTimeout(()=>{
		fOpenPeers(filesid)
	},500)
}

setupDrop(document.querySelector('#drop'),dropCallback)


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
		await dbMe.put('color',randomColor)
		me.color = randomColor
		const skipconfirmation = false
		await dbMe.put('skipconfirmation',skipconfirmation)
		const key = base32hex.encode(strpublicKey)
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
		const key = base32hex.encode(strpublicKey)
		me.key = key
	}
	
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


	connect = webconnect({
		appName:"WIFIDrop",
		channelName:"WIFIDropRoom",
		connectPassword:me.address+me.priority,
		iceConfiguration:{config:{iceServers:ice}}
	})
	connect.getMyId((attribute) => myid = attribute.connectId)
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
	for(const key of fileHistory.keys){
		const item = await dbHistory.get(key)
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
	const avatar = fGenerateAvatar(me.id,me.color)
	document.querySelector('.peer.me .device-name').innerHTML = ''+me.name
	document.querySelector('.peer.me .device').innerHTML = `
		<img class="device-avatar" src="${avatar}">
	`
}






function fSendMyBio(connectId){
	const mybio = {command:'announce',data:{name:me.name,color:me.color}}
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
	await dbBio.put(key,peer)
	
	//add to ui
	const avatar = fGenerateAvatar(peer.id,peer.color)
	const el = `
		<div class="peer peer-${connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name">${fSafe(peer.name)}</div>
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

function fDialogClipboard(connectId){
		
		const para = document.createElement("div");
		para.innerHTML = `
			<div class="dialog clipboard">
				<div id="parax" style="display:block;"><span style="font-size:30px;color:#fff;">X</span></div>
				<div class="message">
					<div class="title"><div style="padding:10px 10px;">title</div></div>
					<div class="content" >
						<textarea id="clipboard" name="clipboard" rows="10" cols="50"></textarea>
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
		document.querySelector('.clipboard .message .title div').innerText = `${peer.name}'s clipboard`
		document.querySelector('.clipboard .message .content #clipboard').value = clipboard.has(connectId)?clipboard.get(connectId):''
		
		document.querySelector('.clipboard .message .footer .save').addEventListener("click",()=>{
			const clip = document.querySelector('.clipboard .message .content #clipboard').value
			const json = {command:'clipboard',data:{clip}}
			fSendData(json,connectId)
			para.remove();
		})
		document.querySelector('.clipboard .message .footer .copy').addEventListener("click",()=>{
				const clip = document.querySelector('.clipboard .message .content #clipboard').value
				navigator.clipboard.writeText(clip).then(() => {
				  //console.log('Content copied to clipboard');
				  /* Resolved - text copied to clipboard successfully */
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

function fOpenPeers(filesid){
	
	let datafiles = files.get(filesid)
	
	const length = datafiles.length
	let size = 0
	for(const file of datafiles){
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
	const avatar = fGenerateAvatar(peer.id,peer.color)
	const el = `
		<div class="peer peer-${peer.connectId}" data-peer="${peer.connectId}">
			<div class="device"><img class="device-avatar" src="${avatar}"></div>
			<div class="device-name">${fSafe(peer.name)}</div>
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

function fOfferFile(peer,filesid){

	let datafiles = files.get(filesid)
	
	const length = datafiles.length
	let size = 0
	for(const file of datafiles){
		size += file.size
	}
	
	document.querySelector('.sendto').remove()
	
	const para = document.createElement("div");
	para.innerHTML = `<div class="dialog offer offer-${filesid}"><div id="parax" style="display:block;"><span style="font-size:30px;color:#fff;">X</span></div><div class="message"><div class="title"><div style="padding:10px 10px;">Waiting confirmation</div></div><div class="content" >You want to send  ${fSafe(length)} file(s) of ${getSizeUnit(fSafe(size))} to ${fSafe(peer.name)} ...</div></div></div>`;
	  
	document.body.appendChild(para);
	  
	document.querySelector('.offer.offer-'+filesid+' #parax').addEventListener("click",()=>{
		para.remove(); 
	})

	let namefiles = []
	for(const file of datafiles){
		const name = file.name
		const size = file.size
		const type = file.type
		const item = {name,size,type}
		namefiles.push(item)
	}
	
	const offer = {command:'offer',data:{length,size,filesid,namefiles}}
	 fSendData(offer,peer.connectId)

}

async function fAnswerFile(connectId,data){
	if(peers.has(connectId)){
		
		const peer = peers.get(connectId)
		
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
					<div class="title"><div style="padding:10px 10px;">${peer.name}</div></div>
					<div class="content" >
						<div>is sending you ${fSafe(data.length)} file(s) of ${getSizeUnit(fSafe(data.size))}</div>
						<div style="height:100px;overflow:scroll;">${list}</div>
					</div>
					<div class="footer">
						<button class="decline">DECLINE</button>
						<button class="accept">ACCEPT></button>
					</div>
				</div>
		</div>`;
		  
		document.body.appendChild(para);
		  
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

function fSendAccept(data,connectId){
	
	let nonce = []
	
	for(const namefile of data.namefiles){
		const time = (new Date()).getTime()
		let nonceid = btoa(namefile.name+namefile.size+namefile.size.toString()+time.toString()+ Math.floor(Math.random() * 1000000))
		nonce.push(nonceid)
		const noncedata = {nonceid,connectId,...namefile}
		nonces.set(nonceid,noncedata)
	}
	
	const filesid = data.filesid
	const answer = {command:'answer',data:{value:true,filesid,nonce}}
	fSendData(answer,connectId)
}

function fAcceptAnswer(connectId,data){
	if(document.querySelector('.offer.offer-'+data.filesid))document.querySelector('.offer.offer-'+data.filesid).remove()
	fSendFile(connectId,data)
}

function fDeclineAnswer(connectId,data){
	if(document.querySelector('.offer.offer-'+data.filesid))document.querySelector('.offer.offer-'+data.filesid).remove()
}

async function fSendFile(connectId,data){
	showexplorer()
	const filesid = data.filesid
	const nonce = data.nonce
	const peer = peers.get(connectId)
	const publicKey = JSON.stringify(peer.jwkpublicKey)
	const key = base32hex.encode(publicKey)
	const send = true
	const complete = 'start'
	let datafiles = files.get(filesid)
	for(const file of datafiles){
		const time = (new Date()).getTime()
		const fileid = file.size.toString()+time.toString()+ Math.floor(Math.random() * 1000000)
		const nonceid = nonce.shift()
		
		setTimeout(()=>{
			fAddExplorerFile(peer,file,fileid,time,send,complete)
			let reader = new FileReader();
			reader.onload = function() {
				let arrayBuffer = this.result
				const attribute = {connectId,metadata:{fileid,name:file.name, type: file.type,size:file.size,nonceid}}
				connect.Send(arrayBuffer,attribute)
			}
			reader.readAsArrayBuffer(file);	
		},500)
		
	
	}
}

async function fReceiveFileProgress(attribute){
	const connectId = attribute.connectId
	const peer = peers.get(connectId)
	const publicKey = JSON.stringify(peer.jwkpublicKey)
	const key = base32hex.encode(publicKey)
	const percent = attribute.percent
	const metadata = attribute.metadata
	const fileid = metadata.fileid
	const name = metadata.name
	const size = metadata.size
	const type = metadata.type
	const nonceid = metadata.nonceid
	if(!nonces.has(nonceid))return
	const noncedata = nonces.get(nonceid)
	const time = (new Date()).getTime()
	const send = false
	const complete = Math.floor(percent*100)
	const file = {name,size}
	if(!document.querySelector('.file.file-'+fileid)){
		if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
		showexplorer()
		fAddExplorerFile(peer,file,fileid,time,send,complete)
	}else{
		document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'
	}
	
	if(percent == 1){
		//save to dbHistory
		const item = {author:key,fileid,time,name,size,send,complete}
		await dbHistory.put(fileid,item)
		//change background colour
		document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
		fDeleteNonce(nonceid)
	}
	
}

function fReceiveData(data,attribute){
	const connectId = attribute.connectId
	const metadata = attribute.metadata
	const name = metadata.name
	const size = metadata.size
	const type = metadata.type
	const nonceid = metadata.nonceid
	if(!nonces.has(nonceid))return
	const noncedata = nonces.get(nonceid)
	if(connectId != noncedata.connectId || name != noncedata.name || size != noncedata.size || type != noncedata.type)return
	
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
	const key = base32hex.encode(publicKey)
	const metadata = attribute.metadata
	const fileid = metadata.fileid
	const name = metadata.name
	const size = metadata.size
	const time = (new Date()).getTime()
	const percent = attribute.percent 
	const complete = Math.floor(percent*100)
	const send = true
	document.querySelector('.file.file-'+fileid+' .progress').innerHTML = complete+'%'

	if(percent == 1){
		//save to dbHistory
		const item = {author:key,fileid,time,name,size,send,complete}
		await dbHistory.put(fileid,item)
		
		//change background colour
		document.querySelector('.file.file-'+fileid).style.backgroundColor = '#9a9fa6'
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
	document.querySelector('body').addEventListener("contextmenu",(e)=>{
		e.preventDefault()
		showexplorer()
	})
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
				<div style="padding:10px 10px;">Info</div>
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
					<label for="skipconfirmation"> Skip download confirmation</label>
				</div>
				<div class="item alias">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-laptop" viewBox="0 0 16 16">
					  <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2zM0 12.5h16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5"/>
					</svg>					
					<label for="alias">Alias:</label>
					<input style="border:none" type="text" id="alias" name="alias" value="${me.name}">
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
		<div class="file file-${fileid}" style="${background}">
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


document.getElementById("loader").style.display = "none"


////////serviceworker////////////////////////////////////////////////////////////////////////////////
if (typeof navigator.serviceWorker !== 'undefined') {
    navigator.serviceWorker.register('sw.js')
}
/////////////////////////////////////////////////////////////////////////////////////////////////////