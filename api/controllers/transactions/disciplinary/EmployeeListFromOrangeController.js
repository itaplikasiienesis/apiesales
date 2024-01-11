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

    const {
        query: { company_id }
      } = req;
  
     await DB.poolConnect;
     try {

        const request = DB.pool.request();
        let xml = fs.readFileSync('soap/disciplinary/REQUEST_EMPLOYEE.xml', 'utf-8');
        let hasil = replaceIDcompanyFilterEmployee(xml,company_id);
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
                       
        let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
        let {body, statusCode } = response;
        //console.log(statusCode);

        let dataEmployee = [];
        if(statusCode==200){
                  
            let parsedXML = await xml2js.parseStringPromise(body);
            //console.log(parsedXML);
            let data = parsedXML['soapenv:Envelope']['soapenv:Body'][0].getEmpIdResponse[0].getEmpIdReturn;
            if(data.length > 0){
                for (let i = 0; i < data.length; i++) {
                    let employee_id = data[i].employee_id[0];
                    let employee_name = data[i].employee_name[0];

                    let obj = {
                        employee_id:employee_id,
                        employee_name:employee_name
                    }
                    dataEmployee.push(obj);
                    
                }
            }
            
        
        }

        //console.log(dataEmployee);


         return res.success({
           result: dataEmployee,
           message: "Fetch data successfully"
         });
     } catch (err) {
       return res.error(err);
     }
   },
 
 };
 

 function replaceIDcompanyFilterEmployee(xmlTemplate, param) {
      return xmlTemplate.replace('?', param)
  }