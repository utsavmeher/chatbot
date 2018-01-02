const WIT_TOKEN = process.env.WIT_TOKEN;
function firstEntity(entities, name) {
  return entities &&
    entities[name] &&
    Array.isArray(entities[name]) &&
    entities[name] &&
    entities[name][0];
}

module.exports = {
  WIT_TOKEN,
  firstEntity,
};