import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Generate test account if ethereal credentials are not in env
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      logger.info(`Ethereal email test account created: ${testAccount.user}`);
    } catch (err) {
      logger.warn(`Failed to create Ethereal test account: ${err.message}. Falling back to console logging.`);
      transporter = {
        sendMail: async (mailOptions) => {
          logger.info(`[MOCK EMAIL SENT] To: ${mailOptions.to} | Subject: ${mailOptions.subject} | Text: ${mailOptions.text}`);
          return { messageId: 'console-mock-id' };
        }
      };
    }
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailer = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"DevSecOps Dashboard" <security@devsecops.local>',
      to,
      subject,
      text,
      html
    };

    const info = await mailer.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    if (nodemailer.getTestMessageUrl && info.messageId !== 'console-mock-id') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Email Preview URL: ${previewUrl}`);
      }
    }
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    throw error;
  }
};
