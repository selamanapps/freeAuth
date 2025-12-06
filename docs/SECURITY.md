# FreeAuth Worker Security Best Practices (Free Tier)

## Overview

This document outlines security measures for the FreeAuth Cloudflare Worker optimized for free tier services. No paid features (KV, Durable Objects) are used.

## 1. Environment Variables & Secrets

### Required Secrets (Set via `wrangler secret put`):

```bash
# Production (free tier)
wrangler secret put BOT_TOKEN --env production
wrangler secret put FIREBASE_SERVICE_ACCOUNT --env production
wrangler secret put BOT_USERNAME --env production
```

### Secret Management:

- **Never commit secrets** to version control
- Use `.dev.vars` for local development (gitignored)
- Rotate secrets regularly:
  - Bot tokens: Every 90 days
  - Firebase service account: Follow Google's recommendations

## 2. Input Validation & Sanitization

### Phone Number Validation:

```javascript
function validatePhoneNumber(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Validate length and format
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }

  return true;
}
```

### JSON Input Validation:

```javascript
async function validateRequestBody(request, schema) {
  try {
    const body = await request.json();

    // Implement schema validation
    for (const [key, validator] of Object.entries(schema)) {
      if (!validator(body[key])) {
        throw new Error(`Invalid ${key}`);
      }
    }

    return body;
  } catch (error) {
    throw new Error(`Invalid request body: ${error.message}`);
  }
}
```

## 3. Session Security

### Session Management:

- Store sessions in Firestore with TTL (Time-To-Live)
- Implement session expiration (default: 1 hour)
- Use cryptographically secure tokens (`crypto.randomUUID()`)
- Never expose sensitive data in API responses
- Direct Firestore integration (no caching layers for free tier)

## 4. API Security Headers

The worker automatically adds security headers via `wrangler.toml` configuration:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 5. Free Tier Monitoring

### Cloudflare Dashboard:

- Monitor request volume and error rates
- Track usage to stay within free tier limits:
  - 100,000 requests per day (Workers)
  - 50,000 reads per day (Firestore)
  - 20,000 writes per day (Firestore)

### Logging:

- Enable Workers Logs in Cloudflare dashboard (free)
- Never log sensitive data (tokens, phone numbers)

## 6. Dependencies & Updates

### Regular Updates:

- Update `compatibility_date` in `wrangler.toml` for security patches
- Review and update npm dependencies regularly
- Use `npm audit` to identify vulnerabilities

### Dependency Security:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## 7. Deployment Security (Free Tier)

### Simplified Strategy:

- **Development**: Local testing with `wrangler dev`
- **Production**: Direct deployment to free \*.workers.dev domain

### Deployment Process:

1. Test locally with `wrangler dev`
2. Deploy to production with `wrangler deploy`
3. Monitor for issues

### Rollback Procedure:

```bash
# Rollback to previous version
wrangler rollback
```

## 8. Incident Response

### Security Incident Checklist:

1. **Identify**: Determine scope and impact
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat vectors
4. **Recover**: Restore normal operations
5. **Learn**: Document lessons and improve

### Contact Information:

- Maintain contact list for security incidents
- Document escalation procedures

## 9. Compliance Considerations

### Data Protection:

- Phone numbers are PII (Personally Identifiable Information)
- Implement data minimization principles
- Follow GDPR/CCPA requirements if applicable

### Retention Policies:

- Session data: Maximum 30 days (auto-expire in Firestore)
- Logs: Maximum 90 days (Cloudflare free tier)

## 10. Free Tier Security Considerations

### Limitations:

- No rate limiting (free tier constraint)
- No caching layer (direct Firestore calls only)
- Limited monitoring capabilities

### Compensating Controls:

- Strong input validation
- Secure session management
- Regular security updates
- Usage monitoring to prevent abuse

---

## Emergency Contacts

- **Security Team**: security@example.com
- **Infrastructure Team**: infra@example.com
- **On-call Engineer**: +1-XXX-XXX-XXXX

## Version History

- v1.0.0 (2025-12-05): Initial security documentation
- v1.0.1 (2025-12-05): Added rate limiting implementation details
