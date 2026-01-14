import express from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Memorial from '../models/Memorial.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 获取 server 目录的路径
const serverDir = path.join(__dirname, '..')

// 确保上传目录存在
const uploadDirs = ['uploads/photos', 'uploads/videos', 'uploads/audios', 'uploads/documents', 'uploads/avatars']
uploadDirs.forEach(dir => {
  const fullPath = path.join(serverDir, dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`初始化创建目录: ${fullPath}`)
  }
})

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/photos'
    if (file.mimetype.startsWith('video/')) {
      uploadPath = 'uploads/videos'
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath = 'uploads/audios'
    } else if (file.mimetype.includes('pdf') || file.mimetype.includes('word')) {
      uploadPath = 'uploads/documents'
    }
    const fullPath = path.join(serverDir, uploadPath)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      console.log(`创建目录: ${fullPath}`)
    }
    cb(null, fullPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|m4a|pdf|doc|docx|txt/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    console.log(`文件过滤器: ${file.originalname}, mimetype: ${file.mimetype}, ext: ${path.extname(file.originalname)}`)

    if (mimetype && extname) {
      return cb(null, true)
    }
    console.error('文件类型被拒绝:', file.originalname)
    cb(new Error('不支持的文件类型'))
  }
})

// 错误处理中间件
router.use((error, req, res, next) => {
  console.error('\n========== Multer 错误 ==========')
  console.error('错误名称:', error.name)
  console.error('错误消息:', error.message)
  console.error('错误堆栈:', error.stack)
  console.error('==================================\n')

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小超过限制 (最大500MB)' })
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: '意外的文件字段' })
    }
    return res.status(400).json({ message: `Multer 错误: ${error.message}` })
  }

  res.status(500).json({ message: error.message || '服务器内部错误' })
})

