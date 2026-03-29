const twilio = require("twilio");

/* ===============================
   INIT TWILIO
================================= */
if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn("⚠ Twilio credentials not configured");
}

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* ===============================
   SINGLE SMS
================================= */
const sendSMS = async (to, message) => {
  try {
    if (!to) {
      console.warn("⚠ Missing phone number");
      return;
    }

    const res = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to
    });

    console.log(`📩 SMS → ${to} | SID: ${res.sid}`);

  } catch (err) {
    console.error("❌ SMS Error:", err.message);
  }
};

/* ===============================
   BULK SMS (SAFE + DELAY)
================================= */
const sendBulkSMS = async (numbers, message) => {
  try {
    if (!numbers || numbers.length === 0) {
      console.warn("⚠ No numbers for bulk SMS");
      return;
    }

    for (const num of numbers) {
      await sendSMS(num, message);

      // 🔥 prevent rate limit
      await new Promise(r => setTimeout(r, 200));
    }

  } catch (err) {
    console.error("❌ Bulk SMS Error:", err.message);
  }
};

module.exports = { sendSMS, sendBulkSMS };