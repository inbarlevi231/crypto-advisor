const express = require('express');
const Feedback = require('../models/Feedback');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  try {
    const { section, itemId, vote, contentSnapshot } = req.body;
    if (!section || !itemId || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ message: 'section, itemId, and vote (up|down) are required' });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { userId: req.user._id, section, itemId },
      {
        userId: req.user._id,
        section,
        itemId,
        vote,
        contentSnapshot: contentSnapshot || '',
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save feedback' });
  }
});

router.get('/', authRequired, async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load feedback' });
  }
});

module.exports = router;
