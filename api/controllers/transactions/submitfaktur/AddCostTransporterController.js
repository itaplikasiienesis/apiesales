const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");
const { head } = require('lodash');
const { func } = require('joi');
const { Table } = require('mssql');
const path = require('path');
const glob = require("glob");
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const DBPROCUREMENT = require('./../../../services/DBPROCUREMENT');
const DBPORTAL = require('./../../../services/DBPORTAL');
const _ = require('lodash');
const json2xls = require('json2xls');

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
    
    find: async function (req, res) {
        const {
          query: { currentPage, pageSize, kode_status, m_transporter_id,searchText}
        } = req;
        console.log(req.query);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

            let whereKodeStatus = ``;
            if(kode_status){
                whereKodeStatus = `AND kode_status = '${kode_status}'`;
            }

            let whereSearchText = ``;
            if(searchText){
              whereSearchText = `AND nomor_id like '%${searchText}%'`;
          }

            let whereTranspoterId = ``;
            if(m_transporter_id){
                whereTranspoterId = `AND m_transporter_id = '${m_transporter_id}'`;
            }


            let queryCountTable = `SELECT COUNT(1) AS total_rows 
            FROM list_data_approval_shipment_add_cost
            WHERE 1=1 ${whereKodeStatus} ${whereTranspoterId}`;


            const totalItems = await request.query(queryCountTable);
            const count = totalItems.recordset[0].total_rows || 0;


            let queryDataTable = `
            SELECT * FROM list_data_approval_shipment_add_cost
            WHERE 1=1 ${whereKodeStatus} ${whereTranspoterId} ${whereSearchText} ORDER BY created DESC
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY`;


            console.log(queryDataTable);

            request.query(queryDataTable, async (err, result) => {
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

    findOne: async function(req, res) {
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
    
            let queryDataTable = `SELECT * FROM list_data_approval_shipment_add_cost WHERE nomor_id='${req.param(
              "id"
            )}'`;
      
            request.query(queryDataTable, async (err, result) => {
              if (err) {
                return res.error(err);
              }
      
              const row = result.recordset[0];
              return res.success({
                result: row,
                message: "Fetch data successfully"
              });
            });
          } catch (err) {
            return res.error(err);
          }
    },
   
}