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
const rentalProducts = require('./models/rentalProducts');

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

app.post("/post-review", async (req, res) => {
  try {
    // Check if the user has rented the item before posting a review
    const rentedItem = await RentalItem.findOne({
      _id: req.body.rentedItemId,
      createdBy: req.body.userId,
    });

    // Check if the person posting the review is the same person who rented the item

    // Check if the rented item was received by the rentor
    if (!rentedItem || rentedItem.returned !== true) {
      return res.status(400).send("Item was not received by the rentor");
    }

    if (rentedItem.createdBy.toString() !== req.body.userId) {
      return res.status(403).send("You are not authorized to post a review for this item");
    }


    // Find the associated RentalProduct
    const rentalProduct = await RentalProduct.findOne({
      _id: rentedItem.productId,
    });

    if (!rentalProduct) {
      return res.status(400).send("Associated RentalProduct not found");
    }

    // Check if the review has already been posted for this rental
    const existingReview = rentalProduct.reviewComments.find(comment => comment.user == req.body.userId);
    if (existingReview) {
      return res.status(400).send("Review for this rental has already been posted");
    }

    // Add the review to the rental product
    rentalProduct.reviewComments.push({
      user: req.body.userId,
      name: req.body.name,
      text: req.body.reviewText,
      rating: req.body.rating,
    });

    await rentalProduct.save();

    res.status(201).send("Review posted successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/get-reviews/:productId", async (req, res) => {
  try {
    // Find the associated RentalProduct
    const rentalProduct = await RentalProduct.findOne({
      _id: req.params.productId,
    });

    if (!rentalProduct) {
      return res.status(404).send("Product not found");
    }

    // Return the reviews for the product
    res.status(200).json(rentalProduct.reviewComments);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/rental/average-rating/:productId", async (req, res) => {
  try {
    const rentalProduct = await RentalProduct.findOne({ _id: req.params.productId });

    if (!rentalProduct) {
      return res.status(404).send("Product not found");
    }

    if (rentalProduct.reviewComments.length === 0) {
      return res.status(200).send("No reviews found for this product");
    }

    const totalRating = rentalProduct.reviewComments.reduce((total, review) => total + review.rating, 0);
    const averageRating = totalRating / rentalProduct.reviewComments.length;

    res.status(200).json({ averageRating });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



module.exports = app;
