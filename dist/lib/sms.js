"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class SMSService {
    // private baseUrl: string;
    constructor() {
        this.apiToken = process.env.GIANT_SMS_API_KEY || "";
        this.senderId = process.env.GIANT_SMS_SENDER_ID || "";
        // this.baseUrl = process.env.GIANT_SMS_BASE_URL || ;
    }
    async sendSMS(phoneNumber, message) {
        try {
            const response = await axios_1.default.post("https://api.giantsms.com/api/v1/send", {
                to: phoneNumber,
                from: this.senderId,
                msg: message,
            }, {
                headers: {
                    Authorization: `Basic ${this.apiToken}`, // Changed to Basic
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        }
        catch (error) {
            console.error("SMS Error:", error.response?.data || error.message);
            throw error;
        }
    }
}
exports.default = new SMSService();
