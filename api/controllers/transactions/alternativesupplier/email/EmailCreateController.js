const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const direktorihtml = () => path.resolve(sails.config.appPath, 'assets', 'emailtemplate', 'alternativesupplier');
const axios = require('axios');
const SendEmail = require('../../../../services/SendEmail');
const { route } = require('../../../../routes/disciplinary/email/EmailDisciplinaryRoute');

module.exports = {

    forApprove: async function(req, res) {
        const {alt_supplier_id,email,name} = req.body;
        await DB.poolConnect;
        try {
                const request = DB.pool.request();

                let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
                let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
                let dataemail = [];
        

                let queryDataTable = `SELECT a.*
                FROM alt_supplier_v a
                WHERE a.alt_supplier_id = '${alt_supplier_id}'`;
        
                request.query(queryDataTable,async (err, result) => {
                    if (err) {
                    return res.error(err);
                    }

                    const row = result.recordset[0];

                    if(statusIntegasi=='DEV'){
                
                        dataemail.push('tiasadeputra@gmail.com');
                    
                    }else{

                        dataemail.push(email);
                    
                    }
        
                    if(dataemail.length > 0){

                        let content = fs.readFileSync(path.resolve(direktorihtml(),"emailcreatealternativesuplier.html"),"utf-8");
                        row.baseurl = direktorihtml();
                        row.name = name;
                                            
                        let template = handlebars.compile(content);
                        let finalHtml = template(row);
                        let subject = `NEED APPROVAL`;
                        SendEmail(dataemail.toString(), subject, finalHtml);
    
                    }

                    return res.success({
                        message: "Process Succesfully"
                    });                        
                    
                });
        } catch (err) {
          return res.error(err);
        }
    
    },
    forNeedResult: async function(req, res) {
      const {alt_supplier_id,email,name} = req.body;
      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
        let dataemail = [];


        let queryDataTable = `SELECT a.*
        FROM alt_supplier_v a
        WHERE a.alt_supplier_id = '${alt_supplier_id}'`;
        request.query(queryDataTable,async (err, result) => {
            if (err) {
              return res.error(err);
            }

            const row = result.recordset[0];

            if(statusIntegasi=='DEV'){
        
                dataemail.push('tiasadeputra@gmail.com');
            
            }else{

                dataemail.push(email);
            
            }

            console.log(dataemail);

            
            if(dataemail.length > 0){

              let content = fs.readFileSync(path.resolve(direktorihtml(),"emailresultalternativesuplier.html"),"utf-8");
              row.baseurl = direktorihtml();
              row.name = name;
                                  
              let template = handlebars.compile(content);
              let finalHtml = template(row);
              let subject = `NEED RESULT TESTING MATERIAL`;
              SendEmail(dataemail.toString(), subject, finalHtml);

            }

            return res.success({
                message: "Process Succesfully"
            });
                               

            
        });
      } catch (err) {
        return res.error(err);
      }
  
  },

  forFinish: async function(req, res) {
    const {alt_supplier_id,email,name} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      let dataemail = [];


      let queryDataTable = `SELECT a.*
      FROM alt_supplier_v a
      WHERE a.alt_supplier_id = '${alt_supplier_id}'`;
      request.query(queryDataTable,async (err, result) => {
          if (err) {
            return res.error(err);
          }

          const row = result.recordset[0];

          if(statusIntegasi=='DEV'){
      
              dataemail.push('tiasadeputra@gmail.com');
          
          }else{

              dataemail = email;
          }
          
          if(dataemail.length > 0){

            let content = fs.readFileSync(path.resolve(direktorihtml(),"emailfinishalternativesuplier.html"),"utf-8");
            row.baseurl = direktorihtml();
            row.name = name;
                                
            let template = handlebars.compile(content);
            let finalHtml = template(row);
            let subject = `Finish Document Alternative Supplier`;
            SendEmail(dataemail.toString(), subject, finalHtml);

          }

          return res.success({
              message: "Process Succesfully"
          });
                             

          
      });
    } catch (err) {
      return res.error(err);
    }

}
    
}



function racikXML(xmlTemplate, param) {

  return xmlTemplate.replace('?', param);

}