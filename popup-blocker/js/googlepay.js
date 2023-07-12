const googlePayUrlSearchParams = new URLSearchParams(window.location.search);
const showGooglePaybuttonOrNot = googlePayUrlSearchParams.get('showGooglePaybutton') ==="false"? false: true;
const integrationType = googlePayUrlSearchParams.get('integrationType');
console.log(`show google pay button: ${showGooglePaybuttonOrNot}`);
document.getElementById("debug").innerHTML = "debug: window.location.href:" + window.location.href;

window.addEventListener("message", (event) => {
    console.log("WE'RE LISTENING");
    if (event.data === "onGooglePaymentButtonClicked") {
        onGooglePaymentButtonClicked();
    }

    if (event.data === "process_payment")
    {
        console.log("found process_payment");
        onGooglePaymentButtonClicked();
    }
})

const gatewayMerchantId = "Microsoft379ECOM";
const RECURRING = 'RECURRING';
const DELAYED = 'DELAYED';
const ONETIME = 'ONETIME';
/**
 * Define the version of the Google Pay API referenced when creating your
 * configuration
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#PaymentDataRequest|apiVersion in PaymentDataRequest}
 */
const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
};

/**
 * Card networks supported by your site and your gateway
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#CardParameters|CardParameters}
 * @todo confirm card networks supported by your site and gateway
 */
const allowedCardNetworks = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"];

/**
 * Card authentication methods supported by your site and your gateway
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#CardParameters|CardParameters}
 * @todo confirm your processor supports Android device tokens for your
 * supported card networks
 */
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

/**
 * Identify your gateway and your site's gateway merchant identifier
 *
 * The Google Pay API response will return an encrypted payment method capable
 * of being charged by a supported gateway after payer authorization
 *
 * @todo check with your gateway on the parameters to pass
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#gateway|PaymentMethodTokenizationSpecification}
 */
let tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY', // or Direct using microsoft certificate
    parameters: {
        'gateway': 'adyen',
        'gatewayMerchantId': gatewayMerchantId
    }
};

/*
const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY', // or Direct using microsoft certificate
    parameters: {
        'gateway': 'adyen',
        'gatewayMerchantId': gatewayMerchantId
    }
};*/

if (integrationType == "direct"){
    tokenizationSpecification = {
        type: 'DIRECT', // or Direct using microsoft certificate
        parameters: {
            "protocolVersion": "ECv2",
            "publicKey": "BIFZVST7Z/ZifKnvJLPMjeOy0IMA9jD5Quikk6zp55NfTkpn6WltKdTg7YtlxMJ9cmCOMoc9f11FKuCZdCAjYfs="
        }
    };
}
/**
 * Describe your site's support for the CARD payment method and its required
 * fields
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#CardParameters|CardParameters}
 */
const baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks,
        billingAddressRequired: true,
        billingAddressParameters: {
            "phoneNumberRequired": true
        }
    }
};

/**
 * Describe your site's support for the CARD payment method including optional
 * fields
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#CardParameters|CardParameters}
 */
const cardPaymentMethod = Object.assign(
    {},
    baseCardPaymentMethod,
    {
        tokenizationSpecification: tokenizationSpecification
    }
);

/**
 * An initialized google.payments.api.PaymentsClient object or null if not yet set
 *
 * @see {@link getGooglePaymentsClient}
 */
let paymentsClient = null;

/**
 * Configure your site's support for payment methods supported by the Google Pay
 * API.
 *
 * Each member of allowedPaymentMethods should contain only the required fields,
 * allowing reuse of this base request when determining a viewer's ability
 * to pay and later requesting a supported payment method
 *
 * @returns {object} Google Pay API version, payment methods supported by the site
 */
function getGoogleIsReadyToPayRequest() {
    return Object.assign(
        {},
        baseRequest,
        {
            allowedPaymentMethods: [baseCardPaymentMethod]
        }
    );
}

/**
 * Configure support for the Google Pay API
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#PaymentDataRequest|PaymentDataRequest}
 * @returns {object} PaymentDataRequest fields
 */
function getGooglePaymentDataRequest() {
    const paymentDataRequest = Object.assign({}, baseRequest);
    paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
    paymentDataRequest.merchantInfo = {
        // @todo a merchant ID is available for a production environment after approval by Google
        // See {@link https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist|Integration checklist}
        // merchantId: '12345678901234567890',
        merchantName: 'Example Merchant'
    };

    if (integrationType == "direct"){
        paymentDataRequest.merchantInfo.merchantId = "BCR2DN4TRKJI35LW"
    }

    paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION"];
    console.log(paymentDataRequest);
    
    return paymentDataRequest;
}

/**
 * Return an active PaymentsClient or initialize
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/client#PaymentsClient|PaymentsClient constructor}
 * @returns {google.payments.api.PaymentsClient} Google Pay API client
 * https://developers.google.com/pay/api/web/guides/resources/demos#authorize-payments-example
 */
function getGooglePaymentsClient() {
    if (paymentsClient === null) {
        paymentsClient = new google.payments.api.PaymentsClient({ 
            environment: 'TEST', 
            merchantInfo: {
                merchantName: "microsoft",
            },
            paymentDataCallbacks: {
              onPaymentAuthorized: onPaymentAuthorized
            }
        });
    }
    return paymentsClient;
}

/**
 * Initialize Google PaymentsClient after Google-hosted JavaScript has loaded
 *
 * Display a Google Pay payment button after confirmation of the viewer's
 * ability to pay.
 */
function onGooglePayLoaded() {
    const paymentsClient = getGooglePaymentsClient();
    paymentsClient.isReadyToPay(getGoogleIsReadyToPayRequest())
        .then(function (response) {
            if (response.result && showGooglePaybuttonOrNot) {
                addGooglePayButton();
            }
            // @todo prefetch payment data to improve performance after confirming site functionality
            // prefetchGooglePaymentData();
        })
        .catch(function (err) {
            // show error in developer console for debugging
            console.error(err);
        });
}

