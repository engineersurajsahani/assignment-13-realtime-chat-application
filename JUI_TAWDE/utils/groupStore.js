const crypto = require("crypto");

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = n => Array.from({ length: n }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
  return `PHX-${pick(4)}-${pick(3)}`;
}

function makeGroupId() {
  return `group_${crypto.randomBytes(7).toString("hex")}`;
}

function makeDmKey(a, b) {
  return [a, b].sort().join("::");
}

module.exports = { makeCode, makeGroupId, makeDmKey };
