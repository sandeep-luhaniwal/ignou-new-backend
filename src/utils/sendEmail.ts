import nodemailer from "nodemailer"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  })

  const mailOptions = {
    from: `"IGNOUPower" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html
  }

  await transporter.sendMail(mailOptions)
}
