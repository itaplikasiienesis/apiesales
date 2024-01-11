


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
const _ = require('lodash');

module.exports = {
  // GET ALL RESOURCE

  findPeriod: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
     
      let queryDataTable = `select 
      LEFT(CONVERT(varchar, rundate,112),6)
      as value, LEFT(CONVERT(varchar, rundate,112),6) as periode 
      from oee_rawdatatbl group by LEFT(CONVERT(varchar, rundate,112),6) order by LEFT(CONVERT(varchar, rundate,112),6) ASC`;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset;

        for (let i = 0; i < rows.length; i++) {
            let periode = moment(rows[i].periode,'YYYYMM').format('MMM-YY');
            rows[i].periode = periode;
        }
    
        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  findPlant: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
    
      
      let queryDataTable = `select val_id, val_char from mst_settings where val_tag='PLANT' ORDER BY val_id`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset;

        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  
}

