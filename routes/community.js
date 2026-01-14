import express from 'express'
import Post from '../models/Post.js'
import { auth } from '../middleware/auth.js'
import mongoose from 'mongoose'

const router = express.Router()

// 获取所有帖子（分页）
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const category = req.query.category
    const search = req.query.search

    const query = {}

    if (category) {
      query.category = category
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }

    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-content') // 列表页不返回完整内容
      .populate('author', 'username')

    const total = await Post.countDocuments(query)

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取帖子列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取单个帖子详情
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'username').populate('comments.author', 'username')

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    res.json(post)
  } catch (error) {
    console.error('获取帖子详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 创建帖子
router.post('/posts', auth, async (req, res) => {
  try {
    const user = await mongoose.connection.db.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(req.user.userId) }
    )

    const postData = {
      ...req.body,
      author: req.user.userId,
      authorName: user?.username || '匿名用户'
    }

    const post = new Post(postData)
    await post.save()

    await post.populate('author', 'username')

    res.status(201).json(post)
  } catch (error) {
    console.error('创建帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 更新帖子
router.put('/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限修改' })
    }

    Object.assign(post, req.body)
    await post.save()

    res.json(post)
  } catch (error) {
    console.error('更新帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 删除帖子
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限删除' })
    }

    await Post.findByIdAndDelete(req.params.id)
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 点赞/取消点赞
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    const userId = req.user.userId
    const likeIndex = post.likes.indexOf(userId)

    if (likeIndex > -1) {
      // 取消点赞
      post.likes.splice(likeIndex, 1)
    } else {
      // 点赞
      post.likes.push(userId)
    }

    post.likeCount = post.likes.length
    await post.save()

    res.json({
      liked: likeIndex === -1,
      likeCount: post.likeCount
    })
  } catch (error) {
    console.error('点赞错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 添加评论
router.post('/posts/:id/comments', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    if (post.isLocked) {
      return res.status(403).json({ message: '帖子已锁定，无法评论' })
    }

    const user = await mongoose.connection.db.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(req.user.userId) }
    )

    post.comments.push({
      author: req.user.userId,
      authorName: user?.username || '匿名用户',
      content: req.body.content
    })

    post.commentCount = post.comments.length
    await post.save()

    await post.populate('comments.author', 'username')

    res.json(post)
  } catch (error) {
    console.error('添加评论错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 删除评论
router.delete('/posts/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    const comment = post.comments.id(req.params.commentId)

    if (!comment) {
      return res.status(404).json({ message: '评论不存在' })
    }

    if (comment.author.toString() !== req.user.userId && post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限删除评论' })
    }

    post.comments.pull(req.params.commentId)
    post.commentCount = post.comments.length
    await post.save()

    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除评论错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 置顶/取消置顶帖子
router.put('/posts/:id/pin', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    post.isPinned = !post.isPinned
    await post.save()

    res.json({ isPinned: post.isPinned })
  } catch (error) {
    console.error('置顶帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 锁定/解锁帖子
router.put('/posts/:id/lock', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: '帖子不存在' })
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限锁定帖子' })
    }

    post.isLocked = !post.isLocked
    await post.save()

    res.json({ isLocked: post.isLocked })
  } catch (error) {
    console.error('锁定帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取热门帖子
router.get('/posts/hot', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5

    const posts = await Post.find()
      .sort({ likeCount: -1, commentCount: -1, views: -1 })
      .limit(limit)
      .select('-content')
      .populate('author', 'username')

    res.json(posts)
  } catch (error) {
    console.error('获取热门帖子错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

export default router
