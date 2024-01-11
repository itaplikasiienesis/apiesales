/* eslint-disable no-undef */
const nodemailer = require('nodemailer');

// const emailConfig = {
//     host: 'email.enesis.com',
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: 'esales@enesis.com', 
//       pass: 'ploSSa@2020' 
//     }, 
//     tls:{
//         rejectUnauthorized: false
//     }
// }

const emailConfig = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'noreply@enesis.com', 
        pass: 'P@ssw0rd@1988*#' 
    }, 
    tls:{
        rejectUnauthorized: false
    }
}




// function replaceParam(template, param) {
//     let resultTemplate = template

//     return resultTemplate
// }

module.exports = async function(target, subject, html, callback, attachments) {

    console.log('attachments ',attachments);

    await DB.poolConnect;
    try {
        const request = DB.pool.request();
        let configUsing = undefined;
        let fromUsuser = undefined;

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
        configUsing = emailConfig; // production
        fromUsuser = `"Customer Promo " <${configUsing.auth.user}>`;
        let transporter = nodemailer.createTransport(configUsing);

    
        //send mail versi promises
        if (!callback) { 
            return transporter.sendMail({
                from: fromUsuser, // sender address
                to: target, // list of receivers : "bar@example.com, baz@example.com"
                subject: subject, // Subject line : "Bidding Order"
                // text: text, // plain text body "Bidding Shipment"
                html: html, // html body : "<b>Bidding Shipment</b>"
                attachments: (attachments) ? attachments : []
            });
        }
    
        // send mail versi callback
        transporter.sendMail({
            from: fromUsuser, // sender address
            to: target, // list of receivers : "bar@example.com, baz@example.com"
            subject: subject, // Subject line : "Bidding Order"
            // text: text, // plain text body "Bidding Shipment"
            html: html, // html body : "<b>Bidding Shipment</b>"
            attachments: (attachments) ? attachments : []
        }, callback); //TANDA
    
    } catch (err) {
        return res.error(err);
      }
    
    

}