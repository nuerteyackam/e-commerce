import crypto from "crypto";
import https from "https";

export const PAYSTACK_CONFIG = {
  publicKey: process.env.PAYSTACK_PUBLIC_KEY || "pk_test_public_key",
  secretKey: process.env.PAYSTACK_SECRET_KEY || "sk_test_secret_key",
  baseUrl: "https://api.paystack.co",
  callbackUrl: process.env.APP_URL
    ? `${process.env.APP_URL}/paystack-callback`
    : "http://localhost:5000/paystack-callback",
  // environment check
  isProduction: process.env.NODE_ENV === "production",
};

// // validation for production keys
// if (PAYSTACK_CONFIG.isProduction) {
//   if (!PAYSTACK_CONFIG.publicKey || !PAYSTACK_CONFIG.secretKey) {
//     throw new Error("Paystack keys are required in production");
//   }

//   if (
//     PAYSTACK_CONFIG.publicKey.startsWith("pk_test_") ||
//     PAYSTACK_CONFIG.secretKey.startsWith("sk_test_")
//   ) {
//     throw new Error("Test keys detected in production environment");
//   }
// }

// Log which mode we're in
const isLive = PAYSTACK_CONFIG.secretKey.startsWith("sk_live_");
console.log(
  `💳 Paystack Mode: ${
    isLive ? "LIVE (Real payments)" : "TEST (Fake payments)"
  }`
);

// Generate unique transaction reference
export function generateTransactionReference(orderId) {
  const timestamp = Date.now();
  return `GV-${orderId}-${timestamp}`;
}

// Convert amount to pesewas
export function convertToPesewas(amount) {
  return Math.round(amount * 100);
}

// Convert amount from pesewas to Ghana cedis
export function convertFromPesewas(pesewas) {
  return pesewas / 100;
}

//make API request to paystack
export function makePaystackRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: path,
      method: method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`,
        "Content-Type": "application/json",
      },
    };
    // log api calls
    if (PAYSTACK_CONFIG.isProduction) {
      console.log(`📡 Paystack API: ${method} ${path}`);
    } else {
      console.log(`📡 Paystack API (TEST): ${method} ${path}`);
    }

    const req = https.request(options, (res) => {
      let responseData = "";

      // Data might arrive in chunks. This updates as and when chunks arrive
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (PAYSTACK_CONFIG.isProduction) {
            console.log(`Paystack Response: ${res.statusCode}`, {
              status: parsedData.status,
              message: parsedData.message,
            });
          } else {
            console.log(
              `Paystack Response (TEST): ${res.statusCode}`,
              parsedData
            );
          }
          resolve(parsedData);
        } catch (error) {
          console.error(" Paystack JSON Parse Error:", error);
          reject(new Error("Invalid JSON response"));
        }
      });
    });

    req.on("error", (error) => {
      console.error(" Paystack API Network Error:", error);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.error("📡 Paystack API Timeout");
      req.destroy();
      reject(new Error("Paystack API request timeout"));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Initialize Paystack transaction
export async function initializeTransaction(
  email,
  amount,
  reference,
  metadata = {}
) {
  try {
    const data = {
      email,
      amount: convertToPesewas(amount),
      reference,
      callback_url: PAYSTACK_CONFIG.callbackUrl,
      metadata,
      currency: "GHS",
    };
    console.log(
      `💳 Initializing payment: ${amount} GHS for ${email} (Ref: ${reference})`
    );
    const response = await makePaystackRequest(
      "/transaction/initialize",
      "POST",
      data
    );

    if (response.status) {
      console.log(` Payment initialized successfully: ${reference}`);
    } else {
      console.error(`Payment initialization failed: ${response.message}`);
    }
    return response;
  } catch (error) {
    console.error(`Paystack initialization error:`, error.message);
    throw new Error(`Paystack initialization failed: ${error.message}`);
  }
}

// Verify Paystack transaction
export async function verifyTransaction(reference) {
  try {
    const response = await makePaystackRequest(
      `/transaction/verify/${reference}`
    );
    return response;
  } catch (error) {
    throw new Error(`Paystack verification failed: ${error.message}`);
  }
}
