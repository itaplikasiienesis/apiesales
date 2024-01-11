/* eslint-disable no-undef */

const nodemailer = require("nodemailer");


module.exports = {
  // GET ALL RESOURCE
  trySendMail: async function (req, res) {
    let user = `esales@enesis.com`;
    let pass = `ploSSa@2020`;
    let host = `email.enesis.com`;
    // let user = `246cbfd7e63de6`;
    // let pass = `4ad9fca930404c`;
    // let host = `smtp.mailtrap.io`;
    // let user = `nugrahaazizluthfi@gmail.com`;
    // let pass = `@NugrahaAzizLuthfi123456`;
    // let host = `smtp.gmail.com`;

    let transporter = nodemailer.createTransport({
      host: host,
      port: 587,
      secure: true, // true for 465, false for other ports
      auth: {
        user: user, // generated ethereal user
        pass: pass // generated ethereal password
      },
    });

    // send mail with defined transport object
    await transporter.sendMail({
      from: '"Fred Foo "', // sender address
      to: "nugrahaazizluthfi@gmail.com", // list of receivers
      subject: "Bidding Order", // Subject line
      text: "Bidding Shipment", // plain text body
      html: "<b>Bidding Shipment</b>" // html body
    });

    res.send(['ok']);
  }
}
