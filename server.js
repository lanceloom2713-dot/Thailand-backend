const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
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
    console.log("================================");
    console.log("Received Lead:", req.body);

    // 1. Send to Sembark
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

    // 2. Check SMTP
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS EXISTS:", !!process.env.EMAIL_PASS);

    console.log("Verifying SMTP...");

    await transporter.verify();

    console.log("SMTP Connected Successfully ✅");

    // 3. Send Email
    console.log("Sending Email...");

    const mailResult = await transporter.sendMail({
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

        <hr/>

        <p><strong>Comments:</strong></p>
        <pre>${req.body.comments || "N/A"}</pre>
      `,
    });

    console.log("Email Sent Successfully ✅");
    console.log(mailResult.messageId);

    return res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      sembark: sembarkResponse.data,
    });
  } catch (error) {
    console.error("ERROR HIT ❌");
    console.error("Error Details:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});