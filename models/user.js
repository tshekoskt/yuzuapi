// models/user.js (Your User schema definition file)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  isAdmin: Boolean,
  email: String,
  birthdate: Date,
  password: String,
  phone: String,
  address: String,
  otp: String,
  isRentor: Boolean,
  userGroup: String,
  isverified: Boolean,
  province: String,
  postalcode: String,
  city: String
});

userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.password;
    delete ret.otp;
    return ret;
  },
});

module.exports = mongoose.model('Users', userSchema);
