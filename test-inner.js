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
const expected = { id: '123', list: [{ name: 'Bob' }] };
const typedItem = {
  id: { 'S': '123' }, list: { 'L': [{ 'M': { name: { 'S': 'Bob' } } }] }
};
console.log(dao.typedItemToObject(typedItem));
