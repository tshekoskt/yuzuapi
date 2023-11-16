const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
    returned: Boolean,
    cancelled: Boolean,
    notes: String,
    startdate: Date,
    enddate: Date,
    duration:Number,
    amount:String,
    deliveryoption:String,
    deliveryamount:String,
    createddate:Date,
    modifieddate:Date,
    totalamount:String,
    ordernumber:String,
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalProduct",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
    /*,
    deliveryoption: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryOption"
    }*/
});

module.exports = mongoose.model('Rentals', rentalSchema);