const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
//const request = require('request');


const app = express();
app.use(bodyParser.json());

const options = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Yuzu Rental API",
            version: "1.0.0",
            description: "API for a Yuzu Rental System",
        },
        servers: [{
            url: "http://localhost:3000/",
        }, ],
    },
    apis: ["./app.js"],
};

const specs = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Connect to MongoDB user yuzuadmin and password yuzuadmin123
mongoose.connect("mongodb+srv://yuzuadmin:yuzuadmin123@cluster0.twbmhw7.mongodb.net/yuzudb?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define User Schema
const userSchema = new mongoose.Schema({
    name: String,
    surname: String,
    email: String,
    birthdate: Date,
    password: String,
    phone: String,
    address: String,
    otp: String,
    isverified: Boolean
});

userSchema.set("toJSON", {
    transform: function (doc, ret, options) {
        delete ret.password;
        delete ret.otp;
        return ret;
    },
});

// Define Category Schema
const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
    isactive: Boolean
});

// Define Delivery Option Schema
const deliveryOptionsSchema = new mongoose.Schema({
    name: String,
    description: String,
    isactive: Boolean
});

// Define RentalItem Schema
const rentalItemSchema = new mongoose.Schema({
    make: String,
    model: String,
    description: String,
    year: Number,
    available: Boolean,
    startdate: Date,
    enddate: Date,
    photos: [String],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
    },
    rentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    deliveryoption: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryOption"
    }
});

// Define Review Schema
const reviewSchema = new mongoose.Schema({
    rating: Number,
    text: String,
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    rentalItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalItem",
    },
});

// Compile Schema into Models
const User = mongoose.model("User", userSchema);
const RentalItem = mongoose.model("RentalItem", rentalItemSchema);
const Review = mongoose.model("Review", reviewSchema);
const Category = mongoose.model("Category", categorySchema);
const DeliveryOption = mongoose.model("DeliveryOption", deliveryOptionsSchema);

// Middleware to Verify JSON Web Token
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


const request = require('request');

app.post("/register", async (req, res) => {
    try {
        const user = await User.findOne({
            email: req.body.email
        });
        if (user) {
            return res.status(400).send({
                statusCode: 402,
                message: "User already exists"
            });
        }
        const otp = randomstring.generate({
            length: 6,
            charset: "numeric",
        });

        const options = {
            method: 'GET',
            url: `https://www.xml2sms.gsm.co.za/send/?username=anisadefreitas&password=bulkgde2023&number=${req.body.phone}&message=Your Yuzu OTP for registration is ${otp}&ems=1`
        };

        request(options, async function (error, response, body) {
            if (error) {
                console.error(error);
                return res.status(500).send({
                    statusCode: 500,
                    message: "Failed to send OTP via SMS"
                });
            }

            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                phone: req.body.phone,
                otp: otp,
                isverified: false
            });
            await newUser.save();
            res.send({
                statusCode: 200,
                message: " OTP Has been send to your mobile number please use it to verify your account"
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
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
  
//Get user by id
app.get('/users', async (req, res) => {
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

app.post("/post-rental-item", verifyToken, upload.array("photos", 5), async (req, res) => {
    try {
        const rentalItem = new RentalItem({
            make: req.body.make,
            model: req.body.model,
            description: req.body.description,
            year: req.body.year,
            photos: req.files.map((file) => file.path),
            category: req.body.categoryId,
            postedBy: req.userId,
            available: true,
        });
        await rentalItem.save();
        res.status(201).send({message: "Rental item posted successfully", rentalItem});
    } catch (error) {
        console.error(error);
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).send({message: "Validation error", errors: error.errors});
        } else {
            res.status(500).send({message: "Server error"});
        }
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

app.get("/available-rental-tems", verifyToken, async (req, res) => {
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

app.listen(3000, () => {
    console.log("Server started on port 3000");
});