import axios from "axios";

const GIANT_SMS_API = "https://api.giantsms.com/v1"; // Replace with actual API endpoint
const API_KEY = process.env.GIANT_SMS_API_KEY;
const SENDER_ID = process.env.GIANT_SMS_SENDER_ID || "Storeroom";

export async function sendSMS(phoneNumber: string, message: string) {
  try {
    // Format phone number (remove spaces, ensure Ghana format)
    const formattedNumber = phoneNumber.replace(/\s/g, "");

    const response = await axios.post(
      `${GIANT_SMS_API}/send`,
      {
        to: formattedNumber,
        from: SENDER_ID,
        message: message,
        type: "0", // 0 = normal SMS, 1 = flash
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("SMS sending failed:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendSaleReceiptSMS(
  phoneNumber: string,
  saleDetails: {
    storeName: string;
    amount: number;
    itemsCount: number;
    date: Date;
  },
) {
  const message = `
${saleDetails.storeName}
Amount: GHS ${saleDetails.amount.toFixed(2)}
Items: ${saleDetails.itemsCount}
Date: ${saleDetails.date.toLocaleDateString()}
Thank you!`.trim();

  return sendSMS(phoneNumber, message);
}
