import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  content: {
    type: String,
    required: true,
    maxLength: 5000
  },
  category: {
    type: String,
    enum: ['sharing', 'support', 'question', 'other'],
    default: 'sharing'
  },
  categoryLabel: {
    type: String,
    default: '分享'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    authorName: String,
    content: {
      type: String,
      required: true,
      maxLength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commentCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 获取分类标签
postSchema.pre('save', function(next) {
  const categoryLabels = {
    'sharing': '分享',
    'support': '情感支持',
    'question': '问答',
    'other': '其他'
  }
  this.categoryLabel = categoryLabels[this.category] || '其他'
  this.likeCount = this.likes.length
  this.commentCount = this.comments.length
  next()
})

export default mongoose.model('Post', postSchema)
