transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
        console.error("❌ Email Sending Failed:", err);
    } else {
        console.log("✅ Email Sent Successfully:", info.response);
    }
});
