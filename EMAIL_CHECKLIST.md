# Email Configuration Checklist

The code correctly implements sending the email with the user in CC. If you are not receiving emails, please check the following:

- [ ] **Resend API Key**: Ensure `RESEND_API_KEY` is set in your `.env` file (local) and Vercel environment variables (production).
- [ ] **Domain Verification**:
    - If you are on the Resend **Free Tier**, you can **ONLY** send emails to the email address you used to sign up (the account owner).
    - To send to other emails (like the test email you entered), you must **verify your domain** (`sozialer-navigator.de`) in the Resend Dashboard.
    - Until the domain is verified, emails to other addresses will be blocked/dropped by Resend.
- [ ] **Spam Folder**: Check the spam folder of the test email account.
- [ ] **Console Logs**: Run the app locally and check the terminal output after "sending". It should show `Email sent successfully to ... ID: ...`.
