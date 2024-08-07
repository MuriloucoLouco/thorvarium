function decode_hex(hex) {
  let decoded = '';
  for (let c = 0; c < hex.length; c += 2)
    decoded += String.fromCharCode(parseInt(hex.substr(c, 2), 16));
  return decoded
}

function encode_text(text) {
  let encoded = '';
  if (!text) return null;
  for (letter of text) {
    let pair = letter.charCodeAt(0).toString(16);
    if (pair.length == 1) {
      pair = "0" + pair;
    }
    encoded += pair;
  }
  return encoded.toUpperCase();
}

function rand_int(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function filter(room_users, recipient_list) {
  const filtered_list = [];

  if (recipient_list) {
    filtered_list.push(...room_users.filter((room_user) => {
      let allowed = false;
      Object.keys(recipient_list[0]['$']).forEach((key) => {
        if (room_user.username == decode_hex(recipient_list[0]['$'][key])) {
          allowed = true;
        }
      });
      return allowed;
    }));
  } else {
    filtered_list.push(...room_users);
  }

  return filtered_list;
}

function cn(user) {
  return `\x1b[35m${user.username}:${user.clientID}\x1b[0m`;
}

module.exports = { decode_hex, encode_text, rand_int, filter, cn };