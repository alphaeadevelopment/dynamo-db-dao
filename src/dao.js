import AWS from 'aws-sdk';
import uuid from 'uuid/v1';

const id = uuid();

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
    console.log('--> typedValue of %s:%s using schema %s', JSON.stringify(key), JSON.stringify(value), JSON.stringify(schema));
    const type = schema[key];
    console.log(typeof type);
    if (typeof type === 'object') {
      console.log('complex')
      const rv = ({ [type.type]: this.objectToTypedItem(value, type) });
      console.log('<-- typedValue %s', JSON.stringify(rv))
      return rv;
    }
    const rv = ({ [type]: value });
    console.log('<-- typedValue %s', JSON.stringify(rv));
    return rv;
  }
  fieldFromValue(key, value) {
    return ({ [key]: this.typedValue(key, value) });
  }
  itemToObject(d, schema = this.schema) {
    if (!d) return null;
    const rv = {}
    for (let v in schema) {
      console.log('handle %s', v);
      const type = schema[v];
      rv[v] = d[v] && d[v][type];
    }
    return rv;
  }
  castValue(v, type) {
    let value;
    switch (type) {
      case 'N':
      case 'S':
      default:
        value = v;
    }
    return ({ [type]: value });
  }
  objectToTypedItem(d, schema = this.schema) {
    console.log('--> objectToTypedItem %s schema %s', JSON.stringify(d), JSON.stringify(schema));
    let rv;
    if (d instanceof Array) {
      console.log('array');
      const arraySchema = schema.schema;
      console.log('arraySchema', arraySchema);
      if (typeof arraySchema === 'object') {
        rv = d.map(i => ({ 'M': this.objectToTypedItem(i, schema.schema) }));
      }
      else {
        rv = d.map(i => this.objectToTypedItem(i, schema.schema));
      }
    }
    else if (typeof d === 'string') {
      rv = this.castValue(d, schema);
    }
    else if (typeof d === 'object') {
      rv = {};
      for (let v in schema) {
        console.log('schema item %s', v);
        rv[v] = this.typedValue(v, d[v], schema);
      }
    }
    console.log('<-- objectToTypedItem %s', JSON.stringify(rv));
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
      this.dynamodb.getItem(params, (err, data) => {
        if (err) rej(err);
        else res(this.itemToObject(data.Item, this.schema));
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
        res({ paginationKey, items: data.Items.map(i => this.itemToObject(i, this.schema)) });
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
      console.log(params);
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
      console.log(params);
      this.dynamodb.putItem(params, (err, data) => {
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
      this.dynamodb.query(params, (e, data) => {
        if (e) rej(e);
        else res({ items: data.Items.map(i => this.itemToObject(i)) });
      });
    });
  }
}
