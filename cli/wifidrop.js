#!/usr/bin/env node

import { spawn,spawnSync,exec } from 'node:child_process';
import { getAvailableBrowsers, launchBrowser } from 'detect-browsers';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { format, promisify } from 'node:util'
import { createWriteStream } from "fs";
import { Readable } from "stream";
import * as admzip from 'adm-zip'
import stream from 'stream'
import { readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const pipeline = promisify(stream.pipeline);
const unlink = promisify(fs.unlink)
const mkdir = promisify(fs.mkdir)
const stat = promisify(fs.stat)
const browsers = await getAvailableBrowsers();
let chromiumPath = getAppDataDir('chromium')
let chromiumRevision = path.join(chromiumPath, 'revision')
const address = 'https://wifidrop.js.org'
const userdata = getAppDataDir('wifidrop')
const args = process.argv.slice(2);
const listrequiredpackage = ['ca-certificates','fonts-liberation','libappindicator3-1','libasound2t64','libatk-bridge2.0-0','libatk1.0-0','libc6','libcairo2','libcups2','libdbus-1-3','libexpat1','libfontconfig1','libgbm1','libgcc1','libglib2.0-0','libgtk-3-0','libnspr4','libnss3','libpango-1.0-0','libpangocairo-1.0-0','libstdc++6','libx11-6','libx11-xcb1','libxcb1','libxcomposite1','libxcursor1','libxdamage1','libxext6','libxfixes3','libxi6','libxrandr2','libxrender1','libxss1','libxtst6','lsb-release','wget','xdg-utils']

if (process.platform === 'linux' && process.env.SNAP_NAME === 'wifidrop'){
	chromiumPath = process.env.SNAP_REAL_HOME+'/Public/narojilstudio/chromium'
	chromiumRevision = path.join(chromiumPath, 'revision')
	
	if (process.getuid() === 0){
		console.error('ok')
		const exe = promisify(exec)
		const file = ''
		
		const tmp = '/var/tmp/narojilstudio'
		
		if(fs.existsSync(tmp+'/chromium')){
			
			const file = await readFile(tmp+'/chromium');
			const sandbox = file+'_sandbox'
			const chown = await exe('chown root:root '+sandbox)
			const chmod = await exe('chmod 4755 '+sandbox)			
		}	
		process.exit()
	}		
	
}

async function openChromiumBrowser(browser,address){
	if (process.platform === 'darwin') {
		spawn('open', ['-a',browser.browser,'--app='+address,'--new-window','--user-data-dir='+path.join(userdata,browser.browser)], { detached: true, env: process.env });
	}else{
		spawn(browser.executable, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,browser.browser)], { detached: true, env: process.env });
	}
}

function getAppDataDir(appName) {
  let appDataDir;
  const publisher = 'naroilstudio';
  if (process.platform === 'win32') {
    appDataDir = (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, publisher)) || path.join(os.homedir(), 'AppData', 'Local', publisher) ;
  } else if (process.platform === 'darwin') {
    appDataDir = path.join(os.homedir(), 'Library', 'Caches', publisher);
  } else if (process.platform === 'linux'){
    appDataDir = (process.env.XDG_CACHE_HOME && path.join(process.env.XDG_CACHE_HOME, publisher)) || path.join(os.homedir(), '.cache', publisher);
  }

  return path.join(appDataDir, appName);
}

const revisionChange = 591479

const cacheRoot = `${os.homedir()}/.chromium-cache`

const archiveName = (platform, revision) => {
  if (platform === 'linux') return 'chrome-linux'
  if (platform === 'mac') return 'chrome-mac'
  if (platform === 'win32' || platform === 'win64') {
    return revision > revisionChange ? 'chrome-win' : 'chrome-win32'
  }
  return null
}

const getFolderPath = (root, platform, revision) => `${root}/chromium-${platform}-${revision}`

const getExecutablePath = (root, platform, revision) => {
  const folder = getFolderPath(root, platform, revision)
  const archiveFolder = archiveName(platform, revision)

  if (platform === 'mac') {
    return `${folder}/${archiveFolder}/Chromium.app/Contents/MacOS/Chromium`
  }
  if (platform === 'linux') {
    return `${folder}/${archiveFolder}/chrome`
  }

  return `${folder}/${archiveFolder}/chrome.exe`
}

const currentPlatform = (p => {
  if (p === 'darwin') return 'mac'
  if (p === 'linux') return 'linux'
  if (p === 'win32') return os.arch() === 'x64' ? 'win64' : 'win32'
  return ''
})(os.platform())