// 获取所有公开纪念馆
router.get('/', async (req, res) => {
  try {
    const memorials = await Memorial.find({ privacy: 'public' })
      .select('-password')
      .sort({ createdAt: -1 })
    res.json(memorials)
  } catch (error) {
    console.error('获取纪念馆列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取我的纪念馆
router.get('/my', auth, async (req, res) => {
  try {
    const memorials = await Memorial.find({
      $or: [
        { createdBy: req.user.userId },
        { admins: req.user.userId }
      ]
    }).sort({ createdAt: -1 })
    res.json(memorials)
  } catch (error) {
    console.error('获取我的纪念馆错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取单个纪念馆
router.get('/:id', async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id)
    
    if (!memorial) {
      return res.status(404).json({ message: '纪念馆不存在' })
    }

    // 检查权限
    if (memorial.privacy === 'restricted') {
      const token = req.header('Authorization')?.replace('Bearer ', '')
      if (!token) {
        return res.status(403).json({ message: '需要登录才能访问' })
      }
    }

    // 增加浏览次数
    await Memorial.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })

    res.json(memorial)
  } catch (error) {
    console.error('获取纪念馆错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 创建纪念馆
router.post('/', auth, upload.fields([
  { name: 'mainPhoto', maxCount: 1 },
  { name: 'backgroundMusic', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('\n========== 收到创建纪念馆请求 ==========')
    console.log('请求时间:', new Date().toISOString())
    console.log('用户ID:', req.user.userId)
    console.log('用户ID类型:', typeof req.user.userId)
    console.log('用户ID是否为ObjectId:', req.user.userId instanceof mongoose.Types.ObjectId)
    console.log('\n--- Body 数据 ---')
    console.log('Body keys:', Object.keys(req.body))
    console.log('Body 值:', req.body)
    console.log('\n--- Body 数据类型 ---')
    Object.keys(req.body).forEach(key => {
      console.log(`  ${key}: ${typeof req.body[key]} = ${req.body[key]}`)
    })
    console.log('\n--- 文件信息 ---')
    console.log('Files keys:', req.files ? Object.keys(req.files) : '无文件')
    if (req.files) {
      Object.keys(req.files).forEach(field => {
        const files = req.files[field]
        console.log(`  ${field}:`, files.map(f => ({
          name: f.originalname,
          filename: f.filename,
          path: f.path,
          size: f.size,
          mimetype: f.mimetype
        })))
      })
    }
    console.log('==========================================\n')

    // 处理日期字段
    const memorialData = {
      ...req.body,
      createdBy: req.user.userId,
      admins: [req.user.userId]
    }

    console.log('\n--- 处理后的数据 ---')
    console.log('createdBy:', memorialData.createdBy)
    console.log('admins:', memorialData.admins)

    // 确保日期是 Date 对象
    if (req.body.birthDate) {
      memorialData.birthDate = new Date(req.body.birthDate)
      console.log('出生日期转换:', req.body.birthDate, '=>', memorialData.birthDate)
      console.log('出生日期是否有效:', !isNaN(memorialData.birthDate.getTime()))
    }
    if (req.body.deathDate) {
      memorialData.deathDate = new Date(req.body.deathDate)
      console.log('逝世日期转换:', req.body.deathDate, '=>', memorialData.deathDate)
      console.log('逝世日期是否有效:', !isNaN(memorialData.deathDate.getTime()))
    }

    if (req.files && req.files.mainPhoto) {
      memorialData.mainPhoto = `/uploads/photos/${req.files.mainPhoto[0].filename}`
      console.log('主照片路径:', memorialData.mainPhoto)
    }
    if (req.files && req.files.backgroundMusic) {
      memorialData.backgroundMusic = `/uploads/audios/${req.files.backgroundMusic[0].filename}`
      console.log('背景音乐路径:', memorialData.backgroundMusic)
    }
    if (req.files && req.files.backgroundImage) {
      memorialData.backgroundImage = `/uploads/photos/${req.files.backgroundImage[0].filename}`
      console.log('背景图片路径:', memorialData.backgroundImage)
    }

    console.log('\n--- 最终要保存的数据 ---')
    console.log('memorialData:', JSON.stringify(memorialData, null, 2))
    console.log('==========================================\n')

    // 验证数据
    console.log('开始验证数据...')
    const memorial = new Memorial(memorialData)
    const validationError = memorial.validateSync()
    if (validationError) {
      console.error('验证失败!')
      console.error('验证错误详情:', JSON.stringify(validationError.errors, null, 2))
      throw validationError
    }
    console.log('验证通过!')

    console.log('开始保存到数据库...')
    await memorial.save()
    console.log('保存成功!')

    console.log('纪念馆保存成功, ID:', memorial._id)
    console.log('==========================================\n')

    res.status(201).json(memorial)
  } catch (error) {
    console.error('\n========== 创建纪念馆错误 ==========')
    console.error('错误消息:', error.message)
    console.error('错误名称:', error.name)

    if (error.name === 'ValidationError') {
      console.error('验证错误详情:')
      Object.keys(error.errors).forEach(key => {
        const err = error.errors[key]
        console.error(`  ${key}:`)
        console.error(`    消息: ${err.message}`)
        console.error(`    路径: ${err.path}`)
        console.error(`    类型: ${err.kind}`)
        console.error(`    值: ${err.value}`)
      })
      const errors = Object.values(error.errors).map(e => e.message)
      return res.status(400).json({
        message: '数据验证失败',
        errors
      })
    }

    console.error('错误堆栈:', error.stack)
    console.error('==========================================\n')
    res.status(500).json({
      message: '服务器错误',
      error: error.message,
      errorName: error.name
    })
  }
})

// 更新纪念馆
router.put('/:id', auth, upload.fields([
  { name: 'mainPhoto', maxCount: 1 },
  { name: 'backgroundMusic', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('\n========== 收到更新纪念馆请求 ==========')
    console.log('请求时间:', new Date().toISOString())
    console.log('纪念馆ID:', req.params.id)
    console.log('用户ID:', req.user.userId)
    console.log('\n--- Body 数据 ---')
    console.log('Body keys:', Object.keys(req.body))
    console.log('Body 值:', req.body)
    console.log('\n--- 文件信息 ---')
    console.log('Files keys:', req.files ? Object.keys(req.files) : '无文件')
    if (req.files) {
      Object.keys(req.files).forEach(field => {
        const files = req.files[field]
        console.log(`  ${field}:`, files.map(f => ({
          name: f.originalname,
          filename: f.filename,
          path: f.path,
          size: f.size,
          mimetype: f.mimetype
        })))
      })
    }
    console.log('==========================================\n')

    const memorial = await Memorial.findById(req.params.id)

    if (!memorial) {
      return res.status(404).json({ message: '纪念馆不存在' })
    }

    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限修改' })
    }

    // 更新文本字段
    const updateData = { ...req.body }

    // 处理日期字段
    if (req.body.birthDate) {
      updateData.birthDate = new Date(req.body.birthDate)
    }
    if (req.body.deathDate) {
      updateData.deathDate = new Date(req.body.deathDate)
    }

    // 处理文件上传
    if (req.files && req.files.mainPhoto && req.files.mainPhoto[0]) {
      // 删除旧照片
      if (memorial.mainPhoto) {
        const oldPhotoPath = path.join(serverDir, memorial.mainPhoto)
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath)
          console.log('删除旧主照片:', oldPhotoPath)
        }
      }
      updateData.mainPhoto = `/uploads/photos/${req.files.mainPhoto[0].filename}`
      console.log('新主照片路径:', updateData.mainPhoto)
    }
    if (req.files && req.files.backgroundMusic && req.files.backgroundMusic[0]) {
      // 删除旧音乐
      if (memorial.backgroundMusic) {
        const oldMusicPath = path.join(serverDir, memorial.backgroundMusic)
        if (fs.existsSync(oldMusicPath)) {
          fs.unlinkSync(oldMusicPath)
          console.log('删除旧背景音乐:', oldMusicPath)
        }
      }
      updateData.backgroundMusic = `/uploads/audios/${req.files.backgroundMusic[0].filename}`
      console.log('新背景音乐路径:', updateData.backgroundMusic)
    }
    if (req.files && req.files.backgroundImage && req.files.backgroundImage[0]) {
      // 删除旧背景图
      if (memorial.backgroundImage) {
        const oldImagePath = path.join(serverDir, memorial.backgroundImage)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
          console.log('删除旧背景图片:', oldImagePath)
        }
      }
      updateData.backgroundImage = `/uploads/photos/${req.files.backgroundImage[0].filename}`
      console.log('新背景图片路径:', updateData.backgroundImage)
    }

    console.log('\n--- 更新数据 ---')
    console.log('updateData:', JSON.stringify(updateData, null, 2))

    Object.assign(memorial, updateData)
    await memorial.save()

    console.log('纪念馆更新成功, ID:', memorial._id)
    console.log('==========================================\n')

    res.json(memorial)
  } catch (error) {
    console.error('\n========== 更新纪念馆错误 ==========')
    console.error('错误消息:', error.message)
    console.error('错误名称:', error.name)
    console.error('错误堆栈:', error.stack)
    console.error('==========================================\n')
    res.status(500).json({
      message: '服务器错误',
      error: error.message
    })
  }
})

// 删除纪念馆
router.delete('/:id', auth, async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id)

    if (!memorial) {
      return res.status(404).json({ message: '纪念馆不存在' })
    }

    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权限删除' })
    }

    await Memorial.findByIdAndDelete(req.params.id)
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除纪念馆错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 上传照片
router.post('/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id)

    if (!memorial) {
      return res.status(404).json({ message: '纪念馆不存在' })
    }

    memorial.photos.push({
      url: `/uploads/photos/${req.file.filename}`,
      description: req.body.description,
      date: req.body.date ? new Date(req.body.date) : null,
      category: req.body.category
    })

    await memorial.save()
    res.json(memorial)
  } catch (error) {
    console.error('上传照片错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 添加留言
router.post('/:id/messages', async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id)

    if (!memorial) {
      return res.status(404).json({ message: '纪念馆不存在' })
    }

    memorial.messages.push({
      author: req.body.author || '匿名访客',
      content: req.body.content
    })

    await memorial.save()
    res.json(memorial)
  } catch (error) {
    console.error('添加留言错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 点蜡烛
router.post('/:id/candle', async (req, res) => {
  try {
    await Memorial.findByIdAndUpdate(req.params.id, { $inc: { candles: 1 } })
    res.json({ message: '点蜡烛成功' })
  } catch (error) {
    console.error('点蜡烛错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 献花
router.post('/:id/flower', async (req, res) => {
  try {
    await Memorial.findByIdAndUpdate(req.params.id, { $inc: { flowers: 1 } })
    res.json({ message: '献花成功' })
  } catch (error) {
    console.error('献花错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

export default router
