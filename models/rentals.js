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
/*
const rentalItemSchema = new mongoose.Schema({
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
    deliveryoption: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryOption"
    }
}, {
    strict: false
  }
  );*/
module.exports = mongoose.model('RentalItem1', rentalItemSchema);