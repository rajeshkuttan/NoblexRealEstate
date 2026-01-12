# CORS Configuration Guide

## Overview
The backend API supports **multiple CORS origins** to allow requests from both local development and production environments.

## Configuration

### Current Setup

**Location**: `backend/config.env`

```env
CORS_ORIGIN=http://localhost:8080,https://realestate.globaldes.cloud
```

### Supported Origins

| Environment | URL | Description |
|------------|-----|-------------|
| **Local Development** | `http://localhost:8080` | Vite development server |
| **Production** | `https://realestate.globaldes.cloud` | Production frontend |

## Adding New Origins

To add additional allowed origins, simply append them to the `CORS_ORIGIN` variable separated by commas:

```env
# Example with multiple origins
CORS_ORIGIN=http://localhost:8080,https://realestate.globaldes.cloud,https://app.example.com,https://staging.example.com
```

### Important Notes

1. **No Spaces**: Don't add spaces between origins
   - ✅ Correct: `http://localhost:8080,https://example.com`
   - ❌ Wrong: `http://localhost:8080, https://example.com`

2. **Include Protocol**: Always include `http://` or `https://`
   - ✅ Correct: `https://realestate.globaldes.cloud`
   - ❌ Wrong: `realestate.globaldes.cloud`

3. **No Trailing Slash**: Don't add trailing slashes
   - ✅ Correct: `https://example.com`
   - ❌ Wrong: `https://example.com/`

## CORS Security Features

### 1. Origin Validation
The backend validates every incoming request against the allowed origins list. Requests from unauthorized origins are rejected with a CORS error.

### 2. Credentials Support
The API supports credentials (cookies, authorization headers) with:
```javascript
credentials: true
```

### 3. Allowed Methods
```javascript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
```

### 4. Allowed Headers
```javascript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
```

### 5. Preflight Caching
Preflight requests (OPTIONS) are cached for 10 minutes to improve performance:
```javascript
maxAge: 600 // 600 seconds = 10 minutes
```

## Implementation Details

### Config File: `backend/src/config/config.js`
```javascript
cors: {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:8080'],
  credentials: true
}
```

### App File: `backend/src/app.js`
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (config.cors.origin.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.use(cors(corsOptions));
```

## Testing CORS Configuration

### 1. Check Current Configuration
```bash
# View current CORS settings
cat backend/config.env | grep CORS_ORIGIN
```

### 2. Test from Browser Console
```javascript
// Test API request from browser console
fetch('http://localhost:5002/api/health')
  .then(res => res.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(err => console.error('❌ CORS error:', err));
```

### 3. Test with cURL
```bash
# Test CORS headers
curl -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     --verbose \
     http://localhost:5002/api/health
```

## Troubleshooting

### CORS Error: "Not allowed by CORS"
**Cause**: The requesting origin is not in the allowed origins list.

**Solution**: Add the origin to `CORS_ORIGIN` in `config.env`

### CORS Error: "No 'Access-Control-Allow-Origin' header"
**Cause**: CORS middleware not properly configured or backend server not running.

**Solution**: 
1. Restart the backend server
2. Check that CORS middleware is loaded in `app.js`

### Warning: "CORS blocked request from origin"
**Cause**: A request was received from an unauthorized origin.

**Action**: This is expected behavior. Check the logs to see which origin was blocked and add it if it's legitimate.

## Environment-Specific Configuration

### Development
```env
CORS_ORIGIN=http://localhost:8080
```

### Staging
```env
CORS_ORIGIN=http://localhost:8080,https://staging.realestate.globaldes.cloud
```

### Production
```env
CORS_ORIGIN=https://realestate.globaldes.cloud,https://app.realestate.globaldes.cloud
```

### All Environments (Current)
```env
CORS_ORIGIN=http://localhost:8080,https://realestate.globaldes.cloud
```

## Security Best Practices

1. ✅ **Only allow specific origins** - Never use `*` (wildcard) in production
2. ✅ **Use HTTPS in production** - Always use `https://` for production URLs
3. ✅ **Keep the list minimal** - Only add origins that actually need access
4. ✅ **Monitor blocked requests** - Check logs for unauthorized access attempts
5. ✅ **Update regularly** - Remove old/unused origins from the configuration

## Related Files

- `backend/config.env` - Environment variables
- `backend/src/config/config.js` - Configuration parser
- `backend/src/app.js` - Express app with CORS middleware
- `frontend/.env.development` - Frontend development API URL
- `frontend/.env.production` - Frontend production API URL

## Support

For issues or questions about CORS configuration, check:
1. Backend logs: `backend/logs/combined.log`
2. Browser developer console (Network tab)
3. CORS error messages in terminal

---

**Last Updated**: January 2026  
**Version**: 1.0.0
