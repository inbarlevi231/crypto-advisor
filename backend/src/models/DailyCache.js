const mongoose = require('mongoose');

const dailyCacheSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

dailyCacheSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('DailyCache', dailyCacheSchema);
