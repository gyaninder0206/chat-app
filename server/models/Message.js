const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  room: {
    type: String,
    required: true,
    default: 'general',
    trim: true,
    lowercase: true,
  },
  type: {
    type: String,
    enum: ['text', 'system'],
    default: 'text',
  },
}, {
  timestamps: true,
});

// Index for efficient room-based queries sorted by time
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
