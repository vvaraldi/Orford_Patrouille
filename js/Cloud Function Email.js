/**
 * Cloud Function: Send Email Notifications
 * 
 * This function triggers when a new document is created in the 'notifications' collection
 * and sends email to system admins.
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Install Firebase CLI if not already installed:
 *    npm install -g firebase-tools
 * 
 * 2. Initialize Firebase Functions in your project:
 *    firebase init functions
 *    (Choose JavaScript, install dependencies)
 * 
 * 3. Install required packages in the functions folder:
 *    cd functions
 *    npm install nodemailer
 * 
 * 4. Set environment variables for email configuration:
 *    firebase functions:config:set email.user="your-email@gmail.com"
 *    firebase functions:config:set email.password="your-app-password"
 *    firebase functions:config:set email.from="Orford Patrouille <noreply@orford-patrouille.ca>"
 * 
 *    Note: For Gmail, you need to create an App Password:
 *    - Go to Google Account > Security > 2-Step Verification > App Passwords
 *    - Generate a new app password for "Mail"
 * 
 * 5. Deploy the function:
 *    firebase deploy --only functions
 * 
 * 6. Upgrade to Firebase Blaze plan (required for outbound network requests)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

/**
 * Triggered when a new notification document is created
 */
exports.sendRequestNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    
    // Only process new_request notifications
    if (notification.type !== 'new_request') {
      console.log('Skipping non-request notification');
      return null;
    }
    
    // Check if already processed
    if (notification.processed) {
      console.log('Notification already processed');
      return null;
    }
    
    const recipients = notification.recipients;
    if (!recipients || recipients.length === 0) {
      console.log('No recipients to notify');
      return null;
    }
    
    // Build email content
    const typeLabels = {
      bug: '🐛 Bug',
      feature: '✨ Fonctionnalité',
      question: '❓ Question',
      suggestion: '💡 Suggestion'
    };
    
    const priorityLabels = {
      high: '🔴 Haute',
      medium: '🟡 Moyenne',
      low: '🟢 Basse'
    };
    
    const subject = `[Orford Patrouille] Nouvelle demande: ${notification.requestTitle}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Orford Patrouille</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Nouvelle demande reçue</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">${notification.requestTitle}</h2>
          
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Type:</td>
              <td style="padding: 8px 0; font-weight: bold;">${typeLabels[notification.requestType] || notification.requestType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Priorité:</td>
              <td style="padding: 8px 0; font-weight: bold;">${priorityLabels[notification.requestPriority] || notification.requestPriority}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Créé par:</td>
              <td style="padding: 8px 0; font-weight: bold;">${notification.createdByName}</td>
            </tr>
          </table>
          
          <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${notification.requestDescription}${notification.requestDescription.length >= 200 ? '...' : ''}</p>
          </div>
          
          <a href="https://vvaraldi.github.io/Orford_Patrouille/pages/requests.html" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Voir la demande
          </a>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Cet email a été envoyé automatiquement par le système Orford Patrouille.</p>
          <p>Vous recevez ce message car vous êtes administrateur système.</p>
        </div>
      </div>
    `;
    
    const textContent = `
Nouvelle demande - Orford Patrouille

Titre: ${notification.requestTitle}
Type: ${typeLabels[notification.requestType] || notification.requestType}
Priorité: ${priorityLabels[notification.requestPriority] || notification.requestPriority}
Créé par: ${notification.createdByName}

Description:
${notification.requestDescription}${notification.requestDescription.length >= 200 ? '...' : ''}

Voir la demande: https://vvaraldi.github.io/Orford_Patrouille/pages/requests.html
    `;
    
    try {
      // Send email to all recipients
      const mailOptions = {
        from: functions.config().email.from || 'Orford Patrouille <noreply@orford-patrouille.ca>',
        to: recipients.join(', '),
        subject: subject,
        text: textContent,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', recipients);
      
      // Mark notification as processed
      await snapshot.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        emailSentTo: recipients
      });
      
      return { success: true, recipients };
      
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Mark as failed
      await snapshot.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message
      });
      
      throw error;
    }
  });


/**
 * Alternative: Using SendGrid instead of Gmail
 * 
 * If you prefer SendGrid (more reliable for production):
 * 
 * 1. Sign up at sendgrid.com and get an API key
 * 
 * 2. Install SendGrid:
 *    npm install @sendgrid/mail
 * 
 * 3. Set config:
 *    firebase functions:config:set sendgrid.key="your-sendgrid-api-key"
 * 
 * 4. Replace the transporter code with:
 * 
 * const sgMail = require('@sendgrid/mail');
 * sgMail.setApiKey(functions.config().sendgrid.key);
 * 
 * // In the function, replace transporter.sendMail with:
 * await sgMail.send({
 *   to: recipients,
 *   from: 'noreply@orford-patrouille.ca',
 *   subject: subject,
 *   text: textContent,
 *   html: htmlContent
 * });
 */