# Emirates Lease Management App - Run Procedure

## Prerequisites

### System Requirements
- Node.js (v16 or higher)
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Windows 10/11 or macOS or Linux

### Development Environment
- Code editor (VS Code recommended)
- Git (for version control)

## Installation & Setup

$env:PATH += ";C:\Program Files\nodejs"

### 1. Navigate to Project Directory
```bash
cd "D:\Projects\Lease Management\emirates-lease-flow"
```

### 2. Install Dependencies
```bash
npm install
```
*This installs all required packages from package.json*

### 3. Verify Installation
```bash
npm list --depth=0
```
*Check that all dependencies are installed without errors*

## Running the Application

### Method 1: Development Server (Recommended)
```bash
npm run dev
```
*Starts Vite development server with hot reload*

### Method 2: Build and Preview
```bash
npm run build
npm run preview
```
*Creates production build and serves it locally*

### Method 3: Alternative Package Managers
```bash
# Using yarn
yarn dev

# Using pnpm
pnpm dev
```

## Accessing the Application

### Default URLs
- **Development**: http://localhost:5173
- **Alternative Port**: http://localhost:8080 (if 5173 is occupied)
- **Network Access**: http://[your-ip]:5173 (for mobile testing)

### Browser Requirements
- JavaScript enabled
- Modern browser with ES6+ support
- Recommended: Chrome 90+, Firefox 88+, Safari 14+

## Troubleshooting

### Common Issues & Solutions

#### 1. Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

#### 2. Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. Import Errors
```bash
# Check for missing imports in components
# Common fix: Add missing imports to file headers
```

#### 4. Build Errors
```bash
# Check TypeScript errors
npm run type-check

# Lint and fix issues
npm run lint
```

### Error Resolution Steps

#### Step 1: Check Console Errors
1. Open browser Developer Tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed requests

#### Step 2: Verify Dependencies
```bash
npm audit
npm audit fix
```

#### Step 3: Clear Cache
```bash
# Clear npm cache
npm cache clean --force

# Clear browser cache
# Ctrl+Shift+R (hard refresh)
```

#### Step 4: Restart Development Server
```bash
# Stop server (Ctrl+C)
# Restart
npm run dev
```

## Development Workflow

### 1. Start Development
```bash
cd "D:\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

### 2. Make Changes
- Edit files in `src/` directory
- Changes auto-reload in browser
- Check console for errors

### 3. Test Features
- Navigate through all pages
- Test form submissions
- Verify responsive design
- Check mobile compatibility

### 4. Build for Production
```bash
npm run build
```
*Outputs to `dist/` directory*

## Application Structure

### Key Directories
```
src/
├── components/     # Reusable UI components
├── pages/         # Main application pages
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
└── main.tsx       # Application entry point
```

### Main Pages
- Dashboard (`/`)
- Properties (`/properties`)
- Leases (`/leases`)
- Tenants (`/tenants`)
- Finance (`/finance`)
- Reports (`/reports`)
- Settings (`/settings`)

## Performance Optimization

### Development
- Use React DevTools for debugging
- Monitor bundle size with `npm run build`
- Check for unused dependencies

### Production
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading for routes

## Security Considerations

### Development
- Never commit sensitive data
- Use environment variables for API keys
- Validate all user inputs

### Production
- Enable HTTPS
- Implement proper authentication
- Regular security audits

## Monitoring & Logs

### Development Logs
- Browser console for client-side errors
- Terminal output for build errors
- Network tab for API issues

### Error Tracking
- Check `error.txt` for runtime errors
- Monitor console for JavaScript errors
- Use React Error Boundaries

## Quick Commands Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking
npm run type-check

# Install new package
npm install package-name

# Update dependencies
npm update
```

## Support & Maintenance

### Regular Tasks
1. Update dependencies monthly
2. Check for security vulnerabilities
3. Monitor performance metrics
4. Backup important data

### Emergency Procedures
1. Check error logs first
2. Restart development server
3. Clear cache and reinstall
4. Check for recent changes
5. Contact development team if issues persist

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Development Team
