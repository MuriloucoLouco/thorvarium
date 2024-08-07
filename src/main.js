const net = require('net');
const builder = require('xmlbuilder');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');

const {
  decode_hex,
  encode_text,
  filter,
  cn
} = require('./tools.js');
const {
  new_user,
  set_room,
  get_user,
  get_room_users,
  get_socket_user,
  remove_user,
  get_username_user
} = require('./users.js');
const {
  new_message,
  parse_message
} = require('./chat.js');
const responses = require('./responses.js');
const { deprecate } = require('util');

const src_dir = path.dirname(require.main.filename); // ./src
const parser = new xml2js.Parser();

const PORT = process.env.PORT || 9000;
const DEBUG_MODE = process.env.DEBUG_MODE || false;

function policy_file() {
  try {
    const data = fs.readFileSync(path.join(src_dir, '../static/policy.xml'), 'utf8');
    return data;
  } catch (err) {
    console.error(err);
  }
}

function error(msgID) {
  console.log('\x1b[31mERRO!\x1b[0m');
  const root = builder.create('Exception', {headless: true});
  root.att('reason', 'Erro na requisição.');
  root.att('reasonID', 'server_error');
  if (msgID) {
    root.att('msgID', msgID);
  } else {
    root.att('msgID', 0);
  }
  
  return root.end();
}

function disconnect(user) {
  const room_users = get_room_users(user.roomID);
  for (const room_user of room_users) {
    const broadcast = builder.create(
      'Room.ParticipantExited', {headless: true}
    );
    broadcast.att('roomID', user.roomID);
    broadcast.att('username', user.username);
    broadcast.att('groupID', user.groupID);
    broadcast.att('seatID', user.seatID);

    room_user.socket.write(broadcast.end() + '\0');
  }
  remove_user(user.clientID);
}

function login_failed(reason, msgID) {
  const root = builder.create('Rejected', {headless: true});
  root.att('msgID', msgID);

  if (reason == 'username') {
    root.att('reason', 'Nome de usuário já utilizado.');
  }

  if (reason == 'server_full') {
    root.att('reason', 'Servidor cheio.');
  }

  if (reason == 'characters') {
    root.att('reason', 'Caracteres invalidos. Caracteres permitidos: 0-9, a-z, A-Z, ., -, _ e acentos.');
  }

  if (reason == 'size') {
    root.att('reason', 'Username muito grande.');
  }

  root.att('reasonID', reason);
  return root.end();
}

function login(xml, socket) {
  const username = decode_hex(xml['System.Login'][0]['Username'][0]['_']);
  const msgID = xml['System.Login'][0]['$']['msgID'];

  if (!msgID) {
    return error();
  }
  if (!username) {
    return error(msgID);
  }

  if (get_socket_user(socket)) {
    disconnect(get_socket_user(socket));
  }

  if (username.match('[^0-9a-zA-ZÀ-ú_.-]+')) {
    return login_failed('characters', msgID);
  }

  if (username.length > 32) {
    return login_failed('size', msgID);
  }

  if (get_username_user(username)) {
    return login_failed('username', msgID);
  }

  const clientID = new_user(username, socket);

  if (!get_user(clientID)) {
    return login_failed('server_full', msgID);
  }

  console.log(`Usuário logado: \x1b[35m${username}:${clientID}\x1b[0m`);

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.ele('Ticket').txt(clientID);
  return root.end();
}

function logout(xml, socket) {
  const msgID = xml['System.Logout'][0]['$']['msgID'];
  const clientID = xml['System.Logout'][0]['$']['clientID'];
  const user = get_user(clientID);

  if (!msgID) {
    return error();
  }
  if (!clientID || user.socket != socket) {
    return error(msgID);
  }

  console.log(`Usuário deslogado: ${cn(user)}`);
  remove_user(user.clientID);

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  
  return root.end();
}

