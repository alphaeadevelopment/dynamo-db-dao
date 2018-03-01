import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

const inject = require('inject-loader!./dao');

describe('dynamo db dao', () => {
  const deleteItemStub = sinon.stub();
  const putItemStub = sinon.stub();
  const dynamoDbStubObj = {
    deleteItem: deleteItemStub,
    putItem: putItemStub,
  };
  const DynamoDbConstructorStub = sinon.stub();
  DynamoDbConstructorStub.returns(dynamoDbStubObj);
  const AWS = {
    DynamoDB: DynamoDbConstructorStub,
  }
  const DynamoDao = inject({
    'aws-sdk': AWS,
  }).default;

  class DummyDao extends DynamoDao {
    constructor(tablename, schema, options) {
      super(tablename, schema, options);
    }
  }
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
  describe('dao operations', () => {
    describe('with default behaviour', () => {
      before(() => {
        deleteItemStub
          .withArgs(sinon.match.object, sinon.match.func)
          .callsFake((params, cb) => cb.call(null, null, 'deleteResponse'));
        putItemStub
          .withArgs(sinon.match.object, sinon.match.func)
          .callsFake((params, cb) => cb.call(null, null, 'putResponse'));
      });
      beforeEach(() => {
        deleteItemStub.resetHistory();
        putItemStub.resetHistory();
      })
      describe('delete', () => {
        it('calls delete with expected params', (done) => {
          const tableName = 'Dummy';
          const id = 'x';
          const dao = new DummyDao(tableName, simpleSchema);
          const expectedDeleteParms = {
            TableName: tableName,
            Key: {
              id: {
                [simpleSchema.id]: id,
              },
            },
          };
          dao.delete(id)
            .then((res) => {
              expect(deleteItemStub).to.have.been.calledWith(expectedDeleteParms, sinon.match.func);
              expect(res).to.equal('deleteResponse');
              done();
            })
            .catch(e => done(e));
        });
      });
      describe('putItem', () => {
        it('calls putItem with correct schema', (done) => {
          const dao = new DummyDao('Dummy', simpleSchema);
          const object = { id: '123', number: '123' };
          const expected = {
            TableName: 'Dummy',
            Item: { id: { 'S': '123' }, number: { 'N': '123' } }
          };
          // putItemStub.callsArgWith(1, null, rv);
          dao.putItem('123', object)
            .then(d => {
              expect(putItemStub).to.have.been.calledWith(expected);
              expect(d).to.equal('putResponse');
              done();
            })
            .catch(e => {
              done(e)
            });
        });
      });
    });
  })
});
