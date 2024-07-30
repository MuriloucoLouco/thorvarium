const net = require('net');
const builder = require('xmlbuilder');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');

const {
  decode_hex,
  encode_text
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
const { new_message } = require('./chat.js');

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
  if (reason == 'username') {
    const root = builder.create('Rejected', {headless: true});
    root.att('msgID', msgID);
    root.att('reason', 'Nome de usuário já utilizado.');
    root.att('reasonID', 'username');
    return root.end();
  }

  if (reason == 'server_full') {
    const root = builder.create('Rejected', {headless: true});
    root.att('msgID', msgID);
    root.att('reason', 'Servidor cheio.');
    root.att('reasonID', 'server_full');
    return root.end();
  }
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

  console.log(`Usuário deslogado: \x1b[35m${user.username}:${user.clientID}\x1b[0m`);
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
  console.log(`Usuário \x1b[35m${user.username}:${clientID}\x1b[0m entrou na sala ${roomID}`);
  
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
  console.log(`Usuário \x1b[35m${user.username}:${clientID}\x1b[0m saiu da sala ${roomID}`);
  
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

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.att('groupID', user.groupID);
  root.att('seatID', user.seatID);
  root.att('roomCount', room_users.length);

  return root.end();
}

function room_action(xml, socket) {
  const roomID = xml['Room.Action'][0]['$']['roomID'];
  const clientID = xml['Room.Action'][0]['$']['clientID'];
  const message = decode_hex(xml['Room.Action'][0]['Chat'][0]['_']);

  if (get_user(clientID).socket != socket) {
    return error();
  }

  console.log(`Mensagem de \x1b[35m${get_user(clientID).username}:${clientID}\x1b[0m: \x1b[33m${message.slice(0,-1)}\x1b[0m`);
  new_message(clientID, roomID, message);

  const root = builder.create('Room.Action', {headless: true});
  root.att('username', get_user(clientID).username);
  root.att('roomID', roomID);
  const chat = root.ele('Chat');
  chat.att('encoding', 'text/binhex');
  chat.txt(encode_text(message));

  const res = root.end();

  const room_users = get_room_users(roomID);
  const recipient_list = xml['Room.Action'][0]['RecipientList'];
  const filtered_list = [];
  if (recipient_list) {
    filtered_list.push(...room_users.filter((user) => {
      let allowed = false;
      Object.keys(recipient_list[0]['$']).forEach((key) => {
        if (user.username == decode_hex(recipient_list[0]['$'][key])) {
          allowed = true;
        }
      });
      return allowed;
    }));
  } else {
    filtered_list.push(...room_users);
  }

  for (const user of filtered_list) {
    user.socket.write(res + '\0');
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
    console.log(`Heartbeat de \x1b[35m${user.username}:${user.clientID}\x1b[0m`);
  } else {
    console.log(`Heartbeat de ${socket.address()}`);
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
      send_notify("testando 123", socket);
      return room_action(xml, socket);
    }
    return error();
  } catch (err) {
    return error();
  }
}

const server = net.createServer((socket) => {
  console.log('Usuário conectado!', socket.address());

  socket.on('data', (data) => {
    if (DEBUG_MODE) console.log(String(data));

    const formated_data =
      '<root>'+String(data).replace(/\0$/, '')+'</root>';

    parser.parseString(formated_data, (err, parsed_xml) => {
      const res = get_res(parsed_xml.root, socket);
      if (res) {
        if (DEBUG_MODE) console.log(res);
        socket.write(res + '\0');
      }
    });
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