/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const axios = require("axios");
const json2xls = require("json2xls");
const moment = require("moment");
module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {tahun,searchText}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereTahun = ``;
      if(tahun && tahun!='null'){
        whereTahun = `AND tahun = '${tahun}'`;
      }

      let whereSearch = ``;
      if(searchText){
        whereSearch = `AND nomor_proposal LIKE '%${searchText}%' OR accounting_document_number LIKE '%${searchText}%'`;
      }

      let queryDataTable = `SELECT tahun,nomor_proposal,accounting_document_number,total_klaim 
      FROM data_eprop_klaim_manual_from_sap WHERE 1=1 ${whereTahun} ${whereSearch}
      ORDER BY nomor_proposal`;


      console.log(queryDataTable);

      let getData = await request.query(queryDataTable);
      let rows = getData.recordset;

      return res.success({
        result: rows,
        message: "Fetch data successfully"
      });
    } catch (err) {
      return res.error(err);
    }
  },
  exportExcel: async function(req, res) {
    const {
      query: {tahun,searchText}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereTahun = ``;
      if(tahun && tahun!='null'){
        whereTahun = `AND tahun = '${tahun}'`;
      }

      let whereSearch = ``;
      if(searchText){
        whereSearch = `AND nomor_proposal LIKE '%${searchText}%' OR accounting_document_number LIKE '%${searchText}%'`;
      }

      let queryDataTable = `SELECT tahun,nomor_proposal,accounting_document_number,total_klaim 
      FROM data_eprop_klaim_manual_from_sap WHERE 1=1 AND tahun = '2023' ${whereTahun} ${whereSearch}
      ORDER BY nomor_proposal`;


      console.log(queryDataTable);

      let getData = await request.query(queryDataTable);
      let rows = getData.recordset;


      let arraydetailsforexcel = [];

      for (let i = 0; i < rows.length; i++) {
        // console.log("Lop >", rows[i].nomor_klaim);
        let obj = {
          "TAHUN": rows[i].tahun,
          "NOMOR PROPOSAL": rows[i].nomor_proposal,
          "DOCUMENT NUMBER": rows[i].accounting_document_number,
          "TOTAL KLAIM": rows[i].total_klaim
        };

        arraydetailsforexcel.push(obj);
      }

      if (arraydetailsforexcel.length > 0) {
        let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
        let namafile = "data_klaim_manual_".concat(tglfile).concat(".xlsx");

        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader("Content-Type", "application/vnd.openxmlformats");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + namafile
        );
        res.end(hasilXls, "binary");
      } else {


        let obj = {
          "TAHUN": "",
          "NOMOR PROPOSAL": "",
          "DOCUMENT NUMBER": "",
          "TOTAL KLAIM": ""
        };

        arraydetailsforexcel.push(obj);

        let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
        let namafile = "data_klaim_manual_".concat(tglfile).concat(".xlsx");

        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader("Content-Type", "application/vnd.openxmlformats");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + namafile
        );
        res.end(hasilXls, "binary");

      }

    } catch (err) {
      return res.error(err);
    }
  },

}
