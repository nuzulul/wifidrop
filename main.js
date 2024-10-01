import './style.css'
import wifidropLogo from './wifidrop.svg'
import { setupDrop } from './drop.js'

document.querySelector('#app').innerHTML = `
  <div>
    <a href="/">
      <img src="${wifidropLogo}" class="logo vanilla" alt="WIFIDrop logo" /><h1 class="logo-text">WIFIDrop</h1>
    </a>
    
    <div class="frame">
      <button id="drop" type="button">Drop a file or click to select a file</button>
    </div>
  </div>
`

setupDrop(document.querySelector('#drop'))
