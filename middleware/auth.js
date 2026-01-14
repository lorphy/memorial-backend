import jwt from 'jsonwebtoken'

export const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    console.log('Auth中间件检查...')
    console.log('Token存在:', !!token)
    if (token) {
      console.log('Token长度:', token.length)
      console.log('Token前20字符:', token.substring(0, 20))
    }

    if (!token) {
      console.log('Token不存在，返回401')
      return res.status(401).json({ message: '未授权访问' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key')
    console.log('Token验证成功，用户ID:', decoded.userId)
    req.user = decoded
    next()
  } catch (error) {
    console.error('\n========== Auth错误 ==========')
    console.error('错误名称:', error.name)
    console.error('错误消息:', error.message)
    console.error('JWT_SECRET:', process.env.JWT_SECRET || '使用默认值')
    console.error('================================\n')
    res.status(401).json({ message: '无效的令牌', error: error.message })
  }
}
