const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
    user: gmailEmail,
        pass: gmailPassword,
  },
});


exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  // send welcome email to users when signed up using Auth
  const email = user.email; // The email of the user.
  const displayName = user.displayName; // The display name of the user.

  const mailOptions = {
    from: '"Influencer Corp." <noreply@influencer.com>',
    to: email,
  };

  // Building Email message.
  mailOptions.subject = 'Thanks and Welcome!';
  mailOptions.text = 'Thanks you for signing up to our platform!';

  try {
    await mailTransport.sendMail(mailOptions);
    console.log(`New signup confirmation email sent to:`, email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
  }
  return null;
});

