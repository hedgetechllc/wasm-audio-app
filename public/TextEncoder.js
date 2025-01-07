// TextEncoder/TextDecoder polyfills for utf-8 - an implementation of TextEncoder/TextDecoder APIs
// Written in 2013 by Viktor Mukhachev <vic99999@yandex.ru>

(function (window) {
  'use strict';
  function TextEncoder() { /* Empty constructor */ }
  TextEncoder.prototype.encode = function (string) {
    const octets = [], length = string.length;
    let i = 0;
    while (i < length) {
      const codePoint = string.codePointAt(i);
      let c = 0, bits = 0x00;
      if ((codePoint > 0x0000007f) && (codePoint <= 0x000007ff)) {
        c = 6;
        bits = 0xc0;
      } else if (codePoint <= 0x0000ffff) {
        c = 12;
        bits = 0xe0;
      } else if (codePoint <= 0x001fffff) {
        c = 18;
        bits = 0xf0;
      }
      octets.push(bits | (codePoint >> c));
      c -= 6;
      while (c >= 0) {
        octets.push(0x80 | ((codePoint >> c) & 0x3f));
        c -= 6;
      }
      i += codePoint >= 0x10000 ? 2 : 1;
    }
    return octets;
  };
  globalThis.TextEncoder = TextEncoder;
  if (!window["TextEncoder"]) window["TextEncoder"] = TextEncoder;

  function TextDecoder() { /* Empty constructor */ }
  TextDecoder.prototype.decode = function (octets) {
    if (!octets) return "";
    let string = "", i = 0;
    while (i < octets.length) {
      let octet = octets[i];
      let bytesNeeded = 0, codePoint = 0;
      if (octet <= 0x7f) {
        codePoint = octet & 0xff;
      } else if (octet <= 0xdf) {
        bytesNeeded = 1;
        codePoint = octet & 0x1f;
      } else if (octet <= 0xef) {
        bytesNeeded = 2;
        codePoint = octet & 0x0f;
      } else if (octet <= 0xf4) {
        bytesNeeded = 3;
        codePoint = octet & 0x07;
      }
      if (octets.length - i - bytesNeeded > 0) {
        let k = 0;
        while (k < bytesNeeded) {
          octet = octets[i + k + 1];
          codePoint = (codePoint << 6) | (octet & 0x3f);
          k += 1;
        }
      } else {
        codePoint = 0xfffd;
        bytesNeeded = octets.length - i;
      }
      string += String.fromCodePoint(codePoint);
      i += bytesNeeded + 1;
    }
    return string;
  };
  globalThis.TextDecoder = TextDecoder;
  if (!window["TextDecoder"]) window["TextDecoder"] = TextDecoder;
})(
  typeof globalThis == "" + void 0
    ? typeof global == "" + void 0
      ? typeof self == "" + void 0
        ? this : self
      : global
    : globalThis
);
