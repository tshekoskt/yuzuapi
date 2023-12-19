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

//Look ups
app.post("/add-category", async (req, res) => {
  try {
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      isactive: true
    });
    await category.save();
    res.send("Category added successfully");
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/add-delivery-option", async (req, res) => {
  try {
    const deliveryoption = new DeliveryOption({
      name: req.body.name,
      description: req.body.description,
      isactive: true
    });
    await deliveryoption.save();
    res.send("Delivery option added successfully");
  } catch (error) {
    res.status(400).send(error);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage
});

const serverUrl = "http://144.126.196.146:3000"; // Replace with your server's URL
//const serverUrl = "http://localhost:3000"; // Replace with your server's URL

app.post("/post-rental-item-public", upload.array("photos", 5), async (req, res) => {
  try {
    const rentalProduct = new RentalProduct({
      make: req.body.make,
      model: req.body.model,
      description: req.body.description,
      year: req.body.year,
      address: req.body.address,
      categories: req.body.categories,
      SubCategories: req.body.SubCategories,
      price: req.body.price,
      status: req.body.status,
      deliveryOption: req.body.deliveryOption,
      photos: req.files.map((file) => `${serverUrl}/uploads/${file.filename}`), // Add the file path to the image URL
      pictures: req.body.pictures,
      category: req.body.categoryId,
      postedBy: req.body.postedBy,
      available: false,
      trackingnumber: req.body.trackingnumber

    });
    await rentalProduct.save();

    res.status(201).send({
      message: "Rental item posted successfully",
      rentalProduct,
      imageUrls: req.files.map((file) => `${serverUrl}/uploads/${file.filename}`), // Add the file path to the image URL
    });
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

app.patch("/update-rental-item", async (req, res) => {
  try {
    const { itemId, available, status, make, model, description, address, price ,photos} = req.body;

    if (!itemId) {
      return res.status(400).send({ message: "itemId field is required" });
    }

    // Update the rental item in the database
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      itemId,
      {available, status, make, model, description, address, price , photos},
      { new: true }
    );

    if (!updatedItem) { 
      return res.status(404).send({ message: "Rental item not found" });
    }

    res.status(200).send({
      message: "Rental item updated successfully",
      updatedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error: error.errors });
  }
});




const path = require('path');
const { Stream } = require("stream");

app.get('/get-rental-item-public', async (req, res) => {
  try {
    const userId = req.query.userId;

    // Fetch the rental items by user ID or perform any other necessary operations
    const rentalItems = await RentalProduct.find({ postedBy: userId });

    // Generate image URLs for each rental item
    const rentalItemsWithImages = await Promise.all(
      rentalItems.map(async (rentalItem) => {
        const imageUrls = await Promise.all(
          rentalItem.photos.map((photo) => {
            const imageUrl = `http://144.126.196.146:3000/images/${photo}`;
            return imageUrl;
          })
        );
        return { ...rentalItem.toObject(), imageUrls };
      })
    );

    res.status(200).send({ message: 'Rental items retrieved successfully', rentalItems: rentalItemsWithImages });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error', error });
  }
});


app.get('/available-rental-items', async (req, res) => {
  try {
    // Fetch the available rental items
    const availableRentalItems = await RentalProduct.find({ available: true });

    // Generate image URLs for each rental item
    const rentalItemsWithImages = await Promise.all(
      availableRentalItems.map(async (rentalItem) => {
        const imageUrls = await Promise.all(
          rentalItem.photos.map((photo) => {
            const imageUrl = `http://144.126.196.146:3000/images/${photo}`;
            return imageUrl;
          })
        );
        return { rentalItem };
      })
    );

    res.status(200).send({ message: 'Available rental items retrieved successfully', rentalItems: rentalItemsWithImages });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error', error });
  }
});

app.delete('/delete-rental-item/:itemId', async (req, res) => {
  try {
    const itemId = req.params.itemId;

    // Check if the rental item exists
    const rentalItem = await RentalProduct.findById(itemId);

    if (!rentalItem) {
      return res.status(404).send({ message: 'Rental item not found' });
    }

    // Delete the rental item
    await rentalItem.remove();

    res.status(200).send({ message: 'Rental item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error', error });
  }
});

/**
 * creating new rental item
 */
//verifyToken,
/*app.post("/rental", verifyToken,  async(req,res)=> {
  try{
    const rental = new Rental({
      returned: req.body.returned,
      cancelled: req.body.cancelled,
      notes: req.body.notes,
      startdate: req.body.startDate,
      enddate: req.body.endDate,
      duration:req.body.duration,
      amount:req.body.amount,
      deliveryoption:req.body.deliveryOption,
      deliveryamount:req.body.deliveryAmount,
      createddate:req.body.createdDate,
      modifieddate:req.body.modifiedDate,
      totalamount:req.body.totalAmount,
      productId:req.body.productId,
      createdBy: req.body.createdBy,
      modifiedBy: req.body.modifiedBy  
    });
    await RentalItem.save();

    res.status(201).send({
      message: "Rental item posted successfully",
      rental      
    });
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
})*/

app.get("/rentals", async (req, res) => {
  try {
    // Add your logic here to fetch all rental items or perform any other operations

    // Example response
    const rentalItems = await RentalProduct.find();
    res.status(200).send({ message: "All rental items retrieved successfully", rentalItems });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error });
  }
});





