const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { uuid } = require('uuidv4');
const { hmacValidator } = require('@adyen/api-library');
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Adyen NodeJS library configuration
const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");  // change to LIVE for production
const checkout = new CheckoutAPI(client);

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'checkout.html'));
});

// API Endpoints
app.post("/api/sessions", async (req, res) => {
  try {
    const orderRef = uuid();
    const localhost = req.get('host');
    const protocol = req.socket.encrypted ? 'https' : 'http';

    const response = await checkout.PaymentsApi.sessions({
      amount: { currency: "USD", value: 10000 },
      countryCode: "US",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      reference: orderRef,
      returnUrl: `${protocol}://${localhost}/checkout?orderRef=${orderRef}`,
      lineItems: [
        {quantity: 1, amountIncludingTax: 10000 , description: "Premium Membership"},
      ]
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

// Webhook
app.post("/api/webhooks/notifications", async (req, res) => {
  const hmacKey = process.env.ADYEN_HMAC_KEY;
  const validator = new hmacValidator()
  const notificationRequest = req.body;
  const notificationRequestItems = notificationRequest.notificationItems
  const notification = notificationRequestItems[0].NotificationRequestItem
  
  if (validator.validateHMAC(notification, hmacKey)) {
    const merchantReference = notification.merchantReference;
    const eventCode = notification.eventCode;
    console.log("merchantReference:" + merchantReference + " eventCode:" + eventCode);
    
    // Consume event asynchronously
    consumeEvent(notification);
    
    res.status(202).send();
  } else {
    console.log("Invalid HMAC signature: " + notification);
    res.status(401).send('Invalid HMAC signature');
  }
});

function consumeEvent(notification) {
  // Implement event consumption logic here
}

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});