const downloadURLs = {
  linux:
    'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/%d/%s.zip',
  mac:
    'https://storage.googleapis.com/chromium-browser-snapshots/Mac/%d/%s.zip',
  win32:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win/%d/%s.zip',
  win64:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/%d/%s.zip'
}

const downloadURL = (platform, revision) => {
  return format(
    downloadURLs[platform],
    revision,
    archiveName(platform, revision)
  )
}

function getLastChangeURL() {
        let url = 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/';

        const platform = process.platform;

        if (platform === 'linux') {
            url += 'Linux';
            if (process.arch === 'x64') {
                url += '_x64';
            }
        } else if (platform === 'win32') {
            url += 'Win';
            if (process.arch === 'x64') {
                url += '_x64';
            }
        } else if (platform === 'darwin') {
            url += 'Mac';
        } else {
            throw new Error('Unsupported platform');
        }

        return url+'%2FLAST_CHANGE?alt=media';
}

async function getLastChange(){
	const resp = await fetch(getLastChangeURL());
	if (resp.ok && resp.body) {
	  let revision = await resp.text()
	  return revision
	}else{
	  return 591479
	}		
}

class ProgressBar {
	constructor() {
		this.total;
		this.current;
		this.bar_length = process.stdout.columns - 30;
	}

	init(total) {
		this.total = total;
		this.current = 0;
		this.update(this.current);
	}

	update(current) {
		this.current = current;
		const current_progress = this.current / this.total;
		this.draw(current_progress);
	}

	draw(current_progress) {
		const filled_bar_length = (current_progress * this.bar_length).toFixed(
			0
		);
		const empty_bar_length = this.bar_length - filled_bar_length;

		const filled_bar = this.get_bar(filled_bar_length, "#");
		const empty_bar = this.get_bar(empty_bar_length, "-");
		const percentage_progress = (current_progress * 100).toFixed(2);

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(
			`Current progress: [${filled_bar}${empty_bar}] | ${percentage_progress}%`
		);
	}

	get_bar(length, char, color = a => a) {
		let str = "";
		for (let i = 0; i < length; i++) {
			str += char;
		}
		return color(str);
	}
};

async function fetchWithProgress(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const Bar = new ProgressBar();

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;
  let received = 0;
  let chunks = [];
  
  Bar.init(total);

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    chunks.push(value);
    received += value.length;
	
	Bar.update(received);
  }
  const allChunks = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
  }
  return allChunks;
}

function popup(msg){
  
  if (process.platform === 'win32') {

		exec('powershell (New-Object -ComObject Wscript.Shell).Popup("""'+msg+'""",1800,"""WIFIDrop""",0x40)'); 
    
  } else if (process.platform === 'darwin') {
	  
	   const type = 1;
       let script = 'tell app \"System Events\" to display dialog ';
       script += '\"' + msg + '\" with title \"WIFIDrop" buttons \"OK\"';
       script += ' with icon ' + type;	
	   const osascript = spawn('osascript', ['-e',script], { detached: true });
	   osascript.on('error', (err) => {console.log('osascript not found');});	  
    
  } else if (process.platform === 'linux'){
	  
	   const xmessage = spawn('xmessage', ['-center',msg,'-timeout',1800], { detached: true });
	   xmessage.on('error', (err) => {console.log('xmessage not found');});
	   const kdialog = spawn('kdialog', ['--title',msg,1800], { detached: true });
	   kdialog.on('error', (err) => {console.log('kdialog not found');});
	   const zenity = spawn('zenity', ['--info','--text="'+msg+'"','--title="WIFIDrop"',1800], { detached: true });
	   zenity.on('error', (err) => {console.log('zenity not found');});
	   const gxmessage = spawn('gxmessage', [msg], { detached: true });
	   gxmessage.on('error', (err) => {console.log('gxmessage not found');});
	   
  }
}

function getDistro() {
  const platform = os.platform();
  if (platform !== 'linux') {
    return 'Not a Linux system';
  }

  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf-8');
    const lines = osRelease.split('\n');
    let id = '';
    for (const line of lines) {
      if (line.startsWith('ID=')) {
        id = line.substring(3).replace(/"/g, '');
        break;
      }
    }
    if (id === 'ubuntu') {
      return 'Ubuntu';
    } else if (id === 'rhel' || id === 'centos' || id === 'fedora') {
      return 'Red Hat based';
    } else {
      return 'Other Linux';
    }

  } catch (error) {
      return 'Could not determine distro';
  }
}

