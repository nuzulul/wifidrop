import { spawn } from 'node:child_process';
import { getAvailableBrowsers, launchBrowser } from 'detect-browsers';
const browsers = await getAvailableBrowsers();

const address = 'https://wifidrop.js.org'

async function openChromiumBrowser(browser,address){
	if (process.platform === 'darwin') {
		spawn('open', ['-a',browser.browser,'--app='+address,'--new-window'], { detached: true, env: process.env });
	}else{
		spawn(browser.executable, ['--app='+address,'--new-window'], { detached: true, env: process.env });
	}
}

async function openFirefoxBrowser(browser,address){
	if (process.platform === 'darwin') {
		spawn('open', ['-a',browser.browser,'-kiosk','-new-window',address], { detached: true, env: process.env });
	}else{
		spawn(browser.executable, ['-kiosk','-new-window',address], { detached: true, env: process.env });
	}
}

async function openSafariBrowser(browser,address){
	if (process.platform === 'darwin') {
		spawn('open', ['-a',browser.browser,address], { detached: true, env: process.env });
	}
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
} else if (browsers.findIndex((item)=>item.browser == "Brave Browser") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Brave Browser");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Vivaldi") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Vivaldi");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Opera") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Opera");
	for(const browser of allbrowser){
			openChromiumBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Firefox") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Firefox");
	for(const browser of allbrowser){
			openFirefoxBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Firefox Nightly") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Firefox Nightly");
	for(const browser of allbrowser){
			openFirefoxBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Firefox Developer Edition") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Firefox Developer Edition");
	for(const browser of allbrowser){
			openFirefoxBrowser(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Safari") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Safari");
	for(const browser of allbrowser){
			openSafari(browser,address)
			break
	}	
} else if (browsers.findIndex((item)=>item.browser == "Safari Technology Preview") != -1){
	const allbrowser = browsers.filter((item)=>item.browser=="Safari Technology Preview");
	for(const browser of allbrowser){
			openSafari(browser,address)
			break
	}	
} else {
	var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
	spawn(start, address, { detached: true, env: process.env });
}
