const messages = [];

function new_message(clientID, room, message) {
  messages.push({
    clientID, room, message
  });
}

module.exports = { new_message };