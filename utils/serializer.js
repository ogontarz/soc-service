// jshint esversion: 6
// jshint strict: true

const COMMA = ',';
const DOUBLE_QUOTE = '"';
const COLON = ':';
const DOUBLE_SLASH = '//';
const EMPTY = '';

const cryptoLib = require('crypto');

class JsonSigner {
  static canonicalize(obj) {
    let buffer = '';

    function serializeElement(object) {
      if (object === null) buffer += 'null';
      else if (Array.isArray(object)) serializeArray(object);
      else if (typeof object === 'object') serializeObject(object);
      else if (typeof object === 'string') buffer += DOUBLE_QUOTE + stringEscape(object) + DOUBLE_QUOTE;
      else if (typeof object === 'number') buffer += object.toString();
      else buffer += JSON.stringify(object); // something else - eg. function
    }

    function serializeObject(object) {
      buffer += '{';
      Object.keys(object).sort().forEach((property) => {
        buffer += DOUBLE_QUOTE + stringEscape(property) + DOUBLE_QUOTE + COLON;
        serializeElement(object[property]);
        buffer += COMMA;
      });
      // remove last comma
      buffer = buffer.substring(0, buffer.length - 1);
      buffer += '}';
    }

    function serializeArray(object) {
      buffer += '[';
      object.forEach((element) => {
        serializeElement(element);
        buffer += COMMA;
      });
      // remove last comma
      buffer = buffer.substring(0, buffer.length - 1);
      buffer += ']';
    }

    // string_escape really slows down everything by the factor of 2x
    function stringEscape(string) {
      return (EMPTY + string).replace(/["'\\\n\r\u2028\u2029]/g, char => DOUBLE_SLASH + char);
    }

    serializeElement(obj);
    return buffer;
  }

  static sign(object, secret) {
    const canonical = JsonSigner.canonicalize(object);
    const hmac = cryptoLib.createHmac('sha256', secret);
    hmac.update(canonical);
    return hmac.digest().toString('hex');
  }
}

module.exports = JsonSigner;
