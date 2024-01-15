
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: "Yuzu API",
      version: "1.0.0",
      description: "Yuzu API Documentation",
    },
    basePath: "/",
  },
  apis: ["./routes/*.js"], // Path to the API routes
};

module.exports = swaggerOptions;
