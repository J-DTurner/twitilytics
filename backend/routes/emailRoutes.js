const express = require('express');
const { sendArchiveInstructionsEmail, sendWaitlistConfirmationEmail } = require('../utils/mailer');

const router = express.Router();

router.post('/send-archive-instructions', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }
  try {
    await sendArchiveInstructionsEmail(email);
    return res.status(200).json({ success: true, message: 'Archive instructions email sent.' });
  } catch (error) {
    console.error('Error sending archive instructions:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email. Please try again later.' });
  }
});

router.post('/join-waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }
  try {
    // TODO: persist email in waitlist storage
    await sendWaitlistConfirmationEmail(email);
    return res.status(200).json({ success: true, message: 'Joined waitlist and confirmation sent.' });
  } catch (error) {
    console.error('Error processing waitlist:', error);
    return res.status(500).json({ success: false, message: 'Failed to process waitlist request. Please try again later.' });
  }
});

module.exports = router; 