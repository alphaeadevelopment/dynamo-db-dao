import AWS from 'aws-sdk';
import uuid from 'uuid/v1';
import keys from 'lodash/keys';
import ObjectHelper from './object-helper';
import mapValues from 'lodash/mapValues';
import filter from 'lodash/filter';

const id = uuid();

export default class DynamoDbDataAccess {
  constructor(
    tablename,
    schema,
    options = {},
  ) {
    const { pk = 'id', sortKey } = options;
    this.schema = schema;
    this.tablename = tablename;
    this.pk = pk;
    this.sortKey = sortKey;
    this.dynamodb = new AWS.DynamoDB({ region: 'eu-west-1' });
    this.oh = new ObjectHelper({ pk, sortKey, schema });
  }
  add(d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const id = d[pk] || uuid();
      const Item = this.oh.objectToTypedItem(Object.assign({}, { ...d, id }));
      const params = {
        Item,
        TableName: this.tablename,
      }
      this.dynamodb.putItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.oh.typedItemToObject(Item));
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
      const keys = this.oh.fieldFromValue(this.pk, id);
      if (sortKey) {
        keys[this.sortKey] = this.oh.typedValue(this.sortKey, sortKey);
      }
      const params = {
        Key: keys,
        TableName: this.tablename,
      }
      this.dynamodb.getItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.oh.typedItemToObject(data.Item, this.schema));
      })
    });
  }
  getAll(limit, pageKey) {
    return new Promise((res, rej) => {
      const params = {
        TableName: this.tablename,
        ExclusiveStartKey: pageKey ? this.oh.fieldFromValue(this.pk, pageKey) : pageKey,
        Limit: limit,
      }
      this.dynamodb.scan(params, (err, data) => {
        if (err) {
          rej(err);
          return;
        }
        const pk = this.pk;
        const paginationKey = data.LastEvaluatedKey ? this.oh.valueFromField(data.LastEvaluatedKey[pk], pk) : null;
        res({ paginationKey, items: data.Items.map(i => this.oh.typedItemToObject(i, this.schema)) });
      })
    });
  }
  update(id, d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        TableName: this.tablename,
        Key: this.oh.objectToTypedItem({ ...d, [pk]: id }),
      }
      this.dynamodb.updateItem(params, (err, data) => {
        if (err) rej(err);
        else res(data);
      })
    });
  }
  putItem(id, d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        TableName: this.tablename,
        Item: this.oh.objectToTypedItem({ ...d, [pk]: id }),
      }
      this.dynamodb.putItem(params, (err, data) => {
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
      this.dynamodb.query(params, (e, data) => {
        if (e) rej(e);
        else res({ items: data.Items.map(i => this.typedItemToObject(i)) });
      });
    });
  }
  delete(id) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        TableName: this.tablename,
        Key: this.oh.objectToTypedItem({ [pk]: id }),
      }
      this.dynamodb.deleteItem(params, (e, data) => {
        if (e) rej(e);
        else res(data);
      });
    });
  }
}
