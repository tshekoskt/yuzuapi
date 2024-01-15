const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  text: String,
  // You can add more properties like date, rating, etc. based on your requirements
});

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
  reviewComments: [reviewSchema], // Modified to use reviewSchema
  enddate: Date,
  photos: [String],
  pictures: [String],
  weight: String,
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
    ref: "DeliveryOption",
  },
});

module.exports = mongoose.model('RentalProducts', rentalProductSchema);
