const net = require('net');
const builder = require('xmlbuilder');
const xml2js = require('xml2js');

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

const parser = new xml2js.Parser();

function disconnect(user) {
  remove_user(user.clientID);
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
  if (get_socket_user(socket)) {
    disconnect(get_socket_user(socket));
  }

  const username = decode_hex(xml['System.Login'][0]['Username'][0]['_']);
  const msgID = xml['System.Login'][0]['$']['msgID'];

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
  disconnect(get_socket_user(socket));
  const msgID = xml['System.Logout'][0]['$']['msgID'];

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  
  return root.end();
}

function room_enter(xml) {
  const msgID = xml['Room.Enter'][0]['$']['msgID'];
  const roomID = xml['Room.Enter'][0]['$']['roomID'];
  const clientID = xml['Room.Enter'][0]['$']['clientID'];
  set_room(clientID, roomID);

  console.log(`Usuário \x1b[35m${get_user(clientID).username}:${clientID}\x1b[0m entrou na sala ${roomID}`);

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.att('groupID', get_user(clientID).groupID);
  root.att('seatID', get_user(clientID).seatID);
  root.att('roomCount', 1);

  /* 
  const room_definition = root.ele('RoomDefinition');
    const activity_attributes = room_definition.ele('ActivityAttributes');
    const custom_data = room_definition.ele('CustomData');
    const link_category = room_definition.ele('LinkCategory');
    link_category.att('id', 'Thorvarium');
    link_category.att('title', 'titulo do thorvarium');
    link_category.att('description', 'descricao do thorvarium');
      const room_link = link_category.ele('RoomLink');
      room_link.att('id', 'Thorvarium 2');
      room_link.att('title', 'outro do thorvarium');
      room_link.att('description', 'mais uma descricao');
  */

  const participant_list = root.ele('ParticipantList');
  participant_list.att('groupID', get_user(clientID).groupID);
  get_room_users(roomID).forEach((user) => {
    const participant = participant_list.ele('Participant');
    participant.att('username', user.username);
    participant.att('groupID', user.groupID);
    participant.att('seatID', user.seatID)
  });
  
  const room_users = get_room_users(roomID);
  for (const room_user of room_users) {
    const broadcast = builder.create(
      'Room.ParticipantEntered', {headless: true}
    );
    broadcast.att('roomID', roomID);
    broadcast.att('username', get_user(clientID).username);
    broadcast.att('groupID', get_user(clientID).groupID);
    broadcast.att('seatID', get_user(clientID).seatID);

    room_user.socket.write(broadcast.end() + '\0');
  }

  return root.end();
}

function room_action(xml) {
  const roomID = xml['Room.Action'][0]['$']['roomID'];
  const clientID = xml['Room.Action'][0]['$']['clientID'];
  const message = decode_hex(xml['Room.Action'][0]['Chat'][0]['_']);

  console.log(`Mensagem de \x1b[35m${get_user(clientID).username}:${clientID}\x1b[0m: \x1b[33m${message}\x1b[0m`);

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

function parse_xml(xml, socket) {
  if ('System.Login' in xml) {
    return login(xml, socket);
  }
  if ('System.Logout' in xml) {
    return logout(xml);
  }
  if ('Room.Enter' in xml) {
    return room_enter(xml);
  }
  if ('Room.Action' in xml) {
    return room_action(xml);
  }
}

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const formated_data = '<root>'+String(data).replace(/\0$/, '')+'</root>';
    parser.parseString(formated_data, (err, result) => {
      const res = parse_xml(result.root, socket);
      if (res) {
        socket.write(res + '\0');
      }
    });
  });

  socket.on('close', () => {
    const user = get_socket_user(socket)
    console.log(`Usuário desconectado: \x1b[35m${user.username}:${user.clientID}\x1b[0m`);
    disconnect(user);
  });
});

console.log("Servidor rodando em 127.0.0.1:9000");
server.listen(9000, '127.0.0.1');