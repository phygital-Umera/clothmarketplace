import nodemailer from 'nodemailer';
import {config, logger} from '@config/index';

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
    transport
        .verify()
        .then(() => logger.info('Connected to email server'))
        .catch(() =>
            logger.warn(
                'Unable to connect to email server. Make sure you have configured the SMTP options in .env',
            ),
        );
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} [html] - Optional HTML content for the email
 * @param {Array<Object>} [attachments] - Optional attachments for the email
 * @returns {Promise}
 */
const sendEmail = async (
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: Array<{filename: string; path?: string; content?: string | Buffer}>,
) => {
    const msg = {
        from: config.email.from,
        to,
        subject,
        text,
        html, // Allows sending emails with HTML content
        attachments, // Allows sending emails with attachments
    };
    try {
        console.log(`[Email Debug] Attempting to send email...`);
        console.log(`[Email Debug] From: ${config.email.from}`);
        console.log(`[Email Debug] To: ${to}`);
        console.log(`[Email Debug] Subject: "${subject}"`);
        console.log(`[Email Debug] Attachments: ${attachments?.length || 0} file(s)`);

        const info = await transport.sendMail(msg);
        console.log(`[Email Debug] Email sent successfully! MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`[Email Debug] Error encountered while sending email:`, error);
        throw error;
    }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @param {string} [customUrl] - Optional custom URL for the reset password page
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to: string, token: string, customUrl?: string) => {
    try {
        const subject = 'Reset password';
        const resetPasswordUrl = customUrl
            ? `${customUrl}?token=${token}`
            : `http://link-to-app/reset-password?token=${token}`;

        const text = `
            Dear user,
            To reset your password, click on this link: ${resetPasswordUrl}
            If you did not request any password resets, then ignore this email.
        `;

        const html = `
            <p>Dear user,</p>
            <p>To reset your password, click on this link: 
                <a href="${resetPasswordUrl}">Reset Password</a>
            </p>
            <p>If you did not request any password resets, you can safely ignore this email.</p>
        `;

        await sendEmail(to, subject, text, html);
        logger.info(`Reset password email sent to ${to}`);

        return {success: true};
    } catch (error) {
        logger.error(`Failed to send reset password email: ${error}`);
        return {
            success: false,
            message: 'Error sending reset password email',
        };
    }
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} username
 * @param {string} token
 * @param {string} [customUrl] - Optional custom URL for the email verification page
 * @returns {Promise}
 */
const sendVerificationEmail = async (
    to: string,
    username: string,
    token: string,
    customUrl?: string,
) => {
    try {
        const subject = 'Email Verification';
        const verificationEmailUrl = `${customUrl ?? 'http://link-to-app/verify'}?username=${username}&code=${token}`;
        const text = `Dear ${username},
        To verify your email, click on this link: ${verificationEmailUrl}`;

        const html = `<p>Dear ${username},</p>
        <p>To verify your email, click on this link: <a href="${verificationEmailUrl}">Verify Email</a></p>`;

        await sendEmail(to, subject, text, html);
        return {success: true};
    } catch (error) {
        logger.error(`Failed to send verification email: ${error}`);
        return {
            success: false,
            message: 'Error sending verification email',
        };
    }
};

export default {
    transport,
    sendEmail,
    sendResetPasswordEmail,
    sendVerificationEmail,
};
