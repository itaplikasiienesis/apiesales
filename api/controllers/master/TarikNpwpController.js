const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const numeral = require("numeral");
const _ = require("lodash");
const SendEmail = require("../../services/SendEmail");
const { request } = require("http");
const json2xls = require("json2xls");

const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const xml2js = require("xml2js");

module.exports = {
    find: async function(req, res) {
        const {
          query: { m_direct_outlet_id }
        } = req;
    
        await DB.poolConnect;
        try {


            const request = DB.pool.request();        


            let sqlGetNamaVendor = `SELECT * FROM m_direct_outlet WHERE m_direct_outlet_id = '${m_direct_outlet_id}'`;
            let dataNamaVendor = await request.query(sqlGetNamaVendor);
            let namaVendor = dataNamaVendor.recordset.length > 0 ? dataNamaVendor.recordset[0].nama_pt : null;
            let kodeVendor = dataNamaVendor.recordset.length > 0 ? dataNamaVendor.recordset[0].kode_vendor : null;

            if(!namaVendor || !kodeVendor){

                return res.error({
                    message: "NPWP Tidak ditemukan"
                });

            }

            let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
            let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
            let statusIntegasi =
                datastatusIntegasi.recordset.length > 0
                ? datastatusIntegasi.recordset[0].status
                : "DEV";

            let url = ``;

            let usernamesoap = sails.config.globals.usernamesoap;
            let passwordsoap = sails.config.globals.passwordsoap;

            if (statusIntegasi == "DEV") {
                // url ="http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zfm_ws_npwp/120/zws_sales_npwp/zbn_sales_npwp";
                url = "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_npwp/300/zws_sales_npwp/zbn_sales_npwp";
                // usernamesoap = sails.config.globals.usernamesoapdev;
                // passwordsoap = sails.config.globals.passwordsoapdev;
            } else {
                url = "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_npwp/300/zws_sales_npwp/zbn_sales_npwp";
            }


            const tok = `${usernamesoap}:${passwordsoap}`;
            const hash = Base64.encode(tok);
            const Basic = "Basic " + hash;


            let headers = {
                Authorization: Basic,
                "user-agent": "esalesSystem",
                "Content-Type": "text/xml;charset=UTF-8",
                soapAction:
                  "urn:sap-com:document:sap:rfc:functions:ZFM_WS_npwp:ZFM_WS_NPWPRequest",
              };

            let xml = fs.readFileSync("soap/ZFM_WS_NPWP.xml", "utf-8");
            let hasil = racikXML(xml, kodeVendor);

            let { response } = await soapRequest({ url:url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
            let {body, statusCode } = response;

            if(statusCode==200){
                let parsedXML = await xml2js.parseStringPromise(body);          
                let taxNumber = parsedXML['soap-env:Envelope']['soap-env:Body'][0]['n0:ZFM_WS_NPWPResponse'][0].TAXNUM[0];
                
                let obj = {
                    taxNumber,
                    namaVendor
                }
                return res.success({
                    result : obj,
                    message: "Fetch data successfully"
                });

            }else{
                return res.error({
                    message: "NPWP Tidak ditemukan"
                });
            }

      
        } catch (err) {
          return res.error(err);
        }
      },
}


function racikXML(xmlTemplate, kode) {
    let kodeVendor = '000'.concat(kode);
    const result = xmlTemplate.replace("?", kodeVendor);  
    return result;
}