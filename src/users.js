const { rand_int } = require('./tools.js');
const MAX_USERS = 99999;

const users = [];

function new_clientID() {
  let clientID = rand_int(1, MAX_USERS);

  if (users.length == MAX_USERS) {
    return null;
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
  if (clientID) {
    const user = {
      clientID: clientID,
      username: username,
      roomID: '',
      socket: socket,
      groupID: 'participants',
      seatID: 'MyseatID'
    }
    users.push(user);
  }
  return clientID;
}

function remove_user(clientID) {
  for (const user of users) {
    if (user.clientID == clientID) {
      const index = users.indexOf(user);
      if (index > -1) {
        users.splice(index, 1);
      }
    }
  }
}

function get_user(clientID) {
  for (const user of users) {
    if (user.clientID == clientID) {
      return user;
    }
  }
  return null;
}

function get_socket_user(socket) {
  for (const user of users) {
    if (user.socket == socket) {
      return user;
    }
  }
  return null;
}

function get_username_user(username) {
  for (const user of users) {
    if (user.username == username) {
      return user;
    }
  }
  return null;
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

module.exports = {
  new_user,
  set_room,
  list_users,
  get_user,
  get_room_users,
  get_socket_user,
  remove_user,
  get_username_user
};