const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Mail Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

app.post("/api/enquiry", async (req, res) => {
  try {
    console.log("Received:", req.body);

    // 1. Send to Sembark CRM
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
      },
    );

    console.log("Sembark Response:", sembarkResponse.data);

    await transporter.verify();
    console.log("SMTP Connected Successfully");

    // 2. Send Email to KOH + Privyr
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: [
        "info@kingdomofholidays.com",
        "cbWR9lQS-4yEwc8KF@v1-incoming-leads.privyr.com",
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
    });

    console.log("Emails sent successfully");

    res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      sembark: sembarkResponse.data,
    });
  } catch (error) {
    console.log("ERROR HIT");

    console.error("Error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
