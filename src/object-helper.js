import keys from 'lodash/keys';
import mapValues from 'lodash/mapValues';
import filter from 'lodash/filter';

export default class ObjectHelper {
  constructor({ pk = 'id', sortKey, schema }) {
    this.schema = schema;
    this.pk = pk;
    this.sortKey = sortKey;
  }
  typedItemToObject = (d) => {
    if (!d) return null;
    const rv = {}
    for (let v in d) {
      rv[v] = this.itemToValue(d[v]);
    }
    return rv;
  }
  typedValue = (key, value, schema = this.schema) => {
    const type = schema[key];
    let rv;
    if (!value) rv = null;
    else if (typeof type === 'object') {
      rv = ({ [type.type]: this.objectToTypedItem(value, type) });
    }
    else {
      let typedValue;
      switch (type) {
        case 'S':
        case 'N':
          typedValue = `${value || ''}`;
          break;
        default:
          typedValue = value;
      }
      rv = ({ [type]: typedValue });
    }
    return rv;
  }
  fieldFromValue = (key, value) => {
    return ({ [key]: this.typedValue(key, value) });
  };
  itemToValue = (item) => {
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
  castValue = (v, type) => {
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
        case 'S':
        default:
          value = v;
      }
      rv = ({ [returnType]: value });
    }
    return rv;
  }
  objectToTypedItem = (d, schema = this.schema) => {
    let rv;
    if (d === undefined || d === null) {
      rv = { 'NULL': true };
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
      if (schema.schema && schema.type === 'M') {
        rv = mapValues(d, i => ({ M: this.objectToTypedItem(i, schema.schema) }));
      }
      else {
        rv = {};
        for (let v in schema) {
          const typedValue = this.typedValue(v, d[v], schema);
          if (typedValue !== null && typedValue !== undefined) {
            rv[v] = typedValue;
          }
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
}
