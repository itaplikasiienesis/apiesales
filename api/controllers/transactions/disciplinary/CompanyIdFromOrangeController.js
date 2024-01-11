/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const _ = require("lodash");
 const soapRequest = require('easy-soap-request');
 const fs = require('fs');
 const xml2js = require('xml2js');
 
 module.exports = {
   // GET ALL RESOURCE
   find: async function (req, res) {
     await DB.poolConnect;
     try {

        const request = DB.pool.request();
        let xml = fs.readFileSync('soap/disciplinary/REQUEST_COMPANY_ID.xml', 'utf-8');
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
        let url = ``;
        if(statusIntegasi=='DEV'){
          url = 'https://hris.enesis.com/enesis-dev/services/EmpDisciplinary?wsdl'; // development
        }else{
          url = 'https://hris.enesis.com/enesis/services/EmpDisciplinary?wsdl'; // production
        }
      

        let sampleHeaders = {
            'user-agent': `Api-Esales`,
            'Content-Type': `application/x-www-form-urlencoded`,
            'soapAction': `""`,
          };
                       
        let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:xml, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
        let {body, statusCode } = response;
    
        let dataCompany = [];
        if(statusCode==200){
                  
            let parsedXML = await xml2js.parseStringPromise(body);
            //console.log(parsedXML);
            // let data = parsedXML['soap-env:Envelope']['soap-env:Body'][0]['getCompanyIdResponse'];
            let data = parsedXML['soapenv:Envelope']['soapenv:Body'][0].getCompanyIdResponse[0].getCompanyIdReturn;
            if(data.length > 0){
                for (let i = 0; i < data.length; i++) {
                    let company_id = data[i].company_id[0];
                    let company_name = data[i].company_name[0];

                    let obj = {
                        company_id:company_id,
                        company_name:company_name
                    }
                    dataCompany.push(obj);
                    
                }
            }
            
        
        }

        //console.log(dataCompany);


         return res.success({
           result: dataCompany,
           message: "Fetch data successfully"
         });
     } catch (err) {
       return res.error(err);
     }
   },

   findOne: async function (req, res) {
    await DB.poolConnect;
    try {

       const request = DB.pool.request();
       let xml = fs.readFileSync('soap/disciplinary/REQUEST_COMPANY_ID.xml', 'utf-8');
       let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
       let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
       let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
     
       let url = ``;
       if(statusIntegasi=='DEV'){
         url = 'https://hris.enesis.com/enesis-dev/services/EmpDisciplinary?wsdl'; // development
       }else{
         url = 'https://hris.enesis.com/enesis/services/EmpDisciplinary?wsdl'; // production
       }
     
       let param_company_id = req.param(
        "company_id"
       );

       console.log(param_company_id);

       let sampleHeaders = {
           'user-agent': `Api-Esales`,
           'Content-Type': `application/x-www-form-urlencoded`,
           'soapAction': `""`,
         };
                      
       let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:xml, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
       let {body, statusCode } = response;
   
       let dataCompany = [];
       if(statusCode==200){
                 
           let parsedXML = await xml2js.parseStringPromise(body);
           //console.log(parsedXML);
           // let data = parsedXML['soap-env:Envelope']['soap-env:Body'][0]['getCompanyIdResponse'];
           let data = parsedXML['soapenv:Envelope']['soapenv:Body'][0].getCompanyIdResponse[0].getCompanyIdReturn;
           if(data.length > 0){
               for (let i = 0; i < data.length; i++) {
                   let company_id = data[i].company_id[0];
                   let company_name = data[i].company_name[0];

                   if(param_company_id == company_id){
                      let obj = {
                        company_id:company_id,
                        company_name:company_name
                      }
                      dataCompany.push(obj);
                   }                   
               }
           }
        
       }
       //console.log(dataCompany);
        return res.success({
          result: dataCompany,
          message: "Fetch data successfully"
        });
    } catch (err) {
      return res.error(err);
    }
  },
 
 };
 