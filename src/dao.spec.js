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
    it('converts map of object', () => {
      const dao = new DummyDao('Dummy', { id: 'S', map: { type: 'M', schema: { name: 'S' } } });
      const expected = {
        'M': {
          bob: {
            'M': {
              name: {
                'S': 'Bob'
              }
            }
          },
        },
      };
      expect(JSON.stringify(dao.typedValue('map', { bob: { name: 'Bob' } }))).to.equal(JSON.stringify(expected));
    });
    it('converts map of string', () => {
      const dao = new DummyDao('Dummy', { id: 'S', map: { type: 'M', schema: 'S' } });
      const expected = {
        'M': {
          bob: {
            'M': {
              'S': 'Bob'
            }
          },
        },
      };
      expect(JSON.stringify(dao.typedValue('map', { bob: 'Bob' }))).to.equal(JSON.stringify(expected));
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
    it('converts Number to N:string', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      const object = { id: '123', number: 123 };
      const expected = {
        id: { 'S': '123' }, number: { 'N': '123' }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts undefined N', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      const object = { id: '123' };
      const expected = {
        id: { 'S': '123' }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts undefined S', () => {
      const dao = new DummyDao('Dummy', simpleSchema);
      const object = { number: 123 };
      const expected = {
        number: { 'N': '123' }
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
    it('converts list of numbers', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'N' } });
      const object = { id: '123', list: [1] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [{ 'N': '1' }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts list of null string', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'S' } });
      const object = { id: '123', list: [null] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [{ 'NULL': true }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts list of null number', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'N' } });
      const object = { id: '123', list: [null] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [{ 'NULL': true }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts null simple list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'N' } });
      const object = { id: '123' };
      const expected = {
        id: { 'S': '123' },
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts empty simple list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'N' } });
      const object = { id: '123', list: [] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts empty complex list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: { name: 'S' } } });
      const object = { id: '123', list: [] };
      const expected = {
        id: { 'S': '123' }, list: { 'L': [] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('converts null complex list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: { name: 'S' } } });
      const object = { id: '123' };
      const expected = {
        id: { 'S': '123' },
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('omits null simple values', () => {
      const dao = new DummyDao('Dummy', { id: 'S', name: 'S' });
      const object = { id: '123' };
      const expected = {
        id: { 'S': '123' }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('omits null simple list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'S' } });
      const object = { id: '123', list: ['abc', null] };
      const expected = {
        id: { 'S': '123' },
        list: { 'L': [{ 'S': 'abc' }, { 'NULL': true }] },
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('omits null complex list', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: { name: 'S' } } });
      const object = { id: '123', list: [{ name: 'abc' }, null] };
      const expected = {
        id: { 'S': '123' },
        list: { 'L': [{ 'M': { name: { 'S': 'abc' } } }, { 'NULL': true }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('handles list of zero', () => {
      const dao = new DummyDao('Dummy', { id: 'S', list: { type: 'L', schema: 'N' } });
      const object = { id: '123', list: [0, 1] };
      const expected = {
        id: { 'S': '123' },
        list: { 'L': [{ 'N': '0' }, { 'N': '1' }] }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('handles map of string', () => {
      const dao = new DummyDao('Dummy', { id: 'S', map: { type: 'M', schema: 'S' } });
      const object = { id: '123', map: { bob: 'Bob' } };
      const expected = {
        id: { 'S': '123' },
        map: {
          'M': { bob: { M: { S: 'Bob' } } }
        }
      };
      expect(dao.objectToTypedItem(object)).to.deep.equal(expected);
    });
    it('handles map of object', () => {
      const dao = new DummyDao('Dummy', { id: 'S', map: { type: 'M', schema: { name: 'S' } } });
      const object = { id: '123', map: { bob: { name: 'Bob' } } };
      const expected = {
        id: { 'S': '123' },
        map: {
          'M': { bob: { M: { name: { S: 'Bob' } } } }
        }
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
