import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  animeId: {
    type: String
  },
  coverImage: {
    type: String
  },
  episode: {
    type: Number
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['NEW_EPISODE', 'WATCHLIST_UPDATE', 'SYSTEM', 'REPLY'],
    default: 'NEW_EPISODE'
  },
  targetUrl: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 345600 // Auto-delete after 4 days
  }
});

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
