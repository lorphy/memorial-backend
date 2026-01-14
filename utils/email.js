import nodemailer from 'nodemailer'

// 创建邮件传输器
let transporter = null

function createTransporter() {
  if (transporter) {
    return transporter
  }

  // 检查是否配置了邮件
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('邮件未配置，将在控制台输出邮件内容')
    return null
  }

  transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  })

  // 验证邮件配置
  transporter.verify((error, success) => {
    if (error) {
      console.error('邮件配置验证失败:', error)
    } else {
      console.log('邮件服务器连接成功')
    }
  })

  return transporter
}

// 发送密码重置邮件
export async function sendResetPasswordEmail(email, resetUrl) {
  const transporter = createTransporter()

  const mailOptions = {
    from: process.env.EMAIL_FROM || '网络纪念馆 <noreply@example.com>',
    to: email,
    subject: '重置您的密码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">网络纪念馆</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">密码重置请求</p>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            您好，
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            我们收到了您的密码重置请求。如果您没有发起此请求，请忽略此邮件，您的账户将保持安全。
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              重置密码
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            或者复制以下链接到浏览器：<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            此链接将在 1 小时后过期。
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            此邮件由系统自动发送，请勿回复。<br>
            如果您有任何疑问，请联系客服。
          </p>
        </div>
      </div>
    `
  }

  try {
    if (transporter) {
      const info = await transporter.sendMail(mailOptions)
      console.log('邮件发送成功:', info.messageId)
      return { success: true, messageId: info.messageId }
    } else {
      // 没有配置邮件，在控制台输出
      console.log('\n========== 密码重置邮件（未配置邮件服务器）==========')
      console.log(`收件人: ${email}`)
      console.log(`重置链接: ${resetUrl}`)
      console.log('================================================\n')
      return { success: false, message: '邮件未配置' }
    }
  } catch (error) {
    console.error('邮件发送失败:', error)
    throw error
  }
}

// 发送普通邮件
export async function sendEmail(options) {
  const transporter = createTransporter()

  if (!transporter) {
    console.log('\n========== 邮件内容（未配置邮件服务器）==========')
    console.log('收件人:', options.to)
    console.log('主题:', options.subject)
    console.log('内容:', options.html || options.text)
    console.log('====================================================\n')
    return { success: false, message: '邮件未配置' }
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '网络纪念馆 <noreply@example.com>',
      ...options
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('邮件发送成功:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('邮件发送失败:', error)
    throw error
  }
}
