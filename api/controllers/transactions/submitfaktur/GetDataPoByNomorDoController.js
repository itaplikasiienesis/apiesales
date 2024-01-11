/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

  const fs = require("fs");
  const Base64 = require('base-64');
  const xml2js = require('xml2js');
  const soapRequest = require('easy-soap-request');
    
  module.exports = {
   
     // GET RESOURCE
    getData: async function(req, res) {

        const {nomor_do} = req.body;

        console.log('nomor_do ', nomor_do);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let usernamesoap = sails.config.globals.usernamesoap;
            let passwordsoap = sails.config.globals.passwordsoap;

            let url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_dopo/300/zws_ws_dopo/zbn_ws_dopo`;

            let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
            let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
            let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
          
            if(statusIntegasi=='DEV'){
            
                usernamesoap = sails.config.globals.usernamesoapdev;
                passwordsoap = sails.config.globals.passwordsoapdev;

                url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zfm_ws_dopo/120/zws_sales_dopo/zbn_sales_dopo`;
                
            }

          

            const tok = `${usernamesoap}:${passwordsoap}`;
            const hash = Base64.encode(tok);
            const Basic = 'Basic ' + hash;

            let Headers = {
              'Authorization': Basic,
              'user-agent': 'apiesales',
              'Content-Type': 'text/xml;charset=UTF-8',
              'soapAction': 'urn:sap-com:document:sap:rfc:functions:zfm_ws_dopo:ZFM_WS_PODORequest',
            };


            let xml = fs.readFileSync('soap/ZFM_WS_PODO.xml', 'utf-8');
            let parser = new xml2js.Parser({ explicitArray: false });


            let hasil = racikXML(xml, nomor_do);
                            
        
            let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 10000000 }); // Optional timeout parameter(milliseconds)
            let { body, statusCode } = response;


            console.log('statusCode ',statusCode);


            let rincian_biaya = [];
            let obj = {};
            let validasiError = false;
            if(statusCode==200){
        
                parser.parseString(body, async function (err, result) {
          
          
                    const GJAHR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].GJAHR;
                    const PESAN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].PESAN;

                    console.log(result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse']);

                    if(GJAHR!='0000' || PESAN==''){

                        const EBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].EBELN;
                        const MBLNR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNR;
                        const ITEMO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMO;
                        const ITEMR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMR;
                        const MBLNO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNO;
                        const NETWO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWO;
                        const NETWR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWR;

  
                        obj = {
                            tahun : GJAHR,
                            nomor_po : EBELN,
                            nomor_gr : MBLNR,
                            item_additional_cost : ITEMO,
                            item_cost_shipment : ITEMR,
                            nomor_gr_additional_cost : MBLNO,
                            additional_cost : Number(NETWO) * 100,
                            cost_shipment : Number(NETWR) * 100,
                            pesan : null
                        }
        
        
                        if(Number(NETWO) * 100 > 0){
                          rincian_biaya.push({
                            keterangan : 'Additional Cost',
                            nominal : Number(NETWO) * 100
                          });
                        }

                        if(Number(NETWR) * 100 > 0){
                          rincian_biaya.push({
                            keterangan : 'Shipment Cost',
                            nominal : Number(NETWR) * 100
                          });
                        }
              
                    }else{

                        console.log('KKKKKKK');
                        obj = {
                            pesan : PESAN
                        }
                        validasiError = true;

                    }

                    obj.rincian_biaya = rincian_biaya;
                
                  });      
                  
                  
                  console.log(validasiError);

                  if(validasiError){

                    return res.success({
                      error:true,
                      message: obj.pesan
                    });
      
                  }else{
                    return res.success({
                      data:obj,
                      message: 'Success'
                    });
                  }
          
          
            }else{

              return res.success({
                error:true,
                message: 'Error SOAP'
              });

            }
                
        } catch (err) {
            return res.error(err);
        }
    },
    
    
  };
  

  
  
  function racikXML(xmlTemplate, result) {
    return xmlTemplate.replace('?', result)
  }
  
  
  
  