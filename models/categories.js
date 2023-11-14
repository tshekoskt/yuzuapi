const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
    isactive: Boolean
});

module.exports = mongoose.model('Category', categorySchema);