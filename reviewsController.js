const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const request = require('request');
//const models = require('./models');
const RentalItem = require('./models/rental');
const RentalProduct = require('./models/rentalProducts');
const userSchema = require('./models/user');
const transactionSchema = require('./models/transaction');
const EmailService = require('./emailService');
const EmailServiceInstace = new EmailService();
const PaymentService = require("./paymentService");
const paymentService = new PaymentService();
const constants = require('./constants');

app.use(bodyParser.json({ limit: '35mb' }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 50000,
  }),
);

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

app.post("/request-review", async (req, res) => {
  try {
    // Check if the user has rented the item before requesting a review
    const rentedProduct = await RentalProduct.findOne({
      _id: req.body.rentedItemId,
      rentedBy: req.userId,
    });

    if (!rentedProduct) {
      return res.status(403).send("You are not authorized to request a review for this item");
    }

    // Check if the review has already been requested for this rental
    if (rentedProduct.reviewComments.length > 0) {
      return res.status(400).send("Review for this rental has already been requested");
    }

    // Add the review request to the rental product
    rentedProduct.reviewComments.push({
      user: req.userId,
      text: "Review request sent",
      // You can add more properties like date, status, etc. based on your requirements
    });

    await rentedProduct.save();

    // Send an email to the user requesting the review
    const emailBody = `
      <html>
        <body>
          <h2>Review Request</h2>
          <p>Dear User,</p>
          <p>We hope you enjoyed your recent rental. Please take a moment to leave a review for the item.</p>
          <p>Thank you!</p>
        </body>
      </html>
    `;
    const mailOptions = {
      from: constants.YUZU_EMAIL,
      to: req.body.email,
      subject: 'Request for Review Yuzu item rental',
      html: emailBody,
    };

    await emailService.sendEmail(mailOptions);

    res.send("Review request sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = app;
