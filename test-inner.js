import DynamoDao from './src/dao';

const simpleSchema = {
  id: 'S',
  number: 'N',
};
const simpleList = {
  id: 'S',
  list: {
    type: 'L',
    schema: 'S'
  },
};
const complexList = {
  id: 'S',
  list: {
    type: 'L',
    schema: {
      name: 'S',
    },
  },
};

class DummyDao extends DynamoDao {
  constructor(tablename, schema, options) {
    super(tablename, schema, options);
  }
}

const dao = new DummyDao('Dummy', complexList);
const object = { id: '123', people: { 'bobj': { firstName: 'Bob', surname: 'Jenkins' } } };
// const typedItem = {
//   id: { 'S': '123' }, people: { 'M': [{ 'M': { name: { 'S': 'Bob' } } }] }
// };
console.log(dao.objectToTypedItem(object));
// console.log(dao.typedItemToObject(typedItem));
