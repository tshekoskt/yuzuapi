const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    vatamount:String,
    servicefee: String,
    duetorentor: String,
    renteerefund: String,
    transactiondate:Date,    
    totalamount:String,   
    ordernumber:String,
    payfastid:String,
    payment_status:String,
    amount_gross:String,
    amount_fee:String,
    amount_net:String,
    rental: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rental",
    },
    rentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
});

module.exports = mongoose.model('Transaction', transactionSchema); 
