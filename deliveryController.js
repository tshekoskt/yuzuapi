const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const https = require('node:https');
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
const rentalProducts = require('./models/rentalProducts');
const constants = require('./constants');
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

//Company Details:
const companyname = "TTM";
const courier_base_url = "https://api.shiplogic.com/v2/";
 // Set the headers for the request (including your ShipLogic API key)
 const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer a601d99c75fc4c64b5a64288f97d52b4' // Replace with your actual ShipLogic API key
  };

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


const httpheaders = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${constants.COURIER_GUY_KEY}`,        
      }
}; 

/***
 * Look up courier-guy prices
 */
//verifyToken,
app.post("/delivery/courier-guy", verifyToken, async (req, res) => {
  try {

    var product = req.body.product;
    console.log("product is ", req.body.product);
    var rentee = req.body.userprofile;
    var rentor = await getUserById(product.postedBy);
    
    var productValue = parseFloat(product.price)
    productValue = 1200;
    
    /**
     * "company": companyname,
          "street_address": rentor.address,
          "local_area": rentor.city, // "Menlyn",
          "city": rentor.city,
          "code": rentor.postalcode,
          "zone": rentor.province,
          "country": "ZA"
     */
    const requestModel = {
        "collection_address": {
            "type": "business",
            "company": "uAfrica.com",
            "street_address": "1188 Lois Avenue",
            "local_area": "Menlyn",
            "city": "Pretoria",
            "zone": "Gauteng",
            "country": "ZA",
            "code": "0181"
        },
        "delivery_address": {
          "type": "residential",
          "company": "",
          "street_address": rentee.address,
          "local_area": rentee.city, //"Olympus AH",
          "city": rentee.city, //"Pretoria",
          "code": rentee.postalcode,
          "zone": rentee.province,
          "country": "ZA"
        },
        "parcels": [
          {
            "parcel_description": "Standard flyer",
            "submitted_length_cm": 0,
            "submitted_width_cm": 0,
            "submitted_height_cm": 0,
            "submitted_weight_kg": 2
          }
        ],               
        "declared_value": productValue,
        "collection_min_date": req.body.startdate,
        "delivery_min_date": req.body.startdate        
      };  
     

      // Make a POST request to the ShipLogic API
      //this.httpS.post('https://api.shiplogic.com/v2/rates', requestModel, {headers })
       
       getRates(requestModel).then(
          (response) => {
            var data = response.data;
            //console.log("data from call ", data);
            res.send(data);
          },
          (error) => {            
            res.status(500).send({ message: "Server error", error: error });
          }
        );   
    
  } catch (error) {
    console.log("localised error :", error);
    res.status(400).send(error);
  }  
});

/**
 * get courier-guy key
 */
app.post("/delivery/courier-guy-token", verifyToken, async (req, res) => {
  try {
    return res.status(200).send({"token": constants.COURIER_GUY_KEY});
  }
  catch(error){
    res.status(400).send(error);
  }
});

/**
 * get courier-guy return rates
 */
app.post("/delivery/courier-guy-return", verifyToken, async (req, res) => {
    try {
  
      var product = req.body.product;
      console.log("product is ", req.body.product);
      var rentee = req.body.userprofile;
      var rentor = await getUserById(product.postedBy);
      
      var productValue = parseFloat(product.price)
      productValue = 1200;
      
      /**
       * "company": companyname,
            "street_address": rentee.address,
            "local_area": rentee.city, //"Olympus AH",
            "city": rentee.city, //"Pretoria",
            "code": rentee.postalcode,
            "zone": rentee.province,
            "country": "ZA"
       */
      const requestModel = {
          "collection_address": {
              "type": "residential",
              "company": companyname,
              "street_address": rentee.address,
                "local_area": rentee.city, // "Menlyn",
                "city": rentee.city,
                "code": rentee.postalcode,
                "zone": rentee.province,
                "country": "ZA"
          },
          "delivery_address": {
            "type": "residential",
            "company": "",
            "street_address": "10 Midas Avenue",
            "local_area": "Olympus AH",
            "city": "Pretoria",
            "zone": "Gauteng",
            "country": "ZA",
            "code": "0081",
            "country": "ZA"
          },
          "parcels": [
            {
              "parcel_description": "Standard flyer",
              "submitted_length_cm": 0,
              "submitted_width_cm": 0,
              "submitted_height_cm": 0,
              "submitted_weight_kg": 2
            }
          ],               
          "declared_value": productValue,
          "collection_min_date": req.body.startdate,
          "delivery_min_date": req.body.startdate        
        };  
       
  
        // Make a POST request to the ShipLogic API
        //this.httpS.post('https://api.shiplogic.com/v2/rates', requestModel, {headers })
         
         getRates(requestModel).then(
            (response) => {
              var data = response.data;
              console.log("data from call ", data);
              res.send(data);
            },
            (error) => {            
              res.status(500).send({ message: "Server error", error: error });
            }
          );   
      
    } catch (error) {
      console.log("localised error :", error);
      res.status(400).send(error);
    }  
  });


/**
 * create shipment
*/
app.post('/delivery/createshipment', verifyToken, async (req,res)=>{

  //get product details
  var product = await getProductById(req.body.productId);
  console.log("product is ", req.body.product);
  //Get rentee details
  var rentee = await getUserById(req.body.createdBy);
  //Get rentor details
  var rentor = await getUserById(product.postedBy);
  
  var productValue = parseFloat(product.price)
  productValue = 1200;
      const requestModel = {
        "collection_address": {
          "type": "business",
          "company": companyname,
          "street_address": rentor.address,
          "local_area": rentee.city, // "Menlyn",
          "city": rentee.city,
          "code": rentee.postalcode,
          "zone": rentee.province,
          "country": "ZA"
        },
        "collection_contact": {
          "name": rentor.name,
          "mobile_number": rentor.phone,
          "email": rentor.email
        },
        "delivery_address": {
          "type": "residential",
          "company": "",
          "street_address": rentee.address,
          "local_area": rentee.city, //"Olympus AH",
          "city": rentee.city, //"Pretoria",
          "code": rentee.postalcode,
          "zone": rentee.province,
          "country": "ZA"
        },
        "delivery_contact": {
          "name": rentee.name,
          "mobile_number": rentee.phone,
          "email": rentee.email
        },
        "parcels": [
          {
            "parcel_description": "Standard flyer",
            "submitted_length_cm": 0,
            "submitted_width_cm": 0,
            "submitted_height_cm": 0,
            "submitted_weight_kg": product.weight
          }
        ],
        "opt_in_rates": [],
        "opt_in_time_based_rates": [
          76
        ],
        "special_instructions_collection": "This is a test shipment - DO NOT COLLECT",
        "special_instructions_delivery": "This is a test shipment - DO NOT DELIVER",
        "declared_value": productValue,
        "collection_min_date": req.body.startdate,
        "collection_after": "08:00",
        "collection_before": "16:00",
        "delivery_min_date": req.body.startdate,
        "delivery_after": "10:00",
        "delivery_before": "17:00",
        "custom_tracking_reference": "",
        "customer_reference": `ORDERNO${req.body.orderNumber}`,
        "service_level_code": "ECO",
        "mute_notifications": false
      };    

      createShipment(requestModel).then(
        (response) => {
          var data = response.data;
          console.log("data from call ", data);
          res.send(data);
        },
        (error) => {            
          res.status(500).send({ message: "Server error", error: error });
        }
      );     

})

/**
 * tracking order
 */
app.get('/delivery/createshipment/:id', verifyToken, async (req,res)=>{
    var trackingnumber = req.params.id;
    trackShipment(trackingnumber).then(
      (response) => {
        var data = response.data;
        console.log("data from call ", data);
        res.send(data);
      },
      (error) => {            
        res.status(500).send({ message: "Server error", error: error });
      }
    );   
})

/***
 * Helper methods
 */
getProductById = async(productId)=> {
    var product = await RentalProduct.findById({_id:productId})
    return product;
  }
  
getUserById = async(userId)=> {
    var user = await userSchema.findById({_id:userId})
    return user;
}

const getRates = (request)=>{
    return axios.post(`${courier_base_url}rates`, request, httpheaders);
}

const createShipment = (request)=>{
    return axios.post(`${courier_base_url}shipments`, request, httpheaders);
}

const trackShipment = (trackingnumber)=>{
  return axios.get(`${courier_base_url}shipments?tracking_reference=${trackingnumber}`, httpheaders);
}


module.exports = app;