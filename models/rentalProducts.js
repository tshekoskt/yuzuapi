const mongoose = require('mongoose');

const rentalProductSchema = new mongoose.Schema({
  make: String,
  model: String,
  status: String,
  address: String,
  categories: String,
  SubCategories: String,
  description: String,
  deliveryOption: String,
  price: String,
  year: Number,
  available: Boolean,
  isRented: Boolean,
  startdate: Date,
  enddate: Date,
  photos: [String],
  pictures: [String],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  rentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  deliveryoption: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryOption"
  }
});

module.exports = mongoose.model('RentalProduct1', rentalProductSchema);
