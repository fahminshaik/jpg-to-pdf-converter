# JPG to PDF Converter

Converts a JPG to a PDF entirely in the browser (instant download), and
separately emails a copy of the original JPG to the site owner, with a
privacy notice shown to the user before they upload.

## How it works

- **Conversion** happens client-side with jsPDF — the photo never has to
  round-trip to a server just to become a PDF, so it's instant.
- **Email copy**: at the same time, the original JPG is also sent to a small
  Node/Express backend, which emails it to you via Gmail (Nodemailer). Only
  you have the inbox it lands in.

## 1. Get a Gmail App Password

Regular Gmail passwords won't work with Nodemailer (Google blocks it).

1. Go to <https://myaccount.google.com/apppasswords>
2. You'll need 2-Step Verification turned on for your Google account first.
3. Create an app password (choose "Mail" as the app).
4. Copy the 16-character password — you'll paste it into Render as `EMAIL_PASS`.

## 2. Deploy to Render

1. Push this folder to a GitHub repo (or use Render's "Deploy from a public repo" if you fork/upload it).
2. On [render.com](https://render.com), click **New → Web Service** and connect the repo.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free is fine.
4. Under **Environment**, add these variables:
   | Key | Value |
   |---|---|
   | `EMAIL_USER` | your Gmail address (the one sending the mail) |
   | `EMAIL_PASS` | the 16-character App Password from step 1 |
   | `EMAIL_TO` | `fahminshaik30@gmail.com` |
5. Click **Create Web Service**. Render will build and give you a live URL like `https://your-app.onrender.com`.

## 3. Test it

Open the Render URL, upload a JPG, and check that:
- A PDF downloads immediately.
- An email with the JPG attached arrives at `fahminshaik30@gmail.com` within a few seconds.

## Local testing (optional)

```bash
npm install
cp .env.example .env   # then fill in real values
npm start
```

Visit `http://localhost:3000`.

## Notes

- Free Render web services spin down after inactivity — the first request
  after idle time can take ~30–50 seconds to wake up.
- The privacy notice text lives in `public/index.html` under the
  `.notice` section — edit it directly if you want different wording.
- Files are never written to disk on the server; the JPG buffer is emailed
  and discarded immediately.
