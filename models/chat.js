const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RentalProducts",
  },
  message: String,
  seen: Boolean,
  replyText: String,
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
  },
  postedDate: Date,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RentalProducts",
  },
});

module.exports = mongoose.model('Chat', chatSchema);
