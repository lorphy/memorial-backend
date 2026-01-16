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
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://memorial-backend-xl42.onrender.com',
      'https://memorial-front.onrender.com'
    ]
    // 允许没有 origin 的请求（如移动端应用）
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(new Error('不允许的跨域请求'))
    }
  },
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`\n========== ${timestamp} ==========`)
  console.log(`${req.method} ${req.url}`)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Query:', req.query)

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('Content-Type:', req.get('Content-Type'))
    if (!req.get('Content-Type')?.includes('multipart/form-data')) {
      console.log('Body:', req.body)
    }
  }

  // 响应日志
  const originalSend = res.send
  res.send = function(data) {
    console.log(`\n响应状态: ${res.statusCode}`)
    console.log(`响应数据类型: ${typeof data}`)
    if (typeof data === 'string') {
      console.log(`响应内容: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`)
    } else if (data) {
      console.log(`响应内容:`, data)
    }
    console.log('=====================================\n')
    originalSend.call(this, data)
  }

  next()
})

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 数据库连接
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB 连接成功')
    console.log('数据库 URI:', process.env.MONGODB_URI)
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
  console.error(err.stack)
  res.status(500).json({ message: '服务器内部错误' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
})
