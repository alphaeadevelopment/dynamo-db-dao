module.exports = {
  extends: 'airbnb',
  "plugins": [
    "class-property"
  ],
  "rules": {
    "class-methods-use-this": "off",
    "function-paren-newline": "off",
    "quote-props": ["error", "consistent"],
    "max-len": ["warn", { "code": 120 }],
    "brace-style": ["error", "stroustrup"],
    "no-plusplus": "off",
    "object-curly-newline": "off",
    "arrow-body-style": "warn",
  },
  "parser": "babel-eslint"
}
