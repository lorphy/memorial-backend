import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// 定义 User 模型
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
})
const User = mongoose.model('User', userSchema)

// 定义 Memorial 模型
const memorialSchema = new mongoose.Schema({
  name: String,
  mainPhoto: String,
  backgroundImage: String,
  birthDate: Date,
  deathDate: Date
}, { strict: false })
const Memorial = mongoose.model('Memorial', memorialSchema)

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('数据库连接成功\n')

    const memorials = await Memorial.find().select('name mainPhoto backgroundImage createdAt').limit(5)

    console.log(`找到 ${memorials.length} 个纪念馆:\n`)

    memorials.forEach((memorial, index) => {
      console.log(`#${index + 1}`)
      console.log(`  名称: ${memorial.name}`)
      console.log(`  主照片: ${memorial.mainPhoto || '无'}`)
      console.log(`  背景图: ${memorial.backgroundImage || '无'}`)
      console.log(`  创建时间: ${memorial.createdAt}`)
      console.log()
    })

    process.exit(0)
  } catch (error) {
    console.error('错误:', error)
    process.exit(1)
  }
}

checkData()
