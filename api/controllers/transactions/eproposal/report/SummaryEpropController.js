/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const { calculateLimitAndOffset, paginate } = require("paginate-info");
const json2xls = require("json2xls");
const moment = require("moment");


module.exports = {


  getData: async function(req, res) {
    
   const {
       query: {tahun}
     } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();


       let sqlQueryDataTable = `SELECT * FROM vw_summary_eprop
       WHERE budget_year = 2023`;

       let queryDataTable = await request.query(sqlQueryDataTable);
       let data = queryDataTable.recordset;

       for (let i = 0; i < data.length; i++) {
        
        data[i].budget = Number(data[i].budget);
        data[i].nominal_reversal = Number(data[i].nominal_reversal);
        
       }


       return res.send(data);
             
    } catch (err) {
      return res.error(err);
    }
  },


  find: async function(req, res) {
    const {
      query: {tahun,searchText,currentPage,pageSize}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);


      let whereTahun = ``;
      if(tahun && tahun!='null'){
        whereTahun = `AND budget_year = '${tahun}'`;
      }

      let whereSearch = ``;
      if(searchText){
        whereSearch = `AND doc_no LIKE '%${searchText}%'`;
      }


      let queryCountTable = `SELECT COUNT(1) AS total_rows 
      FROM vw_summary_eprop WHERE 1=1 AND budget_year = '2023' ${whereTahun} ${whereSearch}`;

      let queryDataTable = `SELECT *   
      FROM vw_summary_eprop WHERE 1=1 AND budget_year = '2023' ${whereTahun} ${whereSearch}
      ORDER BY doc_no
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);

      let getData = await request.query(queryDataTable);
      let rows = getData.recordset;


      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      const meta = paginate(currentPage, count, rows, pageSize);

      
      return res.success({
        result: rows,
        meta,
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
        whereTahun = `AND budget_year = '${tahun}'`;
      }

      let whereSearch = ``;
      if(searchText){
        whereSearch = `AND doc_no LIKE '%${searchText}%'`;
      }

      let queryDataTable = `SELECT *   
      FROM vw_summary_eprop 
      WHERE 1=1 AND budget_year = '2023' ${whereTahun} ${whereSearch}
      ORDER BY doc_no`;

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
          "NOMOR PROPOSAL": rows[i].doc_no,
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
          "NOMOR PROPOSAL": "",
          "BUDGET": "",
          "NOMINAL KLAIM DISTRIBUTOR": "",
          "NOMINAL KLAIM MANUAL": "",
          "NOMINAL KLAIM PO": "",
          "NOMINAL REVERSAL": "",
          "NET VALUE": "",
        };

        arraydetailsforexcel.push(obj);

        let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
        let namafile = "data_summary_eprop_by_nomorproposal_".concat(tglfile).concat(".xlsx");

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


};
