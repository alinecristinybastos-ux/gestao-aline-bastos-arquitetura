// Ligação entre telas: navegar e redesenhar a tela atual após alterações.
export const nav = {
  ir(rota) { location.hash = '#/' + rota; },
  recarregar() { /* definido em app.js */ },
};
