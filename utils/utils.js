// if request.body comes from html form, extract textarea input
module.exports.extractValue = (body) => {
  if (Object.prototype.hasOwnProperty.call(body, 'value')) return JSON.parse(body.value);
  return body;
};
