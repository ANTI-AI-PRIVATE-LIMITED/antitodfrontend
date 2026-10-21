# Frontend Security Headers & Content Security Policy (CSP) Specification

> **Target Audience:** Arpit (DevOps / AWS Infrastructure)  
> **Environment:** AWS CloudFront / S3 / Web Server (Reverse Proxy)  
> **Application:** ANTITODE (Xyberah) Frontend  
> **Date:** October 2026  

---

## 1. Executive Summary

This document specifies the exact HTTP response security headers and Content Security Policy (CSP) directives required for hardening the ANTITODE frontend deployed via AWS CloudFront and S3. 

Implementing these headers prevents:
- Cross-Site Scripting (XSS)
- Clickjacking and UI redressing
- MIME type confusion attacks
- Unintended data/token exfiltration across origins

---

## 2. Content Security Policy (CSP)

### Header Name
`Content-Security-Policy`

### Directives String
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.xyberah.com [VITE_BACKEND_URL origin] https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://api.rss2json.com https://dns.google https://cloudflare-dns.com https://otx.alienvault.com https://www.virustotal.com https://feodotracker.abuse.ch https://threatfox-api.abuse.ch https://urlhaus-api.abuse.ch https://bazaar.abuse.ch https://raw.githubusercontent.com https://services.nvd.nist.gov https://www.cisa.gov https://cvefeed.io https://www.zerodayinitiative.com https://gitlab.com https://cdn.jsdelivr.net https://malpedia.caad.fkie.fraunhofer.de https://api.ipapi.is https://www.peeringdb.com https://internetdb.shodan.io; frame-src 'self' blob: data: https://api.razorpay.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';
```

### Directive Breakdown & Rationale

| Directive | Allowed Sources | Rationale |
| :--- | :--- | :--- |
| `default-src` | `'self'` | Fallback default to same origin only. |
| `script-src` | `'self' https://checkout.razorpay.com` | Allows application JavaScript bundles and Razorpay Checkout gateway script. No inline scripts permitted in production. |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Allows local stylesheets, dynamic CSS variables/animations, and Google Fonts CSS. |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Allows web fonts loaded by Google Fonts and local/embedded icon fonts. |
| `img-src` | `'self' data: blob: https:` | Allows Earth textures for 3D Globe, Threat Map SVGs, flag icons, and external vendor/threat icons. |
| `connect-src` | `'self' https://*.xyberah.com [VITE_BACKEND_URL origin] https://api.razorpay.com ...` | Authorizes REST APIs, Honeypot feeds, DNS-over-HTTPS queries, threat feeds, and Razorpay telemetry. **Task 106:** Injected automatically at build time from `VITE_BACKEND_URL` in `vite.config.ts`. CloudFront sandboxes (e.g. `https://dbfy5oxx2x1eg.cloudfront.net`) are added cleanly without manual HTML edits. Strict prohibition against wildcards (`*`, `https:`). |
| `frame-src` | `'self' blob: data: https://api.razorpay.com` | Authorizes sandboxed isolated previews and Razorpay authentication modals. |
| `frame-ancestors` | `'none'` | Blocks the entire frontend from being embedded inside any foreign iframe (stronger replacement for `X-Frame-Options: DENY`). |
| `object-src` | `'none'` | Fully blocks legacy plugins (Flash, Java Applets, ActiveX). |
| `base-uri` | `'self'` | Prevents malicious `<base>` tag injection attacks. |
| `form-action` | `'self'` | Restricts form submissions to same origin. |

---

## 3. Recommended HTTP Security Headers

In addition to CSP, Arpit should configure the following response headers:

| Header | Value | Purpose |
| :--- | :--- | :--- |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year, including all subdomains. |
| **X-Content-Type-Options** | `nosniff` | Prevents browsers from MIME-sniffing away from declared Content-Type. |
| **X-Frame-Options** | `DENY` | Legacy fallback for older browsers to prevent clickjacking. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Protects sensitive URL query parameters on outbound links. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()` | Disables browser access to unused hardware and APIs. |
| **Cross-Origin-Opener-Policy** | `same-origin` | Isolates browsing context from cross-origin popups/tabs. |

---

## 4. AWS CloudFront Setup Guide

Arpit can apply these headers without server code changes using a **CloudFront Response Headers Policy**:

1. In the **AWS CloudFront Console**, navigate to **Policies** &rarr; **Response headers**.
2. Click **Create response headers policy**.
3. Name: `Antitode-Frontend-Security-Headers`.
4. Under **Security headers**:
   - **Strict-Transport-Security (HSTS)**: Enable &bull; `max-age=31536000`, check `IncludeSubdomains` and `Preload`.
   - **X-Content-Type-Options**: Enable (`nosniff`).
   - **X-Frame-Options**: Enable (`DENY`).
   - **Referrer-Policy**: Enable (`strict-origin-when-cross-origin`).
   - **Content-Security-Policy**: Enable &bull; Paste the directive string from Section 2 above &bull; Leave "Override" checked.
5. Under **Custom headers**, add:
   - Header: `Permissions-Policy` &bull; Value: `camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()`
   - Header: `Cross-Origin-Opener-Policy` &bull; Value: `same-origin`
6. Click **Create**.
7. Navigate to your **CloudFront Distribution** &rarr; **Behaviors** &rarr; Edit default behavior `(*)` &rarr; Under **Response headers policy**, select `Antitode-Frontend-Security-Headers` &rarr; **Save changes**.

---

## 5. Nginx Configuration Snippet (Alternative / Web Server)

If serving via Nginx or an EC2 reverse proxy:

```nginx
# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.xyberah.com https://api.rss2json.com https://dns.google https://cloudflare-dns.com https://otx.alienvault.com https://www.virustotal.com https://feodotracker.abuse.ch https://threatfox-api.abuse.ch https://urlhaus-api.abuse.ch https://bazaar.abuse.ch https://raw.githubusercontent.com; frame-src 'self' blob: data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" always;
```
