const WIT_TOKEN = 'R7KJQ4J3FYCO2MZZ524JXMJPCSORXGZ7' // TODO: add your wit token here

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