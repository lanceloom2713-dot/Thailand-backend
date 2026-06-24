const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ==========================
// Gmail SMTP (Force IPv4)
// ==========================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

app.post("/api/enquiry", async (req, res) => {
  try {
    console.log("=================================");
    console.log("Received Lead:", req.body);

    // ==========================
    // Send Lead To Sembark
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
    // Send Success Response First
    // ==========================
    res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      sembark: sembarkResponse.data,
    });

    // ==========================
    // Email In Background
    // ==========================
    console.log("Sending Email...");

    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: [
          "info@kingdomofholidays.com",
          process.env.PRIVYR_EMAIL,
        ],
        subject: "🔥 New Lead - Kingdom Of Holidays",

        html: `
          <h2>New Enquiry Received</h2>

          <p><strong>Name:</strong> ${req.body.name}</p>
          <p><strong>Phone:</strong> ${req.body.phone_number}</p>
          <p><strong>Destination:</strong> ${req.body.destination}</p>
          <p><strong>Travel Date:</strong> ${req.body.start_date}</p>
          <p><strong>Adults:</strong> ${req.body.no_of_adults}</p>
          <p><strong>Children:</strong> ${req.body.no_of_children}</p>
          <p><strong>Total Days:</strong> ${req.body.no_of_days}</p>

          <hr />

          <p><strong>Comments:</strong></p>
          <pre>${req.body.comments || "N/A"}</pre>
        `,
      })
      .then((info) => {
        console.log("EMAIL SENT ✅");
        console.log(info.messageId);
      })
      .catch((err) => {
        console.error("EMAIL FAILED ❌");
        console.error(err.message);
      });
  } catch (error) {
    console.error("ERROR HIT ❌");

    console.error(
      error.response?.data ||
      error.message ||
      error
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

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});