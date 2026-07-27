# Build phase
FROM node:22-alpine AS build

WORKDIR /frontend

# Copy dependencies manifest and install
COPY package.json /frontend/
RUN npm install

# Copy source and compile
COPY . /frontend/
RUN npm run build

# Hosting phase
FROM nginx:alpine
COPY --from=build /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
