"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpEmailHtml = void 0;
const generateOtpEmailHtml = ({ name, otp, type }) => {
    const isVerification = type === 'verification';
    const title = isVerification ? 'IGNOUPower - Account Verification OTP' : 'IGNOUPower - Password Reset OTP';
    const headerText = isVerification ? 'Verify Your Account' : 'Reset Your Password';
    const bodyText = isVerification
        ? 'Thank you for registering at IGNOUPower. Please use the following One-Time Password (OTP) to complete your account registration:'
        : 'We received a request to reset your IGNOUPower password. Please use the following One-Time Password (OTP) to proceed:';
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            padding: 20px !important;
          }
          .otp-code {
            font-size: 28px !important;
            letter-spacing: 6px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f9; padding: 40px 0;">
        <tr>
          <td align="center">
            <!-- Email Wrapper -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="550" class="email-container" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #eaebf0;">
              
              <!-- Header Section -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 35px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; font-family: 'Segoe UI', Roboto, sans-serif;">
                    IGNOUPOWER
                  </h1>
                  <p style="margin: 5px 0 0 0; color: #bfdbfe; font-size: 14px; font-weight: 500;">
                    Secure Authentication Services
                  </p>
                </td>
              </tr>

              <!-- Body Section -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 700; font-family: 'Segoe UI', Roboto, sans-serif;">
                    ${headerText}
                  </h2>
                  <p style="margin: 0 0 10px 0; color: #334155; font-size: 16px; font-weight: 600;">
                    Hello ${name},
                  </p>
                  <p style="margin: 0 0 30px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                    ${bodyText}
                  </p>

                  <!-- OTP Presentation Card -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="padding: 24px 16px;">
                        <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                          Your Verification Code
                        </span>
                        <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #1e3a8a; letter-spacing: 8px; margin: 0; padding: 6px 0 0 8px;">
                          ${otp}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Information Callout -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <tr>
                      <td style="padding: 12px 16px;">
                        <p style="margin: 0; color: #b45309; font-size: 13px; line-height: 1.5; font-weight: 500;">
                          <strong>Security Warning:</strong> This OTP is valid for <strong>5 minutes</strong>. For your security, do not share this code with anyone.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                    If you did not request this code, you can safely ignore this email. Another user may have entered your email address by mistake.
                  </p>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 30px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                    This is an automated message. Please do not reply directly to this email.
                  </p>
                  <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px; font-weight: 600; font-family: 'Segoe UI', Roboto, sans-serif;">
                    IGNOUPower
                  </p>
                  <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;">
                    &copy; ${new Date().getFullYear()} IGNOUPower. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
exports.generateOtpEmailHtml = generateOtpEmailHtml;
