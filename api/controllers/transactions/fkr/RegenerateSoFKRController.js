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
  regenerateUlangXMLPermusnahan: async function(req, res) {
    const {fkr_id} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;

      console.log(sql);

      let datasource = await request.query(sql);
      let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
      let dataPembentukan = [];
      let data = datasource.recordset;

      console.log(datasource);

      for (let i = 0; i < data.length; i++) {


        let shipto = data[i].ship_to;
        let soldto = data[i].sold_to;
        let channel = data[i].kode_channel;
        let nomor_fkr = data[i].nomor_fkr;

        let btstnk = 'PEMUSNAHAN LOCAL';
        let kodesap = 'ZC03';

        dataPembentukan.push({
            KUNNR : soldto,
            KUNNS : shipto,
            VTWEG : channel,
            SPART : data[i].division,
            AUART : kodesap,
            BSARK : '2212',
            MATNR : data[i].kode_material,
            VRKME : data[i].satuan,
            ABRVW : 'Z1',
            KWEMNG: data[i].total_retur,
            BSTNK : btstnk,
            VTEXT : nomor_fkr
        });
        
      }


      let hasil = racikXML(xml, dataPembentukan, 'ITAB');
      console.log(hasil);
      lemparFTP(hasil,fkr_id);

      return res.success({
        message: 'Berhasil Generate Ulang XML FKR'
      });


    } catch (err) {
      return res.error(err);
    }
  },


  regenerateSoOverStock: async function(req, res) {
    const {fkr_id} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;

      let url = ``;
      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;


      if(statusIntegasi=='DEV'){
        url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr'; // development
        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;
 
       }else{
         // url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr';
        url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sofkr/300/zws_sales_sofkr/zbn_sales_sofkr'; // production
        usernamesoap = sails.config.globals.usernamesoap;
        passwordsoap = sails.config.globals.passwordsoap;
         
       }

      console.log(sql);

      let datasource = await request.query(sql);
      let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
      let dataPembentukan = [];
      let data = datasource.recordset;

      console.log(datasource);

      for (let i = 0; i < data.length; i++) {


        let shipto = data[i].ship_to;
        let soldto = data[i].sold_to;
        let channel = data[i].kode_channel;
        let nomor_fkr = data[i].nomor_fkr;

        let btstnk = 'PEMUSNAHAN LOCAL';
        let kodesap = 'ZC03';

        dataPembentukan.push({
            KUNNR : soldto,
            KUNNS : shipto,
            VTWEG : channel,
            SPART : data[i].division,
            AUART : kodesap,
            BSARK : '2212',
            MATNR : data[i].kode_material,
            VRKME : data[i].satuan,
            ABRVW : 'Z1',
            KWEMNG: data[i].total_retur,
            BSTNK : btstnk,
            VTEXT : nomor_fkr
        });
        
      }


      let hasil = racikXML(xml, dataPembentukan, 'ITAB');
      console.log(hasil);
      lemparFTP(hasil,fkr_id);

      return res.success({
        message: 'Berhasil Generate Ulang XML FKR'
      });


    } catch (err) {
      return res.error(err);
    }
  }


}


function racikXML(xmlTemplate, jsonArray, rootHead) {
    var builder = new xml2js.Builder({headless: true, rootName: rootHead })
    const addTemplate = jsonArray.map(data => {
      return {item: data}
    })
  
    const result = builder.buildObject(addTemplate)
    
  
    return xmlTemplate.replace('#', result)
}



async function lemparFTP(hasil,fkr_id){
  let remotePath = '/home/sapftp/esales/fkr/create/request/'+`${fkr_id}.xml`;


  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

  if (statusIntegasi == 'DEV') {
    remotePath = '/home/sapftp/esales/fkr/create/requestdev/'+`${fkr_id}.xml`;
  } 

  let locationFiles = dokumentPath('fkrtemp','request').replace(/\\/g, '/');
  let dst = dokumentPath('fkrtemp','request') + '/' +`${fkr_id}.xml`;

  let localPath = dst.replace(/\\/g, '/');
  shell.mkdir('-p', locationFiles);
  fs.writeFile(locationFiles+"/"+`${fkr_id}.xml`, hasil,async function (err) {
    if (err) 
    return err;

    await sftp.connect(ftpconfig)
    .then(() => {
      return sftp.fastPut(localPath,remotePath);
    })
    .then(() => {
      sftp.end();
    })
    .catch(err => {
      console.error(err.message);
    });

  })
}