const { get_usernames } = require('./users.js');

const messages = [];

function new_message(clientID, room, message, recipients) {
  messages.push({
    clientID, room, message, recipients
  });
}

function secure_text(text) {
  let html_encoded = text.replace(/&/g, '&amp;');
  html_encoded = html_encoded.replace(/</g, '&lt;');
  html_encoded = html_encoded.replace(/>/g, '&gt;');
  html_encoded = html_encoded.replace(/"/g, '&quot;');
  html_encoded = html_encoded.replace(/'/g, '&#039;');
  return html_encoded;
}

function parse_message(message, user, recipients) {
  let parsed_message = {error: false};

  //comandos
  if (message.substring(0, 8) == '/system/') {
    const pv = message.indexOf(':');
    const command = message.substring(8, pv);
    const parameters = message.substring(pv + 1, message.length);

    parsed_message.kind = 'command';

    if (command == 'desafio') {
      if (!parameters || !get_usernames().includes(parameters)) {
        parsed_message.error = true;
      } else {
        parsed_message.command = 'desafio';
        parsed_message.parameters = parameters;
      }
    }

    if (command == 'gamestart') {
      if (!parameters || !get_usernames().includes(parameters)) {
        parsed_message.error = true;
      } else {
        parsed_message.command = 'gamestart';
        parsed_message.parameters = parameters;
      }
    }

    if (command == 'sendmoves') {
      parsed_message.command = 'sendmoves';
      parsed_message.parameters = parameters;
    }

    if (command == 'sendchoices') {
      parsed_message.command = 'sendchoices';
      parsed_message.parameters = parameters;
    }

    if (command == 'afinou') {
      parsed_message.command = 'afinou';
    }

    if (command == 'recado') {
      parsed_message.command = 'recado';
      if (
        (parameters.substring(0, user.username.length + 25) ==
        `<font color="#0065FF">${user.username} - `     ||
        parameters.substring(0, user.username.length + 25) ==
        `<font color="#FF0000">${user.username} - `) &&
        parameters.slice(-9) == '</font>\n\n'
      ) {
        parsed_message.data = parameters.slice(25 + user.username.length, -9);
        parsed_message.data = secure_text(parsed_message.data);
        if (parameters.slice(13, 20) == '#0065FF') parsed_message.color = '#0065FF';
        if (parameters.slice(13, 20) == '#FF0000') parsed_message.color = '#FF0000';
      }
    }
  }

  //mensagens privadas
  if (message ==
    '<font color="#33ff00">O jogador <font size="12" color="#ffffff">'
    + user.username +
    '</font> recusou seu desafio.</font> \n'
  ) {
    parsed_message.kind = 'privmsg';
    parsed_message.data = 'refused';
  }
  if (message ==
    '<font color="#ffff00" size="12">O jogador <font size="12" color="#ffffff">'
    + user.username +
    '</font> aceitou seu desafio. Clique <a href="asfunction:jogar,'
    + user.username +
    '"><u>aqui</u></a> para jogar.</font> \n'
  ) {
    parsed_message.kind = 'privmsg';
    parsed_message.data = 'accepted';
  }
  if (message ==
    '<font color="#33ff00">O jogador <font size="12" color="#ffffff">'
    + user.username +
    '</font> est numa batalha com <font size="12" color="#ffffff">'
    + recipients[0].username +
    '</font> e no pode aceitar seu desafio.</font> \n'
  ) {
    parsed_message.kind = 'privmsg';
    parsed_message.data = 'playing';
  }

  //broadcasts
  if (message ==
    '<font color="#ffffff" size="12">'
    + user.username +
    ' voltou para a sala.</font>\n'
  ) {
    parsed_message.kind = 'broadcast';
    parsed_message.data = 'backtochat';
  }
  if (user.oponent && message ==
    '<font color="#ffffff" size="12">Nova batalha! '
    + user.username + ' X ' + user.oponent.username +
    '.</font>\n'
  ) {
    parsed_message.kind = 'broadcast';
    parsed_message.data = 'newbattle';
  }

  //chat
  if ( message.substring(0, 64 + user.username.length) ==
    '<font size="12" color="#ffffff">['
    + user.username +
    ']</font><font color="#cccccc"> ' &&

    message.slice(-8) == '</font>\n'
  ) {
    parsed_message.kind = 'chat';
    parsed_message.data = message.slice(64 + user.username.length, -8); 
    parsed_message.data = secure_text(parsed_message.data);
  }

  parsed_message.user = user;
  parsed_message.recipients = recipients;

  return parsed_message;
}

module.exports = { new_message, parse_message };