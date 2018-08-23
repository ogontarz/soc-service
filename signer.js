/*jshint esversion: 6*/
/*jshint strict: true */

const cryptoLib = require("crypto");

/*
  string_escape really slows down everything by the factor of 2x
*/
class JsonSigner {

    static stringEscape(string) {
        return ("" + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
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

    static canonicalize(object) {
        var buffer = "";
        serializeComplex(object);
        return buffer;

        function serializeComplex(object) {
            // null is of type object
            if (object === null) buffer += "null";
            else {
                // array
                if (Array.isArray(object)) {
                    buffer += "[";
                    let next = false;
                    object.forEach((element) => {
                        if (next) buffer += ",";
                        next = true;
                        serialize(element);
                    });
                    buffer += "]";
                } else {
                    // object with structure
                    buffer += "{";
                    let next = false;
                    Object.keys(object).sort().forEach((property) => {
                        if (next) buffer += ",";
                        next = true;
                        buffer += '"' + JsonSigner.stringEscape(property) + ":";
                        serialize(object[property]);
                    });
                    buffer += "}";
                }
            }
        }

        function serialize(object) {
            // object with structure
            if (typeof object === "object") serializeComplex(object);
            // string 
            else if (typeof object === "string") buffer += '"' + JsonSigner.stringEscape(object) + '"';
            // number
            else if (typeof object === "number") buffer += object.toString();
            // something else - eg. function
            else buffer += JSON.stringify(object);
        }
    }

    static sign(object, secret) {
        const canonical = JsonSigner.canonicalize(object);
        const hmac = cryptoLib.createHmac("sha256", secret);
        hmac.update(canonical);
        return hmac.digest().toString("hex");
    }
}

module.exports = JsonSigner;