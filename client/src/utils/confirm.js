// Pide confirmación con el diálogo propio de Nimbox (ConfirmHost) en vez de window.confirm.
// window.confirm lo dibuja el navegador con el origen de la página (ej. "localhost dice...").
// Resuelve true si el usuario acepta y false si cancela.
let listener = null;

export const setConfirmListener = (fn) => { listener = fn; };

export const askConfirm = (message, options = {}) =>
  new Promise((resolve) => {
    if (!listener) { resolve(false); return; }
    listener({ message, ...options, resolve });
  });
