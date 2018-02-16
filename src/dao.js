import AWS from 'aws-sdk';
import uuid from 'uuid/v1';
import keys from 'lodash/keys';
import filter from 'lodash/filter';

const id = uuid();

console.log('In DAO');

export default class DynamoDbDataAccess {
  constructor(
    tablename,
    schema,
    options = {},
  ) {
    const { pk = 'id', sortKey, dynamodb = new AWS.DynamoDB({ region: 'eu-west-1' }) } = options;
    this.schema = schema;
    this.tablename = tablename;
    this.pk = pk;
    this.sortKey = sortKey;
    this.dynamodb = dynamodb;
  }
  typedValue(key, value, schema = this.schema) {
    const type = schema[key];
    if (!value) return;
    if (typeof type === 'object') {
      const rv = ({ [type.type]: this.objectToTypedItem(value, type) });
      return rv;
    }
    let typedValue;
    switch (type) {
      case 'S':
      case 'N':
        typedValue = `${value || ''}`;
        break;
      default:
        typedValue = value;
    }
    const rv = ({ [type]: typedValue });
    return rv;
  }
  fieldFromValue(key, value) {
    return ({ [key]: this.typedValue(key, value) });
  }
  itemToValue(item) {
    const type = keys(item)[0];
    const value = item[type];
    switch (type) {
      case 'S':
        return value;
      case 'N':
        return Number(value);
      case 'M':
        return this.typedItemToObject(value);
      case 'L':
        return value.map(v => this.itemToValue(v));
      default:
        return item;
    }
  }
  typedItemToObject(d) {
    if (!d) return null;
    const rv = {}
    for (let v in d) {
      rv[v] = this.itemToValue(d[v]);
    }
    return rv;
  }
  castValue(v, type) {
    let rv;
    if (v === null || v === undefined) {
      rv = { 'NULL': true };
    }
    else if (typeof type === 'object') {
      switch (type.type) {
        case 'L':
          rv = this.castValue(v || [], type.schema);
          break;
        default:
          rv = v;
      }
    }
    else if (v instanceof Array) {
      rv = v;
    }
    else {
      let value;
      let returnType = type;
      switch (type) {
        case 'N':
          value = `${v}`;
          break;
        // case 'L':
        //   value = this.castValue(v || [], type);
        //   break;
        case 'S':
        default:
          value = v;
      }
      rv = ({ [returnType]: value });
    }
    return rv;
  }
  objectToTypedItem(d, schema = this.schema) {
    let rv;
    if (d === undefined || d === null) {
      rv = { 'NULL': true }; // this.castValue(d, schema);
    }
    else if (d instanceof Array) {
      const arraySchema = schema.schema;
      if (typeof arraySchema === 'object') {
        rv = filter(d.map(i => {
          const value = this.objectToTypedItem(i, schema.schema);
          return (value.NULL) ? value : ({ 'M': value });
        }), v => v !== null && v !== undefined);
      }
      else {
        rv = d.map(i => this.objectToTypedItem(i, schema.schema));
      }
    }
    else if (typeof d === 'object') {
      rv = {};
      for (let v in schema) {
        const typedValue = this.typedValue(v, d[v], schema);
        if (typedValue !== null && typedValue !== undefined) {
          rv[v] = typedValue;
        }
      }
    }
    else if (typeof d === 'string') {
      rv = this.castValue(d, schema);
    }
    else if (typeof d === 'number') {
      rv = this.castValue(d, schema);
    }
    return rv;
  }
  add(d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const id = d[pk] || uuid();
      const Item = this.objectToTypedItem(Object.assign({}, { ...d, id }));
      const params = {
        Item,
        TableName: this.tablename,
      }
      this.dynamodb.putItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.typedItemToObject(Item));
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
      this.dynamodb.getItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.typedItemToObject(data.Item, this.schema));
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
        res({ paginationKey, items: data.Items.map(i => this.typedItemToObject(i, this.schema)) });
      })
    });
  }
  update(id, d) {
    return new Promise((res, rej) => {
      const pk = this.pk;
      const params = {
        TableName: this.tablename,
        Key: this.objectToTypedItem({ ...d, [pk]: id }),
      }
      this.dynamodb.updateItem(params, (err, data) => {
        console.log(err, data);
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
        Item: this.objectToTypedItem({ ...d, [pk]: id }),
      }
      console.log(JSON.stringify(d));
      console.log(JSON.stringify(params.Item));
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
}