function room_enter(xml, socket) {
  const msgID = xml['Room.Enter'][0]['$']['msgID'];
  const roomID = xml['Room.Enter'][0]['$']['roomID'];
  const clientID = xml['Room.Enter'][0]['$']['clientID'];

  const user = get_user(clientID);

  if (!msgID) {
    return error();
  }
  if (!roomID || !clientID || user.socket != socket) {
    return error(msgID);
  }

  set_room(clientID, roomID);
  const room_users = get_room_users(roomID);
  console.log(`Usuário ${cn(user)} entrou na sala ${roomID}`);
  
  for (const room_user of room_users) {
    const broadcast = builder.create(
      'Room.ParticipantEntered', {headless: true}
    );
    broadcast.att('roomID', user.roomID);
    broadcast.att('username', user.username);
    broadcast.att('groupID', user.groupID);
    broadcast.att('seatID', user.seatID);

    room_user.socket.write(broadcast.end() + '\0');
  }

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.att('groupID', user.groupID);
  root.att('seatID', user.seatID);
  root.att('roomCount', room_users.length);

  /* 
  const room_definition = root.ele('RoomDefinition');
    const activity_attributes = room_definition.ele('ActivityAttributes');
    const custom_data = room_definition.ele('CustomData');
    const link_category = room_definition.ele('LinkCategory');
    link_category.att('id', 'Thorvarium');
    link_category.att('title', 'Thorvarium');
    link_category.att('description', 'Sala principal do Thorvarium');
      const room_link = link_category.ele('RoomLink');
      room_link.att('id', 'Thorvarium2');
      room_link.att('title', 'Thorvarium2');
      room_link.att('description', 'Sala secundaria');
  */

  const participant_list = root.ele('ParticipantList');
  participant_list.att('groupID', user.groupID);
  room_users.forEach((room_user) => {
    const participant = participant_list.ele('Participant');
    participant.att('username', room_user.username);
    participant.att('groupID', room_user.groupID);
    participant.att('seatID', room_user.seatID)
  });

  return root.end();
}

function room_exit(xml, socket) {
  const msgID = xml['Room.Exit'][0]['$']['msgID'];
  const roomID = xml['Room.Exit'][0]['$']['roomID'];
  const clientID = xml['Room.Exit'][0]['$']['clientID'];

  const user = get_user(clientID);

  if (!msgID) {
    return error();
  }
  if (!roomID || !clientID || user.socket != socket) {
    return error(msgID);
  }

  set_room(clientID, '');
  const room_users = get_room_users(roomID);
  console.log(`Usuário ${cn(user)} saiu da sala ${roomID}`);
  
  for (const room_user of room_users) {
    const broadcast = builder.create(
      'Room.ParticipantExited', {headless: true}
    );
    broadcast.att('roomID', roomID);
    broadcast.att('username', user.username);
    broadcast.att('groupID', user.groupID);
    broadcast.att('seatID', user.seatID);

    room_user.socket.write(broadcast.end() + '\0');
  }

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.att('groupID', user.groupID);
  root.att('seatID', user.seatID);
  root.att('roomCount', room_users.length);

  return root.end();
}

function interpret_action(action) {
  const user = action.user;

  // comandos
  if (action.kind == 'command') {
    if (action.command == 'desafio') {
      console.log(`[${user.roomID}] Novo desafio: ${cn(user)} para ${cn(action.recipients[0])}`);
    }

    if (action.command == 'gamestart') {
      console.log(`[${user.roomID}] Nova batalha: ${cn(user)} X ${cn(user.oponent)}`);
    }

    if (action.command == 'afinou') {
      console.log(`[${user.roomID}] Desistiu: ${cn(user)} não tankou o ${cn(user.oponent)}`);
    }

    if (action.command == 'recado') {
      console.log(`[${user.roomID}] Recado: ${cn(user)} para ${cn(user.oponent)}: ${action.data}`);
      return `/system/${action.command}:${responses.recado(user, action.data, action.color)}`
    }

    return `/system/${action.command}:${action.parameters}`;
  }

  // mensagens privadas
  if (action.kind == 'privmsg') {
    if (action.data == 'accepted') {
      action.recipients[0].oponent = user;
      user.oponent = action.recipients[0];
      console.log(`[${user.roomID}] Desafio aceito: ${cn(user)} para ${cn(action.recipients[0])}`);
      return responses.accepted(user);
    }
    if (action.data == 'refused') {
      console.log(`[${user.roomID}] Desafio recusado: ${cn(user)} para ${cn(action.recipients[0])}`);
      return responses.refused(user);
    }
    if (action.data == 'playing') {
      console.log(`[${user.roomID}] Desafio recusado: ${cn(user)} para ${cn(action.recipients[0])}`);
      return responses.playing(user, action.recipients[0]);
    }
  }

  // broadcast
  if (action.kind == 'broadcast') {
    if (action.data == 'newbattle') {
      console.log(`[${user.roomID}] Broadcast: Nova batalha, ${cn(user.oponent)} X ${cn(user)}`);
      return responses.newbattle(user);
    }
    if (action.data == 'backtochat') {
      console.log(`[${user.roomID}] Broadcast: ${cn(user)} de volta a sala.`);
      return responses.backtochat(user);
    }
  }

  if (action.kind == 'chat') {
    console.log(`[${user.roomID}] Mensagem de ${cn(user)}: ${action.data}`);
    return responses.chat(user, action.data);
  }
}

