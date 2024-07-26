const { rand_int } = require('./tools.js');
const MAX_USERS = 9999;

const users = [];

function new_clientID() {
  let clientID = rand_int(1, MAX_USERS);

  if (users.length == MAX_USERS) {
    return MAX_USERS;
  }

  for (const user of users) {
    if (user.clientID == clientID) {
      clientID = new_clientID();
    }
  }

  return clientID;
}

function new_user(username, socket) {
  let clientID = new_clientID();
  const user = {
    clientID: clientID,
    username: username,
    roomID: '',
    socket: socket,
    groupID: 69,
    seatID: 69
  }
  users.push(user);
  return clientID;
}

function get_user(clientID) {
  for (const user of users) {
    if (user.clientID == clientID) {
      return user;
    }
  }
}

function get_room_users(roomID) {
  const room_users = [];
  for (const user of users) {
    if (user.roomID == roomID) {
      room_users.push(user);
    }
  }
  return room_users;
}

function set_room(clientID, roomID) {
  for (const user of users) {
    if (user.clientID == clientID) {
      user.roomID = roomID;
    }
  }
}

function list_users() {
  for (const user of users) {
    console.log(user);
  }
}

module.exports = { new_user, set_room, list_users, get_user, get_room_users };