function isPackageInstalled(packageName) {
 return new Promise((resolve) => {
   const distro = getDistro();
   console.log('distro',distro)
   if(distro === 'Ubuntu'){
	   const dpkg = spawn('dpkg', ['-s', packageName]);
	   dpkg.on('close', (code) => {
		 resolve(code === 0);
	   });
   }else{
	   const rpm = spawn('rpm', ['-q', packageName]);
	   rpm.on('close', (code) => {
		 resolve(code === 0);
	   });			   
   }
 });
}

const download = async ({
  platform: platform = currentPlatform,
  revision: revision = '591479',
  installPath: installPath = chromiumPath
} = {}) =>{
	const moduleExecutablePath = getExecutablePath(
	installPath,
	platform,
	revision
	)

	try {
		await stat(moduleExecutablePath)
		return moduleExecutablePath
	} catch (_) {}  
	
	if (process.platform === 'linux' && process.env.SNAP_NAME !== 'wifidrop'){
		
		
		console.log('check pre-requisites');
		
		const distro = getDistro()
		
		if(distro == 'Ubuntu'){
			
			if(args.length > 0 && args[0] === '--install-dependencies-force'){
		
				const apt = ['apt-get','install','-y'];
				const install = apt.concat(listrequiredpackage);
				spawnSync('sudo',install,{stdio: 'inherit'});
				process.exit()
				
			}else{			
		
				const exe = promisify(exec)

				let noninstalled = []
				let datainstall = await exe('apt list --installed')
				for(const item of listrequiredpackage){
					if(!datainstall.stdout.includes(item+'/')){
						noninstalled.push(item)
					}
				}
				//console.log('noninstalled',noninstalled)
				const com = []
				for(const item of noninstalled){
					const input = exe('apt-cache search '+item)
					com.push(input)
				}
				const datasearch = await Promise.all(com)	
				for(let i=0;i<datasearch.length;i++){
					let pkg = noninstalled[i]
					const out = datasearch[i]
					if(out.stdout !== ''){
						const arr = out.stdout.split('\n')
						const filt = arr.filter((x)=>x.includes(pkg) && !x.includes('-dev'))
						if(filt.length>0){
							const str = filt[0].split(' - ');
							const found = str[0];
							noninstalled[i] = found;
						}else{
							const str = arr[0].split(' - ');
							const found = str[0];
							noninstalled[i] = found;
						}
					}
				}
				//console.log('noninstalled',noninstalled)
				let finalnoninstalled = []
				for(const item of noninstalled){
					if(!datainstall.stdout.includes(item+'/')){
						finalnoninstalled.push(item)
					}
				}
				//console.log('finalnoninstalled',finalnoninstalled)
				
				if(finalnoninstalled.length > 0){
					if (process.getuid() === 0){
						const apt = ['install','-y'];
						const install = apt.concat(finalnoninstalled);
						spawnSync('apt-get',install,{stdio: 'inherit'});
						process.exit()
					}else{
						console.error('need to install the must-have pre-requisites',JSON.stringify(finalnoninstalled));
						console.error('you should have sudo privilege to run this script');
						console.error('in terminal : [ sudo npx wifidrop ] or [wifidrop --install-dependencies-force]');
						if(args.length > 0 && args[0] === '-desktop'){popup('Need to install the must-have pre-requisites, you should have sudo privilege to run this script, in terminal : [ sudo npx wifidrop ] or [wifidrop --install-dependencies-force] ')}
						process.exit()
					}
				}					
			}
		} else if(distro == 'Red Hat based'){
				console.error('need to install the must-have pre-requisites',JSON.stringify(listrequiredpackage));
				const apt = ['yum','install'];
				const install = apt.concat(listrequiredpackage);
				spawnSync('sudo',install,{stdio: 'inherit'});
							
		}else{
			console.error('need to install the must-have pre-requisites',JSON.stringify(listrequiredpackage));
		}
		
		if (process.getuid() === 0){
			console.error('ok')
			process.exit()
		}
	}

	let url = downloadURL(platform, revision)

	const folderPath = getFolderPath(chromiumPath, platform, revision)	
	try {
		await mkdir(folderPath, { recursive: true })
	} catch (_) {}	
	const zipPath = `${folderPath}.zip`
	
	if(fs.existsSync(zipPath)){
		await unlink(zipPath)
	}
	
	const fileName = url.split("/").pop();
	console.log("No compatible browser detected, downloading chromimum ...");
	console.log("Source :", url);
	
	if(args.length > 0 && args[0] === '-desktop'){popup('Loading ... please wait WIFIDrop will be auto launched after preparing the components ...')}
	
	let writer = createWriteStream(zipPath)
	const data = await fetchWithProgress(url)
	const blob = new Blob([data]);
	const stream = blob.stream();	
	await pipeline(Readable.fromWeb(stream),writer)
	
	const zip = new admzip.default(zipPath);
	zip.extractAllTo(/*target path*/ folderPath, /*overwrite*/ true);
	await unlink(zipPath)
	if (process.platform === 'linux'){
		try {
		  fs.chmodSync(moduleExecutablePath, 0o777);	  
		  console.log('Permissions changed successfully (sync).');
		} catch (err) {
			console.error('Error changing permissions (sync):', err);
		}
	}
	return moduleExecutablePath
}

