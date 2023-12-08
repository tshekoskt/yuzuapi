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
const EmailService = require('./emailService');
const EmailServiceInstace = new EmailService();

app.use(cors({
  origin:'*'
}));

app.use(bodyParser.json({limit: '35mb'}));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 50000,
  }),
);

 // Set the headers for the request (including your ShipLogic API key)
 const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer a601d99c75fc4c64b5a64288f97d52b4' // Replace with your actual ShipLogic API key
  });

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

/***
 * Look up courier-guy prices
 */
//verifyToken,
app.post("/delivery/courier-guy",  async (req, res) => {
  try {
    const requestModel = {
        "collection_address": {
          "type": "business",
          "company": "uAfrica.com",
          "street_address": "116 Lois Avenue",
          "local_area": "Menlyn",
          "city": "Pretoria",
          "code": "0181",
          "zone": "Gauteng",
          "country": "ZA",
          "lat": -25.7863272,
          "lng": 28.277583
        },
        "collection_contact": {
          "name": "Cornel Rautenbach",
          "mobile_number": "",
          "email": "cornel+sandy@uafrica.com"
        },
        "delivery_address": {
          "type": "residential",
          "company": "",
          "street_address": "10 Midas Ave",
          "local_area": "Olympus AH",
          "city": "Pretoria",
          "code": "0081",
          "zone": "Gauteng",
          "country": "ZA",
          "lat": -25.80665579999999,
          "lng": 28.334732
        },
        "delivery_contact": {
          "name": "",
          "mobile_number": "",
          "email": "cornel+sandyreceiver@uafrica.com"
        },
        "parcels": [
          {
            "parcel_description": "Standard flyer",
            "submitted_length_cm": 20,
            "submitted_width_cm": 20,
            "submitted_height_cm": 10,
            "submitted_weight_kg": 2
          }
        ],
        "opt_in_rates": [],
        "opt_in_time_based_rates": [
          76
        ],
        "special_instructions_collection": "This is a test shipment - DO NOT COLLECT",
        "special_instructions_delivery": "This is a test shipment - DO NOT DELIVER",
        "declared_value": 1100,
        "collection_min_date": "2021-05-21T00:00:00.000Z",
        "collection_after": "08:00",
        "collection_before": "16:00",
        "delivery_min_date": "2021-05-21T00:00:00.000Z",
        "delivery_after": "10:00",
        "delivery_before": "17:00",
        "custom_tracking_reference": "G63",
        "customer_reference": `ORDERNO${orderNumber}`,
        "service_level_code": "ECO",
        "mute_notifications": false
      };
  
     
  
      // Make a POST request to the ShipLogic API
      this.http.post('https://api.shiplogic.com/v2/rates', requestModel, {headers })
        .subscribe(
          (response) => {
            // Handle the successful response from ShipLogic API here
            //console.log('Shipment created:', response);
            // You can perform further actions or navigate to a success page here
          },
          (error) => {
            // Handle any errors that occur during the API request
            //console.error('Error creating shipment:', error);
            // You can display an error message or take appropriate action
          }
        );    
    res.send("Category added successfully");
  } catch (error) {
    res.status(400).send(error);
  }
});