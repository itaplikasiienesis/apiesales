const uuid = require("uuid/v4");
const path = require("path");
const DBPROP = require("../../../services/DBPROPOSAL");
const glob = require("glob");
const numeral = require("numeral");
const axios = require("axios");
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

module.exports = {
  submitDataOpec: async function (req, res) {
    const {
      detailAdvance,
      detailSetllement,
      header: {
        companyCode,
        createdby,
        outstandingBalance,
        totalAdvance,
        updatedby,
        status,
        nomorSap,
        postingDate,
        amount,
        brandCode,
        dppTpAmount,
        dppVatAmount,
        fiscalYear,
        kodeStatus,
        namaAssignment,
        nipApproval,
        nipAssignment,
        nomorDokumen,
        nomorFakturPajak,
        nonVatAmount,
        taxPayableAmount,
        tglFakturPajak,
        totalAmount,
        totalPajak,
        totalPph,
        tpCode,
        tpName,
        tpPercentage,
        tpType,
        vatCode,
        vatIn,
        description,
        tpCodeId,
        totalSettlement,
        documentNo,
      },
    } = req.body;
    try {
      await DB.poolConnect;
      const request = DB.pool.request();
      console.log("connection..");

      const newId = uuid();

      if (!companyCode) {
        return res.error({
          message: "company code tidak boleh kosong",
        });
      }

      if (!outstandingBalance) {
        return res.error({
          message: "outstanding ballance tidak boleh kosong",
        });
      }

      if (!totalAdvance) {
        return res.error({
          message: "total advance tidak boleh kosong",
        });
      }

      if (!totalAmount) {
        return res.error({
          message: "total amount tidak boleh kosong",
        });
      }

      //  insert settlement/header
      let queryInsertHeader = `INSERT INTO settlement_va_operation_cost (settlement_va_operation_cost_id, 
        company_code, created, createdby, isactive, nomor_sap, outstanding_balance, posting_date, total_advance, total_settlement,
        updated, updatedby, amount , brand_code, description , dpp_tp_amount , dpp_vat_amount, fiscal_year,
        kode_status, nama_assigment, nip_approval, nip_assigment, nomor_dokumen, nomor_faktur_pajak, 
        non_vat_amount, status, tax_payable_amount, tgl_faktur_pajak, total_amount, total_pajak, 
        total_pph, tp_code, tp_code_id, tp_name, tp_percentage, tp_type, vat_code, vat_in) 
        VALUES 
        ('${newId}', 
        '${companyCode}', getdate(), '${createdby}', 'Y', '${nomorSap}', ${outstandingBalance}, '${postingDate}', ${totalAdvance}, ${totalSettlement},
        getdate(), '${updatedby}', '${amount}', '${brandCode}', '${description}' , ${dppTpAmount} , ${dppVatAmount}, '${fiscalYear}',
        '${kodeStatus}', '${namaAssignment}', '${nipApproval}', '${nipAssignment}', '${nomorDokumen}', '${nomorFakturPajak}', 
        ${nonVatAmount}, '${status}', ${taxPayableAmount}, '${tglFakturPajak}', ${totalAmount}, '${totalPajak}', 
        ${totalPph}, '${tpCode}', '${tpCodeId}' ,'${tpName}', ${tpPercentage}, '${tpType}', '${vatCode}', ${vatIn})
`;
      console.log(queryInsertHeader, "settlement");
      await request.query(queryInsertHeader);

      //    bentuk array
      const advanceDataArray = Array.isArray(detailAdvance)
        ? detailAdvance
        : [detailAdvance];

      console.log(advanceDataArray, "dataadvancea");
      for (const advanceData of advanceDataArray) {
        const { amount, createdby, documentno, updatedby, fiscalYear, line } =
          advanceData;

        const newIdAdvance = uuid();

        //  insert advance
        let queryInsertAdvance = `INSERT INTO advance_settlement_va_operation_cost (advance_settlement_va_operation_cost_id, 
        settlement_va_operation_cost_id, amount, created, createdby, documentno, fiscal_year, isactive, line, updated, updatedby)
        VALUES
        ('${newIdAdvance}', 
        '${newId}', ${amount}, getdate(), '${createdby}', '${documentno}', '${fiscalYear}', 'Y', '${line}', getdate(), '${updatedby}')`;

        console.log(queryInsertAdvance, "advance settlemnet");
        await request.query(queryInsertAdvance);
      }

      //  bentuk array
      const settlementDataArray = Array.isArray(detailSetllement)
        ? detailSetllement
        : [detailSetllement];

      console.log(settlementDataArray, "datasettlementa");
      for (const settlementData of settlementDataArray) {
        const {
          activityCode,
          amount,
          assigment,
          createdby,
          description,
          fileDokumen,
          nomorAdvance,
          reason,
          dppTp,
          dppVat,
          taxCode,
          taxPayable,
          updatedby,
          vatCode,
          vatIn,
          nonVat,
          istick,
          dateDocument,
          vendorCode,
          accueGlAccount,
          activity,
          brand,
          budgetId,
          budgetYear,
          documentNo,
          dppTpAmount,
          dppVatAmount,
          nomorFakturPajak,
          nonVatAmount,
          period,
          proposalNo,
          taxPayableAmount,
        } = settlementData;

        const newIdDetails = uuid();

        //  insert settlement / detail settlement

        let queryInsertDetails = `INSERT INTO detail_settlement_va_operation_cost (detail_settlement_va_operation_cost_id, settlement_va_operation_cost_id, 
        activity_code, amount, assigment, created, createdby, date_document, description, 
        dpp_tp, dpp_vat, file_dokumen, isactive, istick, nomor_advance, non_vat, reason, 
        tax_code, tax_payable, updated, updatedby, vat_code, vat_in)
        VALUES
        ('${newIdDetails}', '${newId}', 
        '${activityCode}', ${amount}, '${assigment}', getdate(), '${createdby}', '${dateDocument}', '${description}', 
        ${dppTp}, ${dppVat}, '${fileDokumen}', 'Y', '${istick}', '${nomorAdvance}', ${nonVat}, '${reason}', 
        '${taxCode}', ${taxPayable}, getdate(), '${updatedby}', '${vatCode}', ${vatIn})
        `;

        console.log(queryInsertDetails, "details settlemnet");
        await request.query(queryInsertDetails);

        //  get header
        let sqlGetHeader = `SELECT * FROM settlement_va_operation_cost order by created desc`;
        let getdata = await request.query(sqlGetHeader);
        let dataheader = getdata.recordset[0];
        console.log(dataheader, "data header");

        //  get advance detail
        let sqlGetAdvance = `SELECT * FROM advance_settlement_va_operation_cost order by created desc`;
        let getdataAdvance = await request.query(sqlGetAdvance);
        let dataAdvance = getdataAdvance.recordset[0];
        console.log(dataAdvance, "data advance");

        //  get settlement detail
        let sqlGetDetails = `SELECT * FROM detail_settlement_va_operation_cost dsvoc order by created desc`;
        let getdataDetails = await request.query(sqlGetDetails);
        let dataDetail = getdataDetails.recordset[0];
        console.log(dataDetail, "data detail");

        return res.send({
          message: "Succces",
          header: dataheader,
          advanceDetail: dataAdvance,
          detailSetllement: dataDetail,
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  findAssigment: async function (req, res) {
    const { assigment, nama } = req.body;
    await DB.poolConnect;

    try {
      const request = DB.pool.request();
      console.log("connection..");

      let sqlCekNik = `SELECT nik, nama FROM m_user mu where nik ='${assigment}'`;
      console.log(sqlCekNik);
      let getdata = await request.query(sqlCekNik);
      let dataUser = getdata.recordset;
      console.log(dataUser, "datauser");

      let jml = dataUser.length;

      if (jml == 0) {
        return res.error({
          message: "nik tidak ditemukan",
        });
      }

      return res.success({
        message: "success get data",
        data: dataUser,
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getOpecAccrue: async function (req, res) {
    await DB.poolConnect;

    try {
      const request = DB.pool.request();
      console.log("connection..");

      let sql = `SELECT * from m_accrue_gl where type = 'OPEC'`;
      let getdata = await request.query(sql);
      let dataAccrue = getdata.recordset;

      let jml = dataAccrue.length;

      if (jml == 0) {
        return res.error({
          message: "Accrue tidak ditemukan",
        });
      }

      return res.success({
        message: "success get data",
        data: dataAccrue,
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getCostCenter: async function (req, res) {
    await DB.poolConnect;

    try {
      const request = DB.pool.request();
      console.log("connection..");
      
      const requestDBPROP = await DBPROP.promise();
      // let queryBudget = `SELECT * FROM v_getexpiredproposal WHERE doc_no = '${nomoreprop_param}'`;
      let queryCC = `select * from m_cost_center`;
      let getCC = await requestDBPROP.query(queryCC);
      if(getCC[0].length > 0){
        return res.success({
            message: "success get data",
            data: getCC[0]
        });
      } else {
        return res.error({
          message: "Cost center tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  getProfitCenter: async function (req, res) {
    await DB.poolConnect;

    try {
      let response = await axios.get(`https://eis.enesis.com/api/profit-center`);
      console.log("res", response.data.data);
      return res.success({
        message: "success get data",
        data: response.data.data,
      });
    } catch (err) {
      return res.error(err);
    }
  },
};

// const {
//   settlement_va_operation_cost_id,
//   company_code,
//   created,
//   createdby,
//   isactive,
//   nomor_sap,
//   outstanding_balance,
//   posting_date,
//   total_advance,
//   updated,
//   updatedby,
//   amount,
//   brand_code,
//   description,
//   dpp_tp_amount,
//   dpp_vat_amount,
//   fiscal_year,
//   kode_status,
//   nama_assigment,
//   nip_approval,
//   nip_assigment,
//   nip_submited,
//   nomor_dokumen,
//   nomor_faktur_pajak,
//   non_vat_amount,
//   status,
//   tax_payable_amount,
//   tgl_faktur_pajak,
//   total_after_tax,
//   total_amount,
//   total_pajak,
//   total_pph,
//   tp_code,
//   tp_code_id,
//   tp_name,
//   tp_percentage,
//   tp_type,
//   vat_code,
//   vat_in,
//   line,
//   documentno,
// } = req.body;
