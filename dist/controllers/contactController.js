"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                status: "failed",
                message: "All fields are required",
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: "failed",
                message: "Invalid email address",
            });
        }
        // Send email to your business using Brevo
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: {
                    name: "Storeroom Contact",
                    email: "codehumps00233@gmail.com",
                },
                to: [{ email: "storeroompos@gmail.com" }],
                replyTo: { email: email, name: name },
                subject: `New Contact Form Message from ${name}`,
                htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>New Contact Form Message</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316; }
              .logo { font-size: 24px; font-weight: bold; }
              .logo span:first-child { color: #000; }
              .logo span:last-child { color: #f97316; }
              .content { padding: 30px 0; }
              .field { margin-bottom: 20px; }
              .field-label { font-weight: bold; color: #f97316; margin-bottom: 5px; }
              .field-value { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 0; }
              .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  <span>Store</span><span>room</span>
                </div>
              </div>
              <div class="content">
                <h2>New Contact Form Submission</h2>
                
                <div class="field">
                  <div class="field-label">Name:</div>
                  <p class="field-value">${name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                </div>
                
                <div class="field">
                  <div class="field-label">Email:</div>
                  <p class="field-value">${email}</p>
                </div>
                
                <div class="field">
                  <div class="field-label">Message:</div>
                  <p class="field-value">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
                </div>
              </div>
              <div class="footer">
                <p>Storeroom · Smart Inventory Management for African Businesses</p>
              </div>
            </div>
          </body>
          </html>
        `,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo error:", errorData);
            throw new Error(errorData.message || "Failed to send message");
        }
        // Send auto-reply to the user
        const autoReply = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: { name: "Storeroom", email: "codehumps00233@gmail.com" },
                to: [{ email: email }],
                subject: "Thank you for contacting Storeroom",
                htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Thank You</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316; }
              .logo { font-size: 24px; font-weight: bold; }
              .logo span:first-child { color: #000; }
              .logo span:last-child { color: #f97316; }
              .content { padding: 30px 0; }
              .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  <span>Store</span><span>room</span>
                </div>
              </div>
              <div class="content">
                <h2>Thank You for Reaching Out!</h2>
                <p>Hi ${name.replace(/</g, "&lt;").replace(/>/g, "&gt;")},</p>
                <p>Thank you for contacting Storeroom. We have received your message and will get back to you within 24 hours.</p>
                <p>Here's a copy of your message:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
                </div>
                <p>In the meantime, feel free to:</p>
                <ul>
                  <li>Start your free trial at <a href="${process.env.FRONTEND_URL}register">Storeroom</a></li>
                  <li>Check out our FAQ section for quick answers</li>
                  <li>Follow us on social media for updates</li>
                </ul>
                <p>Best regards,<br>The Storeroom Team</p>
              </div>
              <div class="footer">
                <p>Storeroom · Smart Inventory Management for African Businesses</p>
              </div>
            </div>
          </body>
          </html>
        `,
            }),
        });
        if (!autoReply.ok) {
            console.error("Auto-reply failed:", await autoReply.json());
        }
        res.status(200).json({
            status: "success",
            message: "Message sent successfully! We'll get back to you soon.",
        });
    }
    catch (err) {
        console.error("Contact form error:", err);
        res.status(500).json({
            status: "failed",
            message: err.message || "Failed to send message. Please try again.",
        });
    }
};
exports.default = sendContactMessage;
