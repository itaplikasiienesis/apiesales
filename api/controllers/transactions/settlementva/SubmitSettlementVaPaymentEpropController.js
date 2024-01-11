/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const { calculateLimitAndOffset, paginate } = require("paginate-info");
const axios = require("axios");
const moment = require("moment");
// const path = require('path')
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const numeral = require("numeral");
const _ = require("lodash");
const SendEmail = require("../../../services/SendEmail");
const json2xls = require("json2xls");

const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const xml2js = require("xml2js");
const DBPROP = require("../../../services/DBPROPOSAL");
const momentBusinessDays = require("moment-business-days");
const { log } = require("console");

const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const re = /(?:\.([^.]+))?$/;
const getExtOnly = (str, adddot = true) => {
  const result = re.exec(str)[1];
  if (result) return adddot ? "." + result : result;
  return "";
};
module.exports = {
 
submitDokumen: async function (req, res) {
    const {
      nama,
      nip,
      header,
      details
    } = req.body;

    let statusTextMessage = ``;

    try {

      await DB.poolConnect;
      const request = DB.pool.request();


      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi =
        datastatusIntegasi.recordset.length > 0
          ? datastatusIntegasi.recordset[0].status
          : "DEV";


      let listValidation = [];
      // for (let i = 0; i < details.length; i++) {
        
      //       let accrueGlAccountId = details[i].accrueGlAccountId;
      //       let tpCodeId = details[i].tpCodeId;
      //       let vatCode = details[i].vatCode;
      //       let line = details[i].line;

      //       if(!accrueGlAccountId || accrueGlAccountId == ''){
      //           listValidation.push(`Accrue GL pada data settlement dengan nomor line ${line} masih kosong harap isi terlebih dahulu`);
      //       }

      //       if(!tpCodeId || tpCodeId == ''){
      //         listValidation.push(`Tp Type pada data settlement dengan nomor line ${line} masih kosong harap isi terlebih dahulu`);
      //       }

      //       if(!vatCode || vatCode == ''){
      //         listValidation.push(`VAT Code pada data settlement dengan nomor line ${line} masih kosong harap isi terlebih dahulu`);
      //       }
        
      // }


      let url = ``;
      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;

      if (statusIntegasi == "DEV") {
          url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_claim_new/120/zws_sales_claim_new/zbn_sales_claim_new`;
          usernamesoap = sails.config.globals.usernamesoapdev;
          passwordsoap = sails.config.globals.passwordsoapdev;
      } else {
          url ="http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_claim_new/300/zws_ws_claim_new/zbn_ws_claim_new"; // production
      }


      console.log('header ',header);

      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = "Basic " + hash;
      let datasheader = [];
      let datasdetail = [];

      // console.log('totalAfterTax ',header.totalAfterTax);

      let nomorDokumen = header.nomorDokumen.substring(0, 16);
      let nomorFaktur = header.nomorFakturPajak > 0 ? header.nomorFakturPajak ? header.nomorFakturPajak : '' : '';
      let noted = header.description ? header.description.substring(0, 50) : '';
      let budate = moment(header.postingDate,'YYYY-MM-DD').format("DD.MM.YYYY");
      let fiscalYear = moment(header.postingDate,'YYYY-MM-DD').format("YYYY");

      let vatCode =  header.vatCode ? header.vatCode ? header.vatCode : '' : 'V0';
      let tpType =  header.tpType ? header.tpType ? header.tpType : '' : '';
      let vendorCode = 'E'+details[0].vendorCode;
      let afterTax = header.totalSettlement + header.vatIn;

      console.log('afterTax ',afterTax);


      datasheader.push({
        LIFNR: vendorCode,
        ZTERM: 'Z000',
        ZFBDT: budate, //Bline Date ( tanggal posting )
        BVTYP: '', // Partner Bank Key
        BLDAT: budate, //Doc Date ( tanggal dokumen / invoice)
        BUDAT: budate, //Posting Date ( tanggal posting )
        WRBTR: afterTax,
        WAERS: 'IDR',
        MWSKZ: vatCode,
        XBLNR: nomorDokumen.substring(0, 16),
        BKTXT: nomorFaktur,
        SGTXT_VENDOR: noted,
        LINE: tpType,
        WT_WITHCD: header.tpCode ,
        WT_QSSHB: header.tpCode ? header.dppTpAmount : '',
        WT_QBSHB: header.tpCode ? header.totalPph : '',
        BUKRS:header.companyCode
      });

      let profitCenter = header.companyCode+'00';

      for (let i = 0; i < details.length; i++) {
        
        let nomorUrut = i + 1;
        let accrueGlAccountCode = details[i].accrueGlAccountCode;
        let amount = details[i].amount;
        let description = details[i].description ? details[i].description.substring(0, 50) : '';
        let activityCode = details[i].activityCode;

        // let ref1 = details[i].ref1;;
        // let ref3 = 'E'+details[i].vendorCode;

        

        let proposalNo = details[i].proposalNo;
        let panjang = proposalNo.length;
        let ref1 = proposalNo.substring(20, panjang);
        let ref3 = proposalNo.substring(0, 20);
        let ref2 = details[i].brandCode;

        // Proses Ambil Kode Mapping GL Berdasarkan Activity Code

        let sqlGetDataCostCenter = `SELECT kode_mapping FROM r_mapping_gl WHERE kode = '${activityCode}'`;
        let dataMappingGl = await request.query(sqlGetDataCostCenter);
        let costCenter = dataMappingGl.recordset.length > 0 ? dataMappingGl.recordset[0].kode_mapping : '';

        let paramCostCenter = '';
        if(costCenter=='6132053007'){
          paramCostCenter = '2100100016';
        }

        datasdetail.push({
          LINE: nomorUrut,
          HKONT: accrueGlAccountCode,
          WRBTR: amount,
          ZUONR: vendorCode,
          SGTXT: description ? description : '',
          PRCTR: profitCenter,
          XREF1: ref1,
          XREF2: ref2,
          XREF3: ref3,
          KOSTL: paramCostCenter,
          ZLSPR: 'B'
        });
        
      }


      if(listValidation.length > 0){
        return res.error({
          message: listValidation.toString(),
        });
      }else{

        let xml = fs.readFileSync("soap/ZFM_WS_CLAIM_NEW.xml", "utf-8");
      let headerData = racikXMLHeader(xml, datasheader, "HEADER");
      let hasilXml = racikXMLDetail(headerData, datasdetail, "DETAIL");

      console.log(hasilXml);


      let headerSoapRequest = {
        Authorization: Basic,
        "user-agent": "esalesSystem",
        "Content-Type": "text/xml;charset=UTF-8",
        soapAction:
          "urn:sap-com:document:sap:rfc:functions:ZWS_SALES_CLAIM:ZFM_WS_CLAIMRequest",
      };

      let { response } = await soapRequest({
        url: url,
        headers: headerSoapRequest,
        xml: hasilXml,
        timeout: 1000000,
      }); // Optional timeout parameter(milliseconds)
      let { body, statusCode, statusText } = response;

      statusTextMessage = statusText;

      console.log('statusCode ',statusCode);
      console.log('statusText ',statusTextMessage);

      if (statusCode == 200) {
        let dataError = [];
        var parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(body, async function (err,result) {
          if (err) {
            return res.error({
              message: err,
            });
          }else{

            console.log(result["soap-env:Envelope"]["soap-env:Body"][
              "n0:ZFM_WS_CLAIM_NEWResponse"
            ]);
  
            let OUT_RETURN =
              result["soap-env:Envelope"]["soap-env:Body"][
                "n0:ZFM_WS_CLAIM_NEWResponse"
              ].OUT_RETURN;


            let BELNR = result["soap-env:Envelope"]["soap-env:Body"]["n0:ZFM_WS_CLAIM_NEWResponse"].BELNR;


            if (OUT_RETURN && BELNR && BELNR == '$') {
              let itemError = OUT_RETURN.item;


              if(Array.isArray(itemError)){
                
                for (let i = 0; i < itemError.length; i++) {
                  dataError.push(itemError[i].MESSAGE);
                }

              }else{
                dataError.push(itemError.MESSAGE);
              }
  
              
            }
  
      
  
            if (dataError.length > 0) {
              console.log('Kesini');
              return res.error({
                message: dataError.toString(),
              });
  
            } else {
              
  
              let sqlUpdateDataHeader = `UPDATE settlement_va_payment_proposal 
              SET nomor_sap = '${BELNR}',
              fiscal_year='${fiscalYear}',
              kode_status = 'SKP',
              status = 'Submited'
              WHERE settlement_va_payment_proposal_id = '${header.settlementVaPaymentProposalId}'`;

              console.log(sqlUpdateDataHeader);
              await request.query(sqlUpdateDataHeader);
  

              let auditSettlementId = uuid();

              let insertAuditSettlement = `INSERT INTO audit_settlement
              (audit_settlement_id, created, createdby, isactive, nama, nip, 
              settlement_id, status, updated, updatedby, kode_status)
              VALUES('${auditSettlementId}', getdate(), '${nip}', 'Y', '${nama}', 
              '${nip}','${header.settlementVaPaymentProposalId}',
              'Submited',getdate(),'${nip}', 'SKP')`;
              
              console.log(insertAuditSettlement);
              await request.query(insertAuditSettlement);

              return res.success({
                message: `Submit klaim to SAP successfully ( ${BELNR} )`,
              });
  
            }
            
          }
          
        });
      } else {
        return res.error({
          message: `Status ${statusCode} ${statusTextMessage}`,
        });
      }
        
      }


      
    } catch (err) {

      return res.error({
        message: `${statusTextMessage}`,
      });

    }
},
  
};

async function updatenotifikasi_reject(klaim_id, m_user_id, status, rolename) {
  await DB.poolConnect;
  const request = DB.pool.request();
  let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
  AND is_proses = 0 `;

  let ins = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status)
  VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;

  // console.log(upd,ins);
  await request.query(ins);
  await request.query(upd);
}
async function updatenotifikasi(klaim_id, region_id, channel) {
  await DB.poolConnect;
  try {
    const request = DB.pool.request();
    let sel = `SELECT * FROM notifikasi_klaim WHERE klaim_id = '${klaim_id}' AND is_proses = 0`;
    let resp = await request.query(sel);
    resp = resp.recordset;

    console.log(sel);
    let kode_tobe = ``;
    let status_tobe = ``;
    if (resp.length > 0) {
      let kode_notif = resp[0].kode_status;
      let notifikasi_klaim_id = resp[0].notifikasi_klaim_id;

      if (kode_notif == "DR") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `VER`;
        status_tobe = `Klaim Need to be Verify`;

        console.log(upd);
        var seluser = `SELECT * FROM m_user mu WHERE username = 'acc2'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
            VALUES ('${klaim_id}','${channel}','${region_id}','${kode_tobe}','${status_tobe}',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      } else if (kode_notif == "VER") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `VERACC`;
        status_tobe = `Menunggu Pengiriman Dok. Klaim DTB`;
        // kirim email ke distributor
      } else if (kode_notif == "MPD") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `DTA`;
        status_tobe = `Waiting Verifikasi DOK Klaim`;

        console.log(upd);
        var seluser = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${region_id}'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
            VALUES ('${klaim_id}','${channel}','${region_id}','${kode_tobe}','${status_tobe}',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      } else if (kode_notif == "DTA") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);
      }
    } else {
      let cekstat = `SELECT * FROM klaim WHERE klaim_id = '${klaim_id}'`;
      console.log(cekstat);

      let res_stat = await request.query(cekstat);
      res_stat = res_stat.recordset[0];

      if (res_stat.kode_status == "MPD") {
        console.log(`menunggu..`);
        var seluser = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${region_id}'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
              VALUES ('${klaim_id}','${channel}','${region_id}','MPD','Menunggu Penerimaan DOK Klaim',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      }
    }
    console.log(sel, resp.length);
  } catch (err) {
    console.log(err);
  }
}

function racikXMLHeader(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });

  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("header", result);
}

function racikXMLDetail(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("detail", result);
}

function pad(d) {
  var str = "" + d;
  var pad = "00000";
  var ans = pad.substring(0, pad.length - str.length) + str;
  return ans;
}

function padnumber(d) {
  return d < 10 ? "0" + d.toString() : d.toString();
}


function GetTimeDiff(seconds){


  let how_log_ago = '';
  let minutes = Math.round(seconds / 60);
  let hours = Math.round(minutes / 60);
  let days =  Math.round(hours / 24)


  if (days >= 1) {
      how_log_ago = days + ' day' + (days != 1 ? 's' : '');
  } else if (hours >= 1) {
      how_log_ago = hours + ' hour' + (hours != 1 ? 's' : '');
  } else if (minutes >= 1) {
      how_log_ago = minutes + ' minute' + (minutes != 1 ? 's' : '');
  } else {
      how_log_ago = seconds + ' second' + (seconds != 1 ? 's' : '');
  }

  how_log_ago = seconds == 0 ? '-' : how_log_ago;


  return how_log_ago;
}


function checkRole(userRoles, roles) {
  const isTrue = userRoles.some((e) => roles.includes(e.nama));
  return isTrue;
}



function calcBusinessDays(dm1, dm2) {  
  const d1 = moment(dm1, "YYYY-MM-DD HH:mm:ss");
  const d2 = moment(dm2, "YYYY-MM-DD HH:mm:ss");
  const secondsDiff = d2.diff(d1, 'seconds'); 
  
    // Dapatkan interval murni dari 2 tanggal tanpa di potong weekend
    const momentFulldaysd1 = moment(dm1, "YYYY-MM-DD") ;
    const momentFulldaysd2 = moment(dm2, "YYYY-MM-DD") ;
    const days = momentFulldaysd2.diff(momentFulldaysd1, 'days');
    console.log('Debug Total Days:', days);

    var sundays = 0;
    var saturdays = 0;
    let newDay = d1.toDate()
    //dapatkan ada berapa weekend yg terdapat dari 2 tanggal
    for (let i = 0; i < days; i++) {
          const day = newDay.getDay();
          newDay = d1.add(1, "days").toDate();
          const isWeekend = ((day % 6) === 0);
          if (!isWeekend) {
              //abaikan hari kerja
          } 
          else {
              if (day === 6) saturdays++;
              if (day === 0) sundays++;
          }
      }

    // console.log('cetak ada berapa sabtu dan minggu untuk debug: ', "saturdays", saturdays, "sundays", sundays); 

  //interval seluruh hari di kurang interval weekend
    const weekendSeconds = ((Number(saturdays)+Number(sundays)) * 86400);
    const weekedaySecondSubstractWeekendSeconds = secondsDiff - weekendSeconds
 
    return weekedaySecondSubstractWeekendSeconds;
}