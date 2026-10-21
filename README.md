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

## AI Support Assistant

The website's chat assistant (`POST /api/v1/chat`) answers from the site's own
data (retrieval-augmented generation) using Gemini 3.1 Flash-Lite.

- `GEMINI_API_KEY`: key from https://aistudio.google.com/apikey (use a billing-enabled project for production)
- `CHAT_DAILY_LIMIT`: max replies per day across all visitors (default 2000), a cost guard
- Optional: `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`, `BLOG_SOURCE_PATH`

Build or refresh the knowledge base after changing products, blog posts or
`data/knowledge.md`:

```bash
npm run ingest:knowledge
```

This embeds every product, blog section and `data/knowledge.md` section into the
`knowledgechunks` collection (only changed chunks are re-embedded) and creates an
Atlas Vector Search index. Without Atlas Vector Search the chat falls back to an
in-memory similarity search, which is fine at this size.
