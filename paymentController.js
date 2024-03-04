const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const constants = require("./constants");
const math = require('math');
const transactionSchema = require("./models/transaction");
const accountSchema = require('./models/account');
const userSchema = require('./models/user');

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
 * Payfast notify_url


app.get('/payment/notification',async (req,res)=>{
  res.status(200);
  console.log("payload req : ", req);
  console.log("payload body : ", req.body);
  var payload = req.body;
  //run validations

  //check if transaction exist
  var transaction = await transactionSchema.find({
    ordernumber: ordernumber
  })

  if(transaction.length == 0){
    //create a transaction
    var newTransaction = new transactionSchema({
      transactiondate:new Date(),
      ordernumber:payload.m_payment_id,
      payfastid:payload.pf_payment_id,
      payment_status:payload.payment_status,
      amount_gross:payload.amount_gross,
      amount_fee:payload.amount_fee,
      amount_net:payload.amount_net,
    });
    await newTransaction.save();

  }else{
    //update transaction
    transaction.payfastid = payload.pf_payment_id;
    transaction.payment_status = payload.payment_status;
    transaction.amount_gross = payload.amount_gross;
    transaction.amount_fee = payload.amount_fee;
    transaction.amount_net = payload.amount_net;
    await transaction.save();
  }

})
 */

/**
 * Payfast notify_url
 */

app.post('/payment/notification',async (req,res)=>{
  res.status(200);
  //console.log("payload body : ", req.body);
  var payload = req.body;

  //run validations
  //check if transaction exist
  var transaction = await transactionSchema.find({
    ordernumber: payload.m_payment_id
  });

  //console.log("transaction : ", transaction);
  var _payload = JSON.stringify(payload);
  if(transaction.length == 0){
    //create a transaction
    var newTransaction = new transactionSchema({
      transactiondate:new Date(),
      ordernumber:payload.m_payment_id,
      payfastid:payload.pf_payment_id,
      payment_status:payload.payment_status,
      amount_gross:payload.amount_gross,
      amount_fee:payload.amount_fee,
      amount_net:payload.amount_net,
      payfast_payload: _payload
    });
    var newTrans = await newTransaction.save();
    //console.log("newTrans : ", newTrans);

  }else{
    //update transaction
    transaction.payfastid = payload.pf_payment_id;
    transaction.payment_status = payload.payment_status;
    transaction.amount_gross = payload.amount_gross;
    transaction.amount_fee = payload.amount_fee;
    transaction.amount_net = payload.amount_net;
    await transaction.save();
    //console.log("update transaction : ", transaction);
  }

})


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
 * get payment transaction by order number
 */
  app.get('/payment/:ordernumber',verifyToken, async (req,res)=>{
    try{
      //get transaction
      var _ordernumber = req.params.ordernumber;
      var transaction = await transactionSchema.find({
        ordernumber: _ordernumber
      });

      if(!transaction)
         res.status(400).send("Item not found");

      res.status(200).send(transaction);

    }catch(error){
        res.status(400).send(error);
    }
  });

  /**
 * get rentor's balance
 */
  app.post('/payment/account',verifyToken, async (req,res)=>{
    try{
      //get transaction
      var userId = req.body.userid;
      var account = await accountSchema.find({
        rentor: userId
      }).sort({"transactiondate":-1});

      if(!account)
         res.status(400).send("Item not found");

      res.status(200).send(account);

    }catch(error){
        res.status(400).send(error);
    }
  });

  /**
 * Get All transaction from previous year to current
 */
app.get("/getTransactionsFromPreviousYearToCurrent", async (req,res)=>{
  try{
    var previousYear = (new Date().getFullYear()) - 1;
    console.log("previous year :", previousYear);
    let dataSummary = [];
   
    var transactions = await transactionSchema.find({
      $expr: {
        $gte: [
          {
            $year: "$transactiondate"
          },
          previousYear
        ]
      }
    }).sort({"transactiondate":1});

    //console.log("transactions : ", transactions);

    if(transactions.length > 0){
      transactions.forEach(element => {
        let _year = new Date(element.transactiondate).getFullYear();
        let _month = new Date(element.transactiondate).getMonth(); // + 1;
        let _day = new Date(element.transactiondate).getDate();

        if(dataSummary.length == 0){
          dataSummary.push({
            "year": _year,
            month: _month,
            day: _day,
            servicefee: parseFloat(element.servicefee),
            renteerefund: parseFloat(element.renteerefund),
            vatamount:  parseFloat(element.vatamount),
            duetorentor:  parseFloat(element.duetorentor),
            totalamount:  parseFloat(element.totalamount),
            amount_gross: parseFloat(element.amount_gross),
            amount_fee: parseFloat(element.amount_fee),
            amount_net: parseFloat(element.amount_net)
          })
        }else{
          let indexOf = dataSummary.findIndex(x=> x.year == _year && x.month == _month && x.day == _day);
          if(indexOf == -1){
            dataSummary.push({
              "year": _year,
              month: _month,
              day: _day,
              servicefee:  parseFloat(element.servicefee),
              renteerefund: parseFloat(element.renteerefund),
              vatamount:  parseFloat(element.vatamount),
              duetorentor:  parseFloat(element.duetorentor),
              totalamount:  parseFloat(element.totalamount),
              amount_gross: parseFloat(element.amount_gross),
              amount_fee: parseFloat(element.amount_fee),
              amount_net: parseFloat(element.amount_net)
            })
          }else{
            dataSummary[indexOf].totalamount =  parseFloat(dataSummary[indexOf].totalamount) +  parseFloat(element.totalamount);
            dataSummary[indexOf].servicefee =  parseFloat(dataSummary[indexOf].servicefee) +  parseFloat(element.servicefee);
            dataSummary[indexOf].renteerefund =  parseFloat(dataSummary[indexOf].renteerefund) +  parseFloat(element.renteerefund);
            dataSummary[indexOf].vatamount =  parseFloat(dataSummary[indexOf].vatamount) +  parseFloat(element.vatamount);
            dataSummary[indexOf].duetorentor =  parseFloat(dataSummary[indexOf].duetorentor) +  parseFloat(element.duetorentor);
            dataSummary[indexOf].amount_gross =  parseFloat(dataSummary[indexOf].amount_gross) +  parseFloat(element.amount_gross);
            dataSummary[indexOf].amount_fee =  parseFloat(dataSummary[indexOf].amount_fee) +  parseFloat(element.amount_fee);
            dataSummary[indexOf].amount_net =  parseFloat(dataSummary[indexOf].amount_net) +  parseFloat(element.amount_net);
          }
        }
      });
      res.status(200).send(dataSummary);
    }else{
    res.status(200).send(transactions);
    }
  }catch(err){
    console.log("getFromPreviousYearTransactions -  :", err);
    res.status(500).send({ message: "Server error", error: err.errors });
  }
});

