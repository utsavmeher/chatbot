/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
function firstEntity(entities, name) {
  return entities && entities[name] && Array.isArray(entities[name]) && entities[name] && entities[name][0];
}

module.exports = { firstEntity };