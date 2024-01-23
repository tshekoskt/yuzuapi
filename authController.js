// authController.js
const jwt = require("jsonwebtoken");
const cors = require("cors");
const express = require('express');
const app = express();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const request = require('request');
const User = require('./models/user'); // Adjust the path to your User model
const EmailService = require('./emailService');
const EmailServiceInstace = new EmailService();
const fs = require("fs").promises;
const constants = require('./constants');
// Import other required modules

// Define functions for register, login, and reset-password'

app.use(cors({
  origin: '*'
}));

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (!bearerHeader) {
    return res.status(401).send("Access Denied");
  }
  const bearer = bearerHeader.split(" ");
  const bearerToken = bearer[1];
  req.token = bearerToken;
  jwt.verify(req.token, "secretkey", (error, data) => {
    if (error) {
      return res.status(401).send("Invalid Token");
    }
    req.userId = data.userId;
    next();
  });
};


app.post('/register', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).send({
        statusCode: 400,
        message: 'User already exists',
      });
    }

    const otp = randomstring.generate({
      length: 6,
      charset: 'numeric',
    });

    let newUser;

    if (req.body.isAdmin) {
      let temporaryPassword = randomstring.generate({
        length: 8,
        charset: 'alphanumeric',
      });

      // Check if the password meets the requirements
      let hasUppercase = /[A-Z]/.test(temporaryPassword);
      let hasLowercase = /[a-z]/.test(temporaryPassword);
      let hasNumber = /[0-9]/.test(temporaryPassword);

      if (hasUppercase && hasLowercase && hasNumber) {
        // Password meets the requirements, assign it to newUser
        newUser = {
          password: temporaryPassword,
        };
      } else {
        // Regenerate the password until it meets the requirements
        while (!(hasUppercase && hasLowercase && hasNumber)) {
          temporaryPassword = randomstring.generate({
            length: 8,
            charset: 'alphanumeric',
          });

          hasUppercase = /[A-Z]/.test(temporaryPassword);
          hasLowercase = /[a-z]/.test(temporaryPassword);
          hasNumber = /[0-9]/.test(temporaryPassword);
        }

        newUser = {
          password: temporaryPassword,
        };
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // or true if required
        auth: {
          user: 'yuzuxapp@gmail.com',
          pass: 'Keeya6262#',
        },
      });

      const mailOptions = {
        from: 'yuzuxapp@gmail.com',
        to: req.body.email,
        subject: 'Admin Account Information',
        text: `Your admin account has been created.\n
            Username: ${req.body.name}\n
            Email: ${req.body.email}\n
            Temporary Password: ${temporaryPassword}\n
            Please use this information to login.`,
      };

      transporter.sendMail(mailOptions, async function (error, info) {
        if (error) {
          console.error(error);
          return res.status(500).send({
            statusCode: 500,
            message: 'Failed to send email',
          });
        }        
      });    

      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        phone: req.body.phone,
        isverified: true, // Assuming admin accounts are verified by default
        isAdmin: true,
        userGroup: req.body.userGroup,
      });

      await newUser.save();
      res.send({
        statusCode: 200,
        message: 'Admin account created. Please check your email for login information.',
      });
    } else {
      const options = {
        method: 'GET',
        url: `https://www.xml2sms.gsm.co.za/send/?username=anisadefreitas&password=bulkgde2023&number=${req.body.phone}&message=Your Yuzu OTP for registration is ${otp}&ems=1`,
      };

      request(options, async function (error, response, body) {
        if (error) {
          console.error(error);
          return res.status(500).send({
            statusCode: 500,
            message: 'Failed to send OTP via SMS',
          });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        newUser = new User({
          name: req.body.name,
          email: req.body.email,
          password: hashedPassword,
          phone: req.body.phone,
          otp: otp,
          isverified: false,
          isAdmin: false,
        });

        //registration confirmation email 
      try{
        var subject = 'Admin Account Information';
        var body = await fs.readFile("./emailTemplates/registrationTemplate.html");
        var data = body.toString();
        data = data.replace("[User Name]", req.body.name)
        .replace("[Username]", req.body.email)
        .replace("[TemporaryPassword]", hashedPassword)
        .replace("[Email]", req.body.email)
        .replaceAll("[Support Email Address]", constants.SUPPORT_EMAIL);
        var results = await EmailServiceInstace.sendReviewHtmlBody(req.body.email, data, subject);
      }
      catch(error){
        console.error(error);
        return res.status(500).send({
          statusCode: 500,
          message: 'Failed to send email',
        });
      }

        await newUser.save();
        res.send({
          statusCode: 200,
          message: 'OTP has been sent to your mobile number. Please use it to verify your account.',
        });
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Internal server error',
    });
  }
});




