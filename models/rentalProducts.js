const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: String, // name of the person who reviewed the item
  text: String,
  rating: Number, // rating given by the user
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
  Comments: String,
  isApproved: Boolean,
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
