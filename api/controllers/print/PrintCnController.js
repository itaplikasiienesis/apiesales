const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const glob = require('glob');
const xml2js = require('xml2js');
const shell = require('shelljs');
const axios = require("axios");
const numeral = require('numeral');
const converter = require('json-2-csv');
const xlsx = require('node-xlsx');
const _ = require('lodash');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const SMB2 = require('@marsaud/smb2');
const SambaClient = require('samba-client');
let networkDrive = require('windows-network-drive');
const substr = require('locutus/php/strings/substr');
module.exports = {

    print: async function(req, res) { 
      const {
        query: {m_user_id,delivery_order_id}
      } = req;
  
      await DB.poolConnect;
      try {
          
          const request = DB.pool.request();
          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
          let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        
          let url = ``;
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
          if(statusIntegasi=='DEV'){

            url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_inv/120/zws_sales_inv/zbn_sales_inv'; // development
              
          }else{
      
            url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_inv/300/zws_sales_inv/zbn_sales_inv'; // production
            
      
          }

          // console.log(url);


          const tok = `${usernamesoap}:${passwordsoap}`;
          const hash = Base64.encode(tok);
          const Basic = 'Basic ' + hash;


          let sampleHeaders = {
            'Authorization':Basic,
            'user-agent': 'Esales',
            'Content-Type': 'text/xml;charset=UTF-8',
            'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_INV:ZFM_WS_FORMINVRequest',
          };

          let sqlgetdeliveryorder = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
          let datadeliveryorder  = await request.query(sqlgetdeliveryorder);
          let deliveryorder = datadeliveryorder.recordset[0];
          let nomor_do = deliveryorder.nomor_do;
          //console.log(nomor_do);
          if(!nomor_do){

            return res.error501({
              message: "Document Belum Tersedia Harap Hubungi Divisi IT"
            });

          }else{


          let xml = fs.readFileSync('soap/ZFM_WS_FORMINV.xml', 'utf-8');
          let hasil = await racikXML(xml,nomor_do);

          let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
          let {body, statusCode } = response;


          if(statusCode==200){
              var parser = new xml2js.Parser({explicitArray : false});


              parser.parseString(body, async function (err, result) {
                if (err) {
                  return res.error(err);
                }
                
                let IT_ITEM = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].IT_ITEM;
                const WA_ADRC = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_ADRC;
                const WA_BKPF = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_BKPF;
                const WA_HEAD = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_HEAD;
                const WA_KNA1 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_KNA1;

                const WA_TVZBT = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_TVZBT;
              
  
                let tahun = moment(WA_HEAD.FKDAT,'YYYY-MM-DD').format('YYYY');
                let nomor_tittle = WA_BKPF.XBLNR;
                let tanggal_faktur = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').format('YYYY-MM-DD');
                let no_faktur = WA_BKPF.BKTXT.replace(/\./g,'').replace(/\-/g,'');
                let total_akhir = Number(WA_HEAD.TOT) * 100;
                no_faktur = no_faktur.substring(6,100).replace('.','').replace('-','');
                
                const host = '\\\\192.168.1.215\\finance-mij\\E-FAKTUR';
                let tahun_faktur = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').format('YYYY');
                let bulan_faktur = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').format('MM');
                let bulan_keterangan = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').locale("id").format('MMMM').toLocaleUpperCase();
                let arsip = bulan_faktur.concat(' ').concat(bulan_keterangan).concat(' ').concat(tahun_faktur);
                let arsip_pertanggal = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').format('DD.MM.YYYY');
                let no_faktur_invoice = WA_BKPF.BKTXT.replace(/\./g,'').replace(/\-/g,'');
                // console.log(tahun_faktur);
                // console.log(bulan_faktur);
                // console.log(bulan_keterangan);
                // console.log(arsip);
                // console.log(arsip_pertanggal);
                // console.log(no_faktur_invoice);
                let direktori = host+`\\${tahun}\\${arsip}\\${arsip_pertanggal}`;

                fs.readdir(direktori, (err, files) => {
                  if (err)
                    console.log(err);
                  else {
                    // console.log("\nCurrent directory filenames:");
                    let data = files.find(file => no_faktur_invoice==substr(file,16,16));

                    if(data){

                      let sqlupdatedeliveryorder = `UPDATE delivery_order SET nomor_faktur='${no_faktur}',
                      nomor_invoice='${nomor_tittle}',tanggal_faktur='${tanggal_faktur}',
                      tanggal_print=getdate(),
                      total_invoice=${total_akhir}
                      WHERE delivery_order_id = '${delivery_order_id}'`;
                      request.query(sqlupdatedeliveryorder);
                      
                      return res.download(direktori+`\\${data}`);
  
                    }else{
                      return res.error501({
                        message: "Document Belum Tersedia Harap Hubungi Divisi IT"
                      });
                    }
                    
                  }
                })
                
              });

            }else{
              return res.error501({
                message: "Document Belum Tersedia Harap Hubungi Divisi IT"
              });
            }

          }

      } catch (err) {
        return res.error(err);
      }
  

    }
    
}

function racikXML(xmlTemplate, param) {

    return xmlTemplate.replace('?', param);
  
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}