import mongoose from 'mongoose'

const memorialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  birthDate: {
    type: Date,
    required: true
  },
  deathDate: {
    type: Date,
    required: true
  },
  hometown: String,
  profession: String,
  epitaph: String,
  biography: {
    type: String,
    maxLength: 5000
  },
  mainPhoto: String,
  backgroundMusic: String,
  backgroundImage: String,
  theme: {
    type: String,
    default: 'warm'
  },
  privacy: {
    type: String,
    enum: ['public', 'semi-private', 'private', 'restricted'],
    default: 'semi-private'
  },
  password: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  photos: [{
    url: String,
    description: String,
    date: Date,
    category: String
  }],
  videos: [{
    url: String,
    thumbnail: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  audios: [{
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  documents: [{
    url: String,
    title: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  timeline: [{
    date: Date,
    title: String,
    description: String,
    photo: String,
    video: String,
    isMilestone: {
      type: Boolean,
      default: false
    }
  }],
  messages: [{
    author: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  importantDates: [{
    type: String,
    date: Date,
    description: String
  }],
  views: {
    type: Number,
    default: 0
  },
  flowers: {
    type: Number,
    default: 0
  },
  candles: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

memorialSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Memorial', memorialSchema)
