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
      query: {tahun,bulan,division_code}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereTahun = ``;
      if(tahun && tahun!='null'){
        whereTahun = `AND budget_year = '${tahun}'`;
      }

      let whereBulan = ``;
      if(bulan && bulan > 0){
        whereBulan = `AND bulan = '${bulan}'`;
      }

      let whereDivision = ``;
      if(division_code && division_code!='null'){
        whereDivision = `AND division_code = '${division_code}'`;
      }


      let queryDataTable = `SELECT budget_year,bulan,division_code,
      SUM(budget) AS budget,
      SUM(nominal_klaim_distributor) AS nominal_klaim_distributor,
      SUM(nominal_klaim_manual) AS nominal_klaim_manual,
      SUM(nominal_klaim_po) AS nominal_klaim_po,SUM(nominal_reversal) AS nominal_reversal
      FROM eprop_period_channel WHERE 1=1 AND budget_year = '2023' ${whereTahun} ${whereBulan} ${whereDivision}
      GROUP BY budget_year,bulan,division_code
      ORDER BY bulan,division_code`;

      console.log(queryDataTable);

      let getData = await request.query(queryDataTable);
      let rows = getData.recordset;

      for (let i = 0; i < rows.length; i++) {
        
        rows[i].budget = Number(rows[i].budget);
        rows[i].nominal_klaim_distributor = Number(rows[i].nominal_klaim_distributor);
        rows[i].nominal_klaim_manual = Number(rows[i].nominal_klaim_manual);
        rows[i].nominal_klaim_po = Number(rows[i].nominal_klaim_po);
        rows[i].nominal_reversal = Number(rows[i].nominal_reversal);

        let budget = rows[i].budget;
        let nominal_klaim_distributor = rows[i].nominal_klaim_distributor;
        let nominal_klaim_manual = rows[i].nominal_klaim_manual;
        let nominal_klaim_po = rows[i].nominal_klaim_po;
        let nominal_reversal = rows[i].nominal_reversal;

        rows[i].net_value = budget - nominal_klaim_distributor - nominal_klaim_manual - nominal_klaim_po - nominal_reversal;
        
      }


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
      query: {tahun,bulan,division_code}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereTahun = ``;
      if(tahun && tahun!='null'){
        whereTahun = `AND budget_year = '${tahun}'`;
      }

      let whereBulan = ``;
      if(bulan && bulan > 0){
        whereBulan = `AND bulan = '${bulan}'`;
      }

      let whereDivision = ``;
      if(division_code && division_code!='null'){
        whereDivision = `AND division_code = '${division_code}'`;
      }


      let queryDataTable = `SELECT budget_year,bulan,division_code,
      SUM(budget) AS budget,
      SUM(nominal_klaim_distributor) AS nominal_klaim_distributor,
      SUM(nominal_klaim_manual) AS nominal_klaim_manual,
      SUM(nominal_klaim_po) AS nominal_klaim_po,SUM(nominal_reversal) AS nominal_reversal
      FROM eprop_period_channel WHERE 1=1 AND budget_year = '2023' ${whereTahun} ${whereBulan} ${whereDivision}
      GROUP BY budget_year,bulan,division_code
      ORDER BY bulan,division_code`;

      console.log(queryDataTable);


      console.log(queryDataTable);

      let getData = await request.query(queryDataTable);
      let rows = getData.recordset;


      let arraydetailsforexcel = [];

      for (let i = 0; i < rows.length; i++) {
        // console.log("Lop >", rows[i].nomor_klaim);


        rows[i].budget = Number(rows[i].budget);
        rows[i].nominal_klaim_distributor = Number(rows[i].nominal_klaim_distributor);
        rows[i].nominal_klaim_manual = Number(rows[i].nominal_klaim_manual);
        rows[i].nominal_klaim_po = Number(rows[i].nominal_klaim_po);
        rows[i].nominal_reversal = Number(rows[i].nominal_reversal);

        let budget = rows[i].budget;
        let nominal_klaim_distributor = rows[i].nominal_klaim_distributor;
        let nominal_klaim_manual = rows[i].nominal_klaim_manual;
        let nominal_klaim_po = rows[i].nominal_klaim_po;
        let nominal_reversal = rows[i].nominal_reversal;

        rows[i].net_value = budget - nominal_klaim_distributor - nominal_klaim_manual - nominal_klaim_po - nominal_reversal;

        let obj = {
          "TAHUN": rows[i].budget_year,
          "BULAN": rows[i].bulan,
          "DIVISION": rows[i].division_code,
          "BUDGET": rows[i].budget,
          "NOMINAL KLAIM DISTRIBUTOR": rows[i].nominal_klaim_distributor,
          "NOMINAL KLAIM MANUAL": rows[i].nominal_klaim_manual,
          "NOMINAL KLAIM PO": rows[i].nominal_klaim_po,
          "NOMINAL REVERSAL": rows[i].nominal_reversal,
          "NET VALUE": rows[i].net_value,
        };

        arraydetailsforexcel.push(obj);
      }

      if (arraydetailsforexcel.length > 0) {
        let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
        let namafile = "data_summary_eprop_".concat(tglfile).concat(".xlsx");

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
          "BULAN": "",
          "DIVISION": "",
          "BUDGET": "",
          "NOMINAL KLAIM DISTRIBUTOR": "",
          "NOMINAL KLAIM MANUAL": "",
          "NOMINAL KLAIM PO": "",
          "NOMINAL REVERSAL": "",
          "NET VALUE": "",
        };

        arraydetailsforexcel.push(obj);

        let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
        let namafile = "data_summary_eprop_".concat(tglfile).concat(".xlsx");

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
