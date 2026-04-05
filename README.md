# 🚀 Pankh Server

Backend service for the **Pankh Mail Platform** — a scalable, production-ready email infrastructure inspired by Gmail.

---

## 🧩 Tech Stack

* Node.js (NestJS or Express)
* SMTP / IMAP integration
* OAuth2 (Google, Microsoft, etc.)
* REST APIs
* Nginx (reverse proxy)
* Docker (optional)
* Oracle Cloud / VPS deployment

---

## 📁 Project Structure

```
pankh-server/
│
├── src/
│   ├── auth/          # OAuth + authentication logic
│   ├── mail/          # SMTP/IMAP handling
│   ├── users/         # User management
│   ├── common/        # Shared utilities
│   └── main.ts        # Entry point
│
├── .env               # Environment variables
├── package.json
├── docker-compose.yml (optional)
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=

# JWT
JWT_SECRET=

# Mail (if using SMTP directly)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## 🛠️ Setup & Run Locally

```bash
# Install dependencies
npm install

# Run in development
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod
```

---

## 🌐 API Endpoints (Example)

### Auth

* `POST /auth/google`
* `POST /auth/microsoft`
* `GET /auth/callback`

### Mail

* `GET /mail/inbox`
* `POST /mail/send`
* `GET /mail/:id`
* `DELETE /mail/:id`

### User

* `GET /user/profile`

---

## 🔐 OAuth Flow

1. Client calls `/auth/google`
2. User is redirected to provider consent screen
3. Provider redirects back to `/auth/callback`
4. Server exchanges code for tokens
5. Tokens stored securely and used for IMAP/SMTP access

---

## 🚀 Deployment

### Build project

```bash
npm run build
```

### Run with PM2

```bash
npm install -g pm2
pm2 start dist/main.js --name pankh-server
```

---

## 🌍 Nginx Configuration

```
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Enable HTTPS

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx
```

---

## 🐳 Docker (Optional)

```bash
docker-compose up --build
```

---

## 📈 Scaling Strategy

* Stateless backend (horizontal scaling ready)
* Use Redis for caching & sessions
* Add queues (BullMQ / RabbitMQ) for async mail processing
* Move to microservices as user base grows

---

## 🧪 Testing

```bash
npm run test
```

---

## 🧠 Future Improvements

* Push notifications for new emails
* Email threading
* Spam filtering
* Attachment storage (S3 / GCP)
* Rate limiting & abuse protection

---

## 🤝 Contribution

Pull requests are welcome!

---

## 📜 License

MIT
