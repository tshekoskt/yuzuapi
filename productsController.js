
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
const fs = require('fs');
//const models = require('./models');
const RentalItem = require('./models/rental');
const EmailService = require('./emailService');
const EmailServiceInstace = new EmailService();
//const Rental = require('./models/rental');
const RentalProduct = require('./models/rentalProducts');
const Query = require('./models/query');
const userSchema = require('./models/user');
const constants = require('./constants');


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

const serverUrl = "http://localhost:3000"; // Replace with your server's URL

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

app.post("/product/post-query", async (req, res) => { //post query
  try {
    const refNumber = generateRefNumber();
    const query = new Query({
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      referencenumber: refNumber,
      isactive: true,
    });

    // Prepare the email
    var _subject = `New Query: ${refNumber}`;
    var _user = { name: req.body.name, email: req.body.email };
    var _email = _user.email;
    var _body = await fs.promises.readFile("./emailTemplates/queryemailTemplate.html");
    var _data = _body.toString();
    _data = _data.replace("[User's Name]", _user.name)
      .replace("[Unique Reference Numbers]", refNumber)
      .replace("[Date and Time of Complaint Submission]", new Date())
      .replace("[Brief description of the complaint]", req.body.message)
      .replace("[Support Email Address]", constants.SUPPORT_EMAIL);

    // Send the email
    //await EmailService.sendQueryEmail(_user.name, _email, _data, _subject);
    await EmailServiceInstace.sendQueryEmail(_user.name, _email, _data, _subject);

    // Save the query only if the email was sent successfully
    await query.save();

    res.status(200).json({ message: "Query added and email sent successfully" });
  } catch (error) {
    res.status(400).send({ error: error.toString() });
  }
});



app.patch("/product/update-rental", async (req, res) => {
  console.log("update");
  try {
    const { _id, available, status, comments, isApproved, make, model, description, address, price } = req.body;

    if (!_id) {
      return res.status(400).send({ message: "_id field is required" });
    }

    // Find the rental item in the database
    const rentalItem = await RentalProduct.findById(_id);

    if (!rentalItem) {
      return res.status(404).send({ message: "Rental item not found" });
    }

    // Find the user who created the rental item
    const user = await userSchema.findById(rentalItem.postedBy);

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Update the rental item in the database
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      { _id: _id },
      {
        available: available, status: status, comments: comments, isApproved: isApproved, make: make, model: model,
        description: description, address: address, price: price
      }
    );

    console.log("updatedItem", updatedItem);

    // Prepare the email
    var _subject = isApproved ? `Approval: ${updatedItem.make}` : `Rejection: ${updatedItem.make}`;
    var _user = { name: user.name, email: user.email };
    var _email = _user.email;
    var _body = await fs.promises.readFile(isApproved ? "./emailTemplates/approvedemailTemplate.html" : "./emailTemplates/rejecteditemEmailTemplate.html");
    var _data = _body.toString();

    if (isApproved) {
      _data = _data.replace("[Rentor's Name]", _user.name)
        .replace("[Insert Item Name]", updatedItem.make)
        .replace("[Insert Brief Description]", rentalItem.description)
        .replace("[Insert Approval Date]", new Date().toLocaleDateString())
        .replace("[Insert Item Category]", rentalItem.categories)
        .replace("[Support Email]", constants.SUPPORT_EMAIL);
    }else {
      _data = _data.replace("[User's Name]", _user.name)
        .replace("[Yuzu Support Email]", constants.SUPPORT_EMAIL)
        .replace("(Back office to populate specific reason)", comments);
    }

    // Send the email
    await EmailServiceInstace.sendRentalUpdateEmail(_user.name, _email, _data, _subject);

    res.status(200).send({
      message: "Rental item updated and email sent successfully",
      updatedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error", error: error.errors });
  }
});
const path = require('path');
const { Stream } = require("stream");
const query = require('./models/query');
//const EmailService = require('./emailService');

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


app.get('/product/available-rental-items', async (req, res) => {
  try {
    // Fetch the available rental items
    console.log("'available-rental-items inside rentals controller");
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


app.get("/product/search", verifyToken, async (req, res) => {
  try {
    const search = req.query;
    const rentalItems = await RentalItem.find(search).limit(5);
    res.send(rentalItems);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.delete('/product/delete-rental-item/:itemId', async (req, res) => {
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

app.get("/product/myRentedItems", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {

      return res.status(400).send({ message: "userId is required as a query parameter" });
    }

    // Find rental items with isRented set to true and matching userId
    const rentedItems = await RentalProduct.find({ postedBy: userId });

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


/*****************************************
 * PRODUCTS
 *****************************************/
app.get("/product/getById/:id", async (req, res) => {
  try {
    console.log("product id", req.params.id);
    const rentalProduct = await RentalProduct.findById({ _id: req.params.id });
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

app.post("/product/updateAvailability", async (req, res) => {
  try {
    const rentalItem = await RentalProduct.findByIdAndUpdate(
      { _id: req.body.id },
      {
        available: req.body.available,
        status: req.body.status
      });

    return res.status(200).send({ message: "success" });
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

function generateRefNumber() {
  // Generate a random number between 100 and 999
  var randomNumber = Math.floor(Math.random() * 900) + 100;

  // Get today's date and format it to two digits
  var date = new Date();
  var day = ("0" + date.getDate()).slice(-2);

  // Form the reference number
  var refNumber = "YUZU-" + randomNumber + "-" + day;

  return refNumber;
}

module.exports = app;
