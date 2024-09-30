const clientKey = "test_DDPEW35DI5ET7OKNYSWKQ7BG5ID2GFHS"; 
const type = "dropin"; 

// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const redirectResult = urlParams.get('redirectResult');


document.addEventListener('DOMContentLoaded', async () => {
  try {
    initializeDropin()
  } catch (error) {
      console.error('Error:', error);
      alert('Failed to initialize checkout. See console for details.');
  }
});


async function initializeDropin() {
  try {
      // Init Sessions
      const checkoutSessionResponse = await callServer("/api/sessions?type=" + type);

      // Create AdyenCheckout using Sessions response
      const checkout = await createAdyenCheckout(checkoutSessionResponse);

      // Create an instance of Drop-in and mount it
      checkout.create(type).mount(document.getElementById('dropin-container'));
  } catch (error) {
      console.error(error);
      alert("Error occurred. Look at console for details");
  }
}

async function finalizeCheckout() {
  try {
      // Create AdyenCheckout re-using existing Session
      const checkout = await createAdyenCheckout({id: sessionId});

      // Submit the extracted redirectResult
      checkout.submitDetails({details: {redirectResult}});
  } catch (error) {
      console.error(error);
      alert("Error occurred. Look at console for details");
  }
}

async function createAdyenCheckout(session) {
    const configuration = {
        clientKey,
        locale: "en_US",
        environment: "test",  // change to live for production
        showPayButton: true,
        session: session,
        paymentMethodsConfiguration: {
            ideal: {
                showImage: true
            },
            card: {
                hasHolderName: true,
                holderNameRequired: true,
                name: "Credit or debit card",
                amount: {
                    value: 10000,
                    currency: "USD"
                },
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
            handleServerResponse(result, component);
        },
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };
  return new AdyenCheckout(configuration);
}

async function callServer(url, data) {
  const res = await fetch(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : "",
      headers: {
          "Content-Type": "application/json",
      },
  });

  return await res.json();
}

function handleServerResponse(res, component) {
  console.log("response: ", res);
  console.log("component: ", component);
  if (res.action) {
      component.handleAction(res.action);
  } else {
      switch (res.resultCode) {
          case "Authorised":
              // window.location.href = "/result/success";
              console.log("res.resultCode: ", res.resultCode);
              changeCheckoutTitle("Payment Completed");
              setTimeout(() => {
                  addPaymentCompleteMessage();
              }, 2000);
              setTimeout(() => {
                addReturnHomeButton();
            }, 4000);
              break;
          case "Pending":
          case "Received":
              // window.location.href = "/result/pending";
              changeCheckoutTitle("Pending...");
              console.log("res.resultCode: ", res.resultCode);
              break;
          case "Refused":
              // window.location.href = "/result/failed";
              console.log("res.resultCode: ", res.resultCode);
              break;
          default:
              // window.location.href = "/result/error";
              console.log("res.resultCode: ", res.resultCode);
              break;
      }
  }
}

function changeCheckoutTitle(newTitle) {
  const titleElement = document.getElementById('checkout-title');
  if (titleElement) {
      titleElement.textContent = newTitle;
  } else {
      console.error('Checkout title element not found');
  }
}

function addPaymentCompleteMessage() {
  const container = document.querySelector('.checkout-container');
  
  // Add thank you message
  const thankYouMessage = document.createElement('p');
  thankYouMessage.textContent = "Congratulations on joining Spotify Premium!";
  thankYouMessage.style.marginTop = '20px';
  container.appendChild(thankYouMessage);
}

function addReturnHomeButton() {
  const container = document.querySelector('.checkout-container');
  
  // Add button to navigate back to homepage
  const homeButton = document.createElement('button');
  homeButton.textContent = "Learn About New Features";
  homeButton.style.marginTop = '20px';
  homeButton.style.padding = '10px 20px';
  homeButton.style.backgroundColor = '#1DB954';
  homeButton.style.color = 'white';
  homeButton.style.border = 'none';
  homeButton.style.borderRadius = '20px';
  homeButton.style.cursor = 'pointer';
  
  homeButton.addEventListener('click', () => {
      window.location.href = '/'; // Adjust this if your homepage URL is different
  });
  
  container.appendChild(homeButton);
}