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
const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const SendEmail = require('../../services/SendEmail');
const moment = require('moment');
const { number } = require("joi");
const json2xls = require('json2xls');
const ClientSFTP = require('ssh2-sftp-client');
const path = require('path');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
var shell = require('shelljs');
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "root",
  password: "P@ssw0rd1988"
}


module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

      let getRolesUser = `SELECT mr.nama AS role FROM m_user mu
      LEFT JOIN m_role mr ON(mr.m_role_id = mu.role_default_id)
      WHERE mu.m_user_id='${m_user_id}'`;
      let datarole = await request.query(getRolesUser);
      let role = datarole.recordset[0].role;

      let getKodePajak = '';
      if(role=='ACCOUNTING'){
        getKodePajak = `SELECT mp.*,ro.nama FROM m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        ORDER BY mp.kode`;
      }else if(role=='DISTRIBUTOR'){

        getKodePajak = `SELECT mp.*,ro.nama FROM m_user mu,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = '${m_user_id}'
        AND mp.r_organisasi_id = mu.r_organisasi_id
        ORDER BY mp.kode`;

      }else{

        getKodePajak = `SELECT mp.*,ro.nama FROM m_user mu,
        m_user_organisasi muo,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = muo.m_user_id
        AND mu.m_user_id='${m_user_id}'
        AND mp.r_organisasi_id = muo.r_organisasi_id
        ORDER BY mp.kode`;

      }
      
      let orgs = await request.query(getKodePajak);
      let organization = orgs.recordset.map(function (item) {
        return item['kode'];
      });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN += ",'" + datas + "'"
      }

      valueIN = valueIN.substring(1)

      listOrg = organization.length > 0 && req.query.filter === undefined ? `AND mp.kode IN (${valueIN})` : "";

      let queryCountTable = `SELECT COUNT(DISTINCT mp.kode) AS total_rows 
      FROM tracking_planfond mp WHERE 1=1 ${whereClause} ${listOrg}`;

      let queryDataTable = `SELECT DISTINCT tp.kode,ro.nama
      FROM tracking_planfond tp
      LEFT JOIN m_pajak mp ON(mp.kode = tp.kode)
      LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = mp.r_organisasi_id)
      WHERE 1=1 ${whereClause} ${listOrg}
      ORDER BY kode
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;
      
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        
        
        for (let i = 0; i < rows.length; i++) {

          let kode = rows[i].kode;
          let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
          m_distributor md,m_pajak mp 
          WHERE ap.m_distributor_id = md.m_distributor_id 
          AND mp.m_pajak_id = md.m_pajak_id
          AND mp.kode='${kode}'`;
          let dataoverplafond = await request.query(sqlGetOverPlafond);
          rows[i].over_plafond = dataoverplafond.recordset[0].total_plafond;

          let sqlgetTrackingPlafondOpenOrders = `SELECT * FROM tracking_planfond WHERE kode='${kode}' AND credit_category='100'`;
          let dataopenprders = await request.query(sqlgetTrackingPlafondOpenOrders);
          let totalOrders = 0;
          for (let j = 0; j < dataopenprders.recordset.length; j++) {

            totalOrders = totalOrders + (dataopenprders.recordset[j].amount ? Number(dataopenprders.recordset[j].amount) : 0);
            dataopenprders.recordset[j].amount = dataopenprders.recordset[j].amount ? Number(dataopenprders.recordset[j].amount) : 0;
            dataopenprders.recordset[j].limit_amount = dataopenprders.recordset[j].limit_amount ? Number(dataopenprders.recordset[j].limit_amount) : 0;
            
          }
          rows[i].total_orders = totalOrders;
          rows[i].openorders = dataopenprders.recordset;

          let sqlgetTrackingPlafondOpenInvoices = `SELECT * FROM tracking_planfond WHERE kode='${kode}' AND credit_category='200'`;
          let dataopeninvoices = await request.query(sqlgetTrackingPlafondOpenInvoices);
          let totalInvoices = 0;
          for (let k = 0; k < dataopeninvoices.recordset.length; k++) {

            totalInvoices = totalInvoices + (dataopeninvoices.recordset[k].amount ? Number(dataopeninvoices.recordset[k].amount) : 0);
            dataopeninvoices.recordset[k].amount = dataopeninvoices.recordset[k].amount ? Number(dataopeninvoices.recordset[k].amount) : 0;
            dataopeninvoices.recordset[k].limit_amount = dataopeninvoices.recordset[k].limit_amount ? Number(dataopeninvoices.recordset[k].limit_amount) : 0;
            
          }

          rows[i].total_invoices = totalInvoices;
          rows[i].openinvoices = dataopeninvoices.recordset;
          
        }

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

    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    
  
    let kodenya = req.params.kode;
    await DB.poolConnect;
    try {
       
      const request = DB.pool.request();
      //const url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_rlimit/120/zws_sales_rlimit/zbn_sales_rlimit`; //development
      const url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_rlimit/300/zws_sales_rlimit/zbn_sales_rlimit`; //production

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;

      let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
      let datanomorsap = await request.query(sqlGetNoSap);
      let listNoSap = datanomorsap.recordset;

      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;
      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_sales_rlimit:ZFM_WS_RLIMITRequest',
      };

      let dataobject = [];
      let datas = ['X'];
      let xml = fs.readFileSync('soap/ZFM_WS_RLIMIT.xml', 'utf-8');
      let hasil = racikXML(xml, datas, 'NORELEASE');
      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;
      if(statusCode==200){
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) { 
          const data = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_RLIMITResponse']['DATA'].item;
          for (let i = 0; i < data.length; i++) {


            let kode = Number(data[i].KUNNR).toString();
            let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
            m_distributor md,m_pajak mp 
            WHERE ap.m_distributor_id = md.m_distributor_id 
            AND mp.m_pajak_id = md.m_pajak_id
            AND mp.kode='${kode}'`;
            let dataoverplafond = await request.query(sqlGetOverPlafond);
            let datatemp = {
              nomor_so : data[i].VBELN,
              kode : kode,
              nama : data[i].NAME1,
              city : data[i].ORT01,
              req_delivery_date : data[i].VDATU,
              currency : data[i].WAERK,
              nilai_so : data[i].NETWR,
              ar_oustanding : data[i].AMOUNT,
              credit_limit : data[i].LIMIT,
              sisa_saldo : data[i].EXPOSURE,
              nomor_cmo : data[i].BSTNK,
              over_plafond :  dataoverplafond.recordset[0].total_plafond
            }
            dataobject.push(datatemp);
            
          }

          let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
          let header = [];
          datafromsap.reduce(function(res, value) {
            if (!res[value.kode]) {
              res[value.kode] = { 
              kode: value.kode,
              nama: value.nama,
              city: value.city,
              currency: value.currency,
              ar_oustanding: Number(value.ar_oustanding),
              credit_limit: Number(value.credit_limit),
              sisa_saldo: Number(value.sisa_saldo),
              over_plafond: Number(value.over_plafond),
              nilai_so: 0 };
              header.push(res[value.kode])
            }
            res[value.kode].nilai_so += Number(value.nilai_so);
            return res;
          }, {});
          
          const populatedHeader = header;
          const populatedLine = datafromsap;
    
          let finalresult = []
          for (const head of populatedHeader) {
            const perHeader = {
              ...head,
              details: populatedLine.filter(perLine => perLine.kode === head.kode )
            }
            finalresult.push(perHeader)
          }


          for (let i = 0; i < finalresult.length; i++) {

            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id;

            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;
            
            for (let j = 0; j < finalresult[i].details.length; j++) {

              finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so) * 100;
              finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding) * 100;
              finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit) * 100;
              finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo) * 100;
              finalresult[i].details[j].nomor = j + 1;
              
            }
            
          }

          let finalresultfilter = finalresult.filter(e => e.kode === kodenya );
          
          const meta = paginate(currentPage, finalresultfilter.length, finalresultfilter, pageSize);

          return res.success({
            result: finalresultfilter,
            meta,
            message: "Fetch data successfully"
          });

        });
      }

    } catch (err) {
      return res.error(err);
    }
  },

  exportExcelBykode: async function(req, res) {

    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    
    let kodenya = req.params.kode;
    await DB.poolConnect;
    try {
       
      const request = DB.pool.request();
      // const url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_rlimit/120/zws_sales_rlimit/zbn_sales_rlimit`; //development
      const url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_rlimit/300/zws_sales_rlimit/zbn_sales_rlimit`; //production

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;

      let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
      let datanomorsap = await request.query(sqlGetNoSap);
      let listNoSap = datanomorsap.recordset;

      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;
      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_sales_rlimit:ZFM_WS_RLIMITRequest',
      };

      let dataobject = [];
      let datas = ['X'];
      let xml = fs.readFileSync('soap/ZFM_WS_RLIMIT.xml', 'utf-8');
      let hasil = racikXML(xml, datas, 'NORELEASE');
      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;
      if(statusCode==200){
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) { 
          const data = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_RLIMITResponse']['DATA'].item;

          for (let i = 0; i < data.length; i++) {


            let kode = Number(data[i].KUNNR).toString();
            let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
            m_distributor md,m_pajak mp 
            WHERE ap.m_distributor_id = md.m_distributor_id 
            AND mp.m_pajak_id = md.m_pajak_id
            AND mp.kode='${kode}'`;
            let dataoverplafond = await request.query(sqlGetOverPlafond);
            let datatemp = {
              nomor_so : data[i].VBELN,
              kode : kode,
              nama : data[i].NAME1,
              city : data[i].ORT01,
              req_delivery_date : data[i].VDATU,
              currency : data[i].WAERK,
              nilai_so : data[i].NETWR,
              ar_oustanding : data[i].AMOUNT,
              credit_limit : data[i].LIMIT,
              sisa_saldo : data[i].EXPOSURE,
              nomor_cmo : data[i].BSTNK,
              over_plafond :  dataoverplafond.recordset[0].total_plafond
            }
            dataobject.push(datatemp);
            
          }

          let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
          let header = [];
          datafromsap.reduce(function(res, value) {
            if (!res[value.kode]) {
              res[value.kode] = { 
              kode: value.kode,
              nama: value.nama,
              city: value.city,
              currency: value.currency,
              ar_oustanding: Number(value.ar_oustanding),
              credit_limit: Number(value.credit_limit),
              sisa_saldo: Number(value.sisa_saldo),
              over_plafond: Number(value.over_plafond),
              nilai_so: 0 };
              header.push(res[value.kode])
            }
            res[value.kode].nilai_so += Number(value.nilai_so);
            return res;
          }, {});
          
          const populatedHeader = header;
          const populatedLine = datafromsap;
    
          let finalresult = []
          for (const head of populatedHeader) {
            const perHeader = {
              ...head,
              details: populatedLine.filter(perLine => perLine.kode === head.kode )
            }
            finalresult.push(perHeader)
          }


          for (let i = 0; i < finalresult.length; i++) {

            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id;

            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) ;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) ;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) ;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) ;
            
            for (let j = 0; j < finalresult[i].details.length; j++) {

              finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so);
              finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding);
              finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit);
              finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo);
              finalresult[i].details[j].nomor = j + 1;
              
            }
            
          }

          let finalresultfilter = finalresult.filter(e => e.kode === kodenya );
          let arraydetailsforexcel = [];
          for (let i = 0; i < finalresultfilter.length; i++) {

              for (let j = 0; j < finalresultfilter[i].details.length; j++) {

                    let obj = {
                        "KODE DISTRIBUTOR": finalresultfilter[i].details[j].kode,
                        "NAMA DISTRIBUTOR": finalresultfilter[i].details[j].nama,
                        "NOMOR SO": finalresultfilter[i].details[j].nomor_so,
                        "KOTA": finalresultfilter[i].details[j].city,
                        "DELIVERY DATE": finalresultfilter[i].details[j].req_delivery_date,
                        "CUURENCY": finalresultfilter[i].details[j].currency,
                        "NILAI SO": Number(finalresultfilter[i].details[j].nilai_so),
                        "AR OUTSTANDING": Number(finalresultfilter[i].details[j].ar_oustanding),
                        "CREDIT LIMIT": Number(finalresultfilter[i].details[j].credit_limit),
                        "SISA SALDO": Number(finalresultfilter[i].details[j].sisa_saldo),
                        "NOMOR CMO": finalresultfilter[i].details[j].nomor_cmo,
                        // "OVER PLAFOND": Number(finalresultfilter[i].details[j].over_plafond),
                        "NOMOR": finalresultfilter[i].details[j].nomor
                    }

                    arraydetailsforexcel.push(obj);
              }
              
          }


          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'tracking_plafond_'.concat(tglfile).concat('.xlsx');          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats');
          res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
          res.end(hasilXls, 'binary');
          
        });
      }

    } catch (err) {
      return res.error(err);
    }
  },

  getdatafromsap: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    
    await DB.poolConnect;
    try {
             
      const request = DB.pool.request();
      // const url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_rlimit/120/zws_sales_rlimit/zbn_sales_rlimit`; //development
      const url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_rlimit/300/zws_sales_rlimit/zbn_sales_rlimit`; //production
      
      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;


      let sqlGetMuser = `SELECT * FROM m_user_role_v mu
      WHERE mu.m_user_id='${m_user_id}'`;
      let getdatauser = await request.query(sqlGetMuser);
      let rolename = getdatauser.recordset[0].nama;
      let kodenya = getdatauser.recordset[0].username;
      let r_distribution_channel_id = getdatauser.recordset[0].r_distribution_channel_id;

      let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
      let datanomorsap = await request.query(sqlGetNoSap);
      let listNoSap = datanomorsap.recordset;


      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;
      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_sales_rlimit:ZFM_WS_RLIMITRequest',
      };

      let dataobject = [];
      let datas = ['X'];
      let xml = fs.readFileSync('soap/ZFM_WS_RLIMIT.xml', 'utf-8');
      let hasil = racikXML(xml, datas, 'NORELEASE');
      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;
      if(statusCode==200){
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) { 
          const data = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_RLIMITResponse']['DATA'].item;
          for (let i = 0; i < data.length; i++) {


            let kode = Number(data[i].KUNNR).toString();
            

            let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
            m_distributor md,m_pajak mp 
            WHERE ap.m_distributor_id = md.m_distributor_id 
            AND mp.m_pajak_id = md.m_pajak_id
            AND mp.kode='${kode}'`;

            
            let dataoverplafond = await request.query(sqlGetOverPlafond);
            let datatemp = {
              nomor_so : data[i].VBELN,
              kode : kode,
              nama : data[i].NAME1,
              city : data[i].ORT01,
              req_delivery_date : data[i].VDATU,
              currency : data[i].WAERK,
              nilai_so : data[i].NETWR,
              ar_oustanding : data[i].AMOUNT,
              credit_limit : data[i].LIMIT,
              sisa_saldo : data[i].EXPOSURE,
              nomor_cmo : data[i].BSTNK,
              over_plafond :  dataoverplafond.recordset[0].total_plafond
            }
            dataobject.push(datatemp);
            
          }

          let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
          let header = [];
          datafromsap.reduce(function(res, value) {
            if (!res[value.kode]) {
              res[value.kode] = { 
              kode: value.kode,
              nama: value.nama,
              city: value.city,
              currency: value.currency,
              ar_oustanding: Number(value.ar_oustanding),
              credit_limit: Number(value.credit_limit),
              sisa_saldo: Number(value.sisa_saldo),
              over_plafond: Number(value.over_plafond),
              nilai_so: 0 };
              header.push(res[value.kode])
            }
            res[value.kode].nilai_so += Number(value.nilai_so);
            return res;
          }, {});
          
          const populatedHeader = header;
          const populatedLine = datafromsap;
    
          let finalresult = []
          for (const head of populatedHeader) {
            const perHeader = {
              ...head,
              details: populatedLine.filter(perLine => perLine.kode === head.kode )
            }
            finalresult.push(perHeader)
          }


          for (let i = 0; i < finalresult.length; i++) {

            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id ? pajak.r_distribution_channel_id : "B1C029DC-8A20-45E3-AA13-8999A0E8452A";
            
            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;
            
            for (let j = 0; j < finalresult[i].details.length; j++) {

              finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so) * 100;
              finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding) * 100;
              finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit) * 100;
              finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo) * 100;
              finalresult[i].details[j].nomor = j + 1;
              
            }
            
          }

         
          
          if(rolename=='DISTRIBUTOR'){

            finalresult = finalresult.filter(e => e.kode === kodenya );
          
          }

          if(r_distribution_channel_id){

            if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){

               finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id || e.r_distribution_channel_id === 'AD89DBFA-200C-4C2C-9D56-F507771BED9E' || e.r_distribution_channel_id === 'CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800');
               
            }else{
    
               finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id );
            }

          }

          
          const meta = paginate(currentPage, finalresult.length, finalresult, pageSize);

          return res.success({
            result: finalresult,
            meta,
            message: "Fetch data successfully"
          });

        });
      }

    } catch (err) {
      return res.error(err);
    }
  },



  getdatafromsap2: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    

    await DB.poolConnect;
    try {
             
      const request = DB.pool.request();
      let sftp = new ClientSFTP();

      let sqlGetMuser = `SELECT * FROM m_user_role_v mu
      WHERE mu.m_user_id='${m_user_id}'`;
      let getdatauser = await request.query(sqlGetMuser);
      let rolename = getdatauser.recordset[0].nama;
      let kodenya = getdatauser.recordset[0].username;
      let r_distribution_channel_id = getdatauser.recordset[0].r_distribution_channel_id;

      let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
      let datanomorsap = await request.query(sqlGetNoSap);
      let listNoSap = datanomorsap.recordset;
      let remotePath = `/home/sapftp/esales/plafon/plafon.xml`;
      let locationFiles = dokumentPath('plafon','return').replace(/\\/g, '/');
      let dst = dokumentPath('plafon','return') + '/' +`plafon.xml`;
      let localPath = dst.replace(/\\/g, '/');
      shell.mkdir('-p', locationFiles);

      await sftp.connect(ftpconfig)
      .then(() => {
        return sftp.fastGet(remotePath,localPath);
      })
      .then(() => {
        sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });


      let filenames = fs.existsSync(localPath);

      if(filenames){

        let body = fs.readFileSync(localPath,{encoding:'utf8', flag:'r'});
        let dataobject = [];
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) {
        const data = result['asx:abap']['asx:values'].DATA.ZVS_SALES_01;

        for (let i = 0; i < data.length; i++) {


          let kode = Number(data[i].KUNNR).toString();
          

          let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
          m_distributor md,m_pajak mp 
          WHERE ap.m_distributor_id = md.m_distributor_id 
          AND mp.m_pajak_id = md.m_pajak_id
          AND mp.kode='${kode}'`;
          
          let dataoverplafond = await request.query(sqlGetOverPlafond);
          let datatemp = {
            nomor_so : data[i].VBELN,
            kode : kode,
            nama : data[i].NAME1,
            city : data[i].ORT01,
            req_delivery_date : data[i].VDATU,
            currency : data[i].WAERK,
            nilai_so : data[i].NETWR,
            ar_oustanding : data[i].AMOUNT,
            credit_limit : data[i].LIMIT,
            sisa_saldo : data[i].EXPOSURE,
            nomor_cmo : data[i].BSTNK,
            over_plafond :  dataoverplafond.recordset[0].total_plafond
          }
          dataobject.push(datatemp);
          
        }

        let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
        let header = [];
        datafromsap.reduce(function(res, value) {
          if (!res[value.kode]) {
            res[value.kode] = { 
            kode: value.kode,
            nama: value.nama,
            city: value.city,
            currency: value.currency,
            ar_oustanding: Number(value.ar_oustanding),
            credit_limit: Number(value.credit_limit),
            sisa_saldo: Number(value.sisa_saldo),
            over_plafond: Number(value.over_plafond),
            nilai_so: 0 };
            header.push(res[value.kode])
          }
          res[value.kode].nilai_so += Number(value.nilai_so);
          return res;
        }, {});
        
        const populatedHeader = header;
        const populatedLine = datafromsap;
  
        let finalresult = []
        for (const head of populatedHeader) {
          const perHeader = {
            ...head,
            details: populatedLine.filter(perLine => perLine.kode === head.kode )
          }
          finalresult.push(perHeader)
        }


        for (let i = 0; i < finalresult.length; i++) {

          let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
          let datapajak = await request.query(sqlgetpajak);
          let pajak = datapajak.recordset[0];
          finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id ? pajak.r_distribution_channel_id : "B1C029DC-8A20-45E3-AA13-8999A0E8452A";
          
          finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
          finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
          finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
          finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;
          
          for (let j = 0; j < finalresult[i].details.length; j++) {

            finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so) * 100;
            finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding) * 100;
            finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit) * 100;
            finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo) * 100;
            finalresult[i].details[j].nomor = j + 1;
            
          }
          
        }

       
        
        if(rolename=='DISTRIBUTOR'){

          finalresult = finalresult.filter(e => e.kode === kodenya );
        
        }

        if(r_distribution_channel_id){

          if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){

             finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id || e.r_distribution_channel_id === 'AD89DBFA-200C-4C2C-9D56-F507771BED9E' || e.r_distribution_channel_id === 'CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800');
             
          }else{
  
             finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id );
          }

        }

        
          const meta = paginate(currentPage, finalresult.length, finalresult, pageSize);

          return res.success({
            result: finalresult,
            meta,
            message: "Fetch data successfully"
          });

        });

      }
      

    } catch (err) {
      return res.error(err);
    }
  },
  getdata: async function(req, res) {
    const {
      query: { m_user_id }
    } = req;
    
    await DB.poolConnect;
    try {
             
      const request = DB.pool.request();
      let sftp = new ClientSFTP();

      let sqlGetMuser = `SELECT * FROM m_user_role_v mu
      WHERE mu.m_user_id='${m_user_id}'`;
      let getdatauser = await request.query(sqlGetMuser);
      let rolename = getdatauser.recordset.length > 0 ? getdatauser.recordset[0].nama : null;
      let kodenya = getdatauser.recordset.length > 0 ? getdatauser.recordset[0].username : null;
      let r_distribution_channel_id = getdatauser.recordset.length > 0 ? getdatauser.recordset[0].r_distribution_channel_id : null;

      if(rolename && kodenya){

        let remotePath = `/home/sapftp/esales/plafon/plafon.xml`;
        let locationFiles = dokumentPath('plafon','return').replace(/\\/g, '/');
        let dst = dokumentPath('plafon','return') + '/' +`plafon.xml`;
        let localPath = dst.replace(/\\/g, '/');
        shell.mkdir('-p', locationFiles);
  
        await sftp.connect(ftpconfig)
        .then(() => {
          return sftp.fastGet(remotePath,localPath);
        })
        .then(() => {
          sftp.end();
        })
        .catch(err => {
          console.error(err.message);
        });
  
  
        let filenames = fs.existsSync(localPath);
  
        if(filenames){
  
          let body = fs.readFileSync(localPath,{encoding:'utf8', flag:'r'});
          let dataobject = [];
          var parser = new xml2js.Parser({explicitArray : false});
          parser.parseString(body, async function (err, result) {
          const data = result['asx:abap']['asx:values'].DATA.ZVS_SALES_01;
  
          for (let i = 0; i < data.length; i++) {
  
  
            let kode = Number(data[i].KUNNR).toString();
            
  
            let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
            m_distributor md,m_pajak mp 
            WHERE ap.m_distributor_id = md.m_distributor_id 
            AND mp.m_pajak_id = md.m_pajak_id
            AND mp.kode='${kode}'`;
            
            let dataoverplafond = await request.query(sqlGetOverPlafond);
            let datatemp = {
              nomor_so : data[i].VBELN,
              kode : kode,
              nama : data[i].NAME1,
              city : data[i].ORT01,
              req_delivery_date : data[i].VDATU,
              currency : data[i].WAERK,
              nilai_so : data[i].NETWR,
              ar_oustanding : data[i].AMOUNT,
              credit_limit : data[i].LIMIT,
              sisa_saldo : data[i].EXPOSURE,
              nomor_cmo : data[i].BSTNK,
              over_plafond :  dataoverplafond.recordset[0].total_plafond
            }
            dataobject.push(datatemp);
            
          }
  
          let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
          let header = [];
          datafromsap.reduce(function(res, value) {
            if (!res[value.kode]) {
              res[value.kode] = { 
              kode: value.kode,
              nama: value.nama,
              city: value.city,
              currency: value.currency,
              ar_oustanding: Number(value.ar_oustanding),
              credit_limit: Number(value.credit_limit),
              sisa_saldo: Number(value.sisa_saldo),
              over_plafond: Number(value.over_plafond),
              nilai_so: 0 };
              header.push(res[value.kode])
            }
            res[value.kode].nilai_so += Number(value.nilai_so);
            return res;
          }, {});
          
          const populatedHeader = header;
          const populatedLine = datafromsap;
    
          let finalresult = []
          for (const head of populatedHeader) {
            const perHeader = {
              ...head,
              details: populatedLine.filter(perLine => perLine.kode === head.kode )
            }
            finalresult.push(perHeader)
          }
  
  
          for (let i = 0; i < finalresult.length; i++) {
  
            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id ? pajak.r_distribution_channel_id : "B1C029DC-8A20-45E3-AA13-8999A0E8452A";
            
            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;
            
            for (let j = 0; j < finalresult[i].details.length; j++) {
  
              finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so) * 100;
              finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding) * 100;
              finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit) * 100;
              finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo) * 100;
              finalresult[i].details[j].nomor = j + 1;
              
            }
            
          }
  
         
          
          if(rolename=='DISTRIBUTOR'){
  
            finalresult = finalresult.filter(e => e.kode === kodenya );
          
          }
  
          if(r_distribution_channel_id){
  
            if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
  
               finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id || e.r_distribution_channel_id === 'AD89DBFA-200C-4C2C-9D56-F507771BED9E' || e.r_distribution_channel_id === 'CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800');
               
            }else{
    
               finalresult = finalresult.filter(e => e.r_distribution_channel_id === r_distribution_channel_id );
            }
  
          }
  
  
          let hasil = finalresult.length > 0 ? finalresult[0].credit_limit : 0;
          
            return res.success({
              result: hasil,
              message: "Fetch data successfully"
            });
  
          });
  
        }
        
      }else{

        let hasil = 0;
        return res.success({
          result: hasil,
          message: "Fetch data successfully"
        });

      }


    } catch (err) {
      return res.error(err);
    }
  },
  exportExcel: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_user_id }
    } = req;
    
    await DB.poolConnect;
    try {
    
      const request = DB.pool.request();
      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
  
      let url = ``;
      if(statusIntegasi=='DEV'){
        
        url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_rlimit/120/zws_sales_rlimit/zbn_sales_rlimit`; //development
  
      }else{
        
        url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_rlimit/300/zws_sales_rlimit/zbn_sales_rlimit`; //production
  
      }

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;

      let sqlGetMuser = `SELECT * FROM m_user_role_v mu
      WHERE mu.m_user_id='${m_user_id}'`;
      let getdatauser = await request.query(sqlGetMuser);
      let rolename = getdatauser.recordset[0].nama;
      let kodenya = getdatauser.recordset[0].username;

      

      let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
      let datanomorsap = await request.query(sqlGetNoSap);
      let listNoSap = datanomorsap.recordset;

      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;
      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_sales_rlimit:ZFM_WS_RLIMITRequest',
      };

      let dataobject = [];
      let datas = ['X'];
      let xml = fs.readFileSync('soap/ZFM_WS_RLIMIT.xml', 'utf-8');
      let hasil = racikXML(xml, datas, 'NORELEASE');
      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;
      if(statusCode==200){
        var parser = new xml2js.Parser({explicitArray : false});
        parser.parseString(body, async function (err, result) { 
          const data = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_RLIMITResponse']['DATA'].item;

          for (let i = 0; i < data.length; i++) {


            let kode = Number(data[i].KUNNR).toString();
            let sqlGetOverPlafond = `SELECT COUNT(1) AS total_plafond FROM audit_plafond ap,
            m_distributor md,m_pajak mp 
            WHERE ap.m_distributor_id = md.m_distributor_id 
            AND mp.m_pajak_id = md.m_pajak_id
            AND mp.kode='${kode}'`;
            let dataoverplafond = await request.query(sqlGetOverPlafond);
            let datatemp = {
              nomor_so : data[i].VBELN,
              kode : kode,
              nama : data[i].NAME1,
              city : data[i].ORT01,
              req_delivery_date : data[i].VDATU,
              currency : data[i].WAERK,
              nilai_so : data[i].NETWR,
              ar_oustanding : data[i].AMOUNT,
              credit_limit : data[i].LIMIT,
              sisa_saldo : data[i].EXPOSURE,
              nomor_cmo : data[i].BSTNK,
              over_plafond :  dataoverplafond.recordset[0].total_plafond
            }
            dataobject.push(datatemp);
            
          }

          let datafromsap = dataobject; //dataobject.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
          let header = [];
          datafromsap.reduce(function(res, value) {
            if (!res[value.kode]) {
              res[value.kode] = { 
              kode: value.kode,
              nama: value.nama,
              city: value.city,
              currency: value.currency,
              ar_oustanding: Number(value.ar_oustanding),
              credit_limit: Number(value.credit_limit),
              sisa_saldo: Number(value.sisa_saldo),
              over_plafond: Number(value.over_plafond),
              nilai_so: 0 };
              header.push(res[value.kode])
            }
            res[value.kode].nilai_so += Number(value.nilai_so);
            return res;
          }, {});
          
          const populatedHeader = header;
          const populatedLine = datafromsap;
    
          let finalresult = []
          for (const head of populatedHeader) {
            const perHeader = {
              ...head,
              details: populatedLine.filter(perLine => perLine.kode === head.kode )
            }
            finalresult.push(perHeader)
          }


          for (let i = 0; i < finalresult.length; i++) {

            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id;

            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;
            
            for (let j = 0; j < finalresult[i].details.length; j++) {

              finalresult[i].details[j].nilai_so = Number(finalresult[i].details[j].nilai_so) * 100;
              finalresult[i].details[j].ar_oustanding = Number(finalresult[i].details[j].ar_oustanding) * 100;
              finalresult[i].details[j].credit_limit = Number(finalresult[i].details[j].credit_limit) * 100;
              finalresult[i].details[j].sisa_saldo = Number(finalresult[i].details[j].sisa_saldo) * 100;
              finalresult[i].details[j].nomor = j + 1;
              
            }
            
          }

          if(rolename=='DISTRIBUTOR'){

            finalresult = finalresult.filter(e => e.kode === kodenya );
          
          }

          let arraydetailsforexcel = [];
          for (let i = 0; i < finalresult.length; i++) {

            let sqlgetpajak = `SELECT * FROM m_pajak_v WHERE kode ='${finalresult[i].kode}'`;
            let datapajak = await request.query(sqlgetpajak);
            let pajak = datapajak.recordset[0];
            finalresult[i].r_distribution_channel_id = pajak.r_distribution_channel_id;

            finalresult[i].nilai_so = Number(finalresult[i].nilai_so) * 100;
            finalresult[i].ar_oustanding = Number(finalresult[i].ar_oustanding) * 100;
            finalresult[i].credit_limit = Number(finalresult[i].credit_limit) * 100;
            finalresult[i].sisa_saldo = Number(finalresult[i].sisa_saldo) * 100;

              for (let j = 0; j < finalresult[i].details.length; j++) {

                    let obj = {
                        "KODE DISTRIBUTOR": finalresult[i].details[j].kode,
                        "NAMA DISTRIBUTOR": finalresult[i].details[j].nama,
                        "NOMOR SO": finalresult[i].details[j].nomor_so,
                        "KOTA": finalresult[i].details[j].city,
                        "DELIVERY DATE": finalresult[i].details[j].req_delivery_date,
                        "CUURENCY": finalresult[i].details[j].currency,
                        "NILAI SO": Number(finalresult[i].details[j].nilai_so),
                        "AR OUTSTANDING": Number(finalresult[i].details[j].ar_oustanding),
                        "CREDIT LIMIT": Number(finalresult[i].details[j].credit_limit),
                        "SISA SALDO": Number(finalresult[i].details[j].sisa_saldo),
                        "NOMOR CMO": finalresult[i].details[j].nomor_cmo,
                        // "OVER PLAFOND": Number(finalresult[i].details[j].over_plafond),
                        "NOMOR": finalresult[i].details[j].nomor
                    }

                    arraydetailsforexcel.push(obj);
              }
              
          }

          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'tracking_plafond_'.concat(tglfile).concat('.xlsx');          
          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats');
          res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
          res.end(hasilXls, 'binary');


        });
      }

    } catch (err) {
      return res.error(err);
    }
  },

  findDropdown: async function(req, res) {

    const {
      query: {m_user_id }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let getRolesUser = `SELECT mr.nama AS role FROM m_user mu
      LEFT JOIN m_role mr ON(mr.m_role_id = mu.role_default_id)
      WHERE mu.m_user_id='${m_user_id}'`;
      let datarole = await request.query(getRolesUser);
      let role = datarole.recordset[0].role;

      let queryDataTable = '';
      if(role=='ACCOUNTING'){
        queryDataTable = `SELECT mp.*,ro.nama FROM m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        ORDER BY mp.kode`;
      }else if(role=='DISTRIBUTOR'){

        queryDataTable = `SELECT mp.*,ro.nama FROM m_user mu,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = '${m_user_id}'
        AND mp.r_organisasi_id = mu.r_organisasi_id
        ORDER BY mp.kode`;

      }else{

        queryDataTable = `SELECT mp.*,ro.nama FROM m_user mu,
        m_user_organisasi muo,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = muo.m_user_id
        AND mu.m_user_id='${m_user_id}'
        AND mp.r_organisasi_id = muo.r_organisasi_id
        ORDER BY mp.kode`;

      }

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};

function racikXML(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  return xmlTemplate.replace('?', result)
}

function groupBy( array , f )
{
  var groups = {};
  array.forEach( function( o )
  {
    var group = JSON.stringify( f(o) );
    groups[group] = groups[group] || [];
    groups[group].push( o );  
  });
  return Object.keys(groups).map( function( group )
  {
    return groups[group]; 
  })
}