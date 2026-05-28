# Backend Setup

This backend powers the DSS product catalog and product enquiry flow.

## Environment Variables

Create a `backend/.env` file based on `backend/.env.example`.

Required values:

- `PORT`: backend port, usually `3001`
- `MONGODB_URI`: MongoDB connection string
- `SMTP_HOST`: SMTP server host used to send OTP emails
- `SMTP_PORT`: SMTP port, usually `587`
- `SMTP_SECURE`: set to `true` only if your SMTP provider requires TLS from the start
- `SMTP_USER`: SMTP username or email address
- `SMTP_PASS`: SMTP password or app password
- `SMTP_FROM`: sender address shown in the OTP email

## Enquiry Flow

- The enquiry starts by verifying the user's email through an OTP sent by email.
- The user then enters the verification code, phone country code, phone number, and message.
- The backend stores the product identity together with the enquiry record.
- The backend stores the verification state, OTP metadata, and the final enquiry payload.

## Run

```bash
npm install
npm start
```