// Route to Rent an Item
app.post("/rent-item", verifyToken, async (req, res) => {
  try {
    const rentedItem = await RentalItem.findOne({
      _id: req.body.rentedItemId
    });
    if (!rentedItem) {
      return res.status(400).send("Item not found");
    }
    if (!rentedItem.available) {
      return res.status(400).send("Item is not available");
    }

    //make a call to payment gateway

    rentedItem.available = false;
    rentedItem.rentedBy = req.userId;
    await rentedItem.save();
    res.send("Item rented successfully");
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get("/related-rental-item/:id", async (req, res) => {
  try {
    const rentalItem = await RentalItem.findById(req.params.id);
    if (!rentalItem) {
      return res.status(400).send("Rental item not found");
    }
    const relatedRentalItems = await RentalItem.find({
      make: rentalItem.make,
      model: rentalItem.model,
      available: true
    }).limit(5);
    res.send(relatedRentalItems);
  } catch (error) {
    res.status(400).send(error);
  }
});

//Get the rental item and the person who rented if available
app.get("/categories", verifyToken, async (req, res) => {
  try {
    const categories = await Category.find({
      available: true
    });
    res.send(categories);
  } catch (error) {
    res.status(400).send(error);
  }
});

//look ups
app.get("/categories", verifyToken, async (req, res) => {
  try {
    const categories = await Category.find({
      available: true
    });
    res.send(categories);
  } catch (error) {
    res.status(400).send(error);
  }
});


app.get("/deliveryoptions", verifyToken, async (req, res) => {
  try {
    const deliveryOptions = await DeliveryOption.find({
      available: true
    });
    res.send(deliveryOptions);
  } catch (error) {
    res.status(400).send(error);
  }
});


//Get the rental item and the person who rented if available
app.get("/rental-item/:id", async (req, res) => {
  try {
    const rentalItem = await RentalItem.findById(req.params.id).populate("rentedBy");
    res.send(rentalItem);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get("/available-rental-items", verifyToken, async (req, res) => {
  try {
    const availableRentalItems = await RentalItem.find({
      available: true
    });
    res.send(availableRentalItems);
  } catch (error) {
    res.status(400).send(error);
  }
});

///search?make=camera
app.get("/search", async (req, res) => {
  try {
    const search = req.query;
    const rentalItems = await RentalItem.find(search).limit(5);
    res.send(rentalItems);
  } catch (error) {
    res.status(400).send(error);
  }
});


// Route to Add a Review
app.post("/add-review", verifyToken, async (req, res) => {
  try {
    const review = new Review({
      rating: req.body.rating,
      text: req.body.text,
      reviewer: req.userId,
      rentedItem: req.body.rentedItemId,
    });
    await review.save();
    res.send("Review added successfully");
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get("/rentedItems", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).send({ message: "userId is required as a query parameter" });
    }

    // Find rental items with isRented set to true and matching userId
    const rentedItems = await RentalProduct.find({ isRented: true, userId });

    if (rentedItems.length === 0) {
      return res.status(404).send({ message: "No rented items found for the specified user" });
    }

    res.status(200).send({
      message: "Rented items retrieved successfully",
      rentedItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error: error.errors });
  }
});

app.get("/myRentedItems", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      
      return res.status(400).send({ message: "userId is required as a query parameter" });
    }

    // Find rental items with isRented set to true and matching userId
    const rentedItems = await RentalProduct.find({ postedBy:userId });

    if (rentedItems.length === 0) {
      return res.status(404).send({ message: "No rented items found for the specified user" });
    }

    res.status(200).send({
      message: "Rented items retrieved successfully",
      rentedItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error: error.errors });
  }
});

app.patch("/returnItem", async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).send({ message: "itemId is required" });
    }

    // Update the rental item in the database to set isRented to false
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      itemId,
      { isRented: false },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).send({ message: "Rental item not found" });
    }

    res.status(200).send({
      message: "Rental item returned successfully",
      updatedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error: error.errors });
  }
});

