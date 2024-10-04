export function setupDrop(element,callback) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    element.innerHTML = `Drop count is ${counter}`
  }
  element.addEventListener('click', () => {
	  fOpenFilePicker(callback)
  })

	let dropbox;

	dropbox = document.querySelector('body')
	dropbox.addEventListener("drag", drag, false);
	dropbox.addEventListener("dragstart", dragstart, false);
	dropbox.addEventListener("dragenter", dragenter, false);
	dropbox.addEventListener("dragover", dragover, false);
	dropbox.addEventListener("dragleave", dragleave, false);
	dropbox.addEventListener("dragend", dragend, false);
	dropbox.addEventListener("drop", drop, false);

	function drag(e) {
	  e.stopPropagation();
	  e.preventDefault();
	}

	function dragstart(e) {
	  e.stopPropagation();
	  e.preventDefault();
	}

	function dragenter(e) {
	  e.stopPropagation();
	  e.preventDefault();
	  addAnimation()
	}

	function dragover(e) {
	  e.stopPropagation();
	  e.preventDefault();
	  addAnimation()
	}  

	function dragleave(e) {
	  e.stopPropagation();
	  e.preventDefault();
	  removeAnimation()
	}

	function dragend(e) {
	  e.stopPropagation();
	  e.preventDefault();
	  removeAnimation()
	}

	function drop(e) {
	  e.stopPropagation();
	  e.preventDefault();
	  removeAnimation()
	  const dt = e.dataTransfer;
	  const files = dt.files;

	  callback(files)
	}
	
	function addAnimation(){
		document.querySelector('.frame').style.borderColor = '#646cff'
	}
	
	function removeAnimation(){
		document.querySelector('.frame').style.borderColor = '#d7d8da'
	}

}

function fOpenFilePicker(callback){
  let input = document.createElement('input');
  input.type = 'file';
  input.multiple = true
  input.onchange = _ => {
    // you can use this method to get file and perform respective operations
            let files =   Array.from(input.files);
            //console.log(files);
			callback(files)
        };
  input.click();
}
