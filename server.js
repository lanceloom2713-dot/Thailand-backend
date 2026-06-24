const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ==========================
// BREVO SMTP
// ==========================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 2525,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

// ==========================
// SMTP VERIFY
// ==========================
(async () => {
  try {
    await transporter.verify();
    console.log("✅ Brevo SMTP Connected");
  } catch (err) {
    console.error("❌ SMTP Verify Error");
    console.error(err.message);
  }
})();

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// ==========================
// EMAIL TEST ROUTE
// ==========================
app.get("/test-email", async (req, res) => {
  try {
    const info = await transporter.sendMail({
      from: "Kingdom Of Holidays <info@kingdomofholidays.com>",
      to: "info@kingdomofholidays.com",
      subject: "Brevo Test Email 🚀",
      text: "SMTP is working successfully.",
    });

    console.log("✅ TEST EMAIL SENT");
    console.log(info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error("❌ TEST EMAIL FAILED");
    console.error(err.message);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ==========================
// ENQUIRY API
// ==========================
app.post("/api/enquiry", async (req, res) => {
  try {
    console.log("=================================");
    console.log("Received Lead:", req.body);

    // ==========================
    // SEND TO SEMBARK
    // ==========================
    console.log("Calling Sembark API...");

    const sembarkResponse = await axios.post(
      "https://api.sembark.com/integrations/v1/trip-plan-requests",
      req.body,
      {
        headers: {
          Authorization: `Bearer ${process.env.SEMBARK_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    console.log("Sembark Response:", sembarkResponse.data);

    // ==========================
    // SEND SUCCESS RESPONSE FIRST
    // ==========================
    res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      sembark: sembarkResponse.data,
    });

    // ==========================
    // EMAIL IN BACKGROUND
    // ==========================
    console.log("Sending Email...");

    transporter
      .sendMail({
        from: "Kingdom Of Holidays <info@kingdomofholidays.com>",

        to: [
          "info@kingdomofholidays.com",
          process.env.PRIVYR_EMAIL,
        ],

        subject: "🔥 New Lead - Kingdom Of Holidays",

        html: `
          <h2>New Enquiry Received</h2>

          <p><strong>Name:</strong> ${req.body.name || "N/A"}</p>
          <p><strong>Phone:</strong> ${req.body.phone_number || "N/A"}</p>
          <p><strong>Destination:</strong> ${req.body.destination || "N/A"}</p>
          <p><strong>Travel Date:</strong> ${req.body.start_date || "N/A"}</p>
          <p><strong>Adults:</strong> ${req.body.no_of_adults || "0"}</p>
          <p><strong>Children:</strong> ${req.body.no_of_children || "0"}</p>
          <p><strong>Total Days:</strong> ${req.body.no_of_days || "0"}</p>

          <hr />

          <p><strong>Comments:</strong></p>
          <pre>${req.body.comments || "N/A"}</pre>
        `,
      })
      .then((info) => {
        console.log("✅ EMAIL SENT");
        console.log("Message ID:", info.messageId);
      })
      .catch((err) => {
        console.error("❌ EMAIL FAILED");
        console.error(err.message);
      });
  } catch (error) {
    console.error("❌ ERROR HIT");

    console.error(
      error.response?.data ||
        error.message ||
        JSON.stringify(error, null, 2)
    );

    return res.status(500).json({
      success: false,
      error:
        error.response?.data ||
        error.message ||
        "Unknown Error",
    });
  }
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});