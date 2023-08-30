const mongoose = require('mongoose');

const deliveryOptionsSchema = new mongoose.Schema({
    name: String,
    description: String,
    isactive: Boolean
});

module.exports = mongoose.model('DeliveryOption', deliveryOptionsSchema);