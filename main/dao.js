import AWS from 'aws-sdk';
import uuid from 'uuid/v1';

const id = uuid();

const dynamodb = new AWS.DynamoDB({ region: 'eu-west-1' });
export default class DynamoDbDataAccess {
  constructor(tablename, schema, pk = 'id', pkType = 'S') {
    this.schema = schema;
    this.tablename = tablename;
    this.pk = pk;
  }
  itemToObject(d) {
    const rv = {}
    for (let v in this.schema) {
      const type = this.schema[v];
      rv[v] = d[v] && d[v][type];
    }
    return rv;
  }
  objectToItem(d) {
    const i = {};
    for (let v in this.schema) {
      i[v] = { [this.schema[v]]: d[v] }
    }
    return i;
  }
  add(d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const id = d[pk] || uuid();
      const Item = this.objectToItem(Object.assign({}, { ...d, id }));
      const params = {
        Item,
        TableName: this.tablename,
      }
      dynamodb.putItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.itemToObject(Item));
      })
    });
  }
  fieldFromValue(key, value) {
    const type = this.schema[key];
    return ({ [key]: { [type]: value } });
  }
  valueFromField(field, key) {
    const type = this.schema[key];
    return field[type];
  }
  getById(id) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        Key: this.fieldFromValue(this.pk, id),
        TableName: this.tablename,
      }
      dynamodb.getItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.itemToObject(data.Item));
      })
    });
  }
  getAll(limit = 0, pageKey) {
    return new Promise((res, rej) => {
      const params = {
        TableName: this.tablename,
        ExclusiveStartKey: pageKey ? this.fieldFromValue(this.pk, pageKey) : pageKey,
        Limit: limit,
      }
      dynamodb.scan(params, (err, data) => {
        if (err) {
          rej(err);
          return;
        }
        const pk = this.pk;
        const paginationKey = data.LastEvaluatedKey ? this.valueFromField(data.LastEvaluatedKey[pk], pk) : null;
        res({ paginationKey, items: data.Items.map(i => this.itemToObject(i)) });
      })
    });
  }
  update(id, d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        TableName: this.tablename,
        Key: this.objectToItem({ ...d, [pk]: id }),
      }
      dynamodb.updateItem(params, (err, data) => {
        console.log(err, data);
        if (err) rej(err);
        else res(data);
      })
    });
  }
}
