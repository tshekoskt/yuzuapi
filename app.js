const express = require('express');
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


const rental = require('./rentalsController');
const product = require("./productsController");
const authorization = require("./authController");
const courier_delivery = require("./deliveryController");
const payment = require("./paymentController");

//https://www.geeksforgeeks.org/how-to-separate-routers-and-controllers-in-node-js/
const app = express();

app.use(bodyParser.json({ limit: '35mb' }));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 50000,
  }),
);

app.use("/uploads", express.static("uploads"));
app.use(rental);
app.use(product);
app.use(authorization);
app.use(courier_delivery);
app.use(payment);

app.use(cors({
  origin: '*'
}));


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
    },],
  },
  apis: ["./app.js"],
};

const specs = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Connect to MongoDB user yuzuadmin and password yuzuadmin123
mongoose.connect("mongodb+srv://yuzuadmin:1hLWt1MKuNg7T5Gl@cluster0.twbmhw7.mongodb.net/yuzudb?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User Schema
const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  isAdmin: Boolean,
  email: String,
  birthdate: Date,
  password: String,
  phone: String,
  address: String,
  city: String,
  province: String,
  otp: String,
  userGroup: String,
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
  status: String,
  year: Number,
  available: Boolean,
  startdate: Date,
  enddate: Date,
  photos: [String],
  pictures: [String],
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

// Define RentalItem Schema
const rentalProductSchema = new mongoose.Schema({
  make: String,
  model: String,
  status: String,
  address: String,
  categories: String,
  SubCategories: String,
  description: String,
  deliveryOption: String,
  price: String,
  year: Number,
  available: Boolean,
  favorite: Boolean,
  startdate: Date,
  enddate: Date,
  photos: [String],
  pictures: [String],
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


const chatSchema = new mongoose.Schema({
  productId: String,
  message: String,
  seen: Boolean,
  replyText: String,
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
  },
  postedDate: Date,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
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

/**
 * Rental Schema definition
 */
const rentalSchema = new mongoose.Schema({
  returned: Boolean,
  cancelled: Boolean,
  notes: String,
  startdate: Date,
  enddate: Date,
  duration: Number,
  amount: String,
  deliveryoption: String,
  deliveryamount: String,
  createddate: Date,
  modifieddate: Date,
  totalamount: String,
  ordernumber: String,
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RentalProduct",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }
  /*,
  deliveryoption: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryOption"
  }*/
});

// Compile Schema into Models
const User = mongoose.model("User", userSchema);
const RentalItem = mongoose.model("RentalItem", rentalItemSchema);
const Rental = mongoose.model("Rental", rentalSchema);
const RentalProduct = mongoose.model("RentalProduct1", rentalProductSchema);
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


/*app.patch("/update-profile", async (req, res) => {
  try {

    const userId = req.body.userId; // Assuming you have the user ID in the request body
    const newName = req.body.name; // New name value
    const newSurname = req.body.surname; // New surname value

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({
        statuscode: 404,
        message: "User not found"
      });
    }

    user.name = newName;
    user.surname = newSurname;
    await user.save();

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
});*/


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
/*app.post("/login", async (req, res) => {
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
});*/




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


/* app.post("/post-rental-item",  upload.array("photos", 5), async (req, res) => {
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
            res.status(500).send({message: "Server error", error: error.errors });
            console.log('error message' , error)
        }
    }
}); */


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

const serverUrl = "http:/localhost:3000"; // Replace with your server's URL

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
      weight: req.body.weight,
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

app.patch("/update-rental-item", async (req, res) => {

  console.log("update rental funtion");
  try {
    const { _id, available, status } = req.body;

    if (!_id) {
      return res.status(400).send({ message: "itemId, available, and status fields are required" });
    }

    // Update the rental item in the database
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      { _id: _id },
      { available: available, status: status }

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


app.patch("/favoriteItem", async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).send({ message: "itemId is required" });
    }

    // Update the rental item in the database
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      itemId,
      { favorite: true },
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


app.patch("/unfavoriteItem", async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).send({ message: "itemId is required" });
    }

    // Update the rental item in the database
    const updatedItem = await RentalProduct.findByIdAndUpdate(
      itemId,
      { favorite: false },
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
const { response } = require('./rentalsController');

app.get('/post-rental-item-public', async (req, res) => {
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


app.get('/favorite-rental-items', async (req, res) => {
  try {
    // Fetch the available rental items
    const availableRentalItems = await RentalProduct.find({ favorite: true, available: true });

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


const Chat = mongoose.model('Chat', chatSchema);

// POST endpoint to create a new chat message
app.post('/chats', async (req, res) => {
  try {
    // Create a new chat message based on the request body
    console.log(req.body)
    const newChat = new Chat({
      productId:req.body.productId,
      message: req.body.message,
      seen: req.body.seen,
      replyText: req.body.replyText,
      parentId:req.body.parentId,
      postedDate: req.body.postedDate,
      postedBy: req.body.postedBy, // You should provide a valid user ObjectId here
    });

    // Save the chat message to the database
    const savedChat = await newChat.save();
    res.status(201).json(savedChat);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while saving the chat message.' + error });
  }
});

// GET endpoint to retrieve all chat messages
app.get('/chats', async (req, res) => {
  try {
    // Fetch all chat messages from the database
    const chats = await Chat.find().populate("postedBy").populate("parentId");
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching chat messages.' });
  }
});

// GET endpoint to retrieve a chat message by ID
app.get('/chats/:chatId', async (req, res) => {
  try {
    // Fetch a chat message by its ID from the database
    const chat = await Chat.findById(req.params.chatId).populate("postedBy").populate("parentId");

    if (!chat) {
      return res.status(404).json({ error: 'Chat message not found.' });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the chat message.' });
  }
});

// GET endpoint to retrieve a chat message by ID
app.get('/chatsbyuser/:userId', async (req, res) => {
  try {
    // Fetch a chat message by its ID from the database
    const chats = await Chat.find({postedBy:req.params.userId,parentId: null}).populate("postedBy");

    if (!chats) {
      return res.status(404).json({ error: 'Chat message not found.' });
    }

    // Now, for each top-level chat, find and attach its replies
    const chatsWithReplies = await Promise.all(
      chats.map(async (chat) => {
        
        const replies = await Chat.find({ parentId: chat._id }).populate("postedBy");

        console.log(chat._id);

        return {
          ...chat.toObject(), // Convert Mongoose document to plain object replies
          replies
        };
      })
    );

    res.status(200).json(chatsWithReplies);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the chat message.' });
  }
});

app.get('/chatsbyproduct/:productId', async (req, res) => {
  try {
    // Fetch a chat message by its ID from the database
    const chats = await Chat.find({productId:req.params.productId}).populate("postedBy");

    if (!chats) {
      return res.status(404).json({ error: 'Chat message not found.' });
    }

    // Now, for each top-level chat, find and attach its replies
    const chatsWithReplies = await Promise.all(
      chats.map(async (chat) => {
        
        const replies = await Chat.find({ parentId: chat._id }).populate("postedBy");

        console.log(chat._id);

        return {
          ...chat.toObject(), // Convert Mongoose document to plain object replies
          replies
        };
      })
    );

    res.status(200).json(chatsWithReplies);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the chat message.' });
  }
});



//const Chat = mongoose.model('Chat', chatSchema);

// POST endpoint to create a new chat message
app.post('/chats', async (req, res) => {
  try {
    // Create a new chat message based on the request body
    const newChat = new Chat({
      username: req.body.username,
      message: req.body.message,
      seen: req.body.seen,
      orderByDate: req.body.orderByDate,
      postedBy: req.body.postedBy, // You should provide a valid user ObjectId here
    });

    // Save the chat message to the database
    const savedChat = await newChat.save();
    res.status(201).json(savedChat);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while saving the chat message.' });
  }
});

// GET endpoint to retrieve all chat messages
app.get('/chats', async (req, res) => {
  try {
    // Fetch all chat messages from the database
    const chats = await Chat.find();
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching chat messages.' });
  }
});

// GET endpoint to retrieve a chat message by ID
app.get('/chats/:chatId', async (req, res) => {
  try {
    // Fetch a chat message by its ID from the database
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat message not found.' });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the chat message.' });
  }
});





///search?make=camera
/*app.get("/search", async (req, res) => {
  try {
    const search = req.query;
    const rentalItems = await RentalItem.find(search).limit(5);
    res.send(rentalItems);
  } catch (error) {
    res.status(400).send(error);
  }
});*/

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
