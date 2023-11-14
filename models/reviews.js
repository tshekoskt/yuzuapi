const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    rating: Number,
    text: String,
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    rentalItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalItem",
    },
});

module.exports = mongoose.model('Review', reviewSchema);