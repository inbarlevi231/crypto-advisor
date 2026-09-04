const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    assets: {
      type: [String],
      default: ['bitcoin', 'ethereum'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Select at least one asset',
      },
    },
    investorType: {
      type: String,
      enum: ['HODLer', 'DayTrader', 'NFTCollector'],
      required: true,
    },
    contentTypes: {
      type: [String],
      enum: ['MarketNews', 'Charts', 'Social', 'Fun'],
      default: ['MarketNews', 'Charts', 'Fun'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Select at least one content type',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Preferences', preferencesSchema);
