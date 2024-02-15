const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    description:String,
    amount: String,
    oldbalance: String,
    newbalance: String,
    transactiondate:Date, 
    rentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ordernumber: String,
});

module.exports = mongoose.model('Account', accountSchema); 