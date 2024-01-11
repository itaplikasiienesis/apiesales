const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
const { Parser } = require('json2csv');
const json2xls = require('json2xls');
const numeral = require('numeral');

module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,searchText }
    } = req;

    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      if (searchText) {
      whereClause = `AND brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_per_brand LIKE '%${searchText}%'
      OR penggunaan_per_brand LIKE '%${searchText}%'
      OR sisa_per_brand LIKE '%${searchText}%'`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM vw_budget_brand WHERE 1=1 ${whereClause}`;

      let queryDataTable = `SELECT budget_year,brand_code,COALESCE(budget_per_brand,0) AS budget_per_brand,
      COALESCE(penggunaan_per_brand,0) AS penggunaan_per_brand,
      COALESCE(sisa_per_brand,0) AS sisa_per_brand FROM vw_budget_brand WHERE budget_year = ${year} ${whereClause} limit ${offset},${limit}`;

      //console.log(queryDataTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);

      for (let i = 0; i < rows.length; i++) {
          
        rows[i].no = i+1;
        rows[i].budget_per_brand = Number(rows[i].budget_per_brand);
        rows[i].penggunaan_per_brand = Number(rows[i].penggunaan_per_brand);
        rows[i].sisa_per_brand = Number(rows[i].sisa_per_brand);
          
      }

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
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = await DBPROP.promise();

      let queryDataTable = `SELECT * FROM brand_budget WHERE brand_budget_id='${req.param(
        "id"
      )}'`;

      let [rows, fields] = await request.query(queryDataTable);
      const row = rows[0];

      return res.success({
        result: rows,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },

  exportToExcel: async function (req, res) {
    const {
      query: {year,searchText}
    } = req;
    const request = await DBPROP.promise();
    try {
    let whereClause = ``;
    if (searchText) {
    whereClause = `AND brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
    OR budget_per_brand LIKE '%${searchText}%'
    OR penggunaan_per_brand LIKE '%${searchText}%'
    OR sisa_per_brand LIKE '%${searchText}%'`;
    }

    let queryDataTable = `SELECT budget_year,brand_code,COALESCE(budget_per_brand,0) AS budget_per_brand,
    COALESCE(penggunaan_per_brand,0) AS penggunaan_per_brand,
    COALESCE(sisa_per_brand,0) AS sisa_per_brand FROM vw_budget_brand WHERE budget_year = ${year} ${whereClause}`;

    console.log(queryDataTable);
      let [rows] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1
        let obj = {
  
          "No": no, 
          "Budget Year": rows[i].budget_year, 
          "Brand Code" : rows[i].brand_code,
          "Budget Awal" : numeral(rows[i].budget_per_brand).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_per_brand).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_per_brand).format('0,0')

        }

        arraydetailsforexcel.push(obj);
          
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'E-Proposal_Budget_Brand_'.concat(tglfile).concat('.xlsx');          
        
        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.end(hasilXls, 'binary');
      }else{

        return res.error({
          message: "Data tidak ada"
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },

  exportToCsv: async function (req, res) {
    const {
      query: {year,searchText}
    } = req;
    const request = await DBPROP.promise();
    try {

      const fields = ['No', 'Budget Year','Brand Code','Budget Awal','Budget Terpakai','Budget Tersedia'];
      const opts = { fields };
      const parser = new Parser(opts);


      let whereClause = ``;
      if (searchText) {
      whereClause = `AND brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_per_brand LIKE '%${searchText}%'
      OR penggunaan_per_brand LIKE '%${searchText}%'
      OR sisa_per_brand LIKE '%${searchText}%'`;
      }

      let queryDataTable = `SELECT budget_year,brand_code,COALESCE(budget_per_brand,0) AS budget_per_brand,
      COALESCE(penggunaan_per_brand,0) AS penggunaan_per_brand,
      COALESCE(sisa_per_brand,0) AS sisa_per_brand FROM vw_budget_brand WHERE budget_year = ${year} ${whereClause}`;

      let [rows] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1
        let obj = {
  
          "No": no, 
          "Budget Year": rows[i].budget_year, 
          "Brand Code" : rows[i].brand_code,
          "Budget Awal" : numeral(rows[i].budget_per_brand).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_per_brand).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_per_brand).format('0,0')

        }

        arraydetailsforexcel.push(obj);
          
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'E-Proposal_Budget_Brand_'.concat(tglfile).concat('.csv');  
        const csv = parser.parse(arraydetailsforexcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.end(csv, 'binary');
      }else{

        return res.error({
          message: "Data tidak ada"
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },

}