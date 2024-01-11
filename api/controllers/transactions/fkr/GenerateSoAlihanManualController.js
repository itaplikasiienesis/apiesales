const xlsx = require('node-xlsx');
const uuid = require("uuid/v4");
const moment = require('moment');
const XLS = require('xlsx');
const otpGenerator = require('otp-generator');
const SendEmail = require('../../../services/SendEmail');
const soapRequest = require('easy-soap-request');
const xml2js = require('xml2js');
const Base64 = require('base-64');
const numeral = require('numeral');
const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templatefkr');
const fs = require("fs");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);


const path = require('path');
const glob = require("glob");
const { log } = require('console');
const { sync } = require('glob');
const { has } = require('lodash');
const ClientSFTP = require('ssh2-sftp-client');
var shell = require('shelljs');
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "sapftp",
  password: "sapftp@2020"
}



module.exports = {
  // GET ALL RESOURCE
  regenerateUlangSoAlihan: async function(req, res) {
    const {fkr_id} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;


      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


      let getDataFkr = `SELECT nomor_so,nomor_fkr,eksekusi FROM fkr WHERE fkr_id = '${fkr_id}'`;
      console.log(getDataFkr);
      let getDataHeader = await request.query(getDataFkr);
      let dataHeader = getDataHeader.recordset[0];


      let nomorSoRetur = dataHeader.nomor_so;
      let eksekusi = dataHeader.eksekusi;
      let nomorFkr = dataHeader.nomor_fkr;


      console.log(eksekusi);


    //   console.log(sql);

      let datasource = await request.query(sql);
      let xml = fs.readFileSync('soap/ZFM_WS_SOALIHAN.xml', 'utf-8');
      let dataPembentukan = [];
      let data = datasource.recordset;

      console.log(xml);


      if(eksekusi=='Peralihan Distributor'){

        for (let i = 0; i < data.length; i++) {

            let dtalihan = await request.query(`SELECT TOP 1 b.kode_pajak,
            b.kode,b.nama,mp.kode_channel FROM fkr a 
            inner join m_distributor_v b
            on b.m_distributor_id = a.tujuan_retur 
            inner join m_pajak mp
            on mp.kode = b.kode_pajak 
            WHERE a.fkr_id = '${fkr_id}'`);
            dtalihan = dtalihan.recordset;

            let shipTo = dtalihan[0].kode;
            let KodPajak = dtalihan[0].kode_pajak;
            let kode_channel = dtalihan[0].kode_channel;

            dataPembentukan.push({
               KUNNR : KodPajak,
               KUNNS : shipTo,
               VTWEG : kode_channel,
               SPART : '00',
               AUART : 'ZC01',
               BSARK : "",
               MATNR : data[i].kode_material,
               VRKME : data[i].satuan,
               ABRVW : '',
               KWEMNG: data[i].total_retur,
               BSTNK : nomorSoRetur,
               VTEXT : nomorFkr
             })
           
         }

      }else if(eksekusi=='Peralihan Stock'){

        let dtalihan = await request.query(`SELECT TOP 1 b.kode_pajak,b.kode,b.nama,mp.kode_channel FROM fkr a 
        inner join m_distributor_v b
        on b.m_distributor_id = a.tujuan_retur 
        inner join m_pajak mp
        on mp.kode = b.kode_pajak 
        WHERE a.fkr_id = '${fkr_id}'`);
        dtalihan = dtalihan.recordset;


        let shipTo = dtalihan[0].kode;
        let KodPajak = dtalihan[0].kode_pajak;
        let kode_channel = dtalihan[0].kode_channel;
        
        for (let i = 0; i < data.length; i++) {

            dataPembentukan.push({
               KUNNR : KodPajak,
               KUNNS : shipTo,
               VTWEG : kode_channel,
               SPART : '00',
               AUART : 'ZC14',
               BSARK : "",
               MATNR : data[i].kode_material,
               VRKME : data[i].satuan,
               ABRVW : '',
               KWEMNG: data[i].total_retur,
               BSTNK : nomorSoRetur,
               VTEXT : nomorFkr
             })
           
         }

      }


      let hasil = racikXML(xml, dataPembentukan, 'ITAB');

      let url = ``;

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;

      if(statusIntegasi=='DEV'){
        url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_soalihan/120/zws_sales_soalihan/zws_sales_soalihan`; // development

        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;
        
       }else{
        url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_soalihan/300/zws_sales_soalihan/zbn_sales_soalihan`; // production                       
      }


      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;

      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
      };


      let { response } = await soapRequest({ url:url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;

      console.log(statusCode);

      if(statusCode == 200){
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) {
          if (err) {
            return res.error(err);
          }
          const VBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOALIHANResponse'].VBELN;
          console.log(VBELN);
          if(VBELN){
            await request.query(`update fkr set nomor_so_alihan = '${VBELN}' where fkr_id = '${fkr_id}'`)
  
            return res.success({
              message: 'Berhasil Generate Ulang SO ALIHAN'
            });
  
          }else{
            return res.error("Tidak dapat nomor SO Alihan...")
          }
        });
      }else{
        return res.error("Tidak dapat nomor SO Alihan...")
      }

    } catch (err) {
      return res.error(err);
    }
  },


}



function racikXML(xmlTemplate, jsonArray, rootHead) {
    var builder = new xml2js.Builder({headless: true, rootName: rootHead })
    const addTemplate = jsonArray.map(data => {
      return {item: data}
    })
    const result = builder.buildObject(addTemplate)
    
  
    return xmlTemplate.replace('?', result)
  }