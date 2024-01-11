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
   process: async function (req, res) {

    const {
        company_id
      } = req.body;
  
     await DB.poolConnect;
     try {

        const request = DB.pool.request();
        let xml = fs.readFileSync('soap/sinkronisasi/SINKRONISASI_DATA_DEPARTMENT.xml', 'utf-8');
        let hasil = replaceIDcompanyFilterDepartment(xml,company_id);
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
        let url = ``;
        if(statusIntegasi=='DEV'){
          url = 'https://hris.enesis.com/enesis-dev/services/NewEmployee?wsdl'; // development
        }else{
          url = 'https://hris.enesis.com/enesis-dev/services/NewEmployee?wsdl'; // production
        }
    

        let sampleHeaders = {
            'user-agent': `Api-Esales`,
            'Content-Type': `application/x-www-form-urlencoded`,
            'soapAction': `""`,
        };
                       
        let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
        let {body, statusCode } = response;
    
        let dataDepartment = [];
        if(statusCode==200){
                  
            let parsedXML = await xml2js.parseStringPromise(body);
            //console.log(parsedXML);
            let data = parsedXML['soapenv:Envelope']['soapenv:Body'][0].getOrgIdResponse[0].getOrgIdReturn;
            if(data.length > 0){
                for (let i = 0; i < data.length; i++) {
                    let org_id = data[i].org_id[0];
                    let name = data[i].name[0];

                    let obj = {
                        org_id:org_id,
                        name:name
                    }
                    dataDepartment.push(obj);
                    
                }
            }
            
        
        }

        for (let i = 0; i < dataDepartment.length; i++) {
          let kode = dataDepartment[i].org_id;
          let name = dataDepartment[i].name;
          let sqlCekkode = `SELECT COUNT(*) AS status FROM r_department WHERE kode = '${kode}'`;
          let datastatus = await request.query(sqlCekkode);
          let status = datastatus.recordset[0].status;

          if(status==0){
            let sqlInsertDataMaaster = `INSERT INTO r_department
            (r_department_id,kode, nama,company_id)
            VALUES('${kode}','${kode}', '${name}','${company_id}')`;
            await request.query(sqlInsertDataMaaster);
          }
        }


         return res.success({
           result: dataDepartment,
           message: "Fetch data successfully"
         });
     } catch (err) {
       return res.error(err);
     }
   },
 
 };
 

 function replaceIDcompanyFilterDepartment(xmlTemplate, param) {
      return xmlTemplate.replace('?', param)
  }