app.post("/getTransactionByEmail", async(req,res)=>{
  try{
    var previousYear = (new Date().getFullYear()) - 1;
    //console.log("previous year :", previousYear);
    let dataSummary = [];

    const user = await userSchema.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).send({
        statusCode: 400,
        message: 'User not found',
      });
    }
   
    //console.log("user : ", user);
    var transactions = await transactionSchema.find({      
        'rentor':user._id,
        $expr: {
        $gte: [
          {
            $year: "$transactiondate"
          },
          previousYear
        ]
      }
    }).sort({"transactiondate":1});

    //console.log("transactions : ", transactions);

    if(transactions.length > 0){
      transactions.forEach(element => {
        let _year = new Date(element.transactiondate).getFullYear();
        let _month = new Date(element.transactiondate).getMonth(); // + 1;
        let _day = new Date(element.transactiondate).getDate();

        if(dataSummary.length == 0){
          dataSummary.push({
            "year": _year,
            month: _month,
            day: _day,
            servicefee: parseFloat(element.servicefee),
            renteerefund: parseFloat(element.renteerefund),
            vatamount:  parseFloat(element.vatamount),
            duetorentor:  parseFloat(element.duetorentor),
            totalamount:  parseFloat(element.totalamount),
            amount_gross: parseFloat(element.amount_gross),
            amount_fee: parseFloat(element.amount_fee),
            amount_net: parseFloat(element.amount_net)
          })
        }else{
          let indexOf = dataSummary.findIndex(x=> x.year == _year && x.month == _month && x.day == _day);
          if(indexOf == -1){
            dataSummary.push({
              "year": _year,
              month: _month,
              day: _day,
              servicefee:  parseFloat(element.servicefee),
              renteerefund: parseFloat(element.renteerefund),
              vatamount:  parseFloat(element.vatamount),
              duetorentor:  parseFloat(element.duetorentor),
              totalamount:  parseFloat(element.totalamount),
              amount_gross: parseFloat(element.amount_gross),
              amount_fee: parseFloat(element.amount_fee),
              amount_net: parseFloat(element.amount_net)
            })
          }else{
            dataSummary[indexOf].totalamount =  parseFloat(dataSummary[indexOf].totalamount) +  parseFloat(element.totalamount);
            dataSummary[indexOf].servicefee =  parseFloat(dataSummary[indexOf].servicefee) +  parseFloat(element.servicefee);
            dataSummary[indexOf].renteerefund =  parseFloat(dataSummary[indexOf].renteerefund) +  parseFloat(element.renteerefund);
            dataSummary[indexOf].vatamount =  parseFloat(dataSummary[indexOf].vatamount) +  parseFloat(element.vatamount);
            dataSummary[indexOf].duetorentor =  parseFloat(dataSummary[indexOf].duetorentor) +  parseFloat(element.duetorentor);
            dataSummary[indexOf].amount_gross =  parseFloat(dataSummary[indexOf].amount_gross) +  parseFloat(element.amount_gross);
            dataSummary[indexOf].amount_fee =  parseFloat(dataSummary[indexOf].amount_fee) +  parseFloat(element.amount_fee);
            dataSummary[indexOf].amount_net =  parseFloat(dataSummary[indexOf].amount_net) +  parseFloat(element.amount_net);
          }
        }
      });

      let _data = {
        summary: dataSummary,
        transactions:transactions
      };
      res.status(200).send(_data);
    }else{
    res.status(200).send(transactions);
    }
  }catch(err){
    console.log("getFromPreviousYearTransactions -  :", err);
    res.status(500).send({ message: "Server error", error: err.errors });
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

module.exports = app;
