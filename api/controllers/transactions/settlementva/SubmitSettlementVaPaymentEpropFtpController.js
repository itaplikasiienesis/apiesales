/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const moment = require("moment");
const fs = require("fs");
const path = require("path");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, "repo", param2, param3);
const shell = require("shelljs");
const xml2js = require("xml2js");
const ClientSFTP = require("ssh2-sftp-client");
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port: 22,
  user: "sapftp",
  password: "sapftp@2020",
};
const uuid = require("uuid/v4");

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
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : "DEV";

      let listValidation = [];
      //console.log('totalAfterTax ',header.totalAfterTax);
      
      let nomorDokumen = header.nomorDokumen.substring(0, 16);
      let nomorFaktur = header.nomorFakturPajak > 0 ? header.nomorFakturPajak ? header.nomorFakturPajak : '' : '';
      let noted = header.description ? header.description.substring(0, 50) : '';
      let budate = moment(header.postingDate,'YYYY-MM-DD').format("DD.MM.YYYY");

      let vatCode =  header.vatCode ? header.vatCode ? header.vatCode : '' : 'V0';
      let tpType =  header.tpType ? header.tpType ? header.tpType : '' : '';
      let tpCode =  header.tpCode ? header.tpCode ? header.tpCode : '' : '';
      let vendorCode = 'E'+details[0].vendorCode;
      let afterTax = header.totalSettlement + header.vatIn;

    //   console.log('afterTax ',afterTax);
      let datasheader = [];
      let datasdetail = [];

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
        WT_WITHCD: tpCode ,
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


      // PROSES LEMPAR KE FTP
      let remotePath = ``;
      let namaFile = nip +'-'+header.nomorDokumen;

      let paramNamaFile = namaFile.replace(`/`, "-");
      paramNamaFile = paramNamaFile.replace(/\//g, '-'); 
    //   console.log(paramNamaFile);

      if (statusIntegasi == "PROD") {
        remotePath = "/home/sapftp/esales/settlementva/eprop/prod/request/" + `${paramNamaFile}.xml`;
      }else{
        remotePath = "/home/sapftp/esales/settlementva/eprop/dev/request/" + `${paramNamaFile}.xml`;
      }

      let locationFiles = dokumentPath("setllementva/eprop", "request").replace(/\\/g, "/");
      let dst = dokumentPath("setllementva/eprop", "request") + "/" + `${paramNamaFile}.xml`;
      let localPath = dst.replace(/\\/g, "/");
      shell.mkdir("-p", locationFiles);
      console.log(locationFiles + "/" + `${paramNamaFile}.xml`);
      fs.writeFile(
        locationFiles + "/" + `${paramNamaFile}.xml`,
        hasilXml,
        async function (err) {
          if (err) {
            return res.error({
                message: err.message,
            });
          }else{
            await sftp
            .connect(ftpconfig)
            .then(() => {
              return sftp.fastPut(localPath, remotePath);
            })
            .then(async ()  => {
                 
                await sftp.end();

                let sqlUpdateDataHeader = `UPDATE settlement_va_payment_proposal 
                SET nomor_sap = 'WAITING',
                kode_status = 'SKP',
                status = 'Waiting Number Accounting',
                nip_submited = '${nip}'
                WHERE settlement_va_payment_proposal_id = '${header.settlementVaPaymentProposalId}'`;
                await request.query(sqlUpdateDataHeader);


                let auditSettlementId = uuid();
                let insertAuditSettlement = `INSERT INTO audit_settlement
                (audit_settlement_id, created, createdby, isactive, nama, nip, 
                settlement_id, status, updated, updatedby, kode_status)
                VALUES('${auditSettlementId}', getdate(), '${nip}', 'Y', '${nama}', 
                '${nip}','${header.settlementVaPaymentProposalId}',
                'Submited',getdate(),'${nip}', 'SKP')`;

                await request.query(insertAuditSettlement);


                // PROSES INSERT FTP


                let insertSettlemenSchedule = `INSERT INTO settlement_email_schedule
                (settlement_email_schedule_id,action, created, createdby,settlement_id, updated, updatedby)
                VALUES('${uuid()}', 'SENDTOSAP', getdate(), '${nip}','${header.settlementVaPaymentProposalId}', getdate(), '${nip}')`
                await request.query(insertSettlemenSchedule);

                return res.success({
                    message: `Data Successfully Sending to FTP`,
                });
            })
            .catch((err) => {
              return res.error({
                message: err.message,
              });

            });
          }      
        }
      );  
    }
      
    } catch (err) {

      return res.error({
        message: `${statusTextMessage}`,
      });

    }
},
  
};


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