function room_action(xml, socket) {
  const roomID = xml['Room.Action'][0]['$']['roomID'];
  const clientID = xml['Room.Action'][0]['$']['clientID'];
  const message = decode_hex(xml['Room.Action'][0]['Chat'][0]['_']);

  if (!roomID || !clientID || !message) {
    return error();
  }

  const user = get_user(clientID);

  if (user.socket != socket) {
    return error();
  }

  const room_users = get_room_users(roomID);
  const recipient_list = xml['Room.Action'][0]['RecipientList'];
  const filtered_list = filter(room_users, recipient_list);

  try {
  const action = parse_message(message, user, filtered_list);
  if (DEBUG_MODE) console.dir(action, {depth: 0});
  if (action.error) {
    return error();
  }
  const response_message = interpret_action(action);

  const root = builder.create('Room.Action', {headless: true});
  root.att('username', user.username);
  root.att('roomID', roomID);
  const chat = root.ele('Chat');
  chat.att('encoding', 'text/binhex');
  chat.txt(encode_text(response_message));
  const res = root.end();

  for (const recipient of filtered_list) {
    recipient.socket.write(res + '\0');
  }
  } catch (e) {
    console.log(e);
  }

  return null;
}

function send_heartbeat(socket) {
  const root = builder.create('System.Heartbeat', {headless: true});
  socket.write(root.end()+'\0');
}

function on_heartbeat(socket) {
  const user = get_socket_user(socket);
  if (user) {
    console.log(`Heartbeat de ${cn(user)}`);
  } else {
    console.log(`Heartbeat de ${socket.remoteAddress}`);
  }

  return null;
}

function get_res(xml, socket) {
  try {
    if ('policy-file-request' in xml) {
      return policy_file();
    }
    if ('System.Login' in xml) {
      return login(xml, socket);
    }
    if ('System.Logout' in xml) {
      return logout(xml, socket);
    }
    if ('System.Heartbeat' in xml) {
      return on_heartbeat(socket);
    }
    if ('Room.Enter' in xml) {
      return room_enter(xml, socket);
    }
    if ('Room.Exit' in xml) {
      return room_exit(xml, socket);
    }
    if ('Room.Action' in xml) {
      return room_action(xml, socket);
    }
    return error();
  } catch (err) {
    return error();
  }
}

const server = net.createServer((socket) => {
  console.log('Usuário conectado!', socket.remoteAddress);

  socket.on('data', (data) => {
    if (DEBUG_MODE) console.log('\x1b[32mRECEBIDO >>>', String(data), '\x1b[0m');

    const formated_data =
      '<root>'+String(data).replace(/\0$/, '')+'</root>';
    
    try {
      parser.parseString(formated_data, (err, parsed_xml) => {
        const res = get_res(parsed_xml.root, socket);
        if (res) {
          if (DEBUG_MODE) console.log('\x1b[36mRESPOSTA XML >>>', res, '\x1b[0m');
          socket.write(res + '\0');
        }
      });
    } catch (e) {
      socket.write(error() + '\0');
    }
  });

  socket.on('close', () => {
    const user = get_socket_user(socket);
    if (user) {
      console.log(`Usuário desconectado: \x1b[35m${user.username}:${user.clientID}\x1b[0m`);
      disconnect(user);
    }
  });

  socket.on('error', (err) => {
    if (err.code == 'EPIPE') {
      console.log('\x1b[31mErro EPIPE, provávelmente durante logout.\x1b[0m');
    }
  });
});

if (DEBUG_MODE) {
  console.log("DEBUG MODE")
}
console.log(`Servidor rodando em 0.0.0.0:${PORT}`);
server.listen(PORT, '0.0.0.0');
console.log();