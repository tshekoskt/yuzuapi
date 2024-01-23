const nodemailer = require("nodemailer");
const constants = require('./constants');
const fs = require('fs');
const path = require('path');

class EmailService {

  constructor() {
    this.transporter = nodemailer.createTransport({
      pool: true,
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: constants.YUZU_EMAIL,
        pass: constants.YUZU_PASS,
      },
    });
  }

  async sendQueryEmail(name, email, data, subject) {
    const mailOptions = {
      from: constants.YUZU_EMAIL, // sender address
      to: email, // receiver address
      subject: subject, // Subject line
      html: data // html body
    };

    try {
      let info = await this.transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error occurred while sending email:', error);
    }
  }

  async sendEmail(options) {
    try {
      const info = await this.transporter.sendMail(options);
      this.transporter.close();
      return { code: 200, message: 'Success', info };
    } catch (error) {
      console.error(error);
      this.transporter.close();
      throw new Error('Failed to send email');
    }
  }

  async sendCancelationEmail(to, body, subject) {
    const mailOptions = {
      from: constants.YUZU_EMAIL,
      to,
      subject,
      text: body,
    };
    return this.sendEmail(mailOptions);
  }

  async sendReviewHtmlBody(to, body, subject) {
    const mailOptions = {
      from: constants.YUZU_EMAIL,
      to,
      subject,
      html: body,
    };
    return this.sendEmail(mailOptions);
  }
}

module.exports = EmailService;
