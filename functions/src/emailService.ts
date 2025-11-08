// Email Service using AWS SES with Nodemailer
import * as nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';

// LAZY INITIALIZATION for Nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        const AWS_SES_USER = process.env.AWS_SES_USER || functions.config().aws?.ses_user || 'AKIAWXN6QSYXBLFGWVPS';
        const AWS_SES_PASS = process.env.AWS_SES_PASS || functions.config().aws?.ses_pass || 'BIvqBwjo+pxIC2P4CcaF14vOuy0f28Fh4rAcDikjser9';

        const SES_CONFIG = {
            host: 'email-smtp.us-east-1.amazonaws.com',
            port: 587,
            secure: false, // Use TLS
            auth: {
                user: AWS_SES_USER,
                pass: AWS_SES_PASS
            }
        };

        transporter = nodemailer.createTransport(SES_CONFIG);

        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ AWS SES connection error:', error);
            } else {
                console.log('✅ AWS SES is ready to send emails');
            }
        });
    }
<<<<<<< Updated upstream
};

// Lazy-load transporter to avoid blocking module initialization
let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport(SES_CONFIG);
    }
    return transporter;
}


=======
    return transporter;
}
>>>>>>> Stashed changes

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string
): Promise<boolean> {
    try {
        const mailOptions = {
            from: '"Vcanship" <noreply@vcanship.com>',
            to: recipientEmail,
            subject: '🎉 Welcome to Vcanship - Your Shipping Journey Starts Here!',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🚀 Welcome to Vcanship!</h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Your trusted partner for global shipping</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #1F2937; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for joining <strong>Vcanship</strong> - the most affordable and reliable way to ship parcels worldwide! We're thrilled to have you on board.
                            </p>
                            
                            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                <h3 style="color: #92400E; margin: 0 0 12px 0; font-size: 18px;">🎁 Your Benefits:</h3>
                                <ul style="color: #78350F; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li><strong>18-25% cheaper</strong> than DHL, FedEx & UPS</li>
                                    <li>Save addresses for <strong>faster checkouts</strong></li>
                                    <li>Track all shipments in one place</li>
                                    <li>Professional PDF receipts & labels</li>
                                    <li>Exclusive member discounts</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://vcanship-onestop-logistics.web.app/parcel" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
                                    🎯 Ship Your First Parcel
                                </a>
                            </div>
                            
                            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                <h4 style="color: #1F2937; margin: 0 0 12px 0; font-size: 16px;">📍 Quick Links:</h4>
                                <p style="margin: 0; line-height: 2; color: #6B7280;">
                                    <a href="https://vcanship-onestop-logistics.web.app/address-book" style="color: #F97316; text-decoration: none;">📒 Manage Address Book</a><br>
                                    <a href="https://vcanship-onestop-logistics.web.app/dashboard" style="color: #F97316; text-decoration: none;">📊 View Dashboard</a><br>
                                    <a href="https://vcanship-onestop-logistics.web.app/tracking" style="color: #F97316; text-decoration: none;">📦 Track Shipments</a>
                                </p>
                            </div>
                            
                            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin: 20px 0 0 0;">
                                If you have any questions, our support team is here to help 24/7.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                © 2025 Vcanship. All rights reserved.<br>
                                <a href="https://vcanship-onestop-logistics.web.app" style="color: #F97316; text-decoration: none;">vcanship.com</a> | 
                                <a href="mailto:support@vcanship.com" style="color: #F97316; text-decoration: none;">support@vcanship.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        await getTransporter().sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        return false;
    }
}

/**
 * Send Booking Confirmation Email
 */
export async function sendBookingConfirmationEmail(
    recipientEmail: string,
    bookingData: {
        trackingId: string;
        recipientName: string;
        origin: string;
        destination: string;
        weight: number;
        carrier: string;
        service: string;
        transitTime: string;
        totalCost: number;
        currency: string;
    }
): Promise<boolean> {
    try {
        const mailOptions = {
            from: '"Vcanship" <noreply@vcanship.com>',
            to: recipientEmail,
            subject: `✅ Booking Confirmed - ${bookingData.trackingId}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Your parcel is ready to ship</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #1F2937; margin: 0 0 20px 0;">Hi ${bookingData.recipientName},</p>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 25px 0;">
                                Great news! Your shipment has been confirmed and is ready to go. Here are your booking details:
                            </p>
                            
                            <!-- Tracking Box -->
                            <div style="background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400E; font-weight: 600;">TRACKING NUMBER</p>
                                <h2 style="margin: 0; font-size: 28px; color: #78350F; letter-spacing: 2px; font-family: monospace;">${bookingData.trackingId}</h2>
                                <a href="https://vcanship-onestop-logistics.web.app/tracking?id=${bookingData.trackingId}" style="display: inline-block; margin-top: 15px; color: #F97316; text-decoration: none; font-weight: 600;">
                                    📍 Track Your Parcel →
                                </a>
                            </div>
                            
                            <!-- Shipment Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">From:</span><br>
                                        <strong style="color: #1F2937; font-size: 15px;">${bookingData.origin}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">To:</span><br>
                                        <strong style="color: #1F2937; font-size: 15px;">${bookingData.destination}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">Weight:</span>
                                        <strong style="color: #1F2937; font-size: 15px; float: right;">${bookingData.weight} kg</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">Carrier:</span>
                                        <strong style="color: #1F2937; font-size: 15px; float: right;">${bookingData.carrier}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">Service:</span>
                                        <strong style="color: #1F2937; font-size: 15px; float: right;">${bookingData.service}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                                        <span style="color: #6B7280; font-size: 14px;">Transit Time:</span>
                                        <strong style="color: #1F2937; font-size: 15px; float: right;">${bookingData.transitTime}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 0;">
                                        <span style="color: #6B7280; font-size: 16px; font-weight: 600;">Total Cost:</span>
                                        <strong style="color: #10B981; font-size: 22px; float: right;">${bookingData.currency}${bookingData.totalCost.toFixed(2)}</strong>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Next Steps -->
                            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 25px 0;">
                                <h4 style="color: #1E40AF; margin: 0 0 12px 0; font-size: 16px;">📋 Next Steps:</h4>
                                <ol style="color: #1E3A8A; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li>Download your shipping label from your dashboard</li>
                                    <li>Attach the label securely to your parcel</li>
                                    <li>Drop off at your chosen location or schedule pickup</li>
                                    <li>Track your shipment in real-time</li>
                                </ol>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://vcanship-onestop-logistics.web.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                    📊 View in Dashboard
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin: 20px 0 0 0;">
                                Need help? Contact us at <a href="mailto:support@vcanship.com" style="color: #F97316; text-decoration: none;">support@vcanship.com</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                © 2025 Vcanship. All rights reserved.<br>
                                <a href="https://vcanship-onestop-logistics.web.app" style="color: #F97316; text-decoration: none;">vcanship.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        await getTransporter().sendMail(mailOptions);
        console.log(`✅ Booking confirmation sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send booking confirmation:', error);
        return false;
    }
}

/**
 * Send Tracking Update Email
 */
export async function sendTrackingUpdateEmail(
    recipientEmail: string,
    trackingData: {
        trackingId: string;
        recipientName: string;
        status: string;
        location: string;
        timestamp: string;
        nextUpdate: string;
    }
): Promise<boolean> {
    try {
        const mailOptions = {
            from: '"Vcanship" <noreply@vcanship.com>',
            to: recipientEmail,
            subject: `📦 Tracking Update - ${trackingData.trackingId}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Tracking Update</h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">${trackingData.trackingId}</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #1F2937; margin: 0 0 20px 0;">Hi ${trackingData.recipientName},</p>
                            
                            <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 25px; border-radius: 12px; border: 2px solid #3B82F6; margin: 25px 0;">
                                <h3 style="color: #1E40AF; margin: 0 0 10px 0; font-size: 20px;">Current Status</h3>
                                <h2 style="color: #1E3A8A; margin: 0; font-size: 24px;">${trackingData.status}</h2>
                                <p style="margin: 10px 0 0 0; color: #1E3A8A;">
                                    📍 <strong>${trackingData.location}</strong><br>
                                    🕒 ${trackingData.timestamp}
                                </p>
                            </div>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 20px 0;">
                                ${trackingData.nextUpdate}
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://vcanship-onestop-logistics.web.app/tracking?id=${trackingData.trackingId}" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                    📍 View Full Tracking
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                © 2025 Vcanship. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        await getTransporter().sendMail(mailOptions);
        console.log(`✅ Tracking update sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send tracking update:', error);
        return false;
    }
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail(
    recipientEmail: string,
    recipientName: string,
    resetLink: string
): Promise<boolean> {
    try {
        const mailOptions = {
            from: '"Vcanship" <noreply@vcanship.com>',
            to: recipientEmail,
            subject: '🔐 Reset Your Vcanship Password',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
                            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #1F2937; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">
                                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280;">© 2025 Vcanship. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        await getTransporter().sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        return false;
    }
}
