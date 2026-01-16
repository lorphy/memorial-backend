import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { sendResetPasswordEmail } from '../utils/email.js'

const router = express.Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    console.log('收到注册请求:', { username, email })

    // 检查必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有必填字段' })
    }

    // 检查密码长度
    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少为6位' })
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      console.log('用户已存在:', existingUser.email || existingUser.username)
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('密码加密成功')

    const user = new User({
      username,
      email,
      password: hashedPassword
    })

    await user.save()
    console.log('用户保存成功:', user._id)

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }
    res.status(500).json({ message: '服务器错误', error: error.message })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('收到登录请求:', { email })

    if (!email || !password) {
      return res.status(400).json({ message: '请填写邮箱和密码' })
    }

    const user = await User.findOne({ email })

    if (!user) {
      console.log('用户不存在:', email)
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      console.log('密码错误:', email)
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    )

    console.log('登录成功:', user.username)

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ message: '服务器错误', error: error.message })
  }
})

// 请求重置密码
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    console.log('收到密码重置请求, 邮箱:', email)

    const user = await User.findOne({ email })

    // 即使邮箱不存在也返回成功，避免泄露用户信息
    if (!user) {
      console.log('邮箱不存在')
      return res.json({
        message: '如果该邮箱已注册，您将收到密码重置邮件'
      })
    }

    // 生成重置 token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetPasswordExpire = Date.now() + 3600000 // 1小时后过期

    user.resetPasswordToken = resetToken
    user.resetPasswordExpire = resetPasswordExpire

    await user.save()

    console.log('重置 Token 已生成:', resetToken)

    // 构建重置链接
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

    console.log('重置链接:', resetUrl)

    // 发送邮件
    try {
      await sendResetPasswordEmail(user.email, resetUrl)
      console.log('密码重置邮件发送成功')
    } catch (error) {
      console.error('邮件发送失败:', error)
      // 邮件发送失败也返回成功，避免暴露问题
      // 在生产环境中可能需要记录日志以便排查
    }

    res.json({
      message: '如果该邮箱已注册，您将收到密码重置邮件'
    })
  } catch (error) {
    console.error('密码重置请求错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 重置密码
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body
    const { token } = req.params

    console.log('收到密码重置请求, Token:', token)

    // 查找有该 token 且未过期的用户
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      console.log('Token 无效或已过期')
      return res.status(400).json({ message: 'Token 无效或已过期' })
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 更新密码并清除重置 token
    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    console.log('密码重置成功, 用户:', user.email)

    res.json({ message: '密码重置成功' })
  } catch (error) {
    console.error('密码重置错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 验证重置 Token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ message: 'Token 无效或已过期' })
    }

    res.json({ valid: true })
  } catch (error) {
    console.error('验证 Token 错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

export default router
