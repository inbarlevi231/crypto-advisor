const express = require('express');
const Preferences = require('../models/Preferences');
const User = require('../models/User');
const DailyCache = require('../models/DailyCache');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const prefs = await Preferences.findOne({ userId: req.user._id });
    res.json({ preferences: prefs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load preferences' });
  }
});

router.put('/', authRequired, async (req, res) => {
  try {
    const { assets, investorType, contentTypes } = req.body;
    if (!assets?.length || !investorType || !contentTypes?.length) {
      return res.status(400).json({
        message: 'assets, investorType, and contentTypes are required',
      });
    }

    const preferences = await Preferences.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        assets,
        investorType,
        contentTypes,
      },
      { upsert: true, new: true, runValidators: true }
    );

    await User.findByIdAndUpdate(req.user._id, { hasCompletedOnboarding: true });
    // Clear cached dashboards so the next load reflects the new preferences.
    await DailyCache.deleteMany({ userId: req.user._id });

    res.json({
      preferences,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        hasCompletedOnboarding: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Failed to save preferences' });
  }
});

module.exports = router;
