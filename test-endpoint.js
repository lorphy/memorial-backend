import express from 'express'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

// 测试 JWT 生成
app.get('/test/jwt', (req, res) => {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key'
  const testPayload = {
    userId: 'test_user_id_123',
    test: true
  }

  try {
    const token = jwt.sign(testPayload, secret, { expiresIn: '7d' })
    res.json({
      success: true,
      token,
      secret: secret,
      payload: testPayload
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 测试 JWT 验证
app.post('/test/verify', (req, res) => {
  const { token } = req.body
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key'

  try {
    const decoded = jwt.verify(token, secret)
    res.json({
      success: true,
      decoded,
      secret: secret
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      errorName: error.name,
      secret: secret
    })
  }
})

const PORT = 5001
app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`)
  console.log(`测试 JWT 生成: GET http://localhost:${PORT}/test/jwt`)
  console.log(`测试 JWT 验证: POST http://localhost:${PORT}/test/verify`)
})
