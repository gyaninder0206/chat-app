const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');
const { ROOMS, normalizeRoom } = require('../constants/rooms');

const router = express.Router();

router.get('/rooms', protect, async (req, res) => {
  res.json({ rooms: ROOMS });
});

router.get('/:room', protect, async (req, res) => {
  try {
    const room = normalizeRoom(req.params.room);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatarColor')
      .lean();

    messages.reverse();

    const total = await Message.countDocuments({ room });

    res.json({
      messages,
      page,
      totalPages: Math.ceil(total / limit),
      totalMessages: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
