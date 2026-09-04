const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    section: {
      type: String,
      enum: ['news', 'prices', 'insight', 'meme'],
      required: true,
    },
    itemId: { type: String, required: true },
    contentSnapshot: { type: String, default: '' },
    vote: { type: String, enum: ['up', 'down'], required: true },
  },
  { timestamps: true }
);

feedbackSchema.index({ userId: 1, section: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
