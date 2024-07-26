function decode_hex(hex) {
  let decoded = '';
  for (let c = 0; c < hex.length; c += 2)
    decoded += String.fromCharCode(parseInt(hex.substr(c, 2), 16));
  return decoded
}

function encode_text(text) {
  let encoded = '';
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


module.exports = { decode_hex, encode_text, rand_int };