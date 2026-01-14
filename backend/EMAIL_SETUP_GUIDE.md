# Email Configuration Guide for Emirates Lease Flow

## Overview
The application uses **Nodemailer** for sending emails. Email functionality is required for:
- Password reset requests
- Payment reminders
- Standing order notifications
- Credit management alerts
- Report sharing

## Current Status
⚠️ **Email is currently disabled** because SMTP credentials are not configured in the environment file.

The backend is running successfully, but you'll see these warnings:
```
⚠️ Email transporter setup failed: nodemailer.createTransporter is not a function
⚠️ Email notifications will be disabled
```

## Quick Fix

### Step 1: Configure SMTP Settings

Open `backend/config.env` and update the SMTP settings:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here

# Email Settings
EMAIL_FROM=Emirates Lease Flow <noreply@emiratesleaseflow.com>
EMAIL_REPLY_TO=support@emiratesleaseflow.com
```

### Step 2: Set Up Gmail App Password (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or Other)
   - Click "Generate"
   - Copy the 16-character password

3. **Update config.env**
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop  # Use the generated app password
   ```

### Step 3: Restart the Backend Server

After updating the configuration:
```bash
cd backend
npm run dev
```

You should now see:
```
✅ Email transporter configured successfully
```

## Alternative SMTP Providers

### For Production Use:

#### 1. SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### 2. AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-smtp-username
SMTP_PASSWORD=your-aws-smtp-password
```

#### 3. Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
```

#### 4. Microsoft 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

## Testing Email Functionality

### Test Password Reset Email

1. Start the backend server
2. Go to the frontend: http://localhost:8080/forgot-password
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email inbox for the password reset email

### Test from Backend API Directly

You can test the email configuration by creating a test endpoint or using the password reset API:

```bash
POST http://localhost:5002/api/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

## Troubleshooting

### Error: "Invalid login: Username and Password not accepted"
- **Solution**: Make sure you're using an App Password (not your regular Gmail password)
- Enable 2FA and generate a new App Password

### Error: "Connection timeout"
- **Solution**: Check your firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct
- Try port 465 with `secure: true`

### Error: "Self-signed certificate"
- **Solution**: For development only, you can add to the transporter config:
  ```js
  tls: {
    rejectUnauthorized: false
  }
  ```

### Emails Not Arriving
- Check spam/junk folder
- Verify the recipient email address
- Check SMTP provider's sending limits
- Review backend logs for errors

## Security Best Practices

### Development
- ✅ Use App Passwords (never use your main password)
- ✅ Use a dedicated email account for development
- ✅ Don't commit credentials to git

### Production
- ✅ Use a professional email service (SendGrid, AWS SES, etc.)
- ✅ Set up SPF, DKIM, and DMARC records
- ✅ Use environment-specific email addresses
- ✅ Monitor email delivery rates
- ✅ Implement rate limiting to prevent abuse
- ✅ Store credentials in secure vault (AWS Secrets Manager, Azure Key Vault, etc.)

## Email Service Cost Estimates

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Gmail | 500 emails/day | Not recommended for production |
| SendGrid | 100 emails/day | $19.95/month (40K emails) |
| AWS SES | 62,000 emails/month | $0.10/1000 emails |
| Mailgun | 5,000 emails/month | $35/month (50K emails) |
| Postmark | 100 emails/month | $15/month (10K emails) |

## Need Help?

If you're still having issues:
1. Check the backend terminal for detailed error messages
2. Verify your SMTP credentials are correct
3. Test your SMTP settings using an online SMTP tester
4. Review the Nodemailer documentation: https://nodemailer.com/

---

**Last Updated:** January 15, 2026  
**Version:** 1.0
