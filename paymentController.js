const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const constants = require("./constants");
const math = require('math');

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

/**
 * provider_id for use with courier guy api requests.
 */
  app.get('/payment/account',verifyToken, (req,res)=>{
    try{
        res.send(constants.ACCOUNTID);
    }catch(error){
        res.status(400).send(error);
    }
  });


  /**
   * Helper methods
   */
  const percentageAmountCalculator = (amount,percentage) =>{
    return (amount * percentage/100);
  }

  const calculateVAT = (amount) =>{
    return percentageAmountCalculator(amount, 14);
  }

  /**
   * RIRP-05 - The Rentee will be entitled to 50% 
   * 
   * @param {*} startdate 
   * @param {*} enddate 
   * @param {*} datereturned 
   * @param {*} rentalamount 
   * @returns 
   */
  const earlyRentalReturnRefund = (startdate,enddate,datereturned, rentalamount) =>{
        var totalRentalDays = dateDifferenceInDays(startdate, enddate);
        var earlyRentalDays = dateDifferenceInDays(startdate, datereturned);
        var daysDiff = math.abs(totalRentalDays - earlyRentalDays);
        var charge = rentalamount/daysDiff;
        var diff = rentalamount - charge;
        return percentageAmountCalculator(diff, 50);

  }

  const dateDifferenceInDays = (startdt, enddt)=>{
    
    if(startdt == enddt)
      return 1;

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
      
      var enddate = new Date(enddt);
      var stardate = new Date(startdt);
      var utcEnd = Date.UTC(enddate.getFullYear(), enddate.getMonth(), enddate.getDate()) 
      var utcStart = Date.UTC(stardate.getFullYear(), stardate.getMonth(), stardate.getDate()) 
      return Math.floor((utcEnd - utcStart)/MS_PER_DAY);
  }