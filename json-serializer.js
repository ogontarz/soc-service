/*
  string_escape really slows down everything by the factor of 2x
*/
class JsonSerializer {

  static stringEscape(string) {
    return ("" + string).replace(/["'\\\n\r\u2028\u2029]/g, character => {
      switch (character) {
        case '"':
        case "'":
        case "\\":
          return "\\" + character;
          // Four possible LineTerminator characters need to be escaped:
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
      }
    });
  }

  static serialize(object) {
    var buffer = "";
    serializeComplex(object);
    return buffer;

    function serializeComplex(object) {
      // null is of type object
      if (object === null) buffer += "null";
      // array
      else if (Array.isArray(object)) {
        buffer += "[";
        let next = false;
        object.forEach(element => {
          if (next) buffer += ",";
          next = true;
          _serialize(element);
        });
        buffer += "]";
      } else {
        // object with structure
        buffer += "{";
        let next = false;
        Object.keys(object)
          .sort()
          .forEach(property => {
            if (next) buffer += ",";
            next = true;
            buffer += '"' + JsonSerializer.stringEscape(property) + '":';
            _serialize(object[property]);
          });
        buffer += "}";
      }
    }

    function _serialize(object) {
      // object with structure
      if (typeof object === "object") serializeComplex(object);
      // string
      else if (typeof object === "string")
        buffer += '"' + JsonSerializer.stringEscape(object) + '"';
      // number
      else if (typeof object === "number") buffer += object.toString();
      // something else - eg. function
      else buffer += JSON.stringify(object);
    }
  }


}

module.exports = JsonSerializer;