if (browsers.findIndex((item)=>item.browser == "Microsoft Edge") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Microsoft Edge");
	for(const browser of allbrowser){
			if (!browser.executable.endsWith('MicrosoftEdge.exe')){
				openChromiumBrowser(browser,address)
				break
			}
	}
} else if (browsers.findIndex((item)=>item.browser == "Google Chrome") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Google Chrome");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Google Chrome Canary") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Google Chrome Canary");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Chromium") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Chromium");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else {
	
	//spawnSync('rm',['-r',chromiumPath],{stdio: 'inherit'});
	//process.exit()
	
	let revision = '1468493'; //windows 06-2025
	
	if(fs.existsSync(chromiumRevision)){
		
		revision = await readFile(chromiumRevision);
		
	}else{
		
		//static revision
		if(process.platform === 'linux'){
			revision = '1469089'; //linux 06-2025
		}else if(process.platform === 'darwin'){
			revision = '1469109'; //mac 06-2025
		}else if(process.platform === 'win32'){
			revision = '1468493'; //windows 06-2025
		}
		
		//dynamic revision get latest
		//revision = await getLastChange()
		
		const data = new Uint8Array(Buffer.from(revision));
		try {
			await mkdir(chromiumPath, { recursive: true });
			await writeFile(chromiumRevision, data);
		} catch (_) {}				
	}

	const chromium = await download({revision})
	
	let env = process.env;
	env.GOOGLE_API_KEY = "no"
	env.GOOGLE_DEFAULT_CLIENT_ID = "no"
	env.GOOGLE_DEFAULT_CLIENT_SECRET = "no"
	
	if (process.platform === 'darwin') {
		spawn('open', [chromium,'--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled')], { detached: true, env});
	}else if (process.platform === 'linux'){
		if (process.env.SNAP_NAME === 'wifidrop'){
			
				console.log('Running WIFIDrop in snap container.')
			
				const sandbox = chromium+'_sandbox'
				//console.log('sandbox',sandbox)
				
				const tmp = '/var/tmp/narojilstudio'
				const data = new Uint8Array(Buffer.from(chromium));
				try {
					await mkdir(tmp, { recursive: true });
					await writeFile(tmp+'/chromium', data);
				} catch (_) {}					
				
				const owner = await stat(sandbox)
				
				const uid = owner.uid
				
				const gid = owner.gid
				
				const exe = promisify(exec)
				
				const cmhod = await exe("stat -c \"%a %n\" "+sandbox)
				
				const octal = cmhod.stdout.split(' ')[0]
				
				env.CHROME_DEVEL_SANDBOX = sandbox
				
				//production
				if(uid == 0 && gid == 0  && octal === '4755'){
					const msg = 'Snap containers running with sandbox enabled.';
					//console.log(msg);					
					spawn(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled')], { detached: true, env });
				}else{
					const msg = 'Snap containers running with sandbox disabled by default ( enable it with sudo privileges to increas security ).';
					//console.log(msg);
					spawn(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled'),'--no-sandbox','--test-type'], { detached: true, env });
					//if(args.length > 0 && args[0] === '-desktop'){popup(msg)}
				}
				
				//debug
				//spawnSync(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled')], {stdio: 'inherit', detached: true, env });
			
				//debug nosandbox
				//spawnSync(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled'),'--no-sandbox'], {stdio: 'inherit', detached: true, env });
			
		}else{
			const distro = getDistro()
			if(distro !== 'Ubuntu' && distro !== 'Red Hat based'){
				console.error('pre-requisites',JSON.stringify(listrequiredpackage));
			}
			spawn(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled')], { detached: true, env });
		}
	}else if (process.platform === 'win32'){
		spawn(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Bundled')], { detached: true, env });
		
	}else{
		console.log(`Platform ${process.platform} not supported.`)
	}
	
}

console.log('WIFIDrop https://wifidrop.js.org')

//process.exit()
