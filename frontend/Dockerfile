FROM node:22-alpine AS build

ARG PUBLIC_API_URL=/api/v1
ENV PUBLIC_API_URL=$PUBLIC_API_URL

WORKDIR /app

COPY package-lock.json package.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
