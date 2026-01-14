FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建uploads目录
RUN mkdir -p uploads/photos uploads/videos uploads/audios uploads/documents uploads/avatars

# 暴露端口
EXPOSE 10000

# 启动应用
CMD ["node", "server.js"]
