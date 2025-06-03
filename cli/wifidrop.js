#!/usr/bin/env node

import { spawn } from 'node:child_process';
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
const chromiumPath = getAppDataDir('chromium')
const chromiumRevision = path.join(chromiumPath, 'revision')
const address = 'https://wifidrop.js.org'
const userdata = getAppDataDir('wifidrop')

async function openChromiumBrowser(browser,address){
	if (process.platform === 'darwin') {
		spawn('open', ['-a',browser.browser,'--app='+address,'--new-window','--user-data-dir='+path.join(userdata,browser.browser)], { detached: true, env: process.env });
	}else{
		spawn(browser.executable, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,browser.browser)], { detached: true, env: process.env });
	}
}

function getAppDataDir(appName) {
  let appDataDir;
  if (process.platform === 'win32') {
    appDataDir = (process.env.APPDATA && path.join(process.env.APPDATA, 'Narojil Studio')) || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Narojil Studio')) || path.join(os.homedir(), 'AppData', 'Roaming', 'Narojil Studio');
  } else if (process.platform === 'darwin') {
    appDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Narojil Studio');
  } else {
    appDataDir = (process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, 'Narojil Studio')) || path.join(os.homedir(), '.local', 'share', 'Narojil Studio');
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
	
	let writer = createWriteStream(zipPath)
	const data = await fetchWithProgress(url)
	const blob = new Blob([data]);
	const stream = blob.stream();	
	await pipeline(Readable.fromWeb(stream),writer)
	
	const zip = new admzip.default(zipPath);
	zip.extractAllTo(/*target path*/ folderPath, /*overwrite*/ true);
	await unlink(zipPath)
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
	
	let revision = '1468493'
	
	if(fs.existsSync(chromiumRevision)){
		revision = await readFile(chromiumRevision)
	}else{
		revision = await getLastChange()
		const data = new Uint8Array(Buffer.from(revision));
		await writeFile(chromiumRevision, data);		
	}

	const chromium = await download({revision})
	
	let env = process.env;
	env.GOOGLE_API_KEY = "no"
	env.GOOGLE_DEFAULT_CLIENT_ID = "no"
	env.GOOGLE_DEFAULT_CLIENT_SECRET = "no"
	
	if (process.platform === 'darwin') {
		spawn('open', [chromium,'--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Latest')], { detached: true, env});
	}else{
		spawn(chromium, ['--app='+address,'--new-window','--user-data-dir='+path.join(userdata,'Chromium Latest')], { detached: true, env });
	}	
	
}

console.log('WIFIDrop starting ...')

process.exit()