//UPDATES : JM//
/****************************
 * RENTALS
 ****************************/

/**
 * creating new rental item
 */
//verifyToken,
app.post("/rental", verifyToken, async(req,res)=> {
  console.log("rental request.body :", req.body);
  try{

    var ordernumber = req.body.orderNumber;
    //
    const rental = new RentalItem({
      returned: req.body.returned,
      cancelled: req.body.cancelled,
      notes: req.body.notes,
      startdate: req.body.startDate,
      enddate: req.body.endDate,
      duration:req.body.duration,
      amount:req.body.amount,
      deliveryoption:req.body.deliveryOption,
      deliveryamount:req.body.deliveryAmount,
      deliverynotes:req.body.deliveryNotes,
      createddate:req.body.createdDate,
      modifieddate:req.body.modifiedDate,
      totalamount:req.body.totalAmount,
      productId:req.body.productId,
      trackingnumber:req.body.trackingnumber,      
      modifiedBy: req.body.modifiedBy,
      createdBy: req.body.createdBy, 
      ordernumber: ordernumber
    });
    await rental.save();
    //create a transaction - transaction table
    var product = await RentalProduct.findById(req.body.productId);

    var transaction = await transactionSchema.find({
      ordernumber: ordernumber
    })

    if(transaction.length == 0){
      //create transaction
      var newTransaction = new transactionSchema({      
      transactiondate:new Date(),    
      totalamount:req.body.amount,   
      ordernumber:ordernumber,      
      payment_status:"Pending",      
      rental:rental._id,
      rentor: product.postedBy
      });

      await newTransaction.save();
    }else{
      //update transaction    
      transaction.totalamount = req.body.amount;         
      transaction.rental = rental._id,
      transaction.rentor = product.postedBy
      await transaction.save();
    }

    res.status(201).send({
      message: "Rental item posted successfully",
      rental      
    });
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

/**
 * Get rental by id
 */
app.get("/rental/:id", verifyToken, async (req, res) => {
  try {
    
    //const id = mongoose.Types.ObjectId(req.params.id);
    const id = req.params.id;
    console.log("req.params.id : ", id);
      const rentalItem = await RentalItem.findById(id);//.findById(req.params.id);
      if (!rentalItem) {
          return res.status(400).send("Rental item not found");
      }
     
      res.send(rentalItem);
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

/**
 * Update: cancel rental
 */
app.post("/rental/cancel",verifyToken, async (req,res)=>{
  try{
    console.log("retrun item request : ", req.body);
    const rentalItem = await RentalItem.findByIdAndUpdate(
      {_id:req.body.id},
      {
        cancelled:req.body.cancelled,
        notes:req.body.notes
      });

      console.log("rental cancel response", rentalItem);
      //get product
      const rentalProduct = await getProductById(rentalItem.productId);
      //send cancelation email
      var subject = `Rental no. ${rentalItem._id} Item ${rentalProduct.make} cancelled`;
      var body = `Rental with reference munber ${rentalItem._id}, for product ${rentalProduct.make}, from date ${rentalItem.startdate} until ${rentalProduct.enddate} 
      has been cancel with the following reason:
      ${rentalItem.notes} `;
      var user = await getUserById(rentalProduct.postedBy);
      var email = user.email;      
      console.log("email to :", email);
      var results = await EmailServiceInstace.sendCancelationEmail(email,body,subject);
      console.log("email results", results);
      return res.status(200).send({message: "success"});
      
  }catch(error){
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

/**
 * Update: return rental
 */
app.post("/rental/return",verifyToken,upload.array("photos", 3), async (req,res)=>{
  try{
    console.log("request ", req.body.photos);

    //var response = upload.array("photos", 3)
    const rentalItem = await RentalItem.findByIdAndUpdate(
      {_id:req.body.id},
      {
        returned:req.body.returned,
        returnnotes:req.body.notes,
        returntrackingnumber:req.body.trackingnumber,
        photosbyrentee: req.body.photos.map((file) => `http://144.126.196.146:3000/uploads/${file.filename}`),

      });

      console.log("rental return response", rentalItem);
      const rentalProduct = await getProductById(rentalItem.productId);
      //calculate rental transaction
      var amountsResults = calculateRentalCost(rentalItem);
      const transactionItem = new transactionSchema({
        vatamount:amountsResults.vatamount,
        servicefee: amountsResults.servicefee,
        duetorentor: amountsResults.duetorentor,
        renteerefund: amountsResults.renteerefund,
        transactionDate:currentDate,  
        totalamount:rentalItem.amount, 
        rental: rentalItem._id
      });
      
      var transactionResults = await transactionItem.save();

      var subject = `Rental no. ${rentalItem._id} Item ${rentalProduct.make} returned`;
      var body = `Rental with reference munber ${rentalItem._id}, for product ${rentalProduct.make}, from date ${rentalItem.startdate} until ${rentalProduct.enddate} 
      has been cancel with the following reason:
      ${rentalItem.notes} `;
      var user = await getUserById(rentalProduct.postedBy);
      var email = user.email;
      var results = await EmailServiceInstace.sendCancelationEmail(email,body,subject);
      console.log("email results", results);
      return res.status(200).send({message: "success", transaction:transactionResults });
  }catch(error){
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

/**
 * Get Rentals by userId
 */
app.get("/rental/getByUserId/:id",verifyToken, async (req, res) => {
  try {
      const rentalItem = await RentalItem.find({"createdBy": req.params.id});
      if (!rentalItem) {
          return res.status(400).send("Rental(S) item not found");
      }
     
      res.send(rentalItem);
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

/**
 * rentee confirmed receipt of item
 */
app.post(`/rental/receivedByRentee`,verifyToken, async(req,res)=> {

  console.log("accept item", req.body);
  try{
    const rentalItem = await RentalItem.findByIdAndUpdate(
      {_id:req.body._id},
      {        receivedbyrentee:req.body.receivedbyrentee
      });      
      console.log("rentanl item : ", rentalItem);
      return res.status(200).send({message: "success"});
  }catch(error){
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }

});

/**
 * rentor confirmed receipt of item
 */
app.post(`/rental/receivedByRentor`,verifyToken, async(req,res)=> {

  try{
    const rentalItem = await RentalItem.findByIdAndUpdate(
      {_id:req.body.id},
      {
        receivedbyrentor:req.body.receivedbyrentor
      });      
      return res.status(200).send({message: "success"});
  }catch(error){
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }

});

/*****************************************
 * PRODUCTS
 *****************************************/
app.get("/product/getById/:id", async (req, res) => {
  try {
    console.log("product id",req.params.id);
    const rentalProduct = await RentalProduct.findById({_id:req.params.id});
      if (!rentalProduct) {
          return res.status(400).send("Product item not found");
      }
     
      res.send(rentalProduct);
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).send({ message: "Validation error", errors: error.errors });
    } else {
      res.status(500).send({ message: "Server error", error: error.errors });
      console.log("error message", error);
    }
  }
});

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


/**
 * Calculate Rental Cost
 */
calculutateRentalCost = (item)=>{
   /**
       * get current date
       * calculate rental costs
       */
   var currentDate = new Date();
   return earlyRentalReturnRefund(item.startdate,item.enddate,currentDate, item.amount);
}

module.exports = app;
