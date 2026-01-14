import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('检查上传目录...')

const uploadDirs = ['uploads/photos', 'uploads/videos', 'uploads/audios', 'uploads/documents', 'uploads/avatars']

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir)
  const exists = fs.existsSync(fullPath)
  console.log(`${dir}: ${exists ? '✓ 存在' : '✗ 不存在'}`)

  if (!exists) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`  → 已创建: ${fullPath}`)
  }
})

console.log('\n目录检查完成！')
