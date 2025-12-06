FROM node:24-alpine

# Set timezone to Asia/Jakarta (UTC+7)
ENV TZ=Asia/Jakarta
RUN apk add --no-cache tzdata curl
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app

COPY . .

RUN npm install
# Generate Prisma Client before TypeScript build to ensure types are available
RUN npx prisma generate
RUN npm run build

CMD ["npm", "start"]
