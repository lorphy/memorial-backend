import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 确保上传目录存在
const uploadDirs = ['uploads/photos', 'uploads/videos', 'uploads/audios', 'uploads/documents', 'uploads/avatars']
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`创建上传目录: ${fullPath}`)
  }
})

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务 - 放在路由之前
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 请求日志中间件 - 简化版，避免干扰multer
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`\n[${timestamp}] ${req.method} ${req.url}`)
  const contentType = req.get('Content-Type')
  if (contentType) {
    console.log('Content-Type:', contentType)
  }
  next()
})

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/memorial_db')
  .then(() => {
    console.log('MongoDB 连接成功')
    console.log('数据库 URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/memorial_db')
  })
  .catch(err => {
    console.error('MongoDB 连接失败:', err)
    console.error('错误详情:', err.message)
  })

// 监听连接错误
mongoose.connection.on('error', (err) => {
  console.error('MongoDB 连接错误:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB 连接断开')
})

// 路由
import authRoutes from './routes/auth.js'
import memorialRoutes from './routes/memorial.js'
import communityRoutes from './routes/community.js'

app.use('/api/auth', authRoutes)
app.use('/api/memorials', memorialRoutes)
app.use('/api/community', communityRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  console.log('健康检查请求收到')
  res.json({ status: 'ok', message: '服务器运行正常' })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('\n========== 全局错误处理 ==========')
  console.error('错误名称:', err.name)
  console.error('错误消息:', err.message)
  if (err.stack) {
    console.error('错误堆栈:', err.stack)
  }
  console.error('=====================================\n')

  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
})
