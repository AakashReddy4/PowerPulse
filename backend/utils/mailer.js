const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: `"PowerPulse" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your OTP Verification Code',
    html: `
      <h2>OTP Verification</h2>
      <p>Your verification code is:</p>
      <h1>${otp}</h1>
      <p>This code expires in 5 minutes.</p>
    `
  }

  await transporter.sendMail(mailOptions)
}

module.exports = { sendOTPEmail }