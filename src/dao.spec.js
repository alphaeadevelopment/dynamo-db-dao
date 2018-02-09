import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import DynamoDao from './dao';

class DummyDao extends DynamoDao {
  constructor(tablename, schema, options) {
    super(tablename, schema, options);
  }
}

const dynamodb = { putItem: () => { } };
const putItemStub = sinon.stub(dynamodb, "putItem");

describe('dynamo db dao', () => {
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
  it('can create dao', () => {
    const dao = new DummyDao('Dummy', simpleSchema);
  });
  describe('typedValue', () => {
    it('converts id', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      expect(dao.typedValue('id', '123')).to.deep.equal({ 'S': '123' });
    });
    it('converts number', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      expect(dao.typedValue('number', '123')).to.deep.equal({ 'N': '123' });
    });
    it('converts list of string', () => {
      const dao = new DummyDao('Dummy', simpleList);
      const expected = {
        'L': [
          {
            'S': 'Bob',
          }
        ]
      };
      expect(dao.typedValue('list', ['Bob'])).to.deep.equal(expected);
    });
    it('converts list of object', () => {
      const dao = new DummyDao('Dummy', complexList);
      const expected = {
        'L': [
          {
            'M': {
              name: {
                'S': 'Bob',
              },
            },
          },
        ],
      };
      expect(dao.typedValue('list', [{ name: 'Bob' }])).to.deep.equal(expected);
    });
  });
  describe('objectToTypedItem', () => {
    it('converts simple object', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      const object = { id: '123', number: '123' };
      const expected = {
        id: { 'S': '123' }, number: { 'N': '123' }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts simple list', () => {
      const dao = new DummyDao('Dummy', simpleList);
      const object = { id: '123', list: ['123'] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [{ 'S': '123' }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts list of object', () => {
      const dao = new DummyDao('Dummy', complexList);
      const object = { id: '123', list: [{ name: 'Bob' }] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [{ 'M': { name: { 'S': 'Bob' } } }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
  });
  describe('putItem', () => {
    beforeEach(() => {
      putItemStub.reset();
    })
    it('calls putItem with correct schema', (done) => {
      const dao = new DummyDao('Dummy', simpleSchema, { dynamodb });
      const object = { id: '123', number: '123' };
      const expected = {
        TableName: 'Dummy',
        Item: { id: { 'S': '123' }, number: { 'N': '123' } }
      };
      const rv = 1;
      putItemStub.callsArgWith(1, null, rv);
      dao.putItem('123', object)
        .then(d => {
          expect(putItemStub).to.have.been.calledWith(expected);
          expect(d).to.equal(rv);
          done();
        })
        .catch(e => {
          done(e)
        });
    });
  });
  describe('typedItemToObject', () => {
    it('converts to simple object', () => {
      const dao = new DummyDao('Dummy', simpleSchema, { dynamodb });
      const expected = { id: '123', number: 123 };
      const typedItem = {
        id: { 'S': '123' },
        number: { 'N': '123' },
      };
      expect(dao.typedItemToObject(typedItem)).to.deep.equal(expected);
    });
    it('converts to list of string', () => {
      const dao = new DummyDao('Dummy', simpleList, { dynamodb });
      const expected = { id: '123', list: ['123'] };
      const typedItem = {
        id: { 'S': '123' }, list: { 'L': [{ 'S': '123' }] }
      };
      expect(dao.typedItemToObject(typedItem)).to.deep.equal(expected);
    });
    it('converts to list of object', () => {
      const dao = new DummyDao('Dummy', complexList, { dynamodb });
      const expected = { id: '123', list: [{ name: 'Bob' }] };
      const typedItem = {
        id: { 'S': '123' }, list: { 'L': [{ 'M': { name: { 'S': 'Bob' } } }] }
      };
      expect(dao.typedItemToObject(typedItem)).to.deep.equal(expected);
    });
  });
});
