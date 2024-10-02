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

// Pass the clientKey to the client
app.get('/api/getClientKey', (req, res) => {
  res.json({ clientKey: process.env.ADYEN_CLIENT_KEY });
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
      ],
      idempotencyKey: uuid(),
      channel: "web",
      additionalData: {
        allow3DS2: true
      },
      authenticationData: {
        attemptAuthentication: "always"
      }
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}, stack: ${err.stack}`);
    res.status(err.statusCode || 500).json({ error: 'An error occurred during payment processing' });
  }
});

app.post("/api/payments/details", async (req, res) => {
  // console.log("Received payload:", req.body);
  try {
    const payload = req.body;

    // Input validation
    if (!payload.details) {
      console.log("Invalid payload received:", payload);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await checkout.PaymentsApi.paymentsDetails({
      details: payload.details
    });

    // console.log("Adyen response:", response);

    let result = {
      resultCode: response.resultCode,
      refusalReason: response.refusalReason
    };

    // Check if action is needed
    if (response.action) {
      result.action = response.action;
    }

    res.json(result);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}, stack: ${err.stack}`);
    res.status(err.statusCode || 500).json({ error: 'An error occurred during payment processing' });
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

// possible todo: implement event consumption logic
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