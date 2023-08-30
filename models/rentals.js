const mongoose = require('mongoose');

const rentalItemSchema = new mongoose.Schema({
    make: String,
    model: String,
    description: String,
    status: String,
    year: Number,
    available: Boolean,
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

module.exports = mongoose.model('RentalItem', rentalItemSchema);