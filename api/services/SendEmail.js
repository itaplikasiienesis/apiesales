/* eslint-disable no-undef */
const nodemailer = require('nodemailer');


const emailConfig = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'eis@enesis.com', 
      pass: 'Cag42013'
    }, 
    tls:{
        rejectUnauthorized: false
    }
}


const emailConfigDev = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'eis@enesis.com', 
      pass: 'Cag42013'
    }, 
    tls:{
        rejectUnauthorized: false
    }
}

const emailConfigEpropDev = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'eis@enesis.com', 
    pass: 'Cag42013' 
    // pass: 'Enesis@1988'
  }, 
  tls:{
      rejectUnauthorized: false
  }
}

const emailConfigEprop = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'eis@enesis.com', 
    pass: 'Cag42013'
  }, 
  tls:{
      rejectUnauthorized: false
  }

}

module.exports = async function(target, subject, html, callback, apps, attachments) {

    await DB.poolConnect;
    try {
        const request = DB.pool.request();
        let configUsing = undefined;
        let fromUsuser = undefined;

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        //console.log(datastatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
        //let url = ``;
        if(statusIntegasi=='DEV' && apps!=='EPROP'){
          configUsing = emailConfigDev; // development
          fromUsuser = `"EIS " <${configUsing.auth.user}>`;
        }else if(statusIntegasi=='DEV' && apps==='EPROP'){
          configUsing = emailConfigEpropDev; // development
          fromUsuser = `"'EIS' " <${configUsing.auth.user}>`;
        }else if(statusIntegasi=='PROD' && apps==='EPROP'){
          configUsing = emailConfigEprop; // development
          fromUsuser = `"'EIS' " <${configUsing.auth.user}>`;
        }else{
          configUsing = emailConfig; // production
          fromUsuser = `"EIS " <${configUsing.auth.user}>`;
        }   
        
        //console.log(configUsing);
    
        let transporter = nodemailer.createTransport(configUsing);
        const validatedTarget = target.split(',').filter(x => x).toString();


        let targetFinal = [];
        if(statusIntegasi=='DEV'){
          targetFinal.push('tiasadeputra@gmail.com');
        }else{
          targetFinal = validatedTarget;
        }


        if(targetFinal.length > 0){

           //send mail versi promises
            if (!callback) { 
              return transporter.sendMail({
                  from: fromUsuser, // sender address
                  to: targetFinal, // list of receivers : "bar@example.com, baz@example.com"
                  subject: subject, // Subject line : "Bidding Order"
                  // text: text, // plain text body "Bidding Shipment"
                  html: html, // html body : "<b>Bidding Shipment</b>"
                  attachments: (attachments) ? attachments : []
              });
          }
      
          // send mail versi callback
          transporter.sendMail({
              from: fromUsuser, // sender address
              to: targetFinal, // list of receivers : "bar@example.com, baz@example.com"
              subject: subject, // Subject line : "Bidding Order"
              // text: text, // plain text body "Bidding Shipment"
              html: html, // html body : "<b>Bidding Shipment</b>"
              attachments: (attachments) ? attachments : []
          }, callback); //TANDA

        }

       
    
    } catch (err) {
        return err;
      }
    
    

}