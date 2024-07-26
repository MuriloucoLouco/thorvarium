const net = require('net');
const xml2js = require('xml2js');
const { decode_hex, encode_text } = require('./tools.js');
const { new_user, set_room, get_user, get_room_users } = require('./users.js');
const { new_message } = require('./chat.js');
const builder = require('xmlbuilder');
const parser = new xml2js.Parser();

function login(xml, socket) {
  const username = decode_hex(xml['System.Login'][0]['Username'][0]['_']);
  const clientID = new_user(username, socket);

  const msgID = xml['System.Login'][0]["$"]["msgID"];

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.ele('Ticket').txt(clientID);

  return root.end();
}

function logout(xml) {
  const msgID = xml['System.Logout'][0]["$"]["msgID"];

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  
  return root.end();
}

function room_enter(xml) {
  const msgID = xml['Room.Enter'][0]["$"]["msgID"];
  const roomID = xml['Room.Enter'][0]["$"]["roomID"];
  const clientID = xml['Room.Enter'][0]["$"]["clientID"];
  set_room(clientID, roomID);

  const root = builder.create('Accepted', {headless: true});
  root.att('msgID', msgID);
  root.att('groupID', get_user(clientID).groupID);
  root.att('seatID', get_user(clientID).seatID);
  root.att('roomCount', 1);

  const room_definition = root.ele('RoomDefinition');
  //const activity_attributes = room_definition.ele('ActivityAttributes');
  //const custom_data = room_definition.ele('CustomData');
  const link_category = room_definition.ele('LinkCategory');
  link_category.att('id', 'Thorvarium');
  link_category.att('title', 'titulo do thorvarium');
  link_category.att('description', 'descricao do thorvarium');
  const room_link = link_category.ele('RoomLink');
  room_link.att('id', 'Thorvarium 2');
  room_link.att('title', 'outro do thorvarium');
  room_link.att('description', 'mais uma descricao');

  const participant_list = root.ele('ParticipantList');
  participant_list.att('groupID', get_user(clientID).groupID);
  get_room_users(roomID).forEach((user) => {
    const participant = participant_list.ele('Participant');
    participant.att('username', user.username);
    participant.att('groupID', user.groupID);
    participant.att('seatID', user.seatID)
  });

  const room_users = get_room_users(roomID);
  for (const user of room_users) {
    const broadcast = builder.create('Room.ParticipantEntered', {headless: true});
    broadcast.att('roomID', roomID);
    broadcast.att('username', get_user(clientID).username);
    broadcast.att('groupID', get_user(clientID).groupID);
    broadcast.att('seatID', get_user(clientID).seatID);

    user.socket.write(broadcast.end() + '\0');
  }

  return root.end();
}

function room_action(xml) {
  const roomID = xml['Room.Action'][0]["$"]["roomID"];
  const clientID = xml['Room.Action'][0]["$"]["clientID"];
  const message = decode_hex(xml['Room.Action'][0]['Chat'][0]['_']);

  new_message(clientID, roomID, message);

  const root = builder.create('Room.Action', {headless: true});
  root.att('username', get_user(clientID).username);
  root.att('roomID', roomID);
  const chat = root.ele('Chat');
  chat.att('encoding', 'text/binhex');
  chat.txt(encode_text(message));

  const res = root.end();

  console.log('\x1b[33m' + res + '\x1b[0m');

  const room_users = get_room_users(roomID);
  for (const user of room_users) {
    if (user.clientID != clientID) {
      user.socket.write(res + '\0');
    }
  }

  return res;
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
    console.log('\x1b[32m' + String(data) + '\x1b[0m');
    const formated_data = '<root>'+String(data).replace(/\0$/, '')+'</root>';
    parser.parseString(formated_data, (err, result) => {
      const res = parse_xml(result.root, socket);
      if (res) {
        console.log('\x1b[34m' + res + '\x1b[0m');
        socket.write(res + '\0');
      }
    });
  });
});

console.log("Servidor rodando em 127.0.0.1:9000");
server.listen(9000, '127.0.0.1');