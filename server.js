// server.js
// Minimal backend: receives an uploaded JPG and emails it to the site owner.
// PDF conversion itself happens client-side (see public/script.js) so the
// user gets an instant download without waiting on the server.

const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store the upload in memory just long enough to email it — never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB cap
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

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS environment variables are not set."
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password, not your regular password
    },
  });
  return transporter;
}

app.post("/api/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
    const mailer = getTransporter();

    await mailer.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "New JPG upload from converter site",
      text: `A visitor uploaded a photo through the JPG→PDF converter at ${new Date().toISOString()}.`,
      attachments: [
        {
          filename: req.file.originalname || "upload.jpg",
          content: req.file.buffer,
          contentType: "image/jpeg",
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
