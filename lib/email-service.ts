// Email service using Nodemailer with Gmail SMTP for sending workspace invitations
import nodemailer from 'nodemailer';

interface WorkspaceInvitationEmail {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  workspaceName: string;
  workspaceDescription: string;
  invitationToken: string;
  role: 'admin' | 'editor' | 'viewer';
  expiresAt: string;
}

interface ContactFormEmail {
  name: string;
  email: string;
  message: string;
  subject?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Gmail SMTP configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.EMAIL_PASS,
  },
};

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  try {
    return nodemailer.createTransport(SMTP_CONFIG);
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

export class EmailService {
  private static async sendEmail(mailOptions: any): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) {
        console.error('Failed to create email transporter');
        return false;
      }

      // Verify SMTP connection
      await transporter.verify();
      
      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
      
    } catch (error) {
      console.error('Email service error:', error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid login')) {
          console.error('\n🔑 Gmail Authentication Error:');
          console.error('Your Gmail password is incorrect or you need an App Password.');
          console.error('📝 To fix this:');
          console.error('1. Go to https://myaccount.google.com/security');
          console.error('2. Enable 2-Step Verification');
          console.error('3. Generate an App Password for Mail');
          console.error('4. Replace GMAIL_PASS in .env.local with the 16-character app password\n');
        } else if (error.message.includes('self signed certificate')) {
          console.error('SSL certificate issue. Gmail SMTP requires proper SSL.');
        } else if (error.message.includes('ETIMEDOUT')) {
          console.error('Gmail connection timeout. Please try again later.');
        }
      }
      
      return false;
    }
  }

  static async sendWorkspaceInvitation({
    recipientEmail,
    recipientName,
    senderName,
    workspaceName,
    workspaceDescription,
    invitationToken,
    role,
    expiresAt
  }: WorkspaceInvitationEmail): Promise<boolean> {
    const invitationUrl = `${BASE_URL}/invite/${invitationToken}`;
    const expirationDate = new Date(expiresAt).toLocaleDateString();
    
    const roleDescription = {
      admin: 'Administrator - Full access to manage the workspace',
      editor: 'Editor - Can create and edit content',
      viewer: 'Viewer - Can view and comment on content'
    };

    const mailOptions = {
      from: `"AI Document Analysis Platform" <${SMTP_CONFIG.auth.user}>`,
      to: recipientEmail,
      subject: `🎉 You're invited to join "${workspaceName}" workspace`,
      text: `
Hello ${recipientName || 'there'}!

${senderName} has invited you to join the "${workspaceName}" workspace on our AI Document Analysis Platform.

📋 Workspace Details:
• Name: ${workspaceName}
• Description: ${workspaceDescription}
• Your Role: ${roleDescription[role]}

🔗 Accept Invitation:
${invitationUrl}

⏰ This invitation expires on ${expirationDate}

What you can do in this workspace:
${role === 'admin' ? 
  '• Manage workspace settings and members\n• Create, edit, and delete projects\n• Upload and analyze documents\n• Invite new members' :
  role === 'editor' ?
  '• Create and edit projects\n• Upload and analyze documents\n• Collaborate with team members' :
  '• View projects and documents\n• Comment and provide feedback\n• Access shared analyses'
}

🚀 About Our Platform:
Our AI-powered document analysis platform helps teams collaborate on document processing, analysis, and insights using advanced AI models - all running locally for complete privacy.

Questions? Just reply to this email and we'll be happy to help!

Best regards,
The AI Document Analysis Team

---
This invitation was sent by ${senderName} (via AI Document Analysis Platform)
If you weren't expecting this invitation, you can safely ignore this email.
      `,
      // HTML version for better formatting
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .invitation-card { background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .role-badge { background: #e2e8f0; color: #2d3748; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block; }
            .features { background: #f7fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Workspace Invitation</h1>
            <p>You've been invited to collaborate!</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${recipientName || 'there'}</strong>!</p>
            
            <p><strong>${senderName}</strong> has invited you to join the <strong>"${workspaceName}"</strong> workspace on our AI Document Analysis Platform.</p>
            
            <div class="invitation-card">
              <h3>📋 Workspace Details</h3>
              <p><strong>Name:</strong> ${workspaceName}</p>
              <p><strong>Description:</strong> ${workspaceDescription}</p>
              <p><strong>Your Role:</strong> <span class="role-badge">${role.toUpperCase()}</span></p>
              <p><em>${roleDescription[role]}</em></p>
            </div>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="btn">Accept Invitation</a>
              <p style="font-size: 12px; color: #666;">⏰ This invitation expires on ${expirationDate}</p>
            </div>
            
            <div class="features">
              <h3>What you can do in this workspace:</h3>
              <ul>
                ${role === 'admin' ? `
                  <li>Manage workspace settings and members</li>
                  <li>Create, edit, and delete projects</li>
                  <li>Upload and analyze documents</li>
                  <li>Invite new members</li>
                ` : role === 'editor' ? `
                  <li>Create and edit projects</li>
                  <li>Upload and analyze documents</li>
                  <li>Collaborate with team members</li>
                ` : `
                  <li>View projects and documents</li>
                  <li>Comment and provide feedback</li>
                  <li>Access shared analyses</li>
                `}
              </ul>
            </div>
            
            <div style="background: #e6f3ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>🚀 About Our Platform</h3>
              <p>Our AI-powered document analysis platform helps teams collaborate on document processing, analysis, and insights using advanced AI models - all running locally for complete privacy.</p>
            </div>
            
            <p>Questions? Just reply to this email and we'll be happy to help!</p>
            
            <p>Best regards,<br>
            <strong>The AI Document Analysis Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by ${senderName} via AI Document Analysis Platform</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `
    };

    return this.sendEmail(mailOptions);
  }

  static async sendContactForm({
    name,
    email,
    message,
    subject = 'New Contact Form Submission'
  }: ContactFormEmail): Promise<boolean> {
    const emailData = {
      from_name: 'AI Document Analysis Platform',
      subject: `${subject} - from ${name}`,
      message: `
Name: ${name}
Email: ${email}

Message:
${message}

---
Sent via AI Document Analysis Platform Contact Form
      `,
      // Additional fields for Web3Forms
      name,
      email,
      user_message: message,
      to: 'support@your-domain.com', // Replace with your support email
    };

    return this.sendEmail(emailData);
  }

  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const emailData = {
      to: userEmail,
      from_name: 'AI Document Analysis Platform',
      subject: '🎉 Welcome to AI Document Analysis Platform!',
      message: `
Hello ${userName}!

Welcome to our AI Document Analysis Platform! We're excited to have you on board.

🚀 Get Started:
1. Upload your first document
2. Chat with AI about your content
3. Create workspaces for team collaboration
4. Explore advanced analysis features

💡 Key Features:
• 100% Local AI Processing - Your data never leaves your device
• Universal Document Support - PDF, DOCX, TXT, and more
• Real-time AI Chat - Ask questions about your documents
• Team Collaboration - Work together in shared workspaces
• Advanced Analytics - Gain insights from your content

Need help getting started? Check out our documentation or reply to this email.

Best regards,
The AI Document Analysis Team
      `,
      name: userName,
      email: userEmail,
    };

    return this.sendEmail(emailData);
  }
}

// React hook for using Web3Forms in components
export function useWeb3FormsEmail() {
  const sendInvitationEmail = async (invitationData: WorkspaceInvitationEmail) => {
    return EmailService.sendWorkspaceInvitation(invitationData);
  };

  const sendContactEmail = async (contactData: ContactFormEmail) => {
    return EmailService.sendContactForm(contactData);
  };

  const sendWelcomeEmail = async (email: string, name: string) => {
    return EmailService.sendWelcomeEmail(email, name);
  };

  return {
    sendInvitationEmail,
    sendContactEmail,
    sendWelcomeEmail
  };
}