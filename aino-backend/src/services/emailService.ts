import nodemailer from 'nodemailer';

// Configure the transport using environment variables or fallback to a default/mock for development
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal-pass',
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AINO Support" <support@aino.com>',
      to,
      subject,
      text,
    });
    console.log(`Message sent: ${info.messageId}`);
    
    // Preview only available when sending through an Ethereal account
    if (process.env.SMTP_HOST !== 'smtp.ethereal.email') {
       console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Could not send email');
  }
};
