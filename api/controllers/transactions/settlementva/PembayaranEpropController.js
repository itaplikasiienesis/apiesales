const uuid = require("uuid/v4");
const path = require("path");
const DBPROP = require("../../../services/DBPROPOSAL");
const glob = require("glob");
const numeral = require("numeral");
const { default: axios } = require("axios");
const _ = require("lodash");
const { request } = require("http");
const json2xls = require("json2xls");

const fs = require("fs");
const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const xml2js = require("xml2js");
const queryString = require("querystring");
const xlsx = require("node-xlsx");
const XLSX = require("xlsx");
var js2xmlparser = require("js2xmlparser");
const moment = require("moment");
const { toXML } = require("to-xml");
var convert = require("xml-js");

const DBEMPLOYEE = require('./../../../services/DBEMPLOYEE');

module.exports = {
  getDataSoap: async function (req, res) {
    const data = req.body;
    await DB.poolConnect;

    try {
      const request = DB.pool.request();

      let sqlGetStatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let dataStatusIntegrasi = await request.query(sqlGetStatusIntegasi);
      let dataStatus = dataStatusIntegrasi.recordset;
      let nik = data.nik;
      let nikAssigment = data.nikAssigment;
      let sessionId = data.sessionId;


      let sqlCheckLockParam = `SELECT COUNT(1) AS jumlahData
      FROM lock_create_settlement_va WHERE company_code = '${data.IBukrs}' AND nip_assigment = '${nikAssigment}' AND session_id <> '${sessionId}'`;
      let dataCheckLockParam = await request.query(sqlCheckLockParam);
      let jumlahDataCheckAdvance = dataCheckLockParam.recordset[0].jumlahData;




      if(jumlahDataCheckAdvance > 0){

        // return res.error({
        //   message: 'Settlement Sedang Digunakan User Lain Harap Tunggu 5 menit sampai 10 menit'
        // });

      }else{

        let paramSoap = {
          IBudatfr: data.IBudatfr,
          IBudatto: data.IBudatto,
          IBukrs: data.IBukrs,
          ILifnr: data.Lifnr
        }


          if(jumlahDataCheckAdvance == 0){

            let insetDataLock = `INSERT INTO lock_create_settlement_va
            (lock_create_settlement_va_id, isactive, created, createdby, updated, updatedby, nip, datelock, company_code, nip_assigment,session_id)
            VALUES(newid(), 'Y', getdate(), '${nik}', getdate(), '${nik}', '${nik}', getdate(), '${data.IBukrs}', '${nikAssigment}','${sessionId}')`;
            await request.query(insetDataLock);

          }


    
          let isStatus = dataStatus[0].status;
    
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
  
    
          let url = ``;
    
          if (isStatus == "DEV") {
            console.log("masuk ke status DEV");
            url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_settle_va/120/zws_settle_va/zbin_settle_va";


            usernamesoap = sails.config.globals.usernamesoapdev;
            passwordsoap = sails.config.globals.passwordsoapdev;
      

          } else {
            console.log("masuk ke status PROD");
            url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_settlement_va2/120/zws_settlement_va2/zbin_settlement_va2";
          }

          const keys = `${usernamesoap}:${passwordsoap}`;
          const hash = Base64.encode(keys);
          const auth_basic = "Basic " + hash;
    
          // console.log('usernamesoap ',usernamesoap);
          // console.log('passwordsoap ',passwordsoap);
          let Headers = {
            Authorization: auth_basic,
            "user-agent": "esalesSystem",
            "Content-Type": "application/soap+xml",
            soapAction:
              "urn:sap-com:document:sap:soap:functions:mc-style/ZWS_SETTLEMENT_VA2/ZfmFi002Request",
          };
    
          if (!data) {
            return res
              .status(400)
              .json({ Message: "Silahkan masukkan parameter untuk ambil data!" });
          }
    
          let xml = fs.readFileSync(
            "soap/settlementva/ZWS_SETTLEMENT_VA2.xml",
            "utf-8"
          );
          // console.log(data);
    
          //  ambil data param dan parsed to xml
          const toxml = toXML(paramSoap, null, 2);
          // console.log(toxml, "to_xml");
    
          //  buat hasil racik xml full
          const hasil = racikXMLL(xml, toxml);
          // console.log(hasil, "hasil");
    
          const { response } = await soapRequest({
            url: url,
            headers: Headers,
            xml: hasil,
            timeout: 60000,
          });
    
          // console.log(response, "response");
          const { headers, body, statusCode } = response;

          // console.log('statusCode ',statusCode);
          // console.log(headers, "headers"); 
          var datajson = convert.xml2js(body, { compact: true, spaces: 4 });
          // console.log(datajson, "datajson");
    
          let responDataSoap = [];
    
          const data1 = "env:Envelope";
          const data2 = "env:Body";
          const data3 = "n0:ZfmSettleVaResponse";
          const data4 = "ItData";
          const data5 = "item";
    
          const dataJsonDetail = datajson[data1][data2][data3][data4][data5];
          // responDataSoap.push(dataJsonDetail);
          // console.log(Array.isArray(dataJsonDetail));
  
          if(Array.isArray(dataJsonDetail)){
  
               // menghilangkan data duplikat
                const dataMap = {};
                dataJsonDetail.forEach((item) => {
                  // Cek apakah item sudah ada dalam objek dataMap
                  if (!dataMap[item.Belnr._text]) {
                    // Jika belum ada, tambahkan item ke dataMap dan responDataSoap
                    dataMap[item.Belnr._text] = true;
                    responDataSoap.push(item);
                  }
                });
  
          }else{
  
            // console.log('dataJsonDetail ',dataJsonDetail);
            if(dataJsonDetail){
              responDataSoap.push(dataJsonDetail);
            }
          }
    
       
  
          if(responDataSoap.length > 0){
  
            fs.writeFileSync("soapdata.txt", JSON.stringify(responDataSoap));
          
            //  mencari total data
            const totalAmount = _.sumBy(responDataSoap, (item) =>
              parseFloat(item.Wrbtr._text)
            );
  
            //  mencari total data Settlement
            const totalSettlement = _.sumBy(responDataSoap, (item) =>
              parseFloat(item.Fwste._text)
            );
  
            //  mencari data total pengurangan amount - settlement = outstanding Ballance
            const outstandingBallance = totalAmount - totalSettlement;
            // console.log(totalAmount, "total Amount");
    
  
  
            
            const formattedOutstandingBallance = outstandingBallance.toLocaleString(
              "id-ID",
              {
                style: "currency",
                currency: "IDR",
              }
            );
  
            
            for (let i = 0; i < responDataSoap.length; i++) {
      
              responDataSoap[i].Wrbtr._text = parseFloat(responDataSoap[i].Wrbtr._text) * 100;
              responDataSoap[i].Dmbtr._text = parseFloat(responDataSoap[i].Dmbtr._text) * 100;
              
            }
  
            for (let i = 0; i < responDataSoap.length; i++) {
    
              let belnr = responDataSoap[i].Belnr._text;
  
              // if(belnr == '0100000072'){
              //   console.log(responDataSoap[i]);
              // }
  
              let amount = parseFloat(responDataSoap[i].Wrbtr._text);
              let fiscalYear = responDataSoap[i].Gjahr._text;
      
              // let sqlCheckBudgetTerpakai = `SELECT COALESCE(SUM(dsvpp.amount),0) AS setllement_sebelumnya 
              // FROM detail_settlement_va_payment_proposal dsvpp,
              // settlement_va_payment_proposal svpp 
              // WHERE dsvpp.settlement_va_payment_proposal_id = svpp.settlement_va_payment_proposal_id
              // AND dsvpp.document_no  = '${belnr}' AND dsvpp.fiscal_year = '${fiscalYear}'
              // AND dsvpp.istick = 'Y' AND dsvpp.isactive = 'Y' `;
      
              let sqlCheckBudgetTerpakai = `SELECT COALESCE(SUM(dsvpp.amount),0) AS setllement_sebelumnya 
              FROM detail_settlement_va_operation_cost dsvpp,
              settlement_va_operation_cost svpp 
              WHERE dsvpp.settlement_va_operation_cost_id = svpp.settlement_va_operation_cost_id
              AND dsvpp.document_no  = '${belnr}' 
              AND dsvpp.istick = 'Y' AND dsvpp.isactive = 'Y' `;
      
              let dataSettlementSebelumnya = await request.query(sqlCheckBudgetTerpakai);
              let setllementSebelumnya = dataSettlementSebelumnya.recordset.length > 0 ? parseFloat(dataSettlementSebelumnya.recordset[0].setllement_sebelumnya) : 0;
    
  
              responDataSoap[i].Wrbtr._text = amount - setllementSebelumnya;
              responDataSoap[i].Dmbtr._text = amount - setllementSebelumnya;
              
              
            }
  
            responDataSoap = responDataSoap.filter(e => e.Wrbtr._text > 0);
  
            // console.log(responDataSoap);
  
    
            let dataNoDoc = responDataSoap.map((item) => ({
              belnr: item.Belnr._text,
              amount: item.Wrbtr._text,
              description : item.Sgtxt._text,
              fiscalYear : item.Gjahr._text
            }));
  
            let total_amount = 0;
            for (let i = 0; i < dataNoDoc.length; i++) {
              let element = dataNoDoc[i];
              total_amount = total_amount + element.amount;
              
            }
  
            // console.log('total_amount ',total_amount);
  
            
            const formattedAmount = total_amount.toLocaleString("id-ID", {
              style: "currency",
              currency: "IDR",
            });
  
            return res.send({
              Status: "Success",
              Message: "Fetch data successfully",
              total_amount: formattedAmount,
              total_settlement: 0,
              outstanding_ballance: formattedAmount,
              dataNoDoc: dataNoDoc,
              data: responDataSoap,
            });
  
          }else{
  
            return res.error({
              message: 'Data Advance tidak ditemukan'
            });
  
          }

      }


      

    } catch (err) {
      return res.error(err);
    }
  },


  //  untuk upload file dan convert menjadi data json kebutuhan tabel frontend
  uploadFileXlsx: async function (req, res) {
    try {
      req.file("file").upload(
        {
          maxBytes: 150000000, // Batasan ukuran file (dalam byte)
          dirname: require("path").resolve(
            sails.config.appPath,
            "uploads/pembayaranEprop"
          ),
        },
        function (err, uploadedFiles) {
          if (err) return res.serverError(err);

          if (uploadedFiles.length === 0) {
            return res.error({
              Message: "No file was uploaded",
            });
          }

          const filePath = uploadedFiles[0].fd;
          // console.log(filePath);
          const workbook = XLSX.readFile(filePath);
          // console.log(workbook);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          // console.log(worksheet, "worksheet");
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log(jsonData, "json data");

          // Mendapatkan ID file yang diunggah
          const fileId = uploadedFiles[0].id;
          console.log(fileId, "uploaded file ID");

          const response = {
            Status: "Success",
            Message: "File uploaded successfully",
            // fileId: fileId,
            data: jsonData,
          };

          return res.json(response);
        }
      );
    } catch (err) {
      return res.error({
        Message: "Upload file invalid",
      });
    }
  },

  getDataDetailCodeID: async function (req, res) {
    // const { budgetId } = req.body;
    // await DB.poolConnect;

    try {
      const requesteprop = await DBPROP.promise();
      const request = DB.pool.request();

      let sqlGetData = `SELECT pb.brand_code,pb.bulan,pb.activity_id AS activity_code,ma.activity_desc AS activity,
      p.budget_year,mb.brand_sap AS brand_id
      FROM proposal_budget pb,proposal p,m_activity ma,m_brand mb  
      WHERE proposal_budget_id = '${req.param("budgetId")}'
      AND pb.proposal_id = p.proposal_id
      AND ma.activity_code = pb.activity_id
      AND pb.brand_code = mb.brand_code 
      AND p.budget_year = ma.year`;

      console.log(sqlGetData);
      let awdata = await requesteprop.query(sqlGetData);
      let data = awdata[0];
      console.log(data, "data");

      const datas = data.length;
      console.log(datas, "length");
      

      if (datas == 0) {
        return res.error({
          status: "Error",
          message: "Maaf budgetId yang anda cari tidak ditemukan!",
        });
      }else{


        let listValidation = [];
        for (let i = 0; i < data.length; i++) {
          
            let activity_code = data[i].activity_code;
            let sqlGetDataActivity = `SELECT ac.m_accrue_gl_id,ac.kode,ac.nama FROM m_accrue_gl ac,
            r_mapping_gl rmg 
            WHERE ac.kode = rmg.kode_mapping
            AND rmg.kode = '${activity_code}'`;

            let getDataGlAccrue = await request.query(sqlGetDataActivity);
            let m_accrue_gl_id = getDataGlAccrue.recordset.length > 0 ? getDataGlAccrue.recordset[0].m_accrue_gl_id : null;
            let kode = getDataGlAccrue.recordset.length > 0 ? getDataGlAccrue.recordset[0].kode : null;
            let nama = getDataGlAccrue.recordset.length > 0 ? getDataGlAccrue.recordset[0].nama : null;

            data[i].accrueGlAccountId = m_accrue_gl_id;
            data[i].accrueGlAccountCode = kode;
            data[i].accrueGlAccountName = nama;

            if(!m_accrue_gl_id){
              listValidation.push(`Data activity code ${activity_code} belum ada mapping Accrue GL harap hubungi IT untuk proses setting data mapping`);
            }
          
        }

        if(listValidation.length > 0){
          return res.error({
            message:listValidation.toString(),
          });
        }

        return res.success({
          status: "success",
          message: "success fetch data",
          data: data,
        });
      }
    } catch (err) {
      return res.error({
        message: "Tidak berhasil ambil data!",
      });
    }
  },

  //  upload jenis 2
  uploadFileXlsxLengkap: async function (req, res, budgetIds) {
    try {
      const requesteprop = await DBPROP.promise();
      const request = DB.pool.request();

      req.file("file").upload(
        {
          maxBytes: 150000000, // Batasan ukuran file (dalam byte)
          dirname: require("path").resolve(
            sails.config.appPath,
            "uploads/pembayaranEprop"
          ),
        },
        async function (err, uploadedFiles) {
          if (err) return res.serverError(err);

          if (uploadedFiles.length === 0) {
            return res.error({
              Message: "No file was uploaded",
            });
          }

          const filePath = uploadedFiles[0].fd;
          // console.log(filePath);
          const workbook = XLSX.readFile(filePath);
          // console.log(workbook);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          // console.log(worksheet, "worksheet");
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log(jsonData, "json data");

          // // Mendapatkan ID file yang diunggah
          // const fileId = uploadedFiles[0].id;
          // console.log(fileId, "uploaded file ID");

          //  masuk kondisi 2 => cari data budgetIdnya
          const cekbudgetId = jsonData.map((item) => item["Budget ID"]);
          console.log(cekbudgetId, "cekbudgetId");

          //  kondisi kedua
          // const paramBudgetId = cekbudgetId.map(() => "?").join(",");
          let sqlGetData = `SELECT proposal_budget_id, pb.brand_code, pb.bulan, pb.activity_id AS activity_code, ma.activity_desc AS activity
                            FROM proposal_budget pb, proposal p, m_activity ma
                            WHERE pb.proposal_budget_id IN (${cekbudgetId})
                            AND pb.proposal_id = p.proposal_id
                            AND ma.activity_code = pb.activity_id
                            AND p.budget_year = ma.year`;
          console.log(sqlGetData);
          let awdata = await requesteprop.query(sqlGetData);
          let data = awdata[0];
          console.log(data, "data");

          const datas = data.length;
          console.log(datas, "length");

          if (datas == 0) {
            return res.error({
              status: "Error",
              message: "Maaf budgetId yang anda cari tidak ditemukan!",
            });
          }

          //  kondisi merge data
          // Mengelompokkan data berdasarkan "Budget ID" menggunakan Lodash
          const groupedData = _.groupBy(jsonData, "Budget ID");

          // Menggabungkan data dan detail berdasarkan "Budget ID" dan "proposal_budget_id"
          const mergedData = _.map(data, (itemsql) => {
            const { proposal_budget_id, ...rest } = itemsql;
            const datafile = groupedData[proposal_budget_id];
            if (datafile) {
              // Menggabungkan itemsql dan datafile menggunakan Lodash
              const mergedObj = _.merge(itemsql, datafile[0]);
              // Menghapus properti "proposal_budget_id"
              delete mergedObj.proposal_budget_id;
              return mergedObj;
            }
            // console.log(rest, "data rest");
            // return rest;
          });
          // console.log(mergedData, "data merge");
          // return mergedData;
          //  mengubah nama field
          const renamedField = _.map(mergedData, (item) => {
            return {
              Brand: item.brand_code,
              Period: item.bulan,
              "Activity Code": item.activity_code,
              Activity: item.activity,
              ..._.omit(item, [
                "brand_code",
                "bulan",
                "activity_code",
                "activity",
              ]),
            };
          });

          console.log(renamedField, "updaterename");
          const response = {
            Status: "Success",
            Message: "File uploaded successfully",
            // data: jsonData,
            data: renamedField,
          };

          return res.json(response);
        }
      );
    } catch (err) {
      return res.error({
        Message: "Upload file invalid",
      });
    }
  },
  getListBudgetIdByNomorEprop: async function (req, res) {
    const {
      query: { nomorProposal }
    } = req;

    try {
      const requesteprop = await DBPROP.promise();
      const request = DB.pool.request();

      let sqlGetData = `SELECT pb.proposal_budget_id AS budget_id,pb.brand_code,pb.bulan,pb.activity_id AS activity_code,ma.activity_desc AS activity,
                          p.budget_year
                          FROM proposal_budget pb,proposal p,m_activity ma  
                          WHERE p.doc_no = '${nomorProposal}'
                          AND pb.proposal_id = p.proposal_id
                          AND ma.activity_code = pb.activity_id
                          AND p.budget_year = ma.year`;
      console.log(sqlGetData);
      let awdata = await requesteprop.query(sqlGetData);
      let data = awdata[0];
      console.log(data, "data");

      const datas = data.length;
      console.log(datas, "length");

      if (datas == 0) {
        return res.error({
          status: "Error",
          message: `Maaf Listing Budget ID atas nomor eprop ${nomorProposal} tidak ditemukan!`,
        });
      }

      return res.success({
        status: "success",
        message: "success fetch data",
        data: data,
      });
    } catch (err) {
      return res.error({
        message: "Tidak berhasil ambil data!",
      });
    }
  },

  lockTransaction: async function (req, res) {
    const {nik,kode} = req.body;

    try {
      const request = DB.pool.request();

      let sqlCheckData = `SELECT COUNT(1) AS jumlahData 
      FROM lock_settlement_va 
      WHERE kode = '${kode}' 
      AND islock = 'Y' AND nik <> '${nik}'`;

      // console.log(sqlGetCekApakahNomorProposalSedangDigunakan);

      let getJumlahData = await request.query(sqlCheckData);
      let jumlahData = getJumlahData.recordset.length > 0 ? getJumlahData.recordset[0].jumlahData : 0;

      if (jumlahData > 0) {
        
        return res.error({
          message: `Menu Settlement VA Sedang dalam proses antrian penggunaan oleh user harap menunggu maksimal 10 menit kedepan terimakasih`
        });

      }else{

        let inserDataLock = `INSERT INTO lock_settlement_va
        (kode, nik)
        VALUES('${kode}', '${nik}')`;
        await request.query(inserDataLock);

        return res.success({
          message: "Success open menu",
        });

      }
    } catch (err) {
      return res.error({
        message: "Tidak berhasil ambil data!",
      });
    }
  },


  clearAdvance: async function (req, res) {
    const {nik,sessionId} = req.body;

    try {
      const request = DB.pool.request();

      let sqlDeleteLockSettlement = `DELETE FROM lock_create_settlement_va WHERE nip = '${nik}' AND session_id = '${sessionId}'`;
      await request.query(sqlDeleteLockSettlement);

      return res.success({
        message: "Success Clear Advance",
      });

      
    } catch (err) {
      return res.error({
        message: "Tidak berhasil ambil data!",
      });
    }
  },


};

function racikXMLL(xmlTemplate, body) {
  return xmlTemplate.replace("?", body);
}