app.patch("/update-profile", async (req, res) => {
  try {
    /*const userId = req.body._id; // Assuming you have the user ID in the request body
    const newName = req.body.name; // New name value
    const newSurname = req.body.surname; // New surname value */

    console.log("req.body : ", req.body);
    const user = await User.findById(req.body._id);
    if (!user) {
      return res.status(404).send({
        statuscode: 404,
        message: "User not found"
      });
    }

    /* user.name = req.body.name;
     //user.surname = newSurname;
     user.address = req.body.address;
     user.city = req.body.city;
     user.province = req.body.province;
     user.postalcode = req.body.postalcode;
     user.email = req.body.email;
     user.phone = req.body.phone;*/

    //await user.save();

    var _user = await User.findByIdAndUpdate(
      { _id: req.body._id },
      {
        address: req.body.address,
        name: req.body.name,
        isRentor: req.body.isRentor,
        city: req.body.city,
        province: req.body.province,
        postalcode: req.body.postalcode,
        email: req.body.email,
        phone: req.body.phone
      });

      
        var subject = 'Account Information change';
        var body = await fs.readFile("./emailTemplates/accountChangeTemplate.html");
        var data = body.toString();
        data = data.replace("[User Name]", req.body.name);       
        var results = await EmailServiceInstace.sendReviewHtmlBody(req.body.email, data, subject);
      

    res.send({
      statuscode: 200,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({
      statuscode: 500,
      message: "Internal server error"
    });
  }
});


// Route to Validate OTP
app.post("/validate-otp", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email
    });
    if (!user) {
      return res.status(404).send({
        statuscode: 404,
        message: "User not found"
      });
    }
    if (user.otp !== req.body.otp) {
      return res.status(400).send({
        statuscode: 400,
        message: "Incorrect OTP"
      });
    }
    user.otp = null;
    user.isverified = true;
    await user.save();
    const token = jwt.sign({
      userId: user._id
    }, "secretkey");
    res.send({
      statuscode: 200,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      statuscode: 500,
      message: "Internal server error"
    });
  }
});


//Route to forgot password using email password
//const request = require('request');



app.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({
        statuscode: 404,
        message: "User email does not exist"
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    await user.save();

    const options = {
      method: 'GET',
      url: `https://www.xml2sms.gsm.co.za/send/?username=anisadefreitas&password=bulkgde2023&number=${user.phone}&message=Your Yuzu OTP for password reset is ${otp}&ems=1`
    };

    request(options, function (error, response, body) {
      if (error) {
        console.error(error);
        return res.status(500).send({
          statuscode: 500,
          message: "Failed to send OTP via SMS"
        });
      }

      console.log(body);
      res.send({
        statuscode: 200,
        message: `Your Yuzu OTP for password reset has been sent to ${user.phone}`
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      statuscode: 500,
      message: "Internal server error"
    });
  }
});




//Route to reseting user password
app.post("/reset-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).send({ statuscode: 400, message: "User not found" });
    }
    if (user.otp !== req.body.otp) {
      return res.status(400).send({ statuscode: 400, message: "Incorrect OTP" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.otp = null;
    await user.save();
    res.send({ statuscode: 200, message: "Password reset successful" });
  } catch (error) {
    res.status(400).send({ statuscode: 400, message: error.message });
  }
});

app.post("/reset-passwords", async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).send({ statuscode: 400, message: "User not found" });
    }
    const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({ statuscode: 400, message: "Incorrect current password" });
    }
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.send({ statuscode: 200, message: "Password reset successful" });
  } catch (error) {
    res.status(400).send({ statuscode: 400, message: error.message });
  }
});



//Get user by id
app.get('/users', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.query.id);
    if (!user) {
      return res.status(404).json({
        statuscode: 404,
        message: 'User not found'
      });
    }
    res.json({
      statuscode: 200,
      message: 'User found',
      user
    });
  } catch (error) {
    res.status(500).json({
      statuscode: 500,
      message: error.message
    });
  }
});

app.get('/adminusers', async (req, res) => {
  try {
    const adminUsers = await User.find({ isAdmin: true });

    if (adminUsers.length === 0) {
      return res.status(404).json({
        statuscode: 404,
        message: 'No admin users found'
      });
    }

    res.json({
      statuscode: 200,
      message: 'Admin users found',
      users: adminUsers
    });
  } catch (error) {
    res.status(500).json({
      statuscode: 500,
      message: error.message
    });
  }
});

app.get('/getadminuser', async (req, res) => {
  try {
    if (!req.query.isAdmin) {
      return res.status(403).json({
        statuscode: 403,
        message: 'Forbidden: You are not authorized to access this resource.'
      });
    }

    const { id } = req.query;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        statuscode: 404,
        message: 'User not found'
      });
    }

    res.json({
      statuscode: 200,
      message: 'User found',
      user
    });
  } catch (error) {
    res.status(500).json({
      statuscode: 500,
      message: error.message
    });
  }
});




//Route to logout
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    statuscode: 200,
    message: 'Logout successful'
  });
});


// Route to Login a User
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        statuscode: 404,
        message: "Cannot find user",
      });
    }
    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) {
      return res.status(401).json({
        statuscode: 401,
        message: "Incorrect password",
      });
    }
    const token = jwt.sign({ userId: user._id }, "secretkey");
    res.json({
      statuscode: 200,
      message: "Login successful",
      token,
      userId: user._id,
    });
  } catch (error) {
    res.status(400).json({
      statuscode: 400,
      message: error.message,
    });
  }
});




app.get("/userss", async (req, res) => {
  try {
    const users = await User.find();
    res.send({
      statuscode: 200,
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      statuscode: 500,
      message: "Internal server error"
    });
  }
});

module.exports = app;
