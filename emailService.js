const nodemailer = require("nodemailer");

class EmailService{


    /***
     * user: 'yuzuxapp@gmail.com',
          pass: 'Keeya6262#',
     * 
     */
transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // or true if required
    auth: {
      user: 'yuzuxapp@gmail.com',
      pass: 'Keeya6262#',
    },
  });

async sendCancelationEmail(to, body, subject){

  const mailOptions = {
    from: 'yuzuxapp@gmail.com',
    to:to,
    subject: subject,
    text: body,
  };

  this.transporter.sendMail(mailOptions, async function (error, info) {
    if (error) {
      console.error(error);
      return {code: 500, message: 'Failed to send email'}
  
    }else{
        return {code: 200, message: 'Success'}
    }
    
  });
}
}

module.exports = EmailService