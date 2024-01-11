const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const mssql = require('mssql');
const moment = require('moment');
const xml2js = require('xml2js');
const numeral = require('numeral');
const bcrypt = require('bcryptjs');
const path = require('path');
const Client = require('ftp');
const fs = require('fs');
const ClientSFTP = require('ssh2-sftp-client');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const json2xls = require('json2xls');

module.exports = {
  // GET ALL RESOURCE

  findDaily: async function(req, res) {
    const {
      query: { currentPage, pageSize,searchText,r_delivery_plant_id,startdate,enddate,m_mesin_id}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
      

      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR machine_id LIKE '%${searchText}%' 
        OR product_id LIKE '%${searchText}%' OR m_area LIKE '%${searchText}%'
        OR line LIKE '%${searchText}%'`
      }

      let WhereMesins = ``;
      if(m_mesin_id){
        WhereMesins = ` AND machine_id = '${m_mesin_id}'`
      }

     
      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }
  
      let WhereRange = ``;
      if(startdate && enddate){
        WhereRange = ` AND CONVERT(VARCHAR(10),rundate,120) BETWEEN '${startdate}' AND '${enddate}'`
      }
  

      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM v_raw_oees WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}`;
      
      let queryDataTable = `SELECT CONVERT(VARCHAR(10),rundate ,120) AS tgl,
      rundate,plant_id,line,m_area,machine_id ,product_id,ROUND(AR1 , 2) AS ar,ROUND(QR1 , 2) AS qr,ROUND(PR1 , 2) AS pr ,ROUND(OEE1, 2) AS oee
      FROM v_raw_oees WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}${WhereMesins}
      order by rundate DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit== 0 ? 20 : limit} ROWS ONLY`;

      // console.log(queryDataTable);

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  findMonthly: async function(req, res) {
    const {
      query: { currentPage, pageSize,searchText,r_delivery_plant_id,m_mesin_id}
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
      
      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR marea LIKE '%${searchText}%' 
        OR machineid LIKE '%${searchText}%' OR machinename LIKE '%${searchText}%'
        OR line LIKE '%${searchText}%'`
      }

      let WhereMesins = ``;
      if(m_mesin_id){
        WhereMesins = ` AND machineid = '${m_mesin_id}'`
      }
     
      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }
  
      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM v_summ_oees WHERE 1=1 ${WheresearchText}${WherePlants}`;
      
      let queryDataTable = `SELECT 
      periode,plant_id,line,marea,machineid,machinename ,ROUND(AR , 2) AS ar,ROUND(QR , 2) AS qr,ROUND(PR , 2) AS pr ,ROUND(OEE, 2) AS oee
      FROM v_summ_oees WHERE 1=1 ${WheresearchText}${WherePlants}${WhereMesins}
      order by periode DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit== 0 ? 20 : limit} ROWS ONLY`;


      // console.log(queryDataTable);
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  exportExcelDaily: async function(req, res) {
    const {
      query: {searchText,r_delivery_plant_id,startdate,enddate,m_mesin_id}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let titleReport = `oee_daily_`;
      
      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR marea LIKE '%${searchText}%' 
        OR machineid LIKE '%${searchText}%' OR machinename LIKE '%${searchText}%'
        OR line LIKE '%${searchText}%'`
      }
     


      let WhereMesins = ``;
      if(m_mesin_id){
        WhereMesins = ` AND machine_id = '${m_mesin_id}'`
      }

      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }

      let WhereRange = ``;
      if(startdate && enddate){
        WhereRange = ` AND CONVERT(VARCHAR(10),rundate,120) BETWEEN '${startdate}' AND '${enddate}'`
      }
  
        
      let queryDataTable = `SELECT CONVERT(VARCHAR(10),rundate ,120) AS tgl,
      rundate,plant_id,line,m_area,machine_id ,product_id,ROUND(AR1 , 2) AS ar,ROUND(QR1 , 2) AS qr,ROUND(PR1 , 2) AS pr ,ROUND(OEE1, 2) AS oee
      FROM v_raw_oees WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}${WhereMesins}
      order by rundate DESC`;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
            let nomor = i +1;
            let obj = {
              "Nomor":nomor,
              "Tgl":rows[i].tgl,
              "Plant":rows[i].plant_id,	
              "Line":rows[i].line,
              "Mesin":rows[i].machine_id,
              "Produk":rows[i].product_id,
              "AR":rows[i].ar,
              "QR":rows[i].qr,
              "PR":rows[i].pr,
              "OEE":rows[i].oee
          }
          arraydetailsforexcel.push(obj);
          								
        }

        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY hh:mm');
          let namafile = 'report_'.concat(titleReport).concat(tglfile).concat('.xlsx');          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
          res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
          res.end(hasilXls, 'binary');
        }else{
          return res.error({
            message: "Data tidak ada"
          });

        }

        // return res.success({
        //   result: rows,
        //   message: "Fetch data successfully"
        // });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  exportExcelMonthly: async function(req, res) {
    const {
      query: {searchText,r_delivery_plant_id}
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let titleReport = `oee_monthly_`;
      
      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR marea LIKE '%${searchText}%' 
        OR machineid LIKE '%${searchText}%' OR machinename LIKE '%${searchText}%'
        OR line LIKE '%${searchText}%'`
      }
     
      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }
        
      let queryDataTable = `SELECT 
      periode,plant_id,line,marea,machineid,machinename,ROUND(AR,2) AS ar,ROUND(QR , 2) AS qr,ROUND(PR , 2) AS pr ,ROUND(OEE, 2) AS oee
      FROM v_summ_oees WHERE 1=1 ${WheresearchText}${WherePlants}
      order by periode DESC`;


      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
            let nomor = i +1;
            let obj = {
              "Nomor":nomor,
              "Periode":rows[i].periode,
              "Plant":rows[i].plant_id,	
              "Line":rows[i].line,
              "Area":rows[i].marea,
              "Mesin ID":rows[i].machineid,
              "Mesin":rows[i].machinename,
              "AR":rows[i].ar,
              "QR":rows[i].qr,
              "PR":rows[i].pr,
              "OEE":rows[i].oee
          }
          arraydetailsforexcel.push(obj);
          								
        }

        if(arraydetailsforexcel.length > 0){

          let tglfile = moment().format('DD-MMM-YYYY hh:mm');
          let namafile = 'report_'.concat(titleReport).concat(tglfile).concat('.xlsx');          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
          res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
          res.end(hasilXls, 'binary');
        
        }else{

          return res.error({
            message: "Data tidak ada"
          });

        }
      });
    } catch (err) {
      return res.error(err);
    }
  }

}

function pad(d) {
  var str = "" + d
  var pad = "00000"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}