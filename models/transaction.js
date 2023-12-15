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
