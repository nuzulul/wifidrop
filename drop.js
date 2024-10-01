export function setupDrop(element) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    element.innerHTML = `Drop count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  //setCounter(0)
}
