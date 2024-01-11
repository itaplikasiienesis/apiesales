/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const Base64 = require('base-64');
 const soapRequest = require('easy-soap-request');
 const fs = require('fs');
 const xml2js = require('xml2js');
 const uuid = require("uuid/v4");
 const path = require('path');
 const moment = require('moment');
 const glob = require('glob');
 const json2xls = require('json2xls');
 const axios = require("axios");
 const numeral = require('numeral');
 const puppeteer = require('puppeteer')
 const handlebars = require("handlebars");
 const { words } = require("lodash");
 const { format } = require("path");
 const _ = require('lodash');
 const DBPROP = require("../../../services/DBPROPOSAL");
 const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'eprop');
 
 module.exports = {

    kirim: async function(req, res) {
        await DB.poolConnect;
        try {
          const request = await DBPROP.promise();
          const requestprod = DB.pool.request();
          const{bulan,tahun} = req.body;

          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await requestprod.query(sqlgetstatusIntegasi);
          let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
    
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
   
          let url = ``;
          if (statusIntegasi == 'DEV') {
   
            usernamesoap = sails.config.globals.usernamesoap;
            passwordsoap = sails.config.globals.passwordsoap;
    
            //url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_data_eprop/120/zws_data_eprop/zbn_data_eprop'; // development
            url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_data_eprop/300/zws_data_eprop/zbn_data_eprop'; // production aja biar enak ngetes
    
          } else {
    
            url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_data_eprop/300/zws_data_eprop/zbn_data_eprop'; // production
    
            //url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_data_eprop/120/zws_data_eprop/zbn_data_eprop'; // development

          }

          let queryDataTable = `SELECT pb.proposal_budget_id,
          p.proposal_id,p.budget_year,
          CASE WHEN p.company_code='HI' THEN 1100 WHEN p.company_code='SEI' THEN 1200 
          WHEN p.company_code='MI' THEN 1200 ELSE 1200 END AS company_code,
          (SELECT DATE_FORMAT(hsp.date_approval,'%Y-%m-%d') FROM history_appr hsp WHERE p.proposal_id = hsp.proposal_id ORDER BY hsp.date_approval DESC LIMIT 1) AS last_approve,
          p.division_code,pb.branch_code,pb.activity_id,
          (SELECT division_sap FROM m_division dvs WHERE dvs.division_code = p.division_code AND dvs.company_desc = p.company_code LIMIT 1 ) AS division_sap,
          (SELECT mb.brand_sap FROM m_brand mb WHERE mb.brand_code = pb.brand_code LIMIT 1 ) AS brand_sap,
          DATE_FORMAT(p.created_date,'%Y-%m-%d') as created_date,
          DATE_FORMAT(p.created_date,'%T') as time_created,
          left(p.created_by,10) as created_by,
          p.doc_no,p.title,
          pb.budget
          FROM proposal p,proposal_budget pb 
          WHERE p.budget_year = ${tahun} AND pb.flag_kirim = 0
          AND pb.proposal_id = p.proposal_id
          AND status_id = '30'`;

          if(bulan){
            queryDataTable = `SELECT bulan,pb.proposal_budget_id,
            p.proposal_id,p.budget_year,
            CASE WHEN p.company_code='HI' THEN 1100 WHEN p.company_code='SEI' THEN 1200 
            WHEN p.company_code='MI' THEN 1200 ELSE 1200 END AS company_code,
            (SELECT DATE_FORMAT(hsp.date_approval,'%Y-%m-%d') FROM history_appr hsp WHERE p.proposal_id = hsp.proposal_id ORDER BY hsp.date_approval DESC LIMIT 1) AS last_approve,
            p.division_code,pb.branch_code,pb.activity_id,
            (SELECT division_sap FROM m_division dvs WHERE dvs.division_code = p.division_code AND dvs.company_desc = p.company_code LIMIT 1 ) AS division_sap,
            (SELECT mb.brand_sap FROM m_brand mb WHERE mb.brand_code = pb.brand_code LIMIT 1 ) AS brand_sap,
            DATE_FORMAT(p.created_date,'%Y-%m-%d') as created_date,
            DATE_FORMAT(p.created_date,'%T') as time_created,
            left(p.created_by,10) as created_by,
            p.doc_no,p.title,
            pb.budget
            FROM proposal p,proposal_budget pb 
            WHERE p.budget_year = ${tahun} AND pb.flag_kirim = 0
            AND pb.proposal_id = p.proposal_id
            AND pb.bulan = ${bulan}
            AND status_id = '30'`;
          }else{

            queryDataTable = `SELECT bulan,pb.proposal_budget_id,
            p.proposal_id,p.budget_year,
            CASE WHEN p.company_code='HI' THEN 1100 WHEN p.company_code='SEI' THEN 1200 
            WHEN p.company_code='MI' THEN 1200 ELSE 1200 END AS company_code,
            (SELECT DATE_FORMAT(hsp.date_approval,'%Y-%m-%d') FROM history_appr hsp WHERE p.proposal_id = hsp.proposal_id ORDER BY hsp.date_approval DESC LIMIT 1) AS last_approve,
            p.division_code,pb.branch_code,pb.activity_id,
            (SELECT division_sap FROM m_division dvs WHERE dvs.division_code = p.division_code AND dvs.company_desc = p.company_code LIMIT 1 ) AS division_sap,
            (SELECT mb.brand_sap FROM m_brand mb WHERE mb.brand_code = pb.brand_code LIMIT 1 ) AS brand_sap,
            DATE_FORMAT(p.created_date,'%Y-%m-%d') as created_date,
            DATE_FORMAT(p.created_date,'%T') as time_created,
            left(p.created_by,10) as created_by,
            p.doc_no,p.title,
            pb.budget
            FROM proposal p,proposal_budget pb 
            WHERE p.budget_year = ${tahun} AND pb.flag_kirim = 0
            AND pb.proposal_id = p.proposal_id
            AND status_id = '30'`;

          }



      
          //console.log(queryDataTable);                
          let [rows] = await request.query(queryDataTable);

          //console.log(rows[0].proposal_id);
          let datas = []
          for(let i = 0;i< rows.length ; i++){


            var startDate = moment([tahun, rows[i].bulan - 1]);
            var endDate = moment(startDate).endOf('month');
                
              datas.push({
                  Mandt : '',
                  Bukrs : rows[i].company_code,
                  GlAcc : rows[i].activity_id,
                  Brand : rows[i].brand_sap,
                  EPropNumber : rows[i].doc_no,
                  Posnr : i + 1,
                  Text : rows[i].title,
                  DivE : '',
                  BranchE : rows[i].branch_code,
                  CostCenter : rows[i].division_sap,
                  StartPer : startDate.format('YYYY-MM-DD'),
                  EndPer : endDate.format('YYYY-MM-DD'),
                  AppDate : rows[i].last_approve,
                  Curr : 'IDR',
                  Amount : rows[i].budget,
                  Erdat : rows[i].created_date,
                  Ernam : rows[i].created_by,
                  Erzet : rows[i].time_created,
                  Flag : ''
                });
                
            }

            if(datas.length > 0){
              const tok = `${usernamesoap}:${passwordsoap}`;
              const hash = Base64.encode(tok);
              const Basic = 'Basic ' + hash;
       
              let sampleHeaders = {
                  'Authorization':Basic,
                  'user-agent': 'esalesSystem',
                  'Content-Type': 'text/xml;charset=UTF-8',
                  'soapAction': 'urn:sap-com:document:sap:soap:functions:mc-style:zws_data_eprop:ZfmWsEpropRequest',
                };
  
  
            let xml = fs.readFileSync('soap/ZBN_DATA_EPROP.xml', 'utf-8'); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
            let hasil = racikXML2(xml, datas, 'Itab');
            let { response } = await soapRequest({ url:url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
            let {statusCode } = response;
  
            console.log(statusCode);
  
            if(statusCode==200){
              for(let i = 0;i< rows.length ; i++){
  
                  let proposal_budget_id = rows[i].proposal_budget_id;
                  let sqlUpdateFlagKirim = `UPDATE proposal_budget SET flag_kirim=1 WHERE proposal_budget_id = ${proposal_budget_id}`;
                  await request.query(sqlUpdateFlagKirim);
  
                  let lines = i + 1;
  
                  let judul = rows[i].title.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);
  
                  let insertHistory = `INSERT INTO history_insert_sap
                  (Bukrs, AppDate, EPropNumber, Posnr, BranchE, CostCenter, StartPer, EndPer, GlAcc, Brand, Curr, Amount, 
                  Erdat, Ernam, Erzet, created_date,proposal_budget_id)
                  VALUES('${rows[i].company_code}', '${rows[i].last_approve}', '${rows[i].doc_no}', ${lines}, 
                  '${rows[i].branch_code}', '${rows[i].division_sap}', 
                  '${startDate.format('YYYY-MM-DD')}', '${endDate.format('YYYY-MM-DD')}', '${rows[i].activity_id}', '${rows[i].brand_sap}', 
                  'IDR', ${rows[i].budget}, '${rows[i].created_date}', '${rows[i].created_by}', 
                  '${rows[i].time_created}', now(),${proposal_budget_id})`;
  
                  console.log(insertHistory);
                  await request.query(insertHistory);
  
  
              }
            }
   
              return res.success({
                result: rows,
                message: "Kirim Proposal successfully"
              });
            }else{
              return res.success({
                message: "Data tidak ada"
              });
            }


        } catch (err) {
          return res.error(err);
        }
      }
 
 
 }
 

 function racikXML2(xmlTemplate, jsonArray, rootHead) {
    var builder = new xml2js.Builder({headless: true, rootName: rootHead })
    const addTemplate = jsonArray.map(data => {
      return {item: data}
    })
    const result = builder.buildObject(addTemplate)
    return xmlTemplate.replace('#', result)
  }
 

 function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}