# PDM Nillion Proxy Server

Backend proxy server that bridges the PDM browser extension with the Nillion network.

## Why This Server?

The Nillion SDK requires Node.js and cannot run directly in browser extensions. This server:
- ✅ Uses the official `@nillion/secretvaults` SDK
- ✅ Provides REST API for the browser extension
- ✅ Handles authentication and encryption
- ✅ Production-ready architecture

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Run the Server

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun start
```

Server starts at **http://localhost:3000**

---

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and Nillion connection state.

### Initialize Nillion
```
POST /api/initialize
Body: {
  "privateKey": "your_private_key",
  "apiKey": "your_api_key",
  "nilchainUrl": "http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz",
  "nilauthUrl": "https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz"
}
```
Initializes connection to Nillion network using SecretVaultBuilderClient. Must be called before other operations.

### Create Collection
```
POST /api/collection/create
Body: {
  "name": "My Collection",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "title": { "type": "string" },
        "content": { "type": "string" }
      }
    }
  }
}
```

### List Collections
```
GET /api/collections
```

### Store Data
```
POST /api/store
Body: {
  "did": "user_did",
  "collectionId": "collection_id",
  "data": { ...your_data }
}
```

### Retrieve Data
```
GET /api/retrieve/:dataId
```

### Update Data
```
PUT /api/update/:dataId
Body: {
  "data": { ...updated_data }
}
```

### Delete Data
```
DELETE /api/delete/:dataId
```

### List User Data
```
GET /api/list/:did
```

### Grant Permission
```
POST /api/permissions/grant
Body: {
  "dataId": "data_id",
  "grantee": "user_did",
  "permissions": ["read", "write"]
}
```

### Revoke Permission
```
POST /api/permissions/revoke
Body: {
  "dataId": "data_id",
  "grantee": "user_did"
}
```

---

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Server port
PORT=3000

# Nillion Network URLs (optional, uses defaults if not set)
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
```

---

## Deployment

### Local Development
```bash
bun run dev
```

### Production (PM2)
```bash
# Install PM2
bun add -g pm2

# Start server
pm2 start server.ts --name pdm-server --interpreter bun

# View logs
pm2 logs pdm-server

# Restart
pm2 restart pdm-server
```

### Docker (Optional)
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "start"]
```

---

## Extension Configuration

Update the extension's `.env`:

```bash
PDM_SERVER_URL=http://localhost:3000
```

For production, change to your deployed URL:
```bash
PDM_SERVER_URL=https://your-server.com
```

---

## Security Notes

⚠️ **Important**:
- Never expose this server directly to the internet without authentication
- Use HTTPS in production
- Implement rate limiting
- Add API key authentication
- Use environment variables for sensitive data
- Consider using a reverse proxy (nginx/caddy)

---

## Troubleshooting

### Server won't start
- Check Node.js version (requires 22+)
- Ensure Bun is installed: `bun --version`
- Check if port 3000 is available

### Extension can't connect
- Verify server is running: `curl http://localhost:3000/health`
- Check extension's `PDM_SERVER_URL` in build logs
- Ensure `localhost:3000` is in manifest host_permissions

### Nillion initialization fails
- Verify your API keys are correct
- Check Nillion network status
- Review server logs for detailed errors

---

## Development

### Project Structure
```
server/
├── server.ts          # Main server file
├── package.json       # Dependencies
└── README.md         # This file
```

### Adding New Endpoints

1. Add route handler in `server.ts`:
```typescript
if (url.pathname === '/api/your-endpoint' && req.method === 'POST') {
  // Your logic here
  return Response.json({ success: true }, { headers: corsHeaders });
}
```

2. Update extension's `NillionManager` to call it

---

## Support

- Nillion Docs: https://docs.nillion.com
- PDM Repository: [Your repo URL]

---

**Last Updated**: 2025-10-12
