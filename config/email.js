 
module.exports.email = {
  service: "Mailgun",
  auth: {
    user: "postmaster@xxxxxxxxxxxxx.mailgun.org",
    pass: "xxxxxxxxxxxxxxxxxxxxxx"
  },
  templateDir: "api / emailTemplates",
  from: "info@mycompany.com",
  testMode: false,
  ssl: true
}
