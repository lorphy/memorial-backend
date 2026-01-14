import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 5002

// 确保测试上传目录存在
const testUploadDir = path.join(__dirname, 'uploads', 'test')
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true })
  console.log(`创建测试目录: ${testUploadDir}`)
}

// 配置multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, testUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

// 测试文件上传
app.post('/test/upload', upload.single('file'), (req, res) => {
  console.log('\n========== 文件上传测试 ==========')
  console.log('文件名:', req.file?.originalname)
  console.log('文件大小:', req.file?.size)
  console.log('文件类型:', req.file?.mimetype)
  console.log('保存路径:', req.file?.path)
  console.log('====================================\n')

  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' })
  }

  res.json({
    success: true,
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    }
  })
})

// 列出测试目录中的文件
app.get('/test/files', (req, res) => {
  try {
    const files = fs.readdirSync(testUploadDir)
    const fileDetails = files.map(file => {
      const filePath = path.join(testUploadDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime
      }
    })
    res.json({ success: true, files: fileDetails })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 清理测试目录
app.delete('/test/clear', (req, res) => {
  try {
    const files = fs.readdirSync(testUploadDir)
    files.forEach(file => {
      const filePath = path.join(testUploadDir, file)
      fs.unlinkSync(filePath)
    })
    res.json({ success: true, message: `已清理 ${files.length} 个文件` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`\n文件上传测试服务器运行在 http://localhost:${port}`)
  console.log(`\n测试文件上传:`)
  console.log(`  curl -X POST -F "file=@/path/to/image.jpg" http://localhost:${port}/test/upload`)
  console.log(`\n查看上传的文件:`)
  console.log(`  curl http://localhost:${port}/test/files`)
  console.log(`\n清理测试目录:`)
  console.log(`  curl -X DELETE http://localhost:${port}/test/clear`)
  console.log(`\n或者在前端使用 fetch 测试:`)
  console.log(`  const formData = new FormData()`)
  console.log(`  formData.append('file', fileInput.files[0])`)
  console.log(`  fetch('http://localhost:${port}/test/upload', { method: 'POST', body: formData })`)
  console.log()
})
