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

  find: async function(req, res) {
    const {
      query: { currentPage, pageSize,searchText,r_delivery_plant_id,startdate,enddate}
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? ` AND ${req.query.filter}` : "";

      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR machine_id LIKE '%${searchText}%' OR product_id LIKE '%${searchText}%' OR notes LIKE '%${searchText}%'`
      }
     
      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }

      let WhereRange = ``;
      if(startdate && enddate){
        WhereRange = ` AND CONVERT(VARCHAR(10),rundate,120) BETWEEN '${startdate}' AND '${enddate}'`
      }

      

      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM oee_losstbl WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}`;
      
      let queryDataTable = `SELECT CONVERT(VARCHAR(10),rundate ,120) AS tgl,*
      FROM oee_losstbl WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}
      order by rundate DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit== 0 ? 10 : limit} ROWS ONLY`;

      //console.log(queryDataTable);

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
  exportExcel: async function(req, res) {
    const {
      query: {searchText,r_delivery_plant_id,startdate,enddate}
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let titleReport = `loss_data_`;

      let WheresearchText = ``;
      if(searchText){
        WheresearchText = ` AND plant_id LIKE '%${searchText}%' 
        OR machine_id LIKE '%${searchText}%' OR product_id LIKE '%${searchText}%' OR notes LIKE '%${searchText}%'`
      }
     
      let WherePlants = ``;
      if(r_delivery_plant_id){
        WherePlants = ` AND plant_id = '${r_delivery_plant_id}'`
      }

      let WhereRange = ``;
      if(startdate && enddate){
        WhereRange = ` AND CONVERT(VARCHAR(10),rundate,120) BETWEEN '${startdate}' AND '${enddate}'`
      }

          
      let queryDataTable = `SELECT CONVERT(VARCHAR(10),rundate ,120) AS tgl,rundate,loss_id ,loss_time,machine_id,plant_id,product_id,notes,notes_detail
      FROM oee_losstbl WHERE 1=1 ${WheresearchText}${WherePlants}${WhereRange}
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
              "Plant ID":rows[i].plant_id,	
              "ID Mesin":rows[i].machine_id,
              "ID Produk":rows[i].product_id,
              "Loss ID":rows[i].loss_id,
              "Length (min)":rows[i].loss_time,
              "Notes":rows[i].notes,
              "Notes Detail":rows[i].notes_detail
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