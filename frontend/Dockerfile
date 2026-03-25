FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_URL=localhost:8000
ARG REACT_APP_API_URL_ADD_PROGRAM=localhost:8000
ARG REACT_APP_API_URL_GET_PROGRAMMS=localhost:8000
ENV REACT_APP_API_URL=${REACT_APP_API_URL} \
    REACT_APP_API_URL_ADD_PROGRAM=${REACT_APP_API_URL_ADD_PROGRAM} \
    REACT_APP_API_URL_GET_PROGRAMMS=${REACT_APP_API_URL_GET_PROGRAMMS}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
