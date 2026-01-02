# Stage 1: Build (The "Activation Energy" stage)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve (The "Environment Optimization" stage)
FROM nginx:stable-alpine
# Remove the default Nginx config to avoid "Pathological Homeostasis" (config conflicts)
RUN rm /etc/nginx/conf.d/default.conf
# Copy your custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the build output from Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]