/**
 * Add a Google Pay purchase button alongside an existing checkout button
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#ButtonOptions|Button options}
 * @see {@link https://developers.google.com/pay/api/web/guides/brand-guidelines|Google Pay brand guidelines}
 */
function addGooglePayButton() {
    console.log("made it to addGooglePayButton");
    const paymentsClient = getGooglePaymentsClient();
    const button =
    paymentsClient.createButton({
        onClick: onGooglePaymentButtonClicked,
        allowedPaymentMethods: [baseCardPaymentMethod]
    });
    document.getElementById('container').appendChild(button);
    
    
}

/**
 * Provide Google Pay API with a payment amount, currency, and amount status
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/request-objects#TransactionInfo|TransactionInfo}
 * @returns {object} transaction info, suitable for use as transactionInfo property of PaymentDataRequest
 */
function getGoogleTransactionInfo() {
    return {
        countryCode: 'US',
        currencyCode: 'USD',
        totalPriceStatus: 'FINAL',
        totalPrice: '1.00'
    };
}

function getRecurringTransactionInfo(type) {
    if (type == RECURRING) {
        return {
            type: type, // Use 'DELAYED' for delayed charge transaction
            interval: 'MONTHLY', // Define the interval for recurring transaction (e.g. 'MONTHLY', 'YEARLY')
            totalCount: 12, // Define the total count of recurring transactions (optional)
        }
    }
    else if (type == DELAYED) {
        return {
            type: type, // Use 'DELAYED' for delayed charge transaction
        }
    }
    else {
        throw new Error('Unknown RecurringTransaction');
    }
}

/**
 * Prefetch payment data to improve performance
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/client#prefetchPaymentData|prefetchPaymentData()}
 */
function prefetchGooglePaymentData() {
    console.log("made it to prefetchGooglePaymentData");
    const paymentDataRequest = getGooglePaymentDataRequest();
    // transactionInfo must be set but does not affect cache
    paymentDataRequest.transactionInfo = {
        totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
        currencyCode: 'USD' 
    };
    const paymentsClient = getGooglePaymentsClient();
    paymentsClient.prefetchPaymentData(paymentDataRequest);
}

function onPaymentAuthorized(paymentData) {
    return new Promise(function(resolve, reject){
        // handle the response
        console.log(paymentData);
        processPayment(paymentData)
        .then(function(data) {
            showAuthZResult(data);
            resolve({transactionState: 'SUCCESS'});
        })
        .catch(function(){
            resolve({
                transactionState: 'ERROR',
                error: {
                    intent: 'PAYMENT_AUTHORIZATION',
                    message: 'Insufficient funds',
                    reason: 'PAYMENT_DATA_INVALID'
                }
            });
        });
    });
}

  

/**
 * Show Google Pay payment sheet when Google Pay payment button is clicked
 */
function onGooglePaymentButtonClicked() {
    const paymentDataRequest = getGooglePaymentDataRequest();
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
    paymentDataRequest.emailRequired = true;

    const paymentsClient = getGooglePaymentsClient();
    paymentsClient.loadPaymentData(paymentDataRequest)
        // .then(function (paymentData) {
        //     // handle the response
        //     processPayment(paymentData);
        // })
        // .then(function (data) {
        //     showAuthZResult(data);
        // })
        .catch(function (err) {
            // show error in developer console for debugging
            console.error(err);
        });
}

function showAuthZResult(paymentResult) {
    // document.getElementById('payment-result').innerText = paymentResult != null ? JSON.stringify(paymentResult, null, " ") : "null";
    window.parent.postMessage(`AuthResult:${JSON.stringify(paymentResult)}`, "*");
}

/**
 * Process payment data returned by the Google Pay API
 *
 * @param {object} paymentData response from Google Pay API after user approves payment
 * @see {@link https://developers.google.com/pay/api/web/reference/response-objects#PaymentData|PaymentData object reference}
 */
async function processPayment(paymentData) {
    // show returned data in developer console for debugging
    // const e = document.getElementById("tran_type");
    // const tranType = e.value;
    const tranType = "ONETIME";
    // const authZ_status = document.getElementById("authz_status");
    // const authZStatus = authZ_status.value;
    // const authZStatus = "success";

    // if (authZStatus == "insufficientfund") {
    //     return Promise.reject(new Error("insufficientfund"));
    // }
    
    // @todo pass payment token to your gateway to process payment
    // @note DO NOT save the payment credentials for future transactions,
    // unless they're used for merchant-initiated transactions with user
    // consent in place.
    paymentToken = paymentData.paymentMethodData.tokenizationData.token;
    const payload = {
        TokenType: 'googlepay', // or Direct using microsoft certificate
        Token: paymentToken,
        AcceptHeader: 'text\/html,application\/xhtml+xml,application\/xml;q=0.9,image\/webp,image\/apng,*\/*;q=0.8',
        Language: 'en-US',
        UserAgent: 'Mozilla\/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit\/537.36 (KHTML, like Gecko) Chrome\/70.0.3538.110 Safari\/537.36', // add Edge string
        Currency: 'USD',
        Amount: 10,
        OrderReference: '12345',
        ShopperReference: 'userid_to_retrieve_later',
        PaymentType: tranType
    };
    console.log("made it to processPayment");
    console.log("paymentData", payload);
    const paymentResult = await postRequest("/api/payments", payload);
    console.log("processPayment", JSON.stringify(paymentResult));
    return Promise.resolve(paymentResult);
}

if(showGooglePaybuttonOrNot)
{
    onGooglePayLoaded();
}