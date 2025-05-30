const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const defaultSender = process.env.SENDER_EMAIL_ADDRESS || 'Twitilytics <noreply@twitilytics.com>';

const createBaseTemplate = (title, contentHtml) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>body{font-family:'Inter',Arial,sans-serif;margin:0;padding:0;background:#F5F8FA;color:#292F33}.container{max-width:600px;margin:40px auto;background:#FFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)}.header{background:#1DA1F2;padding:20px;text-align:center}.header img{max-width:150px;height:auto}.content{padding:30px;line-height:1.6}.button{display:inline-block;background:#F45D22;color:#FFF;padding:12px 25px;text-decoration:none;border-radius:5px;font-weight:600;margin-top:15px}.footer{background:#E1E8ED;padding:20px;text-align:center;font-size:12px;color:#657786}.footer a{color:#1DA1F2;text-decoration:none}</style></head><body><div class="container"><div class="header"><img src="https://your-logo-url.com/twitilytics-logo-white.png" alt="Twitilytics"></div><div class="content">${contentHtml}</div><div class="footer">&copy; ${new Date().getFullYear()} Twitilytics. All rights reserved.<br><a href="https://twitilytics.com">Visit Twitilytics</a> | <a href="https://twitilytics.com/privacy">Privacy Policy</a></div></div></body></html>`;

const archiveInstructionsHtml = `<h1>How to Download Your Twitter Archive</h1><p>Hello,</p><p>Download your Twitter archive:</p><ol><li>Log into Twitter on web.</li><li>Go to More > Settings and privacy > Your account > Download an archive of your data.</li><li>Verify identity and request archive.</li></ol><p>Once ready, extract and upload <strong>tweets.js</strong> on Twitilytics.</p><a href="https://twitilytics.com#file-upload" class="button">Return to Twitilytics</a><p>The Twitilytics Team</p>`;
const archiveInstructionsText = `How to Download Your Twitter Archive\n\nLog into Twitter on web. Go to More > Settings and privacy > Your account > Download an archive of your data. Verify identity and request archive. Once ready, extract tweets.js and upload at https://twitilytics.com#file-upload`;

const waitlistConfirmationHtml = `<h1>You're on the Waitlist!</h1><p>Thank you for joining the Twitilytics Agency waitlist. We'll notify you with updates on white-labeling and bulk pricing.</p><a href="https://twitilytics.com" class="button">Visit Twitilytics</a><p>The Twitilytics Team</p>`;
const waitlistConfirmationText = `You're on the Waitlist!\n\nThank you for joining the Twitilytics Agency waitlist. We'll notify you with updates on features.`;

const sendEmail = (to, subject, html, text) => {
  if (!resend) throw new Error('Email service not configured');
  return resend.emails.send({ from: defaultSender, to, subject, html, text });
};

function sendArchiveInstructionsEmail(to) {
  const subject = 'How to Download Your Twitter Archive for Twitilytics';
  const html = createBaseTemplate(subject, `<h1>How to Download Your Twitter Archive</h1><p>Please follow Twitter's steps to request and download your archive.</p><p>After you get it, upload <strong>tweets.js</strong> at <a href="https://twitilytics.com#file-upload">Twitilytics</a>.</p>`);
  const text = `How to Download Your Twitter Archive: request it via Settings > Download archive on Twitter, then upload tweets.js at https://twitilytics.com#file-upload`;
  return sendEmail(to, subject, html, text);
}

function sendWaitlistConfirmationEmail(to) {
  const subject = "You're on the Twitilytics Agency Waitlist!";
  const html = createBaseTemplate(subject, `<h1>You're on the Waitlist!</h1><p>Thanks for joining our agency waitlist. We'll notify you with feature updates.</p><a href="https://twitilytics.com" class="button">Visit Twitilytics</a>`);
  const text = `You're on the Waitlist! We'll notify you with updates at https://twitilytics.com`;
  return sendEmail(to, subject, html, text);
}

function sendReportLinkEmail(to, link) {
  if (!link) return Promise.reject(new Error('Missing report link'));
  const subject = 'Your Twitilytics Report is Ready!';
  const html = createBaseTemplate(subject, `<h1>Your Report is Ready!</h1><p>Access it here: <a href="${link}">${link}</a></p>`);
  const text = `Your Twitilytics report is ready: ${link}`;
  return sendEmail(to, subject, html, text);
}

module.exports = { sendArchiveInstructionsEmail, sendWaitlistConfirmationEmail, sendReportLinkEmail }; 