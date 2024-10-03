export function setupDrop(element,callback) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    element.innerHTML = `Drop count is ${counter}`
  }
  element.addEventListener('click', () => {
	  fOpenFilePicker(callback)
  })
  
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
