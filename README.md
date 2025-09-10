# AWS Lambda — Cognito Signup & Login (TypeScript)

> This README documents a **TypeScript AWS Lambda-ready** implementation for user **registration, confirmation, login, and resend confirmation** using **Amazon Cognito**. It contains:
>
> 1. The Lambda-ready TypeScript code (Express app + Lambda wrapper).
> 2. Deployment & local run steps.
> 3. Security measures implemented.
> 4. Performance / resource / security improvement suggestions (analysis).
> 5. IAM requirements, environment variables, and interview-ready checklist.

---

# 1 — What this delivers (summary)

* A **TypeScript Express** app (`src/app.ts`) that implements:
* The Base Url is  [https://f56leuye1e.execute-api.us-east-1.amazonaws.com/dev]("https://f56leuye1e.execute-api.us-east-1.amazonaws.com/dev")
  
  * `POST /signup` — create user (email, firstName, lastName, password)
  * `POST /confirm-user` — confirm signup with code
  * `POST /login` — returns tokens and user attributes
  * `POST /resend` — resend confirmation code
  * `GET /server-health` — simple health/test route
* A **Lambda wrapper (`src/index.ts`)** that uses `aws-serverless-express` to expose the app via API Gateway.
* Secure-by-default patterns: no secrets in code, minimal logging of PII, input validation suggestions.
* Analysis of performance, security, and cost improvements.

   You can view the full API documentation [here](https://documenter.getpostman.com/view/15764037/2sB3HnLLFK).

---

# 2 — Files / Code

> Place the TypeScript files in `ts/`. Build outputs go to `src/` instead of `dist/`. 




---


# 3 — tsconfig.json (suggested)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "../src",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["*.ts", "../ts/app.ts", "index.ts"]
}
```


---

# 4 — Environment variables (required)

* `REGION` — AWS region of the User Pool (e.g., `us-east-1`)
* `COGNITO_CLIENT_ID` — App client ID (Web client, no secret)

Set these in Lambda console under **Configuration -> Environment variables** or via your IaC.

---

# 5 — How to build & deploy (quick)

1. Install deps:

   ```bash
   npm ci
   ```
2. Build:

   ```bash
   npm run build
   ```
3. First run `npm run build` from the `ts/` and then run 
   ```bash 
   amplify push
   ```

---

# 6 — Logging / Monitoring

* Logs go to **CloudWatch Logs** (Lambda default). Use structured logs for better search.
* Suggest enabling **CloudWatch Alarms** for high error rate, auth failures, or throttles.
* In production replace `console` with a structured logger (winston/pino) that supports log levels and JSON output.

---

# 7 — Security measures included (explicit)

1. **No secrets in code** — `COGNITO_CLIENT_ID` and `REGION` from env.
3. **Input validation** — required fields checked before calling Cognito (basic).
4. **Least privilege IAM** — example policy restricts to required Cognito actions; scope to pool resource.
5. **No token storage** — tokens are returned; service doesn’t persist them.
6. **CORS** — enabled but currently wide open: *restrict in prod*.
7. **Error scrubbing** — API returns friendly messages; internal errors logged without leaking secrets.

---

# 8 — Suggestions & Improvements (analysis)

### Performance & resource utilization

* **Keep-alive / HTTP agent**: configure AWS SDK client with HTTP keep-alive to reuse connections and reduce TLS overhead.
* **Cold start mitigation**:

  * Keep SDK client outside the handler (already done).
  * Use **AWS Lambda Provisioned Concurrency** if strict latency SLAs.
  * Use Node14+/Node18 on **ARM64** for cost/performance improvements.
* **Bundle smaller**: only include needed SDK clients; use esbuild to reduce package size.
* **Tune memory**: measure invocation duration and tune memory to optimal point for cost vs speed.

### Security improvements

* **Rate limiting**: protect `signup`, `login`, `resend` endpoints (API Gateway throttle + WAF rules).
* **Bot mitigation**: AWS WAF + CAPTCHA on UI, or suspicious client detection.
* **Account enumeration**: normalize responses (e.g., same message whether user exists or not) to avoid revealing user presence.
* **MFA & stronger auth**: enable MFA or passwordless options (email/SMS OTP or passkeys) for higher assurance.
* **JWT validation**: for downstream APIs, validate tokens against Cognito JWKS to avoid trusting unvalidated tokens.
* **Secrets management**: if you later use client secrets, store them in **Secrets Manager** or **Parameter Store** (KMS encrypted).
* **Audit logging**: produce structured audit logs (who, what, when, outcome, IP) and ship to SIEM/CloudWatch Logs Insights.
* **Penetration testing**: test signup/login flows for abuse, injection, and logic flaws.

### Operational & cost

* **Log level control**: decrease log verbosity in prod to reduce CloudWatch costs.
* **Alarms**: set alarms on error rates, latency increases, and throttle count.
* **Retry strategy**: use reasonable retries on transient errors, but limit excessive retries that increase cost.

---

# 9 — Interview-ready checklist

* [x] Code compiles (`npm run build`) and `dist/index.js` contains built handler.
* [x] Environment variables configured in Lambda.
* [x] Cognito App Client (Web) configured with `USER_PASSWORD_AUTH` and no client secret.
* [x] Lambda role contains minimum required Cognito permissions scoped to pool.
* [x] API Gateway configured to invoke Lambda for the routes described.
* [x] Test users created and flows verified: signup → confirm → login → get attributes.
* [x] CloudWatch logs show structured “signup/login” events without sensitive data.
* [x] Can explain and demonstrate improvement items: WAF, keep-alive, JWT validation, MFA.

---

# 10 — Quick FAQs

**Q: Why not store passwords?**
A: Cognito handles password storage & secure verification. The backend never stores raw passwords — only sends to Cognito over HTTPS.

**Q: How to protect against brute force?**
A: Use Cognito built-in account lockout/rate limits, API Gateway throttling, and AWS WAF rate-based rules.

**Q: How to scale?**
A: Lambda auto-scales. Improve cold-starts with provisioned concurrency; keep handler lightweight and client outside the handler.

**Q: How to include user attributes in token?**
A: Configure Cognito to include custom attributes or map claims to ID token. Alternatively, after login call GetUser (current flow).

