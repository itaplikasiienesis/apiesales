const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
const json2xls = require('json2xls');
const numeral = require('numeral');
const { Parser } = require('json2csv');

module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,searchText,bulan,group}
    } = req;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

      let whereClause = ``;
      if (searchText) {
      whereClause = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }

      let whereClauseCount = ``;
      if (searchText) {
      whereClauseCount = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }

      let filtertahun = ``;

      if (year) {
          
        filtertahun = `AND budget_year = '${year}'`;
      
      }

      let filterbulan = ``;

      if (bulan) {
          
        filterbulan = `AND bulan = '${bulan}'`;
      
      }

      let filtergroup = ``;

      if (group) {
          
        filtergroup = `AND group_id = '${group}'`;
      
      }
  
  
            
 
      let queryCountTable = `SELECT COUNT(1) AS total_rows
      FROM vw_budget_awal_vs_penggunaan_perperiod_pergl 
      WHERE 1=1 AND active=1 ${filtertahun} ${filterbulan} ${filtergroup} ${whereClauseCount}`;
      

      let queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
      COALESCE(budget_awal,0) AS budget_awal_group_activity,
      COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
      COALESCE(sisa_budget,0) AS sisa_budget_group_activity,
      activity_code,activity_desc
      FROM vw_budget_awal_vs_penggunaan_perperiod_pergl WHERE 1=1 AND active=1 ${filtertahun} ${filterbulan} ${filtergroup} ${whereClause} ORDER BY activity_code ASC limit ${offset},${limit}`;

      console.log(queryDataTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      //console.log(count);
      let [rows] = await request.query(queryDataTable);
      //console.log(rows);
      for (let i = 0; i < rows.length; i++) {


        rows[i].no = i+1;
        rows[i].budget_awal_group_activity = Number(rows[i].budget_awal_group_activity);
        rows[i].penggunaan_group_activity = Number(rows[i].penggunaan_group_activity);
        rows[i].sisa_budget_group_activity = Number(rows[i].sisa_budget_group_activity);
          
      }

      const meta = paginate(currentPage, count, rows, pageSize);
      //console.log(rows);
      return res.success({
            result: rows,
            meta,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },

  findSummary: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,bulan,quarter}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

      let filtertahun = ``;
      if(year){
        filtertahun = `AND budget_year = ${year}`;
      }

      let filterbulan = ``;
      let groupbybulan = ``;
      if(bulan){
        filterbulan = `AND bulan = ${bulan}`;
        groupbybulan = `,bulan`;

      }


      let filterquarter = ``;
      let groupbyquarter = ``;
      if(quarter){
        filterquarter = `AND quarter = '${quarter}'`;
        groupbyquarter = `,quarter`;
      }

      // let queryDataTable = `SELECT group_name,brand_code, budget_year,bulan,bulan_desc,quarter,
      // SUM(COALESCE(budget_awal,0)) AS budget_awal_group_activity,
      // SUM(COALESCE(budget_penggunaan,0)) AS penggunaan_group_activity,
      // SUM(COALESCE(sisa_budget,0)) AS sisa_budget_group_activity
      // FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter}
      // GROUP BY group_name,brand_code, budget_year,bulan,bulan_desc,quarter`;


      let companyfilter = ``;
      let active = 0;
      if(year==2020){
        active = 0;
        companyfilter = `AND company_id=3`
      }else{
        active = 1;
      }


      let queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
      COALESCE(budget_awal,0) AS budget_awal_group_activity,
      COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
      COALESCE(sisa_budget,0) AS sisa_budget_group_activity
      FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 AND active=${active} ${filtertahun} ${filterbulan} `;
      console.log(queryDataTable);
      let [rows, fields] = await request.query(queryDataTable);
      for (let i = 0; i < rows.length; i++) {

        rows[i].no = i+1;
        rows[i].budget_awal_group_activity = Number(rows[i].budget_awal_group_activity);
        rows[i].penggunaan_group_activity = Number(rows[i].penggunaan_group_activity);
        rows[i].sisa_budget_group_activity = Number(rows[i].sisa_budget_group_activity);
          
      }
      const meta = paginate(currentPage, rows.length, rows, pageSize);
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



  exportToExcelSummary: async function (req, res) {
    const {
      query: {year,bulan,quarter}
    } = req;

    // await DBPROP;
    console.log(req.query);
    try {
      const request = await DBPROP.promise();

      let filtertahun = ``;
      let yearfile = `Year_all`;
      if(year){
        filtertahun = `AND budget_year = ${year}`;
        yearfile = year;

      }

      let filterbulan = ``;
      let groupbybulan = ``;
      let bulanfile = `Bulan_all`;
      if(bulan){
        filterbulan = `AND bulan = ${bulan}`;
        groupbybulan = `,bulan`;
        bulanfile = convertBulan(Number(bulan));

      }

      let filterquarter = ``;
      let groupbyquarter = ``;
      if(quarter){
        filterquarter = `AND quarter = '${quarter}'`;
        groupbyquarter = `,quarter`;

      }

      // let queryDataTable = `SELECT group_name,
      // SUM(COALESCE(budget_awal,0)) AS budget_awal_group_activity,
      // SUM(COALESCE(budget_penggunaan,0)) AS penggunaan_group_activity,
      // SUM(COALESCE(sisa_budget,0)) AS sisa_budget_group_activity
      // FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter}
      // GROUP BY group_name ${groupbybulan}${groupbyquarter}`;

      let queryDataTable = `SELECT group_name,brand_code, budget_year,bulan,bulan_desc,quarter,
      SUM(COALESCE(budget_awal,0)) AS budget_awal_group_activity,
      SUM(COALESCE(budget_penggunaan,0)) AS penggunaan_group_activity,
      SUM(COALESCE(sisa_budget,0)) AS sisa_budget_group_activity
      FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter}
      GROUP BY group_name,brand_code, budget_year,bulan,bulan_desc,quarter`;

      let [rows, fields] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1


        let obj = {
  
          "No": no,  
          "Budget Group Name": rows[i].group_name,         
          "Budget Awal" : numeral(rows[i].budget_awal_group_activity).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_group_activity).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_budget_group_activity).format('0,0')

        }

        arraydetailsforexcel.push(obj);
          
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = `E-Proposal_Budget_Summary_${yearfile}_${bulanfile}_`.concat(tglfile).concat('.xlsx');
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

  exportToExcel: async function (req, res) {
    const {
    query: {year,searchText,bulan,quarter}
    } = req;
    
    // await DBPROP;
    try {
    const request = await DBPROP.promise();
    
    let whereClause = ``;
    if (searchText) {
    whereClause = `AND group_name LIKE '%${searchText}%'
    OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
    OR budget_awal LIKE '%${searchText}%'
    OR budget_penggunaan LIKE '%${searchText}%'
    OR sisa_budget LIKE '%${searchText}%'`;
    }
    
    let whereClauseCount = ``;
    if (searchText) {
    whereClauseCount = `AND group_name LIKE '%${searchText}%'
    OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
    OR budget_awal LIKE '%${searchText}%'
    OR budget_penggunaan LIKE '%${searchText}%'
    OR sisa_budget LIKE '%${searchText}%'`;
    }
    
    
    let filtertahun = ``;
    if(year){
    filtertahun = `AND budget_year = ${year}`;
    }
    
    let filterbulan = ``;
    if(bulan){
    filterbulan = `AND bulan = ${bulan}`;
    }
    
    
    let filterquarter = ``;
    if(quarter){
    filterquarter = `AND quarter = '${quarter}'`;
    }
    
    
    
    let queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
    COALESCE(budget_awal,0) AS budget_awal_group_activity,
    COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
    COALESCE(sisa_budget,0) AS sisa_budget_group_activity
    FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter} ${whereClause}`;
    
    
    
    
    if(year > 2022){
    
    queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
    COALESCE(budget_awal,0) AS budget_awal_group_activity,
    COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
    COALESCE(sisa_budget,0) AS sisa_budget_group_activity,
    activity_code,activity_desc
    FROM vw_budget_awal_vs_penggunaan_perperiod_pergl WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter} ${whereClause}`;
    
    }
    
    
    let [rows, fields] = await request.query(queryDataTable);
    console.log("QUERY GENERATE BUDGET",queryDataTable);
    let arraydetailsforexcel = [];
    for (let i = 0; i < rows.length; i++) {
    
    let no = i + 1
    
    // console.log("masuk sini 1.0");
    let obj = {
    
    "No": no,
    "Budget Year": rows[i].budget_year,
    "Periode" : rows[i].bulan_desc,
    "Quarter" : rows[i].quarter,
    "Budget Group Name": rows[i].group_name,
    "Brand Code" : rows[i].brand_code,
    "Budget Awal" : numeral(rows[i].budget_awal_group_activity).format('0,0'),
    "Budget Terpakai" : numeral(rows[i].penggunaan_group_activity).format('0,0'),
    "Budget Tersedia" : numeral(rows[i].sisa_budget_group_activity).format('0,0'),
    "Activity Code" : rows[i].activity_code,
    "Activity Name" : rows[i].activity_desc
    
    }
    // console.log("obj>",obj);
    
    arraydetailsforexcel.push(obj);
    
    }
    
    if(arraydetailsforexcel.length > 0){
    let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
    let namafile = 'E-Proposal_Budget_Activity_'.concat(tglfile).concat('.xlsx');
    
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

  /*exportToExcel: async function (req, res) {
    const {
      query: {year,searchText,bulan,quarter,group}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      let whereClause = ``;
      if (searchText) {
      whereClause = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }

      let whereClauseCount = ``;
      if (searchText) {
      whereClauseCount = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }
      

      let filtertahun = ``;
      if(year){
        filtertahun = `AND budget_year = ${year}`;
      }

      let filterbulan = ``;
      if(bulan){
        filterbulan = `AND bulan = ${bulan}`;
      }

      
      let filtergroup = ``;

      if (group) {
          
        filtergroup = `AND group_id = '${group}'`;
      
      }


      let queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
      COALESCE(budget_awal,0) AS budget_awal_group_activity,
      COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
      COALESCE(sisa_budget,0) AS sisa_budget_group_activity
      FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 AND active=1 ${filtertahun} ${filterbulan} ${filtergroup} ${whereClause}`;



      
      if(year > 2022){

        queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,bulan,bulan_desc,quarter,
        COALESCE(budget_awal,0) AS budget_awal_group_activity,
        COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
        COALESCE(sisa_budget,0) AS sisa_budget_group_activity,
        activity_code,activity_desc
        FROM vw_budget_awal_vs_penggunaan_perperiod_pergl WHERE 1=1 AND active=1 ${filtertahun} ${filterbulan} ${filtergroup} ${whereClause}`;

      }


      let [rows, fields] = await request.query(queryDataTable);
      console.log("QUERY GENERATE BUDGET",queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1

        // console.log("masuk sini  1.0");
        let obj = {
  
          "No": no, 
          "Budget Year": rows[i].budget_year, 
          "Periode" : rows[i].bulan_desc,
          "Quarter" : rows[i].quarter,
          "Budget Group Name": rows[i].group_name,         
          "Brand Code" : rows[i].brand_code,
          "Budget Awal" : numeral(rows[i].budget_awal_group_activity).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_group_activity).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_budget_group_activity).format('0,0'),
          "Activity Code" : rows[i].activity_code,
          "Activity Name" : rows[i].activity_desc

        }
        // console.log("obj>",obj);

        arraydetailsforexcel.push(obj);
          
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'E-Proposal_Budget_Activity_'.concat(tglfile).concat('.xlsx');          
        
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
  },*/

  exportToCsv: async function (req, res) {
    const {
      query: {year,searchText}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      const fields = ['No', 'Budget Year', 'Budget Group Name','Brand Code','Budget Awal','Budget Terpakai','Budget Tersedia'];
      const opts = { fields };
      const parser = new Parser(opts);

      let whereClause = ``;
      if (searchText) {
      whereClause = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }

      let whereClauseCount = ``;
      if (searchText) {
      whereClauseCount = `AND group_name LIKE '%${searchText}%'
      OR brand_code LIKE '%${searchText}%' OR budget_year LIKE '%${searchText}%'
      OR budget_awal LIKE '%${searchText}%'
      OR budget_penggunaan LIKE '%${searchText}%'
      OR sisa_budget LIKE '%${searchText}%'`;
      }
      

      let queryDataTable = `SELECT group_id, group_name AS group_name, brand_code, budget_year,
      COALESCE(budget_awal,0) AS budget_awal_group_activity,
      COALESCE(budget_penggunaan,0) AS penggunaan_group_activity,
      COALESCE(sisa_budget,0) AS sisa_budget_group_activity
      FROM vw_budget_awal_vs_penggunaan WHERE budget_year = ${year} ${whereClause}`;
      let [rows] = await request.query(queryDataTable);
      console.log("query Budget activiry",queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1


        console.log("MASUK 1.0");
        let obj = {
  
          "No": no, 
          "Budget Year": rows[i].budget_year, 
          "Budget Group Name": rows[i].group_name,         
          "Brand Code" : rows[i].brand_code,
          "Budget Awal" : numeral(rows[i].budget_awal_group_activity).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_group_activity).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_budget_group_activity).format('0,0')

        }
        console.log("obj",obj);

        arraydetailsforexcel.push(obj);
          
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'E-Proposal_Budget_Activity_'.concat(tglfile).concat('.csv');          
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


  exportToCsvSummary: async function (req, res) {
    const {
      query: {year,bulan,quarter}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();


      const fields = ['No','Budget Group Name','Budget Awal','Budget Terpakai','Budget Tersedia'];
      const opts = { fields };
      const parser = new Parser(opts);

      let filtertahun = ``;
      let yearfile = `Year_all`;
      if(year){
        filtertahun = `AND budget_year = ${year}`;
        yearfile = year;

      }

      let filterbulan = ``;
      let groupbybulan = ``;
      let bulanfile = `Bulan_all`;
      if(bulan){
        filterbulan = `AND bulan = ${bulan}`;
        groupbybulan = `,bulan`;
        bulanfile = convertBulan(bulan);

      }

      let filterquarter = ``;
      let groupbyquarter = ``;
      if(quarter){
        filterquarter = `AND quarter = '${quarter}'`;
        groupbyquarter = `,quarter`;

      }

      // let queryDataTable = `SELECT group_name,
      // SUM(COALESCE(budget_awal,0)) AS budget_awal_group_activity,
      // SUM(COALESCE(budget_penggunaan,0)) AS penggunaan_group_activity,
      // SUM(COALESCE(sisa_budget,0)) AS sisa_budget_group_activity
      // FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter}
      // GROUP BY group_name ${groupbybulan}${groupbyquarter}`;

      let queryDataTable = `SELECT group_name,brand_code, budget_year,bulan,bulan_desc,quarter,
      SUM(COALESCE(budget_awal,0)) AS budget_awal_group_activity,
      SUM(COALESCE(budget_penggunaan,0)) AS penggunaan_group_activity,
      SUM(COALESCE(sisa_budget,0)) AS sisa_budget_group_activity
      FROM vw_budget_awal_vs_penggunaan_perperiod WHERE 1=1 ${filtertahun} ${filterbulan} ${filterquarter}
      GROUP BY group_name,brand_code, budget_year,bulan,bulan_desc,quarter`;

      let [rows] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {

        let no = i + 1


        let obj = {
  
          "No": no, 
          "Budget Group Name": rows[i].group_name,         
          "Budget Awal" : numeral(rows[i].budget_awal_group_activity).format('0,0'), 
          "Budget Terpakai" : numeral(rows[i].penggunaan_group_activity).format('0,0'),
          "Budget Tersedia" : numeral(rows[i].sisa_budget_group_activity).format('0,0')

        }

        arraydetailsforexcel.push(obj);
          
      }

      console.log('samm');
      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = `E-Proposal_Budget_Summary_${yearfile}_${bulanfile}_`.concat(tglfile).concat('.csv');          
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


function convertBulan(bulan){

  let periode =  ``;
  if(bulan==1){
    periode='Januari';
  }else if(bulan==2){
    periode='Februari';
  }else if(bulan==3){
    periode='Maret';
  }else if(bulan==4){
    periode='April';
  }else if(bulan==5){
    periode='Mei';
  }else if(bulan==6){
    periode='Juni';
  }else if(bulan==7){
    periode='Juli';
  }else if(bulan==8){
    periode='Agustus';
  }else if(bulan==9){
    periode='September';
  }else if(bulan==10){
    periode='Oktober';
  }else if(bulan==11){
    periode='November';
  }else if(bulan==12){
    periode='Desember';
  }

  return periode;

}