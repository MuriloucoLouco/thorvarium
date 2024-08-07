function accepted(user) {
  return `<font color="#ffff00" size="12">O jogador <font size="12" color="#ffffff">${user.username}</font> aceitou seu desafio. Clique <a href="asfunction:jogar,${user.username}"><u>aqui</u></a> para jogar.</font>\n`
}

function refused(user) {
  return `<font color="#33ff00">O jogador <font size="12" color="#ffffff">${user.username}</font> recusou seu desafio.</font>\n`;
}

function playing(user, challenged) {
  return `<font color="#33ff00">O jogador <font size="12" color="#ffffff">${user.username}</font> est numa batalha com <font size="12" color="#ffffff">${challenged.username}</font> e no pode aceitar seu desafio.</font>\n`
}

function newbattle(user) {
  return `<font color="#ffffff" size="12">Nova batalha! ${user.username} X ${user.oponent.username}.</font>\n`;
}

function backtochat(user) {
  return `<font color="#ffffff" size="12">${user.username} voltou para a sala.</font>\n`;
}

function chat(user, text) {
  return `<font size="12" color="#ffffff">[${user.username}]</font><font color="#cccccc"> ${text}</font>\n`;
}

function recado(user, text, color) {
  return `<font color="${color}">${user.username} - ${text}</font>\n\n`
}

module.exports = {
  accepted,
  refused,
  playing,
  newbattle,
  backtochat,
  chat,
  recado
};