import express from "express";
import open from "open";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3002;

// Replace with the Client ID / Secret you copied, or set env vars before running
const CLIENT_ID = process.env.GMAIL_API_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_API_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("no GMAIL_API_CLIENT_ID or GMAIL_API_CLIENT_SECRET in env vars");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
// Request send + readonly so server can send and read thread messages
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "email",
  "profile",
];

const app = express();

app.get("/", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // force refresh token on first run
  });
  console.log("Open this URL in your browser:\n", authUrl);
  open(authUrl);
  res.send(
    'Opening Google consent screen... If nothing opens, copy the URL from the terminal and open it manually.'
  );
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing code in callback");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    // tokens.refresh_token will be provided on first consent (or if prompt=consent)
    console.log("TOKENS:", tokens);
    res.send(
      `<pre>Got tokens. Check terminal.\n\nRefresh token: ${tokens.refresh_token || "<none returned>"}\n\nClose this page.</pre>`
    );
    console.log("\n=== COPY THESE INTO quotely-app/.env ===\n");
    console.log("GMAIL_API_CLIENT_ID=", CLIENT_ID);
    console.log("GMAIL_API_CLIENT_SECRET=", CLIENT_SECRET);
    console.log("GMAIL_API_REFRESH_TOKEN=", tokens.refresh_token);
    console.log("GMAIL_API_SENDER=youremail@example.com");
    console.log("\nIf refresh_token is empty, re-run with prompt=consent and ensure you revoke previous grant for this app in Google Account > Security > Third-party access.");
    process.exit(0);
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.status(500).send("Token exchange failed. See terminal.");
  }
});

app.listen(PORT, () => {
  console.log(`Listening for OAuth callback on http://localhost:${PORT}/oauth2callback`);
  console.log("Open http://localhost:3002/ to start the flow.");
});
