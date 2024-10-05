// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const redirectResult = urlParams.get('redirectResult');


// Trigger the Drop-in component on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!sessionId) {
        // new session: start checkout
        initializeDropin();
    }
    else {
        // existing session: complete Checkout
        finalizeSession()
    }
  } catch (error) {
      console.error('Error:', error);
      alert('Failed to initialize checkout. See console for details.');
  }
});

// Create the Drop-in component
async function initializeDropin() {
    try {
        const checkoutDetials = {
            amount: {
                value: 10000,
                currency: "USD"
            },
            countryCode: "US",
            lineItems: [
                {quantity: 1, amountIncludingTax: 10000 , description: "Premium Membership"},
            ]
        }
        // Init Session
        const session = await callServer(`/api/sessions`, checkoutDetials);

        // Create AdyenCheckout instance using the session returned by the server
        const checkout = await createAdyenCheckout(session);

        // Create an instance of Drop-in and mount it
        checkout.create("dropin", {instantPaymentTypes: ['googlepay']}).mount(document.getElementById('dropin-container'));
    } catch (error) {
        console.error('Error in initializeDropin:', error);
        alert("Error occurred. Look at console for details");
    }
}

// Create AdyenCheckout instance
async function createAdyenCheckout(session) {
    const clientKey = await getClientKey();
    const amount = session.amount;
    const configuration = {
        clientKey,
        locale: "en_US",
        environment: "test",  // change to live for production
        showPayButton: true,
        session,
        analytics: {
            enabled: true
        },
        paymentMethodsConfiguration: {
            card: {
                hasHolderName: true,
                holderNameRequired: true,
                hideCVC: false,
                name: "Credit or debit card",
                amount,
                styles: {
                    base: {
                        color: '#FFFFFF',
                        fontSize: '14px',
                        lineHeight: '14px',
                    },
                    error: {
                        color: '#FFFFFF'
                    }
                }
            },
            style: {
                theme: 'dark',
                backdrop: 'rgba(0, 0, 0, 0.85)',
            }
        },
        onPaymentCompleted: (result, component) => {
            handlePaymentResult(result, component);
        },
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };
  return new AdyenCheckout(configuration);
}

// Finalize the session
async function finalizeSession() {
    try {
        // Create AdyenCheckout instance re-using existing Session
        const checkout = await createAdyenCheckout({id: sessionId});

        // Submit the extracted redirectResult - triggers the onPaymentCompleted() handler  
        checkout.submitDetails({details: {redirectResult}});
    } catch (error) {
        console.error(error);
        alert("Error occurred. Look at console for details");
    }
}

// Handle the payment result
function handlePaymentResult(response, component) {
    if (response.action) {
        component.handleAction(response.action);
    } else {
        switch (response.resultCode) {
            case "Authorised":
                changeCheckoutTitle("Payment Completed");
                setTimeout(addPaymentCompleteMessage, 2000);
                setTimeout(addButton, 3000);
                console.log("response.resultCode: ", response.resultCode);
                break;
            case "Refused":
                changeCheckoutTitle("Payment Refused");
                setTimeout(() => {
                    addPaymentCompleteMessage("We encountered a problem while processing your payment method.");
                    addPaymentCompleteMessage("Please try again, or choose a different payment method to complete your purchase.");
                    addButton("/checkout", "Continue");
                }, 1500);
                console.log("response.resultCode: ", response.resultCode);
                break;
            case "Pending":
                console.log("response.resultCode: ", response.resultCode);
            case "Received":
                console.log("response.resultCode: ", response.resultCode);
                break;
            default:
                changeCheckoutTitle("Error");
                console.log("response.resultCode: ", response.resultCode);
                break;
        }
    }
}

// Call server
async function callServer(url, data) {
    const response = await fetch(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : "",
        headers: {
            "Content-Type": "application/json",
        },
    });
  
    return await response.json();
}

// ----- Utility functions ------

async function getClientKey() {
    const response = await fetch('/api/getClientKey');
    const data = await response.json();
    return data.clientKey;
}

function changeCheckoutTitle(newTitle) {
  const titleElement = document.getElementById('checkout-title');
  if (titleElement) {
      titleElement.textContent = newTitle;
  } else {
      console.error('Checkout title element not found');
  }
}

function addPaymentCompleteMessage(message="Welcome to Spotify Premium! Enjoy music like never before!") {
  const container = document.querySelector('.checkout-container');
  
  // Add payment complete message after session is complete
  const paymentCompleteMessage = document.createElement('p');
  paymentCompleteMessage.textContent = message;
  paymentCompleteMessage.style.marginTop = '20px';
  container.appendChild(paymentCompleteMessage);
}

function addButton(href="/", buttonText="Explore Your Benefits") {
  const container = document.querySelector('.checkout-container');
  
  // Add button to navigate back to homepage
  const button = document.createElement('button');
  button.textContent = buttonText;
  button.style.marginTop = '20px';
  button.style.padding = '10px 20px';
  button.style.backgroundColor = '#1DB954';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '20px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
      window.location.href = href; // Adjust this if your homepage URL is different
  });
  
  container.appendChild(button);
}