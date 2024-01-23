const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  referencenumber: String,
  isactive: Boolean,
});

module.exports = mongoose.model('Query', querySchema);
