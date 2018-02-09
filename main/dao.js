import AWS from 'aws-sdk';
import uuid from 'uuid/v1';

const id = uuid();

const dynamodb = new AWS.DynamoDB({ region: 'eu-west-1' });
export default class DynamoDbDataAccess {
  constructor(tablename, schema, pk = 'id', sortKey) {
    this.schema = schema;
    this.tablename = tablename;
    this.pk = pk;
    this.sortKey = sortKey;
  }
  typedValue(key, value) {
    const type = this.schema[key];
    return ({ [type]: value });
  }
  fieldFromValue(key, value) {
    return ({ [key]: this.typedValue(key, value) });
  }
  itemToObject(d) {
    if (!d) return null;
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
      i[v] = this.typedValue(v, d[v]);
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
  valueFromField(field, key) {
    const type = this.schema[key];
    return field[type];
  }
  getById(id, sortKey) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const keys = this.fieldFromValue(this.pk, id);
      if (sortKey) {
        keys[this.sortKey] = this.typedValue(this.sortKey, sortKey);
      }
      const params = {
        Key: keys,
        TableName: this.tablename,
      }
      dynamodb.getItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.itemToObject(data.Item));
      })
    });
  }
  getAll(limit, pageKey) {
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
  findByQuery(query, queryParameters, index) {
    return new Promise((res, rej) => {
      const params = {
        IndexName: index,
        ExpressionAttributeValues: queryParameters,
        KeyConditionExpression: query,
        TableName: this.tablename,
      };
      dynamodb.query(params, (e, data) => {
        if (e) rej(e);
        else res({ items: data.Items.map(i => this.itemToObject(i)) });
      });
    });
  }
}
