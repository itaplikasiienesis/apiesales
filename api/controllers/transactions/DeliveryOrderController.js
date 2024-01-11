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
 //const axios = require("axios");
 const mssql = require('mssql');
 const moment = require('moment');
 const otpGenerator = require('otp-generator');
 const xml2js = require('xml2js');
 const Base64 = require('base-64');
 const fs = require('fs');
 const soapRequest = require('easy-soap-request');
 const path = require('path');
 const json2xls = require('json2xls');
 const glob = require("glob");
 const numeral = require('numeral');
 const _ = require('lodash');
 const SendEmail = require('../../services/SendEmail');
 const { request } = require("http");
 const { update } = require("lodash");
 const { log } = require("console");
 var shell = require('shelljs');
 const DBPORTAL = require('./../../services/DBPORTAL.js');
 
 
const ClientSFTP = require('ssh2-sftp-client');
const abs = require("locutus/c/math/abs");
const { resolveSoa } = require("dns");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
 
 
 module.exports = {
   // GET ALL RESOURCE
 
   find_misspart: async function (req, res) {
     const {
       query: { currentPage, pageSize, m_user_id, bundle_id, searchText, planner, transporter, startdate, enddate, kode_status, m_distributor_id }
     } = req;
     console.log(req.query, ` misspart`);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
 
       let queryUser = `select * from m_user_role_v where m_user_id = '${m_user_id}'`
 
       //console.log(queryUser);
       let ds = await request.query(queryUser)
       ds = ds.recordset;
       const rolename = ds[0].nama;
 
       //console.log(rolename);
       let where = ` `
       if (startdate && enddate) {
         where = where + ` and convert(varchar(10),a.createddate,120) between ${startdate} and ${enddate}`
       }
 
       if (rolename == `TRANSPORTER`) {
         where = where + `and m_transporter_id = '${m_user_id}'`
       }
 
 
       let query = `select b.bundle_id,nomor_ba,nomor_do,
       convert(varchar(10),a.createddate,120) as period ,
       b.pengirim,penerima,a.status 
       ,m_transporter_id,b.planner_id,m_distributor_id,a.kode_status
       from delivery_order_misspart a
       inner join delivery_order_v b on a.delivery_order_id = b.delivery_order_id
       where a.isactive = 'Y' ${where} ORDER BY a.createddate desc
       OFFSET ${offset} ROWS
       FETCH NEXT ${limit} ROWS ONLY`
 
       console.log(query);
       let dtQuery = await request.query(query)
       let rows = dtQuery.recordset
 
       return res.success({
         result: rows,
         message: "Fetch data successfully"
       });
 
     } catch (error) {
       console.log(error);
       return res.error(error)
     }
   },

   findTrackingDo: async function (req, res) {

    const {
      query: { sdate, ndate }
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let filterBetween = ``;
      if(sdate && ndate){
        filterBetween = `AND CONVERT(varchar(10),created,120) BETWEEN '${sdate}' AND '${ndate}'`;
      }

      let queryDataTable = `SELECT delivery_order_detail_id, nomor_do, kode_tranporter, nama_tranporter, kode_shipto, shipto, 
      jenis_kendaraan, nama_kendaraan, plat_nomor_kendaraan, nama_driver, nomor_sim, nomor_ktp, bundle_id, kode_sap, nama_produk, 
      qty, console_number, sampai_gudang_enesis, picking_barang, proses_pengantaran, driver_telah_sampai_lokasi, tanggal_pod_distributor, 
      finish, tanggal_pod_logistik, tanggal_pod_transporter, tanggal_gi, route, type_inner_outer, 
      CASE WHEN jenis_kendaraan='ZF' THEN total_kubikasi * biaya_kirim ELSE biaya_kirim END AS biaya_kirim, jumlah_rate, 
      rate_multidrop, total_biaya_kirim, delivery_order_id, ring, region, total_kubikasi, total_tonase, kapasitas_kubikasi, 
      kapasitas_tonase, vso_kubikasi, vso_tonase, vso_final,CONVERT(varchar(10),created,120) tanggal_created
      FROM delivery_order_tracking_v do
      WHERE 1=1
      ${filterBetween} ORDER BY do.created DESC`;

      console.log(queryDataTable);
    
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset

        return res.send(rows);

      });


    } catch (error) {
      console.log(error);
      return res.error(error)
    }
  },

  findTrackingDoDraft: async function (req, res) {

    const {
      query: { sdate, ndate }
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let filterBetween = ``;
      if(sdate && ndate){
        filterBetween = `AND CONVERT(varchar(10),created,120) BETWEEN '${sdate}' AND '${ndate}'`;
      }

      let queryDataTable = `SELECT delivery_order_detail_id, nomor_do, kode_tranporter, nama_tranporter, kode_shipto, shipto, 
      jenis_kendaraan, nama_kendaraan, plat_nomor_kendaraan, nama_driver, nomor_sim, nomor_ktp, bundle_id, kode_sap, nama_produk, 
      qty, console_number, sampai_gudang_enesis, picking_barang, proses_pengantaran, driver_telah_sampai_lokasi, tanggal_pod_distributor, 
      finish, tanggal_pod_logistik, tanggal_pod_transporter, tanggal_gi, route, type_inner_outer, 
      CASE WHEN jenis_kendaraan='ZF' THEN total_kubikasi * biaya_kirim ELSE biaya_kirim END AS biaya_kirim, jumlah_rate, 
      rate_multidrop, total_biaya_kirim, delivery_order_id, ring, region, total_kubikasi, total_tonase, kapasitas_kubikasi, 
      kapasitas_tonase, vso_kubikasi, vso_tonase, vso_final,CONVERT(varchar(10),created,120) tanggal_created
      FROM delivery_order_tracking_draft_v do
      WHERE 1=1
      ${filterBetween} ORDER BY do.created DESC`;

      console.log(queryDataTable);
    
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset

        return res.send(rows);

      });


    } catch (error) {
      console.log(error);
      return res.error(error)
    }
  },
   view_misspart: async function (req, res) {
     const {
       query: { m_user_id, misspart_id }
     } = req;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let rows = {}
       let query = `select b.bundle_id,nomor_ba,nomor_do,convert(varchar(10),a.createddate,120) as period ,b.pengirim,penerima,a.status
           ,m_transporter_id,b.planner_id,m_distributor_id
           ,delivery_order_misspart_detail_id,c.m_produk_id,d.kode_sap,d.nama,c.qty,d.satuan,'' as alasan,document_ba
           from delivery_order_misspart a
           inner join delivery_order_v b on a.delivery_order_id = b.delivery_order_id
           inner join delivery_order_misspart_detail c on c.delivery_order_misspart_id = a.delivery_order_misspart_id
           inner join m_produk d on d.m_produk_id = c.m_produk_id
           where a.isactive = 'Y' and a.delivery_order_misspart_id = '${misspart_id}'  ORDER BY a.createddate desc `
 
       //console.log(query);
       let data = await request.query(query)
       data = data.recordset;
       console.log(data);
       rows.nomor_bundle = data[0].bundle_id
       rows.nomor_ba = data[0].nomor_ba
       rows.nomor_do = data[0].nomor_do
       rows.period = data[0].period
       rows.pengirim = data[0].pengirim
       rows.penerima = data[0].penerima
       rows.status = data[0].status
       rows.penerima = data[0].penerima
       let filename = data[0].document_ba;
       //console.log(filename);
       filename = filename.split('.').slice(0, -1).join('.')
       rows.document = `https://esales.enesis.com/api/do/fileBA/${misspart_id}/${filename}`
       let lines = []
       for (let i = 0; i < data.length; i++) {
         let obj = {}
         obj.m_produk_id = data[i].m_produk_id
         obj.kode_sap = data[i].kode_sap
         obj.nama = data[i].nama
         obj.satuan = data[i].satuan
         obj.qty = data[i].qty
         obj.alasan = data[i].alasan
 
         lines.push(obj)
 
       }
       rows.details = lines;
 
 
 
       return res.success({
         result: rows,
         message: "Fetch data successfully"
       });
 
     } catch (err) {
       console.log(err);
       return res.error(err)
     }
   },
   getfileBA: async function (req, res) {
     const record = req.param('record')
     const filename = req.param('filename')
     const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('ba_misspart', record), filename + '*'))
     if (filesamaDir.found.length > 0) {
       var lastItemAkaFilename = path.basename(filesamaDir.found[0])
       return res.download(filesamaDir.found[0], lastItemAkaFilename)
     }
     return res.error('Failed, File Not Found');
   },
   find: async function (req, res) {
     const {
       query: { currentPage, pageSize, m_user_id, bundle_id, searchText, planner, transporter, startdate, enddate, kode_status, m_distributor_id }
     } = req;
     //console.log(req.query);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();

       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

       const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
 
       let sqlDateGi = ``;
       if (startdate && enddate) {
         sqlDateGi = `AND CONVERT(VARCHAR(10),tanggal_penjemputan,120) BETWEEN '${startdate}' AND '${enddate}'`;
       }
 
       let sqlGetRole = `SELECT murv.nama,mtp.m_transporter_id,md.m_driver_id FROM m_user_role_v murv
       LEFT JOIN m_user mu ON(mu.m_user_id = murv.m_user_id) 
       LEFT JOIN m_transporter mtp ON(mtp.r_organisasi_id = mu.r_organisasi_id)
       LEFT JOIN m_driver md ON(md.r_organisasi_id = mu.r_organisasi_id) 
       WHERE murv.m_user_id='${m_user_id}'`;
 
      //  console.log(">>>>>>>>>>> ",sqlGetRole);
 
 
       let datarole = await request.query(sqlGetRole);
       let rolename = datarole.recordset[0].nama;
       let transporter_id = datarole.recordset[0].m_transporter_id;
       let m_driver_id = datarole.recordset[0].m_driver_id;
 
 
       //console.log(req.query);
       let WherePlannerId = ``;
       if (planner) {
         WherePlannerId = `AND planner_id = '${planner}'`;
       }
 
 
       let WhereKodStatus = ``;
       if (kode_status) {
         WhereKodStatus = `AND kode_status = '${kode_status}'`;
       }
 
       let WhereTujuanPenerima = ``;
       if (m_distributor_id) {
         WhereTujuanPenerima = `AND m_distributor_id = '${m_distributor_id}'`;
       }
 
       let WhereTranspoterId = ``;
       if (transporter) {
         WhereTranspoterId = `AND m_transporter_id = '${transporter}'`;
       }
 
       let transporterlist = '';
       let driverlist = '';
       let plannerlist = '';
       let valueIN = '';
       let listOrg = '';
       let isgantidriver = 'N';
       let isprovedelivery = 'N';
 
       if (rolename == 'TRANSPORTER') {
 
         isgantidriver = 'Y';
         transporterlist = `AND m_transporter_id='${transporter_id}'`;
 
       } else if (rolename == 'DRIVER') {
         driverlist = `AND m_driver_id='${m_driver_id}'`;
       } else if (rolename == 'LOGISTIK') {
 
       } else if (rolename == 'LOGISTIKHEAD') {
 
       } else if (rolename == 'DISTRIBUTOR' || rolename == 'ASDH' || rolename == "RSDH") {
         let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
         let orgs = await request.query(org);
         let organization = orgs.recordset.map(function (item) {
           return item['r_organisasi_id'];
         });
 
         for (const datas of organization) {
           valueIN += ",'" + datas + "'"
         }
         valueIN = valueIN.substring(1)
         listOrg = organization.length > 0 ? `AND r_organisasi_id IN (${valueIN})` : '';

       } else if (rolename == 'SALESMTREGIONKLAIM') {
 
 
       }

       let filtersearchtext = ``;
       if (searchText) {
         filtersearchtext = `AND console_number LIKE '%${searchText}%' OR bundle_id LIKE '%${searchText}%'  OR nomor_do LIKE '%${searchText}%'`;
       }
 
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows FROM delivery_order_v WHERE 1=1 
         ${whereClause} ${transporterlist} ${driverlist} ${plannerlist} ${listOrg} ${filtersearchtext} ${WherePlannerId} ${WhereKodStatus} ${WhereTujuanPenerima} ${WhereTranspoterId} ${sqlDateGi}`;
 
       //console.log(queryCountTable);
 

       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
       let queryDataTable = `SELECT *,COALESCE(console_number,bundle_id) AS nomor_id FROM delivery_order_v WHERE 1=1 
       ${whereClause} ${transporterlist} ${driverlist} ${plannerlist} ${listOrg} ${filtersearchtext} ${WherePlannerId} ${WhereKodStatus} ${WhereTujuanPenerima} ${WhereTranspoterId} ${sqlDateGi}
       ORDER BY schedule_delivery_date desc
       OFFSET ${offset} ROWS
       FETCH NEXT ${limit} ROWS ONLY`;
  
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
         const meta = paginate(currentPage, count, rows, pageSize);
 
         for (let i = 0; i < result.recordset.length; i++) {
 
           let kode_status = result.recordset[i].kode_status;
           let issge = 'N';
           let ispicking = 'N';
           let isstart = 'N';
           let issampailokasi = 'N';
           let ispoddist = 'N';
           let isfinish = 'N';
           let ispodtransporter = 'N';
           let isgantidriverbymobile = 'N';
          //  rows[i].isbidding = null;
           if (kode_status == 'DOD') {
             issge = 'Y';
             rows[i].isbidding = result.recordset[i].isbidding;
           } else if (kode_status == 'SGE') {
             ispicking = 'Y';
           } else if (kode_status == 'PIC') {
             isstart = 'Y';
           } else if (kode_status == 'OTW') {
             issampailokasi = 'Y';
             isgantidriverbymobile = 'Y';
           } else if (kode_status == 'SPL') {
             ispoddist = 'Y';
             isgantidriver = 'N';
             isprovedelivery = 'Y';
           } else if (kode_status == 'PODDIST') {
             isfinish = 'Y';
             isgantidriver = 'N';
           } else if (kode_status == 'FNS') {
             ispodtransporter = 'Y';
             isprovedelivery = 'N';
             isgantidriver = 'N';
           } else if (kode_status == 'PODTRANS') {
             isfinish = 'N';
             isgantidriver = 'N';
             isprovedelivery = 'N';
           } else if (kode_status == 'CHG' && rolename == 'TRANSPORTER') {
             isgantidriver = 'Y';
           }
 
           if (rolename == 'LOGISTIK') {
             isprovedelivery = 'N';
           }
 
           rows[i].isgantidriver = isgantidriver;
           rows[i].isgantidriverbymobile = isgantidriverbymobile;
           rows[i].isprovedelivery = isprovedelivery;
           rows[i].issge = issge;
           rows[i].ispicking = ispicking;
           rows[i].isstart = isstart;
           rows[i].issampailokasi = issampailokasi;
           rows[i].ispoddist = ispoddist;
           
           rows[i].ispodtransporter = ispodtransporter;
           rows[i].isfinish = isfinish;
           rows[i].eta = moment(rows[i].schedule_delivery_date, 'YYYY-MM-DD').add(rows[i].waktu, 'days').format('YYYY-MM-DD');
 
           let delivery_order_id = result.recordset[i].delivery_order_id;
        
           let sqlDetailTracking = `SELECT TOP 1 * FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created DESC`;
           let datadetailTracking = await request.query(sqlDetailTracking);



           let bundle_id = rows[i].bundle_id;
           let console_number = rows[i].console_number;
           
           
           if (datadetailTracking.recordset.length > 0) {
             rows[i].tracking = datadetailTracking.recordset;
           }


           let sqlApproval = `SELECT TOP 1 * FROM delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
           let getApproval = await request.query(sqlApproval);
           let tglCreatedAppr = getApproval.recordset.length > 0 ? getApproval.recordset[0].tanggal_approve : null;
           let statusApproval = 'Auto';

           if(!tglCreatedAppr){

              if(getApproval.recordset.length > 0 ){
                statusApproval = 'Auto';
              }else{
                statusApproval = 'Manual';
              }

           }

           rows[i].tanggal_approval = tglCreatedAppr;
           rows[i].status_place_order = statusApproval;


           let checkSubmitFaktur = `SELECT COUNT(1) AS jumlahData FROM c_invoice_detail WHERE nomor_id = '${rows[i].nomor_id}'`;
           let getCheckTagihan = await request.query(checkSubmitFaktur);

           let jumlahTagihan = getCheckTagihan.recordset[0].jumlahData;

           if(jumlahTagihan > 0){
              rows[i].status_billing = 'Sudah ditagihkan';
           }else{
              rows[i].status_billing = 'Belum ditagihkan';
           }
 
         }
 
        //  console.log(rows)
 
         /**
          * {
          *    result : data utama,
          *    meta : data tambahan ( optional ),
          *    status : status response ( optional),
          *    message : pesan ( optional )
          * }
          */
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
 
   // GET ONE RESOURCE
   view: async function (req, res) {
     const {
       query: { m_user_id }
     } = req;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       if('tracking-do-driver'==req.param("id")){
 
         return res.success({
           message: "Fetch data successfully"
         });
 
       }else{
               let sqlGetRole = `SELECT murv.nama,mtp.m_transporter_id,md.m_driver_id FROM m_user_role_v murv
               LEFT JOIN m_user mu ON(mu.m_user_id = murv.m_user_id) 
               LEFT JOIN m_transporter mtp ON(mtp.r_organisasi_id = mu.r_organisasi_id)
               LEFT JOIN m_driver md ON(md.r_organisasi_id = mu.r_organisasi_id) 
               WHERE murv.m_user_id='${m_user_id}'`;
 
 
             let datarole = await request.query(sqlGetRole);
             let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : '';
             let isgantidriver = 'N';
             let isprovedelivery = 'N';
             let isUploadAddCost = 'Y';
 
             if (rolename == 'TRANSPORTER') {
               isgantidriver = 'Y';
             }
 
             if (rolename == 'LOGISTIK') {
               isprovedelivery = 'N';
             }
 
 
             let queryDataTable = `SELECT * FROM delivery_order_v WHERE delivery_order_id ='${req.param(
               "id"
             )}'`;
 
             //console.log(queryDataTable);
 
 
             request.query(queryDataTable, async (err, result) => {
               if (err) {
                 return res.error(err);
               }
 
               const row = result.recordset[0];
 
               let kode_status = row.kode_status;
               let bundle_id = row.bundle_id;
               let console_number = row.console_number;
               let issge = 'N';
               let ispicking = 'N';
               let isstart = 'N';
               let issampailokasi = 'N';
               let ispoddist = 'N';
               let isfinish = 'N';
               let ispodtransporter = 'N';
               let isgantidriverbymobile = 'N';
               let ispodlogistik = 'N';

               let nomor_id = console_number ? console_number : bundle_id;
               let sqlCekAddCost = `SELECT kode_status,status FROM delivery_order_add_cost WHERE nomor_id = '${nomor_id}'`;
               let getDataAddCost = await request.query(sqlCekAddCost);
               let kodeStatusAddCost = getDataAddCost.recordset.length > 0 ? getDataAddCost.recordset[0].kode_status : null;
               let statusAddCost = getDataAddCost.recordset.length > 0 ? getDataAddCost.recordset[0].status : null;

               if(kodeStatusAddCost){

                  if(kodeStatusAddCost == 'DR' || kodeStatusAddCost == 'RJC'){
                      isUploadAddCost = 'Y';
                  }else{
                    isUploadAddCost = 'N'
                  }
               }
 
               if (rolename == 'LOGISTIK') {
                 isprovedelivery = 'N';
               }
 
 
               if (kode_status == 'DOD') {
                 issge = 'Y';
               } else if (kode_status == 'SGE') {
                 ispicking = 'Y';
               } else if (kode_status == 'PIC') {
                 isstart = 'Y';
               } else if (kode_status == 'OTW') {
                 issampailokasi = 'Y';
                 isgantidriverbymobile = 'Y';
                 isprovedelivery = 'N';
               } else if (kode_status == 'SPL') {
                 ispoddist = 'Y';
                 isgantidriver = 'N';
                 isprovedelivery = 'Y';
                 ispodlogistik = 'N';
               } else if (kode_status == 'PODDIST') {
                 isfinish = 'Y';
                 isgantidriver = 'N';
               } else if(kode_status == 'FNS'){
                 ispodtransporter = 'N';
                 isprovedelivery = 'N';
                 isgantidriver = 'N';
                 ispodlogistik = 'Y';
               }else if(kode_status == 'PODLOG'){
                 ispodtransporter = 'Y';
                 isprovedelivery = 'N';
                 isgantidriver = 'N';
                 ispodlogistik = 'N';
               }else if (kode_status == 'PODTRANS') {
                 isfinish = 'N';
                 isgantidriver = 'N';
                 isprovedelivery = 'N';
                 ispodtransporter = 'N';
               } else if (kode_status == 'CHG') {
 
                 issge = 'N';
                 ispicking = 'N';
                 isstart = 'N';
                 issampailokasi = 'N';
                 isfinish = 'N';
                 isgantidriver = 'Y';
 
               }
 
               if (rolename == 'TRANSPORTER') {
                 isprovedelivery = 'N';
                 ispodlogistik = 'N';
               }
 
               if (rolename == 'TRANSPORTER' && kode_status != 'FNS' && kode_status != 'PODTRANS' && kode_status != 'PODLOG') {
                 isgantidriver = 'Y';
               } else {
                 isgantidriver = 'N';
               }
 
               // console.log('rolename ',rolename);
               // console.log('kode_status ',kode_status);
               // console.log('isgantidriver ',isgantidriver);
 
               row.isgantidriver = isgantidriver;
               row.isgantidriverbymobile = isgantidriverbymobile;
               row.isprovedelivery = isprovedelivery;
               row.isUploadAddCost = isUploadAddCost;
               row.statusAddCost = statusAddCost;
               row.issge = issge;
               row.ispicking = ispicking;
               row.isstart = isstart;
               row.issampailokasi = issampailokasi;
               row.ispoddist = ispoddist;
               row.ispodtransporter = ispodtransporter;
               row.isfinish = isfinish;
               row.ispodlogistik = ispodlogistik;
               row.eta = moment(row.schedule_delivery_date, 'YYYY-MM-DD').add(row.waktu, 'days').format('YYYY-MM-DD');
 
               const delivery_order_id = result.recordset[0].delivery_order_id;
               const sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,
               dod.jumlah AS jumlah,
               CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
               CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
               dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
               CASE WHEN '${rolename}'='DISTRIBUTOR' AND do.kode_status='SPL' THEN dod.jumlah ELSE dod.jumlah_approve_distributor END AS jumlah_approve_distributor,
               CASE WHEN '${rolename}'='LOGISTIK' AND do.kode_status='FNS' THEN dod.jumlah ELSE COALESCE(dod.jumlah_approve_logistik,0) END AS jumlah_approve_logistik,
               CASE WHEN '${rolename}'='TRANSPORTER' AND do.kode_status='PODLOG'
               THEN dod.jumlah ELSE  COALESCE(dod.jumlah_approve_transporter,0) END AS jumlah_approve_transporter,
               dod.actual_quantity,
               do.bundle_id
               FROM delivery_order_detail dod,m_produk mp,delivery_order do
               WHERE dod.delivery_order_id= '${delivery_order_id}'
               AND dod.delivery_order_id = do.delivery_order_id
               AND dod.jumlah > 0
               AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
 
               const datadetail = await request.query(sqlDetail);
               row.details = datadetail.recordset;
 
               let total_tonase = 0;
               let total_kubikasi = 0;
               for (let j = 0; j < row.details.length; j++) {
 
                 row.details[j].expired_date = row.details[j].expired_date ? moment(row.details[j].expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
                 total_tonase = total_tonase + Number(row.details[j].tonase);
                 total_kubikasi = total_kubikasi + Number(row.details[j].kubikasi);
               }

 
               let sqlDetailTracking = `SELECT *,convert(varchar(16),created ,120) AS datetracking FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created ASC`;
               let datadetailTracking = await request.query(sqlDetailTracking);
               if (datadetailTracking.recordset.length > 0) {
                 row.tracking = datadetailTracking.recordset;
                 for (let j = 0; j < row.tracking.length; j++) {
 
                   row.tracking[j].datetracking = row.tracking[j].datetracking ? row.tracking[j].datetracking : null;
 
                 }
               }
 
 
 
               let sqlDetailLocation = `SELECT TOP 1 created,latitude,longitude FROM delivery_order_tracking 
               WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
               let datadetailLocation = await request.query(sqlDetailLocation);
               if (datadetailLocation.recordset.length > 0) {
 
                 row.location = datadetailLocation.recordset[0];
                 row.location.datelocation = row.location.created ? moment(row.location.created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
                 delete row.location.created;
               }
               row.isnew = 0;
               row.direct = `https://enesis.com`;

               let sqlApproval = `select TOP 1 * from delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
               let getApproval = await request.query(sqlApproval);
               let tglCreatedAppr = getApproval.recordset.length > 0 ? getApproval.recordset[0].tanggal_approve : undefined;

               let statusApproval = 'Auto';
    
               if(!tglCreatedAppr){
    
                  if(getApproval.recordset.length > 0 ){
                    statusApproval = 'Auto';
                  }else{
                    statusApproval = 'Manual';
                  }
    
               }


               row.tanggal_approval = tglCreatedAppr;
               row.status_place_order = statusApproval;
               row.total_tonase = Number(total_tonase).toFixed(2);
               row.total_kubikasi = Number(total_kubikasi).toFixed(2);

               console.log(`detail disini...`,row.total_tonase);
               console.log(`tanggal_approval`,row.tanggal_approval);
               return res.success({
                 result: row,
                 message: "Fetch data successfully"
               });
             });
       }
       
     } catch (err) {
       return res.error(err);
     }
   },
   viewRelease: async function (req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let queryDataTable = `SELECT
       do.delivery_order_id,
       do.c_order_id,
       do.isactive,
       do.created,
       do.createdby,
       do.updated,
       do.updatedby,
       co.cmo_id,
       co.week_number,
       c.bulan,
       c.tahun,
       md.nama_pajak,
       md.nama,
       md.kode_channel,
       md.channel,
       do.schedule_delivery_date AS schedule_date,
       do.tonase,
       do.kubikasi,
       co.nomor_sap,
       do.nomor_do AS nomor_shipment,
       do.status AS statusweek,
       do.kode_status,
       do.r_kendaraan_id,
       rk.tonase AS tonaseMuatan,
       CAST((do.tonase / rk.tonase) * 100 AS DECIMAL(10,2)) totalPercentaseTonaseOrder,
       CAST((do.kubikasi / rk.kubikasi) * 100 AS DECIMAL(10,2)) AS totalPercentaseKubikasiOrder,
       do.nomor_do,
       rk.nama AS namakendaraan,
       do.plat_nomor_kendaraan,
       rk.tonase AS totalTonaseKendaraan,
       rk.kubikasi AS totalKubikasiKendaraan,
       do.delivery_note AS catatan_pengiriman,
       do.tanggal_sampai_tujuan,
       ro.nama AS pengirim,
       md.nama AS penerima,
       mt.nama AS perusahaan_jasa_pengiriman,
       do.nama_driver,
       do.nomor_sim_driver,
       do.nomor_hp_driver,
       do.nama_assisten_driver,
       do.nomor_hp_assisten_driver,
       do.penawaran_biaya AS total_penawaran,
       CASE WHEN do.m_transporter_id IS NULL THEN 'N' ELSE 'Y' END AS isCreateResi
       FROM 
       delivery_order do 
       LEFT JOIN c_order co ON(do.c_order_id = co.c_order_id)
       LEFT JOIN m_distributor_v md ON(do.m_distributor_id = md.m_distributor_id)
       LEFT JOIN r_organisasi ro ON(do.r_organisasi_id = ro.r_organisasi_id)
       LEFT JOIN r_kendaraan rk ON(do.r_kendaraan_id = rk.r_kendaraan_id)
       LEFT JOIN m_transporter_v mt ON(do.m_transporter_id = mt.m_transporter_id)
       LEFT JOIN cmo c ON(c.cmo_id = co.cmo_id)
       WHERE do.isactive='Y' AND do.delivery_order_id ='${req.param(
         "id"
       )}'`;
 
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const row = result.recordset[0];
         const delivery_order_id = result.recordset[0].delivery_order_id;
         const c_order_id = result.recordset[0].c_order_id;
 
 
         let biddingtransporter = await request.query(`
         SELECT mtv.*,
         bs.price,bs.keterangan
         FROM quo_bidding_shipment bs,
         m_transporter_v mtv
         WHERE bs.c_order_id='${c_order_id}'
         AND bs.delivery_order_id='${delivery_order_id}'
         AND mtv.m_transporter_id = bs.m_transporter_id`);
 
         let alltransporter = await request.query(`SELECT mtv.* FROM m_transporter_v mtv`);
         row.biddingtransporter = biddingtransporter.recordset;
         row.alltransporter = alltransporter.recordset;
 
         if (biddingtransporter.recordset.length > 0) {
 
           row.isbiddingweek = 'Y';
 
         }
 
         const sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
         CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
         CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
         dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
         dod.jumlah_approve_distributor,dod.jumlah_approve_transporter,
         dod.actual_quantity,
         do.bundle_id
         FROM delivery_order_detail dod,m_produk mp,delivery_order do
         WHERE dod.delivery_order_id= '${delivery_order_id}'
         AND dod.delivery_order_id = do.delivery_order_id
         AND dod.jumlah > 0
         AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
 
 
         const datadetail = await request.query(sqlDetail);
         row.details = datadetail.recordset;
 
 
 
         return res.success({
           result: row,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
   getbidding: async function (req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const bidding_id = req.param("bidd");
 
       console.log(bidding_id, "okey...");


       let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
       let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
       let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

       let datacekmultidrop = `select DISTINCT c.nama as pengirim,b.bundle_id,c.m_transporter_id,b.console_number 
       ,a.isactive,penerima from r_log_bidding a
       inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
       inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
       where a.r_log_bidding_id = '${bidding_id}'`;
 
       let dataparam = await request.query(datacekmultidrop);
       let console_number = dataparam.recordset.length > 0 ? dataparam.recordset[0].console_number : null;
 
       if(console_number && console_number.length > 1){


        let m_transporter_id = dataparam.recordset.length > 0 ? dataparam.recordset[0].m_transporter_id : null;

        if(m_transporter_id){

          let queryData = `select 
          DISTINCT a.isactive,a.isclosed from r_log_bidding a
          inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
          inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
          where b.console_number = '${console_number}' AND c.m_transporter_id = '${m_transporter_id}'
          and a.r_log_bidding_id = '${bidding_id}'`;


          let datacekkadaluarsa = await request.query(queryData);
          let kadaluarsa = datacekkadaluarsa.recordset;


          let cekErrorValidation = [];
          for (let i = 0; i < kadaluarsa.length; i++) {
              
              if(kadaluarsa[i].isactive==0){
                cekErrorValidation.push('Penawaran sudah kadaluarsa...');
              }

              if(kadaluarsa[i].isclosed!=0){

                cekErrorValidation.push('sudah ada pemenang');

              }
            
          }


          if(cekErrorValidation.length > 0){
            return res.success({
              result: null,
              message: cekErrorValidation.toString()
            });
          }else{

            let queryData = `select 
            DISTINCT a.isactive,a.isclosed,a.r_log_bidding_id,a.bundle_id,a.delivery_order_id  
            ,ring_transporter,a.harga,b.kendaraan,b.r_kendaraan_id,rk.kode AS kode_kendaraan,
            c.kode AS kode_transporter,
            b.type_inner_outer from r_log_bidding a
            inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
            inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
            inner join r_kendaraan rk  on rk.r_kendaraan_id = b.r_kendaraan_id 
            where b.console_number = '${console_number}' AND c.m_transporter_id = '${m_transporter_id}'
            and a.r_log_bidding_id = '${bidding_id}'`;

            let ds = await request.query(queryData);
            let datasource = ds.recordset;

            for (let i = 0; i < datasource.length; i++) {

              let r_log_bidding_id = datasource[i].r_log_bidding_id;
              let bundle_id = datasource[i].bundle_id;
              let delivery_order_id = datasource[i].delivery_order_id;
              let ring_transporter = datasource[i].ring_transporter;
              let harga = datasource[i].harga;
              let kode_kendaraan = datasource[i].kode_kendaraan;
              let type_inner_outer = datasource[i].type_inner_outer;
              let kode_transporter = datasource[i].kode_transporter;

                let update = `update  r_log_bidding set isactive = 0 , isclosed = 1, winner_date = getdate()
                where r_log_bidding_id  = '${r_log_bidding_id}'`;
                await request.query(update);
    
    
                let update2 = `update  r_log_bidding set isactive = 0
                where bundle_id  = '${bundle_id}' or console_number = '${console_number}'`;
                await request.query(update2);
    
                let update3 = `update delivery_order set m_transporter_id = '${m_transporter_id}'
                , status = 'Draft', kode_status = 'DOD',tgl_ambil_bidding = getdate(),ring_winner = '${ring_transporter}'
                where r_log_bidding_id = '${delivery_order_id}' or console_number = '${console_number}'`
                await request.query(update3);
    
                let cekloop = `select * from  delivery_order where r_log_bidding_id = '${delivery_order_id}' or console_number = '${console_number}'`;
                
                if(harga){
                  let updateBiayaKirim = `UPDATE delivery_order SET biaya_kirim = ${harga} 
                  where r_log_bidding_id = '${delivery_order_id}' or console_number = '${console_number}'`;
                  await request.query(updateBiayaKirim);
                }

                let sqlGetRateMultidrop = `SELECT rate from bucket_bidding_multidrop bbm WHERE kode_vendor = '${kode_transporter}' 
                AND trucking = '${kode_kendaraan}' AND route ='${type_inner_outer}'`;

                let dataRateMultiDrop = await request.query(sqlGetRateMultidrop);
                let rateMultiDrop = dataRateMultiDrop.recordset.length > 0 ? dataRateMultiDrop.recordset[0].rate : 0;

                if(rateMultiDrop > 0){
                  let updateRateMultiDrop = `UPDATE delivery_order SET rate_multidrop = ${rateMultiDrop} 
                  where r_log_bidding_id = '${delivery_order_id}' or console_number = '${console_number}'`;
                  await request.query(updateRateMultiDrop);
                }


                console.log(cekloop);
                let dts = await request.query(cekloop)
                for (let i = 0; i < dts.recordset.length; i++) {
                  console.log("masuok..");
                  let c_shipment_id = uuid();
                  let delivery_order_id = dts.recordset[i].delivery_order_id
                  let total_biaya = 0;
                  let sqlInsertShipment = `INSERT INTO  c_shipment
                  (c_shipment_id,createdby,updatedby, 
                  m_transporter_id,
                  total_biaya, 
                  status, 
                  status_dokumen,delivery_order_id)
                  VALUES('${c_shipment_id}','SYSTEM',
                  'SYSTEM', 
                  '${m_transporter_id}', 
                  0, 
                  'Vendor Transporter Terpilih',
                  'VALID','${delivery_order_id}')`;   
                  await request.query(sqlInsertShipment);
                }
            }


                // kirim email disini
                  
                let usr = `select distinct username,d.nama as trf
                ,convert(varchar(17),getdate(),113) as winner_date,do.penerima,
                c.bundle_id
                from delivery_order_v do
                inner join m_user b on b.m_user_id = do.planner_id 
                inner join r_log_bidding c on c.delivery_order_id = do.r_log_bidding_id 
                and c.winner_date is not null
                inner join m_transporter_v d on d.m_transporter_id = c.m_transporter_id  
                where 
                do.console_number = '${console_number}' AND c.m_transporter_id = '${m_transporter_id}'`;
                
                let duser = await request.query(usr);
                let datauser = duser.recordset;

                let arrayTrf = [];
                let arrayPenerima = [];
                let arrayBundleId = [];
                let arrayPembuat = [];
                for (let iduser = 0; iduser < datauser.length; iduser++) {
                  arrayTrf.push(datauser[iduser].trf);
                  arrayPenerima.push(datauser[iduser].penerima);
                  arrayBundleId.push(datauser[iduser].bundle_id);
                  arrayPembuat.push(datauser[iduser].username);
                }



                arrayTrf = _.uniq(arrayTrf);
                arrayPenerima = _.uniq(arrayPenerima);

                let trf = arrayTrf.toString();
                let winner_date = datauser[0].winner_date;
                let dtb = arrayPenerima.toString();
                let bundle = arrayBundleId.toString();

                arrayPembuat.push('it.aplikasi@enesis.com');

                let param = {           
                  subject: `Penawaran Kontrak Logistik PT. Marketama Indah Diterima`,
                  bundleid: bundle,
                  dtb : dtb,
                  transporter : trf,
                  waktu : winner_date
                }
                let template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'menangbidding', templateparam: param });
                SendEmail(arrayPembuat.toString(), param.subject, template);
                //SendEmail('ilyas.nurrahman74@gmail.com,tiasadeputra@gmail.com', param.subject, template);

                respone = {
                  kode: "200",
                  pesan: "Selamat Anda Sebagai pemenang..."
                }
                return res.success({
                  result: null,
                  message: respone
                });   
          }
        }
       }else{
        let sel1 = `select * from  r_log_bidding where r_log_bidding_id  = '${bidding_id}'`;
        let ds = await request.query(sel1);
        console.log("QQQ ....... ",sel1);
        if(ds.recordset.length > 0){
               console.log("MASUK 1");
               let bundle = ds.recordset[0].bundle_id;
               let m_transporter_id = ds.recordset[0].m_transporter_id;
               let key_id = ds.recordset[0].delivery_order_id;
               let ring_transporter = ds.recordset[0].ring_transporter;
               let respone = {};
               if (ds.recordset[0].isactive == "1") {
         
                 let sel2 = `select * from  r_log_bidding where bundle_id = '${bundle}' `;
                 console.log("MASUK 2 .. ",sel2);
                 let ds = await request.query(sel2);
                 let isclosebidding = ds.recordset[0].isclosed;
                 let r_log_bidding_id = ds.recordset[0].delivery_order_id;
                 
                 if (isclosebidding == "0") {
                   try {
                    console.log("CETAK 3");
                     let update = `update  r_log_bidding set isactive = 0 , isclosed = 1, winner_date = getdate()
                     where r_log_bidding_id  = '${bidding_id}'`;
                     await request.query(update);
         
         
                     let update2 = `update  r_log_bidding set isactive = 0
                     where bundle_id  = '${bundle}'`;
                     await request.query(update2);
         
                     let update3 = `update  delivery_order set m_transporter_id = '${m_transporter_id}', status = 'Draft', kode_status = 'DOD'
                     ,tgl_ambil_bidding = getdate(),ring_winner = '${ring_transporter}'
                     where r_log_bidding_id = '${key_id}'`
                     console.log(update3);
                     // return res.error("xxx")
                     await request.query(update3);
         
                     let cekloop = `select * from  delivery_order where r_log_bidding_id = '${r_log_bidding_id}'`
                     console.log(cekloop);
                     let dts = await request.query(cekloop)
                     for (let i = 0; i < dts.recordset.length; i++) {
                       console.log("masuok..");
                       let c_shipment_id = uuid();
                       let delivery_order_id = dts.recordset[i].delivery_order_id
                       let total_biaya = 0;
                       const sqlInsertShipment = `INSERT INTO  c_shipment
                       (c_shipment_id,createdby,updatedby, 
                       m_transporter_id,
                       total_biaya, 
                       status, 
                       status_dokumen,delivery_order_id)
                       VALUES('${c_shipment_id}','SYSTEM',
                       'SYSTEM', 
                       '${m_transporter_id}', 
                       0, 
                       'Vendor Transporter Terpilih',
                       'VALID','${delivery_order_id}')`;
                       console.log(sqlInsertShipment);
                       await request.query(sqlInsertShipment);
                     }
       
                     // kirim email disini
       
                     let usr = `select distinct username,d.nama as trf
                     ,convert(varchar(17),getdate(),113) as winner_date,do.penerima
                     from delivery_order_v do
                     inner join m_user b on b.m_user_id = do.planner_id 
                     inner join r_log_bidding c on c.delivery_order_id = do.r_log_bidding_id 
                     and c.winner_date is not null
                     inner join m_transporter_v d on d.m_transporter_id = c.m_transporter_id  
                     where do.bundle_id = '${bundle}' and do.r_log_bidding_id = '${key_id}'`
                     let duser = await request.query(usr);
                     duser = duser.recordset[0]
                     let pembuat = duser.username;
                     let trf = duser.trf;
                     let winner_date = duser.winner_date;
                     let dtb = duser.penerima;
       
                     
                   //  console.log(usr,duser.username);
                   let param = {
             
                     subject: `Penawaran Kontrak Logistik PT. Marketama Indah Diterima`,
                     bundleid: bundle,
                     dtb : dtb,
                     transporter : trf,
                     waktu : winner_date
                   }
                   let template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'menangbidding', templateparam: param });
                   // console.log(template);
                   // pembuat

                   let emailArray = [];


                   if (statusIntegasi == 'DEV') {
                    
                    emailArray.push('tiasadeputra@gmail.com');
                    // emailArray.push('ilyas.nurrahman74@gmail.com');
                    emailArray.push('sumadi.logistik@enesis.com');
                    emailArray.push('siswanto@enesis.com');
                    emailArray.push('mardiyanto.hadi@enesis.com');


                  }else{

                    emailArray.push('tiasadeputra@gmail.com');
                    // emailArray.push('ilyas.nurrahman74@gmail.com');
                    emailArray.push('sumadi.logistik@enesis.com');
                    emailArray.push('siswanto@enesis.com');
                    emailArray.push('mardiyanto.hadi@enesis.com');

                  }

                   SendEmail(pembuat, param.subject, template);
                   SendEmail(emailArray.toString(), param.subject, template);
                     
                   } catch (error) {
                     console.log(error);
                   }
                   respone = {
                     kode: "200",
                     pesan: "Selamat Anda Sebagai pemenang..."
                   }
                 } else {
                   respone = {
                     kode: "1",
                     pesan: "sudah ada pemenang"
                   }
                 }
                 return res.success({
                   result: null,
                   message: respone,
         
                 });
               } else {
                 respone = {
                   kode: "5",
                   pesan: "sudah tidak aktif"
                 }
                 return res.success({
                   result: null,
                   message: respone
                 });
               }
        }else{
          respone = {
            kode: "5",
            pesan: "sudah tidak aktif"
          }
          return res.success({
            result: null,
            message: respone
          });
        }

    
      }
       
     } catch (err) {
       console.log(err);
       return res.error(err);
     }
   },
   // CREATE NEW RESOURCE
   new: async function (req, res) {
     const { c_order_id } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
 
       const sqlGetOrder = `SELECT c_order_id,co.schedule_date,c.m_distributor_id,co.tonase,co.kubikasi 
         FROM c_order co,cmo c 
         WHERE co.c_order_id ='${c_order_id}'
         AND c.cmo_id = co.cmo_id`;
 
       const getorder = await request.query(sqlGetOrder);
       let dataorder = getorder.recordset[0];
       const sqlDetail = `SELECT cod.line,mp.m_produk_id,mp.kode_sap AS kode_barang,
         mp.nama AS nama_barang,cod.qty,
         CAST(cod.qty * mp.tonase AS DECIMAL(10,2)) AS tonase,
         CAST(cod.qty * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi
         FROM c_orderdetail cod,m_produk mp 
         WHERE cod.c_order_id= '${c_order_id}'
         AND cod.m_produk_id=mp.m_produk_id ORDER BY cod.line`;
 
       const sqlMuatan = `SELECT ck.r_kendaraan_id,rk.nama,rk.tonase,rk.kubikasi
         FROM cmo_kendaraan ck
         LEFT JOIN r_kendaraan rk ON(ck.r_kendaraan_id = rk.r_kendaraan_id),
         c_order co
         WHERE ck.cmo_id=co.cmo_id
         AND co.c_order_id = '${c_order_id}'
         AND ck.week_number=co.week_number`;
 
       const getdetails = await request.query(sqlDetail);
       let datadetails = getdetails.recordset;
 
       const getmuatan = await request.query(sqlMuatan);
       let datamuatan = getmuatan.recordset;
 
       const sortedDataBarang = _.sortBy(datadetails, ['tonase', 'datadetails']) //sot asc
       const sortedMuatan = _.sortBy(datamuatan, ['tonase', 'datadetails']) //sot asc
 
       let datamuatanClone = _.cloneDeep(sortedMuatan)
       let currMuatan = 0
       let banyaknyaMuatan = datamuatanClone.length
       let akumulasiTonase = 0
       let akumulasiKubikai = 0
 
       for (const barang of sortedDataBarang) {
         const muatan = datamuatanClone[currMuatan]
         if (akumulasiTonase <= muatan.tonase && akumulasiKubikai <= muatan.kubikasi) {
           if (!datamuatanClone[currMuatan].details) {
             datamuatanClone[currMuatan].details = []
           }
           datamuatanClone[currMuatan].details.push(barang)
         } else {
           if (currMuatan < banyaknyaMuatan) {
             currMuatan += 1
             if (!datamuatanClone[currMuatan].details) {
               datamuatanClone[currMuatan].details = []
             }
             datamuatanClone[currMuatan].details.push(barang)
             akumulasiTonase = 0
             akumulasiKubikai = 0
           } else {
             //paksakan masuk ke muatan yg terakhir
             datamuatanClone[currMuatan].details.push(barang)
           }
         }
         akumulasiTonase += barang.tonase
         akumulasiKubikai += barang.kubikasi
       }
 
       //bungkus agar ada object 'packing' nya
       const result = {
         packing: datamuatanClone
       }
 
 
       const tableHeaderDo = new mssql.Table('delivery_order');
       tableHeaderDo.create = false;
       tableHeaderDo.columns.add('delivery_order_id', mssql.TYPES.VarChar, { nullable: false, primary: true });
       tableHeaderDo.columns.add('c_order_id', mssql.TYPES.VarChar, { nullable: false });
       tableHeaderDo.columns.add('nomor_do', mssql.TYPES.VarChar, { nullable: false });
       tableHeaderDo.columns.add('r_kendaraan_id', mssql.TYPES.VarChar, { nullable: false });
       tableHeaderDo.columns.add('schedule_delivery_date', mssql.TYPES.NVarChar, { nullable: false });
       tableHeaderDo.columns.add('m_distributor_id', mssql.TYPES.VarChar, { nullable: false });
       tableHeaderDo.columns.add('tonase', mssql.TYPES.Int, { nullable: false });
       tableHeaderDo.columns.add('kubikasi', mssql.TYPES.Int, { nullable: false });
       tableHeaderDo.columns.add('bundle_id', mssql.TYPES.VarChar, { nullable: true });
 
 
 
       const tableDetailDO = new mssql.Table('delivery_order_detail');
       tableDetailDO.create = false;
       tableDetailDO.columns.add('delivery_order_detail_id', mssql.TYPES.VarChar, { nullable: false, primary: true });
       tableDetailDO.columns.add('delivery_order_id', mssql.TYPES.VarChar, { nullable: false });
       tableDetailDO.columns.add('line', mssql.TYPES.SmallInt, { nullable: false });
       tableDetailDO.columns.add('m_produk_id', mssql.TYPES.VarChar, { nullable: false });
       tableDetailDO.columns.add('jumlah', mssql.TYPES.Int, { nullable: false });
       tableDetailDO.columns.add('tonase', mssql.TYPES.Int, { nullable: false });
       tableDetailDO.columns.add('kubikasi', mssql.TYPES.Int, { nullable: false });
 
 
 
       let schedule_date = dataorder.schedule_date ? moment(dataorder.schedule_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;
       let m_distributor_id = dataorder.m_distributor_id;
       let bundle_id = ``;
 
       const sqlBundleId = `SELECT COUNT(1) + 1 AS bundle FROM delivery_bundle`;
       const getbundelId = await request.query(sqlBundleId);
       let bundle = getbundelId.recordset[0].bundle;
       bundle_id = pad(bundle);
 
 
       for (let i = 0; i < result.packing.length; i++) {
 
         let deliveryorderid = uuid();
         let nomorDo = otpGenerator.generate(14, { alphabets: false, upperCase: false, specialChars: false });
         let r_kendaraan_id = result.packing[i].r_kendaraan_id;
         let tonaseOrder = 0;
         let kubikasiOrder = 0;
         let numbering = 0;
 
 
 
 
         for (let j = 0; j < result.packing[i].details.length; j++) {
 
           let deliveryorderdetailid = uuid();
           let m_produk_id = result.packing[i].details[j].m_produk_id;
           let qty = result.packing[i].details[j].qty;
           let tonase = result.packing[i].details[j].tonase;
           let kubikasi = result.packing[i].details[j].kubikasi;
           tonaseOrder = tonaseOrder + tonase;
           kubikasiOrder = kubikasiOrder + kubikasi;
 
           if (qty > 0) {
 
             numbering = numbering + 1;
             tableDetailDO.rows.add(
               deliveryorderdetailid,
               deliveryorderid,
               numbering,
               m_produk_id,
               qty,
               tonase,
               kubikasi
             );
           }
 
         }
 
         tableHeaderDo.rows.add(
           deliveryorderid,
           c_order_id,
           nomorDo,
           r_kendaraan_id,
           schedule_date,
           m_distributor_id,
           tonaseOrder,
           kubikasiOrder,
           bundle_id
         );
 
 
 
       }
 
 
 
       await request.bulk(tableHeaderDo);
       await request.bulk(tableDetailDO);
 
 
       return res.success({
         data: result,
         message: "Insert data successfully"
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   cariDO: async function (req, res) {
     const {
       query: { m_user_id, startdate, endate, r_distribution_channel_id, r_region_id }
     } = req;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 

       let errorArray = [];
       console.log("_________________________________")
       let sqlGetChannel = `SELECT * FROM r_distribution_channel WHERE r_distribution_channel_id ='${r_distribution_channel_id}'`;
       let datachannel = await request.query(sqlGetChannel);
       let kode_channel = datachannel.recordset.length > 0 ? datachannel.recordset[0].kode : undefined;
 
       let sqlGetRegion = `SELECT * FROM r_region WHERE r_region_id ='${r_region_id}'`;
       let dataregion = await request.query(sqlGetRegion);
       let kode_region = dataregion.recordset.length > 0 ? padnumber(dataregion.recordset[0].kode) : undefined;;
 
       console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>")
       let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
       let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
       let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
       console.log(statusIntegasi,">>>>>>>>>>>>>>>>>>>>>>>>>>>>")
       // let usernamesoap = sails.config.globals.usernamesoap;
       // let passwordsoap = sails.config.globals.passwordsoap;
      //  console.log(passwordsoap,">>>>>>>>>>>>>>>>>>>>>>>>>> test")

       let url = ``;
    
		if (statusIntegasi == 'DEV') {
			usernamesoap = sails.config.globals.usernamesoapdev;
			passwordsoap = sails.config.globals.passwordsoapdev;
			url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_do/120/zws_sales_do/zbin_sales_do'; // development
		} else {
			usernamesoap = sails.config.globals.usernamesoap;
		  passwordsoap = sails.config.globals.passwordsoap;
			url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production
		}
      
 
 
 
      //  let usernamesoap = sails.config.globals.usernamesoap;
      //  let passwordsoap = sails.config.globals.passwordsoap;
       const tok = `${usernamesoap}:${passwordsoap}`;
       const hash = Base64.encode(tok);
       const Basic = 'Basic ' + hash;
 
       let datas = [];
 
 
       if (kode_region && kode_channel) {
 
         datas.push({
           CREATEDDATE_MAX: endate,
           CREATEDDATE_MIN: startdate,
           REGIO: kode_region,
           VTWEG: kode_channel
         });
 
       } else if (kode_region && kode_channel == undefined) {
 
         datas.push({
           CREATEDDATE_MAX: endate,
           CREATEDDATE_MIN: startdate,
           REGIO: kode_region,
         });
 
       } else if (kode_region == undefined && kode_channel) {
 
         datas.push({
           CREATEDDATE_MAX: endate,
           CREATEDDATE_MIN: startdate,
           VTWEG: kode_channel,
         });
 
       } else {
 
 
         datas.push({
           CREATEDDATE_MAX: endate,
           CREATEDDATE_MIN: startdate,
         });
 
 
       }
 
 
       if (datas.length > 0) {
         let Headers = {
           'Authorization': Basic,
           'user-agent': 'sampleTest',
           'Content-Type': 'text/xml;charset=UTF-8',
           'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_DO:ZFM_WS_DORequest',
         };
 
 
         let xml = fs.readFileSync('soap/ZFM_SW_DO_DRAFT.xml', 'utf-8');
         let hasil = racikXML(xml, datas, 'urn:ZFM_WS_DO');
         console.log(hasil);
         let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
 
         let { body, statusCode } = response;
         console.log('statusCode ', statusCode);
         if (statusCode == 200) {
 
 
           var parser = new xml2js.Parser({ explicitArray: false });
           parser.parseString(body, async function (err, result) {
             console.log(result);
             const populatedHeader = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOHEAD'].item
             const populatedLine = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOITEM'].item
             //console.log(populatedHeader);
             let generatedHeader = [];
             let tempHeader = [];
 
             if (populatedLine) {
 
               if (populatedHeader.VBELN) {
 
                 tempHeader.push(populatedHeader);
                 for (const head of tempHeader) {
                   const perHeader = {
                     ...head,
                     DOITEM: populatedLine.filter(perLine => perLine.VBELN === head.VBELN)
                   }
                   generatedHeader.push(perHeader)
                 }
 
               } else {
 
                 for (const head of populatedHeader) {
                   const perHeader = {
                     ...head,
                     DOITEM: populatedLine.filter(perLine => perLine.VBELN === head.VBELN)
                   }
                   generatedHeader.push(perHeader)
                 }
               }
 
             }
 
             const finalResult = {
               DOHEAD: generatedHeader
             }
 
 
             // let sqlGetNoSap = `SELECT nomor_sap FROM c_order WHERE nomor_sap IS NOT NULL`;
             // let datanomorsap = await request.query(sqlGetNoSap);
             // let listNoSap = datanomorsap.recordset;
 
             let sqlGetNoDo = `SELECT nomor_do FROM delivery_order WHERE isactive='Y'`;
             let datanomorDo = await request.query(sqlGetNoDo);
             let datalistNoDo = datanomorDo.recordset;
 
             let listNoDo = [];
             if (datanomorDo.recordset.length > 0) {
               listNoDo = datalistNoDo;
             } else {
               listNoDo.push({
                 nomor_do: null
               })
             }
 
 
             let datado = finalResult.DOHEAD;
             let rows = [];
             for (let i = 0; i < datado.length; i++) {
                
               let nomor_so = datado[i].DOITEM[0].VGBEL;
               let nomor_do = datado[i].VBELN;
               let do_number = datado[i].VBELN;
               let kode_kendaraan = datado[i].TYPE; //'ZC';
               let tanggal_do = datado[i].ERDAT;
               let route = datado[i].ROUTE;
               let tanggal_sampai_tujuan = datado[i].WADAT;
               let tanggal_gi = datado[i].WADAT_IST;
               let kode_shipto = Number(datado[i].KUNNR);
               let kode_soldto = Number(datado[i].KUNAG);
               let penerima = datado[i].NAME1;
               let perusahaan_jasa_pengiriman = datado[i].VENDOR;
               let kode_vendor = datado[i].VENDOR;              
               let kode_region = parseInt(datado[i].REGIO);

 
               let sqltransporter = `SELECT * FROM m_transporter_v mtv WHERE nama='${perusahaan_jasa_pengiriman}' OR kode='${kode_vendor}'`;
               let datatransporter = await request.query(sqltransporter);
               let m_transporter_id = datatransporter.recordset.length > 0 ? datatransporter.recordset[0].m_transporter_id : null;
               let namatransporter = datatransporter.recordset.length > 0 ? datatransporter.recordset[0].nama : null;
 
 
               let sqlregion = `SELECT * FROM r_region WHERE kode='${kode_region}'`;
               let dataregion = await request.query(sqlregion);
               let r_region_id = dataregion.recordset.length > 0 ? dataregion.recordset[0].r_region_id : null;
 
               let street = datado[i].STREET;
               let alamat_kirim_1 = datado[i].STR_SUPPL1;
               let alamat_kirim_2 = datado[i].STR_SUPPL2;
               let kode_pos = datado[i].POST_CODE1;
 
 
               let total_tonase = 0;
               let total_kubikasi = 0;
 
               let datadetail = [];
               for (let j = 0; j < datado[i].DOITEM.length; j++) {
 
                 let kode_sap = datado[i].DOITEM[j].MATNR;
                 let quantity = Number(datado[i].DOITEM[j].LFIMG);
                 let line = parseInt(datado[i].DOITEM[j].POSNR);
                 let batch = datado[i].DOITEM[j].CHARG;
                 let satuan = datado[i].DOITEM[j].VRKME;
                 let location_storage = datado[i].DOITEM[j].LGORT;
                 let expired_date = datado[i].DOITEM[j].VFDAT;
 
                 let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${Number(kode_sap)}'`;
                 let dataproduct = await request.query(sqldataproduk);
                 let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                 let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                 let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                 let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                 let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                 let tonase_detail = tonase * quantity;
                 let kubikasi_detail = kubikasi * quantity;
 
                 total_tonase = total_tonase + tonase_detail;
                 total_kubikasi = total_kubikasi + kubikasi_detail;
 
 
                 let data = {
 
                   line: line,
                   kode_sap:Number(kode_sap),
                   m_produk_id: m_produk_id,
                   kode_barang: kode_barang,
                   nama_barang: nama_barang,
                   jumlah: quantity,
                   tonase: tonase_detail,
                   kubikasi: Number(kubikasi_detail),
                   batch: batch,
                   satuan: satuan,
                   location_storage: location_storage,
                   expired_date: expired_date,
                   route:route
                 }
 
                 if (quantity > 0) {
                   datadetail.push(data);
                 }
 
 
               }
 
 
               let sqlDataKendaraan = `SELECT * FROM r_kendaraan WHERE kode='${kode_kendaraan}'`;
               let datakendaraan = await request.query(sqlDataKendaraan);
 
               let r_kendaraan_id = datakendaraan.recordset.length > 0 ? datakendaraan.recordset[0].r_kendaraan_id : null;
               let kendaraan = datakendaraan.recordset.length > 0 ? datakendaraan.recordset[0].nama : null;
               let kapasitas_tonase = datakendaraan.recordset.length > 0 ? datakendaraan.recordset[0].tonase : null;
               let kapasitas_kubikasi = datakendaraan.recordset.length > 0 ? datakendaraan.recordset[0].kubikasi : null;
 
 
 
               let sqlDataDistributor = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
               let datadistributor = await request.query(sqlDataDistributor);
               let distributor_id = datadistributor.recordset.length > 0 ? datadistributor.recordset[0].m_distributor_id : null;
 
 
               let data = {
                 m_user_id: m_user_id,
                 nomor_so: nomor_so,
                 nomor_do: nomor_do,
                 do_number:do_number,
                 r_kendaraan_id: r_kendaraan_id,
                 m_transporter_id: m_transporter_id,
                 m_distributor_id: distributor_id,
                 tanggal_gi: tanggal_gi,
                 kode_kendaraan:kode_kendaraan.toUpperCase(),
                 kendaraan: kendaraan,
                 route:route,
                 plat_nomor_kendaraan: null,
                 kapasitas_tonase: kapasitas_tonase,
                 kapasitas_kubikasi: kapasitas_kubikasi,
                 catatan_pengiriman: null,
                 tanggal_do: tanggal_do,
                 tanggal_sampai_tujuan: tanggal_sampai_tujuan,
                 r_region_id: r_region_id,
                 pengirim: 'PT Marketama Indah',
                 penerima: penerima,
                 perusahaan_jasa_pengiriman: namatransporter,
                 kode_vendor:kode_vendor,
                 nama_driver: null,
                 nomor_sim_driver: null,
                 nomor_hp_driver: null,
                 nama_assisten_driver: null,
                 nomor_hp_assisten_driver: null,
                 total_tonase: numeral(total_tonase).format('0.0'),
                 total_kubikasi: numeral(total_kubikasi).format('0.0'),
                 actual_sampai_tujuan: null,
                 alamat: alamat_kirim_1,
                 tujuan: street,
                 details: datadetail,
                 kode_pos: kode_pos,
                 kode_soldto: kode_soldto,
                 alamat_kirim_2
               }
               rows.push(data)
 
             }
 
             // let dofromsap = rows.filter(o1 => listNoSap.some(o2 => o1.nomor_so === o2.nomor_sap));
             // let final = dofromsap.filter(o1 => !listNoDo.some(o2 => o1.nomor_do === o2.nomor_do));
             let final = rows.filter(o1 => !listNoDo.some(o2 => o1.nomor_do === o2.nomor_do));
             let finalrows = final.filter(o1 => o1.tanggal_gi);
 
             finalrows = _.orderBy(finalrows, ['nomor_do'], ['asc'])
 
             //let details = finalrows[3].details;
             //console.log(details);
             return res.success({
               result: finalrows,
               message: "Fetch Data successfully"
             });
 
 
           });
 
 
         }
       }
 
     } catch (err) {
       return res.error(err);
     }
   },
 

  
   rejectLogistik: async function (req, res) {
    const { delivery_order_id,m_user_id } = req.body; // --> terima request user
    console.log("PARAM ",delivery_order_id," muser ",m_user_id);

    // return res.error("xxxx")
    await DB.poolConnect; //--> inisialisasi variable DB
    try {
        const request = DB.pool.request(); //--> init var request koneksi

        let qcek = `select * from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0' ` //--> initialisasi vr cek
        let data_qcek = await request.query(qcek) // --> execute
        let data = data_qcek.recordset // --> ambil recordset nya aja
       

        let jml = data.length // jumlah baris di recordset

        if (jml > 0) {
          
          let ambilValue = `select delivery_order_id,bundle_id,console_number from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0'`;
          console.log("CEK bundle dan consol ",ambilValue);
          let execData = await request.query(ambilValue)
          let getBundle = execData.recordset[0].bundle_id;
          console.log("CEK BUNDLE .. ",getBundle);
          let getConsolNumber = execData.recordset[0].console_number;
          console.log("CEK CONSOL .. ",getConsolNumber);

          if (getConsolNumber == null || !getConsolNumber ) {
            console.log("masuk 1");
            const sql1 = `update delivery_order set kode_status = 'RJF' , status = 'Reject', updatedby = '${m_user_id}', updated = GETDATE(),isactive='N' where bundle_id = '${getBundle}'  `
            console.log(sql1);
            await request.query(sql1);

          }else{
            const sql2 = `update delivery_order set kode_status = 'RJF' , status = 'Reject', updatedby = '${m_user_id}', updated = GETDATE(),isactive='N' where console_number = '${getConsolNumber}'  `
            console.log(sql2);
            await request.query(sql2);
          }

          return res.success({
            message: "Berhasil "
          });

        } else {
            return res.error({
                message: "Data tidak terdaftar untuk konfirmasi logistik ! "
            });
        }

    } catch (err) {
        return res.error(err);
    }
    },

    konfirmLogistik: async function (req, res) {
      const { delivery_order_id } = req.body; // --> terima request user
      console.log("PARAM ",delivery_order_id);
  
      // return res.error("xxxx")
      await DB.poolConnect; //--> inisialisasi variable DB
      try {
          const request = DB.pool.request(); //--> init var request koneksi
  
          let qcek = `select * from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0' ` //--> initialisasi vr cek
          let data_qcek = await request.query(qcek) // --> execute
          let data = data_qcek.recordset // --> ambil recordset nya aja
         
  
          let jml = data.length // jumlah baris di recordset
  
          if (jml > 0) {
            
            let ambilValue = `select delivery_order_id,bundle_id,console_number from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0'`;
            console.log("CEK bundle dan consol ",ambilValue);
            let execData = await request.query(ambilValue)
            let getBundle = execData.recordset[0].bundle_id;
            console.log("CEK BUNDLE .. ",getBundle);
            let getConsolNumber = execData.recordset[0].console_number;
            console.log("CEK CONSOL .. ",getConsolNumber);
  
            if (getConsolNumber == null || !getConsolNumber ) {
              console.log("masuk 1");
              const sql1 = `update delivery_order set kode_status = 'WT1' , status = 'Placed Order' where bundle_id = '${getBundle}'  `
              console.log(sql1);
              await request.query(sql1);
  
            }else{
              const sql2 = `update delivery_order set kode_status = 'WT1' , status = 'Placed Order' where console_number = '${getConsolNumber}'  `
              console.log(sql2);
              await request.query(sql2);
            }
  
            return res.success({
              message: "Berhasil "
            });
  
          } else {
              return res.error({
                  message: "Data tidak terdaftar untuk konfirmasi logistik ! "
              });
          }
  
      } catch (err) {
          return res.error(err);
      }
      },
 

      multipleassignDOSapRitase: async function (req, res) {
        const {
          m_user_id,
          data,
          delivery_notes,
          tanggal_penjemputan,
          jam_penjemputan,
          console_number,
          lifetime,
          reason_lifetime,
          type_inner_outer,
          value_rate
        } = req.body;
   
   
        let type_inner_outer_param = type_inner_outer;
        let value_rate_param = value_rate;
        
        let tanggal_jemput = tanggal_penjemputan.concat(' ').concat(jam_penjemputan);
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
   
   
         // PROSES PENGECEKAN APAKAH CONSOLE NUMBER SUDAH PERNAH DIGUNAKAN ATAU BELUM.
         let sqlCheckDataConsoleNumber = `SELECT COUNT(1) AS jumlah_data FROM delivery_order WHERE console_number = '${console_number}'`;
         //console.log(sqlCheckDataConsoleNumber);
         let checkDataConsoleNumber = await request.query(sqlCheckDataConsoleNumber);
         let jumlahDataConsoleNumber = checkDataConsoleNumber.recordset[0].jumlah_data;
         
   
   
         if(jumlahDataConsoleNumber > 0){
           return res.error({
             message: 'Console Number Sudah digunakan harap ubah atau generate ulang console number yang baru'
           });
         }else{
   
          let errorMessage = [];
          let kendaraan_ = "";
          let jk = "";
          let rute = "";
          let totalRute = [];
          let totalDistributor = [];
   
          // PROSES VALIDASI SETIAP DO
          for (let i = 0; i < data.length; i++) {
           
           // JIKA KENDARAAN TIDAK SAMA MAKA AKAN DITOLAK KARENA JENIS KENDARAAN SETIAP DO HARUS SAMA
           if (i > 0) {
              if (kendaraan_ !== data[i].r_kendaraan_id) {
                let pesan = `Jenis Kendaraan setiap DO harus sama...`;
                errorMessage.push(pesan);  
              }
           }
   
           kendaraan_ = data[i].r_kendaraan_id;
           jk = data[i].kendaraan;
    
           let selk = `SELECT kode FROM r_kendaraan WHERE nama = '${jk}'`;
           let dtk = await request.query(selk)
           jk = dtk.recordset[0].kode;
       
           let r_kendaraan_id = data[i].r_kendaraan_id;
           let nomor_do = data[i].nomor_do;
           rute = data[i].route;
           totalRute.push(rute);
   
           // JIKA DATA JENIS KENDARAAN KOSONG MAKA AKAN DITOLAK
           if (!r_kendaraan_id) {
             let pesan = `Nomor DO : ${nomor_do} belum memiliki data Kendaraan`;
             errorMessage.push(pesan);
           }
   
           let m_distributor_id = data[i].m_distributor_id;
           let penerima = data[i].penerima;
   
   
           totalDistributor.push(m_distributor_id);
           
           if(!m_distributor_id){
   
             let pesan_validasi_penerima = `Data Penerima ${penerima} tidak aktif atau belum terdaftar di EIS`;
             errorMessage.push(pesan_validasi_penerima);
   
           }
   
   
          }
   
   
          for (let index = 0; index < totalDistributor.length; index++) {
                 
           let ruteTujuan = totalDistributor[index];
           let filterdata = data.filter(e => e.m_distributor_id == ruteTujuan);
   
           for (let i = 0; i < filterdata.length; i++) {
   
   
             let nomor_do = filterdata[i].nomor_do;
   
             for (let j = 0; j < filterdata[i].details.length; j++) {
   
               let m_produk_id = filterdata[i].details[j].m_produk_id;
               let kode_sap = filterdata[i].details[j].kode_sap;
               if(!m_produk_id){
                 errorMessage.push(`Nomor DO : ${nomor_do} terdapat barang dengan kode SKU ${kode_sap}. 
                 namun kode SKU ${kode_sap} tidak ditemukan di dalam System EIS harap daftarkan SKU terlebih 
                 dahulu agar dapat dilakukan kalkulasi perhitungan VSO kubikasi dan VSO tonase`);
               }
   
             } 
   
           }
         
          }
   
         // PROSES HITUNG JUMLAH DISTRIBUTOR, JIKA DISTRIBUTOR LEBIH DARI SATU RUTE. MAKA CONSOLE NUMBER TIDAK BOLEH KOSONG
         totalDistributor = _.uniq(totalDistributor);
         if(totalDistributor.length > 1 && !console_number){
             errorMessage.push('Tujuan Distributor lebih dari satu (Multi Drop) Konsol number tidak boleh kosong');
         }
          
         
         // JIKA RUTE KOSONG MAKA AKAN TERTOLAK
         if(!rute){
             errorMessage.push('Rute DO kosong pastikan rute terisi');
         }
   
   
          let valueTotalRuteIN = "";
          for (const datas of totalRute) {
           valueTotalRuteIN += ",'" + datas + "'"
          }
                        
          valueTotalRuteIN = valueTotalRuteIN.substring(1);
   
   
          // PROSES PENGAMBILAN DATA BIDDING BERDASARKAN HARGA RUTE TERMAHAL
          let selBidd = `SELECT * FROM bucket_bidding bb 
           INNER JOIN m_transporter_v c on c.kode = bb.kode 
           WHERE valid_from <= CONVERT(varchar(10),getdate(),120) 
           AND valid_until >= CONVERT(varchar(10),getdate(),120) AND ring = 1
           AND jenis_kendaraan = '${jk}' AND rute IN(${valueTotalRuteIN})
           AND harga = (
             SELECT max(harga) FROM bucket_bidding bb 
             INNER JOIN m_transporter_v c on c.kode = bb.kode 
               WHERE valid_from <= CONVERT(varchar(10),getdate(),120) 
               AND valid_until >= CONVERT(varchar(10),getdate(),120) AND ring = 1
               AND jenis_kendaraan = '${jk}' AND rute IN(${valueTotalRuteIN})
           )`;
   
           // console.log(selBidd);
           let getdtBidd = await request.query(selBidd);
           let dtBidd = getdtBidd.recordset;
     
           if (dtBidd.length == 0) {
             let pesan = `Data Transporter tidak ditemukan periksa kembali Rute dan Kendaraan nya : ${selBidd}`;
             errorMessage.push(pesan);
           }
     
           if(console_number && !type_inner_outer_param){
    
            let pesan = `Data Outer atau Inner Harus Dipilih`;
            errorMessage.push(pesan);
    
           }else if(console_number && type_inner_outer_param){
    
             if(!value_rate_param){
               let pesan = `Jumlah Rate tidak boleh kosong`;
               errorMessage.push(pesan);
             }
           
           }
   
   
         // JIKA ADA VALIDASI YANG TERTANGKAP MAKA AKAN MUNCUL MESSAGE ERROR
         if (errorMessage.length > 0) {
    
            let error = errorMessage
            return res.error({
              message: error[0]
            });
          } else {
   
   
               let delivery_order_header_id = uuid();
               let tanggal_sampai_tujuan = data[0].tanggal_sampai_tujuan;
               let m_transporter_id = data[0].m_transporter_id ? `'${data[0].m_transporter_id}'` : 'NULL';
               let r_logbidding_id = uuid();
   
   
               let delverynotes = delivery_notes ? `'${delivery_notes}'` : 'NULL';
               let consolenumber = console_number ? `'${console_number}'` : 'NULL';
               let typeouterinner = type_inner_outer_param ? `'${type_inner_outer_param}'` : 'NULL';
               let valuerate = value_rate_param ? `${value_rate_param}` : 'NULL';
               let reasonlifetime = reason_lifetime ? `'${reason_lifetime}'` : 'NULL';
               let generateBundleId = [];
               let totalBundleId = [];


               if(totalDistributor.length == 1){
                  let bundle_id = ``;
                  const sqlBundleId = `SELECT COUNT(1) + 1 AS bundle FROM delivery_bundle`;
                  const getbundelId = await request.query(sqlBundleId);
                  let bundle = getbundelId.recordset[0].bundle;
                  bundle_id = pad(bundle);
                  generateBundleId.push(bundle_id);
             }
                  
               let nomorId = console_number ? console_number : generateBundleId.toString();
   
               let insertHeader = `INSERT INTO delivery_order_header
               (delivery_order_header_id,createdby, updatedby, schedule_delivery_date, r_kendaraan_id, tanggal_sampai_tujuan, 
               m_transporter_id, status, kode_status, nomor_id, r_log_bidding_id)
               VALUES('${delivery_order_header_id}',
               '${m_user_id}',
               '${m_user_id}', 
               '${tanggal_penjemputan}', '${kendaraan_}', 
               '${tanggal_sampai_tujuan}', 
               ${m_transporter_id},'Waiting Approval', 'WT0', 
               '${nomorId}', '${r_logbidding_id}')`;
   
               console.log(insertHeader);
               await request.query(insertHeader);
   
   
               for (let index = 0; index < totalDistributor.length; index++) {
                 
                 let ruteTujuan = totalDistributor[index];
                 let bundle_id = ``;
   
                 const sqlBundleId = `SELECT COUNT(1) + 1 AS bundle FROM delivery_bundle`;
                 const getbundelId = await request.query(sqlBundleId);
                 let bundle = getbundelId.recordset[0].bundle;
                 bundle_id = pad(bundle);
                 totalBundleId.push(bundle_id);
   
                 let sqlinsertbundleid = `INSERT INTO delivery_bundle
                 (createdby, updatedby, line)
                 VALUES('${m_user_id}', '${m_user_id}',${bundle})`;
                 await request.query(sqlinsertbundleid);
   
               
                 let filterdata = data.filter(e => e.m_distributor_id == ruteTujuan);
                 
               
   
                         for (let i = 0; i < filterdata.length; i++) {
   
                           let delivery_order_id = uuid();
                           let sqlgetOrder = `SELECT * FROM c_order WHERE nomor_sap='${data[i].nomor_so}'`;
                           let getorder = await request.query(sqlgetOrder);
                           let dataorder = getorder.recordset[0];
                           let dataorderdo = dataorder ? `'${dataorder.c_order_id}'` : 'NULL';    
   
                           let sqlInsertDo = `INSERT INTO delivery_order
                           (delivery_order_id,
                           createdby, 
                           updatedby, 
                           c_order_id, 
                           schedule_delivery_date, 
                           nomor_do,
                           m_distributor_id,
                           r_kendaraan_id,
                           tanggal_sampai_tujuan, 
                           alamat, 
                           kode_pos, 
                           tonase, 
                           kubikasi, 
                           status, 
                           kode_status, 
                           tujuan, 
                           tanggal_do,
                           delivery_note,
                           bundle_id,
                           nomor_so,
                           tanggal_penjemputan,
                           console_number,r_log_bidding_id,route,reason_lifetime,
                           type_inner_outer,
                           jumlah_rate,
                           rate_multidrop,
                           delivery_order_header_id
                           )
                           VALUES('${delivery_order_id}',
                           '${m_user_id}',
                           '${m_user_id}', 
                           ${dataorderdo}, 
                           '${filterdata[i].tanggal_sampai_tujuan}', 
                           '${filterdata[i].nomor_do}', 
                           '${filterdata[i].m_distributor_id}',
                           '${filterdata[i].r_kendaraan_id}', 
                           '${filterdata[i].tanggal_sampai_tujuan}',
                           '${filterdata[i].alamat}', 
                           '${filterdata[i].kode_pos}', 
                           ${filterdata[i].total_tonase}, 
                           ${filterdata[i].total_kubikasi}, 
                           'Waiting Approval',
                           'WT0',
                           '${filterdata[i].tujuan.replace("'", "")}', 
                           '${filterdata[i].tanggal_do}',
                           ${delverynotes},
                           '${bundle_id}',
                           '${filterdata[i].nomor_so}',
                           '${tanggal_jemput}',
                           ${consolenumber},'${r_logbidding_id}','${filterdata[i].route}',${reasonlifetime},
                           ${typeouterinner},${valuerate},0,'${delivery_order_header_id}')`;
   
                           await request.query(sqlInsertDo);
                           for (let j = 0; j < filterdata[i].details.length; j++) {
   
                             filterdata[i].delivery_order_id = delivery_order_id;
                             
                             let batch = filterdata[i].details[j].batch ? `'${filterdata[i].details[j].batch}'` : 'NULL';
                             let satuan = filterdata[i].details[j].satuan ? `'${filterdata[i].details[j].satuan}'` : 'NULL';
                             let location_storage = filterdata[i].details[j].location_storage ? `'${filterdata[i].details[j].location_storage}'` : 'NULL';
                             let expired_date = filterdata[i].details[j].expired_date && !filterdata[i].details[j].expired_date == '0000-00-00' ? `'${filterdata[i].details[j].expired_date}'` : 'NULL';
                             let insertDetailDO = `INSERT INTO delivery_order_detail
                                 (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                                 batch,satuan,location_storage,expired_date)
                                 VALUES('${filterdata[i].m_user_id}','${filterdata[i].m_user_id}', '${delivery_order_id}', ${filterdata[i].details[j].line}, 
                                 '${filterdata[i].details[j].m_produk_id}', 
                                 ${filterdata[i].details[j].jumlah}, ${filterdata[i].details[j].tonase}, ${filterdata[i].details[j].kubikasi}, ${batch}, ${satuan}, ${location_storage},${expired_date})`;
                             
                             await request.query(insertDetailDO);
           
                           }                      
                         }
   
                         let arrayRoute = [];
                         for (let i = 0; i < dtBidd.length; i++) {
                           arrayRoute.push(dtBidd[i].rute);
                         }
   
                         let valueIN = "";
                         for (const datas of arrayRoute) {
                               valueIN += ",'" + datas + "'"
                         }
                                         
                         valueIN = valueIN.substring(1);
   
   
                         for (let i = 0; i < dtBidd.length; i++) {
   
   
                             let maxring = `SELECT MAX(ring) AS ring FROM bucket_bidding bb 
                             INNER JOIN m_transporter_v c on c.kode = bb.kode 
                             WHERE valid_from <= CONVERT(varchar(10),getdate(),120) 
                             AND valid_until >= CONVERT(varchar(10),getdate(),120)
                             AND jenis_kendaraan = '${jk}' AND rute IN (${valueIN})`;
   
   
                             let dsmax = await request.query(maxring);
                             let max = dsmax.recordset[0].ring
               
                             let m_transporter_id = dtBidd[i].m_transporter_id
                             let email_trans = dtBidd[i].email
                             let harga = dtBidd[i].harga
               
                             //PROSES PEMBENTUKAN REFERENCE LOG BIDDING
                             let insBid = `INSERT INTO r_log_bidding (r_log_bidding_id, delivery_order_id,
                               bundle_id,createby,m_transporter_id,email,
                               ring_transporter,harga,lifetime,isactive,max_ring,console_number)
                               VALUES (newid(),'${r_logbidding_id}','${bundle_id}','${m_user_id}','${m_transporter_id}','${email_trans}','1',
                               ${harga},${lifetime},1,${max},'${console_number}')`
                               await request.query(insBid);
                         }
          
               }
   
   

   
               return res.success({
                 result: data,
                 message: "Waiting Approval" 
               });
   
     
           }
         }
         
         } catch (err) {
          console.log(err);
          return res.error(err);
        }
      },

      multipleassignDOSapNonBidding: async function (req, res) {
        const {
          m_user_id,
          data,
          delivery_notes,
          tanggal_penjemputan,
          jam_penjemputan,
          console_number,
          reason_lifetime,
          type_inner_outer,
          value_rate
        } = req.body;
   
        console.log(req.body);
   
        let type_inner_outer_param = type_inner_outer;
        let value_rate_param = value_rate;
        
        let tanggal_jemput = tanggal_penjemputan.concat(' ').concat(jam_penjemputan);
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
   
   
         // PROSES PENGECEKAN APAKAH CONSOLE NUMBER SUDAH PERNAH DIGUNAKAN ATAU BELUM.
         let sqlCheckDataConsoleNumber = `SELECT COUNT(1) AS jumlah_data FROM delivery_order WHERE console_number = '${console_number}'`;
         //console.log(sqlCheckDataConsoleNumber);
         let checkDataConsoleNumber = await request.query(sqlCheckDataConsoleNumber);
         let jumlahDataConsoleNumber = checkDataConsoleNumber.recordset[0].jumlah_data;
         
   
   
         if(jumlahDataConsoleNumber > 0){
           return res.error({
             message: 'Console Number Sudah digunakan harap ubah atau generate ulang console number yang baru'
           });
         }else{
   
          let errorMessage = [];
          let kendaraan_ = "";
          let jk = "";
          let rute = "";
          let totalRute = [];
          let totalDistributor = [];
          let m_transporter_arr = [];
   
          // PROSES VALIDASI SETIAP DO
          for (let i = 0; i < data.length; i++) {
           
           // JIKA KENDARAAN TIDAK SAMA MAKA AKAN DITOLAK KARENA JENIS KENDARAAN SETIAP DO HARUS SAMA
           if (i > 0) {
              if (kendaraan_ !== data[i].r_kendaraan_id) {
                let pesan = `Jenis Kendaraan setiap DO harus sama...`;
                errorMessage.push(pesan);  
              }
           }


           let m_transporter_id = data[i].m_transporter_id;

           m_transporter_arr.push(m_transporter_id);
   
           kendaraan_ = data[i].r_kendaraan_id;
           jk = data[i].kendaraan;
    
           let selk = `SELECT kode FROM r_kendaraan WHERE nama = '${jk}'`;
           let dtk = await request.query(selk)
           jk = dtk.recordset[0].kode;
       
           let r_kendaraan_id = data[i].r_kendaraan_id;
           let nomor_do = data[i].nomor_do;
           rute = data[i].route;
           totalRute.push(rute);
   
           // JIKA DATA JENIS KENDARAAN KOSONG MAKA AKAN DITOLAK
           if (!r_kendaraan_id) {
             let pesan = `Nomor DO : ${nomor_do} belum memiliki data Kendaraan`;
             errorMessage.push(pesan);
           }
   
           let m_distributor_id = data[i].m_distributor_id;
           let penerima = data[i].penerima;
   
   
           totalDistributor.push(m_distributor_id);
           
           if(!m_distributor_id){
   
             let pesan_validasi_penerima = `Data Penerima ${penerima} tidak aktif atau belum terdaftar di EIS`;
             errorMessage.push(pesan_validasi_penerima);
   
           }
   
   
          }
   
   
          for (let index = 0; index < totalDistributor.length; index++) {
                 
           let ruteTujuan = totalDistributor[index];
           let filterdata = data.filter(e => e.m_distributor_id == ruteTujuan);
   
           for (let i = 0; i < filterdata.length; i++) {
   
   
             let nomor_do = filterdata[i].nomor_do;
   
             for (let j = 0; j < filterdata[i].details.length; j++) {
   
               let m_produk_id = filterdata[i].details[j].m_produk_id;
               let kode_sap = filterdata[i].details[j].kode_sap;
               if(!m_produk_id){
                 errorMessage.push(`Nomor DO : ${nomor_do} terdapat barang dengan kode SKU ${kode_sap}. 
                 namun kode SKU ${kode_sap} tidak ditemukan di dalam System EIS harap daftarkan SKU terlebih 
                 dahulu agar dapat dilakukan kalkulasi perhitungan VSO kubikasi dan VSO tonase`);
               }
   
             } 
   
           }
         
          }
   
         // PROSES HITUNG JUMLAH DISTRIBUTOR, JIKA DISTRIBUTOR LEBIH DARI SATU RUTE. MAKA CONSOLE NUMBER TIDAK BOLEH KOSONG
         totalDistributor = _.uniq(totalDistributor);
         if(totalDistributor.length > 1 && !console_number){
             errorMessage.push('Tujuan Distributor lebih dari satu (Multi Drop) Konsol number tidak boleh kosong');
         }
          
         
         // JIKA RUTE KOSONG MAKA AKAN TERTOLAK
         if(!rute){
             errorMessage.push('Rute DO kosong pastikan rute terisi');
         }
   
   
          let valueTotalRuteIN = "";
          for (const datas of totalRute) {
           valueTotalRuteIN += ",'" + datas + "'"
          }
                        
          valueTotalRuteIN = valueTotalRuteIN.substring(1);
          m_transporter_arr = _.uniq(m_transporter_arr);

          if(m_transporter_arr.length > 1){
            let pesan = `Transporter tidak boleh berbeda`;
            errorMessage.push(pesan);
          }else if(m_transporter_arr.length == 1){

              // AMBIL KODE TRANSPORTER

              let m_transporter_id = m_transporter_arr[0];

              let sqlGetDataTransporter = `SELECT * FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
              let getDataTransporter = await request.query(sqlGetDataTransporter);
              let kodeTransporter = getDataTransporter.recordset.length> 0 ? getDataTransporter.recordset[0].kode : null;

              // PROSES PENGAMBILAN DATA BIDDING BERDASARKAN HARGA RUTE TERMAHAL
              let selBidd = `SELECT * FROM bucket_bidding bb 
              INNER JOIN m_transporter_v c on c.kode = bb.kode 
              WHERE valid_from <= CONVERT(varchar(10),getdate(),120) 
              AND valid_until >= CONVERT(varchar(10),getdate(),120)
              AND jenis_kendaraan = '${jk}' AND rute IN(${valueTotalRuteIN}) AND bb.kode = '${kodeTransporter}'
              AND harga = (
                SELECT max(harga) FROM bucket_bidding bb 
                INNER JOIN m_transporter_v c on c.kode = bb.kode 
                  WHERE valid_from <= CONVERT(varchar(10),getdate(),120) 
                  AND valid_until >= CONVERT(varchar(10),getdate(),120)
                  AND jenis_kendaraan = '${jk}' AND rute IN(${valueTotalRuteIN}) AND bb.kode = '${kodeTransporter}'
              )`;

              // console.log(selBidd);
              let getdtBidd = await request.query(selBidd);
              let dtBidd = getdtBidd.recordset;

            if(m_transporter_arr.toString() != '2D816E90-DC1B-4CCD-AA3B-3D1BE04728A2'){
              if (dtBidd.length == 0) {
                let pesan = `Transporter tidak terdaftar dalam ACP harap pilih transporter yang memenuhi kriteria jenis kendaraan dan rute tujuan yang sesuai dengan data ACP !`;
                errorMessage.push(pesan);
              }
            }
           

          }
              
           if(console_number && !type_inner_outer_param){
    
            let pesan = `Data Outer atau Inner Harus Dipilih`;
            errorMessage.push(pesan);
    
           }else if(console_number && type_inner_outer_param){
    
             if(!value_rate_param){
               let pesan = `Jumlah Rate tidak boleh kosong`;
               errorMessage.push(pesan);
             }
           
           }
   
   
         // JIKA ADA VALIDASI YANG TERTANGKAP MAKA AKAN MUNCUL MESSAGE ERROR
         if (errorMessage.length > 0) {
    
            let error = errorMessage
            return res.error({
              message: error[0]
            });
          } else {
   
   
               let delivery_order_header_id = uuid();
               let tanggal_sampai_tujuan = data[0].tanggal_sampai_tujuan;
               let m_transporter_id = data[0].m_transporter_id ? `'${data[0].m_transporter_id}'` : 'NULL';
 
               let delverynotes = delivery_notes ? `'${delivery_notes}'` : 'NULL';
               let consolenumber = console_number ? `'${console_number}'` : 'NULL';
               let typeouterinner = type_inner_outer_param ? `'${type_inner_outer_param}'` : 'NULL';
               let valuerate = value_rate_param ? `${value_rate_param}` : 'NULL';
               let reasonlifetime = reason_lifetime ? `'${reason_lifetime}'` : 'NULL';   
               let generateBundleId = [];
               let totalBundleId = [];


               if(totalDistributor.length == 1){
                  let bundle_id = ``;
                  const sqlBundleId = `SELECT COUNT(1) + 1 AS bundle FROM delivery_bundle`;
                  const getbundelId = await request.query(sqlBundleId);
                  let bundle = getbundelId.recordset[0].bundle;
                  bundle_id = pad(bundle);
                  generateBundleId.push(bundle_id);
               }

        
                  
               let nomorId = console_number ? console_number : generateBundleId.toString();
   
               let insertHeader = `INSERT INTO delivery_order_header
               (delivery_order_header_id,createdby, updatedby, schedule_delivery_date, r_kendaraan_id, tanggal_sampai_tujuan, 
               m_transporter_id, status, kode_status, nomor_id)
               VALUES('${delivery_order_header_id}',
               '${m_user_id}',
               '${m_user_id}', 
               '${tanggal_penjemputan}', '${kendaraan_}', 
               '${tanggal_sampai_tujuan}', 
               ${m_transporter_id},'Draft', 'DOD', 
               '${nomorId}')`;
   
               console.log(insertHeader);
               await request.query(insertHeader);
   
   
               for (let index = 0; index < totalDistributor.length; index++) {
                 
                 let ruteTujuan = totalDistributor[index];
                 let bundle_id = ``;
   
                 const sqlBundleId = `SELECT COUNT(1) + 1 AS bundle FROM delivery_bundle`;
                 const getbundelId = await request.query(sqlBundleId);
                 let bundle = getbundelId.recordset[0].bundle;
                 bundle_id = pad(bundle);
                 totalBundleId.push(bundle_id);
   
                 let sqlinsertbundleid = `INSERT INTO delivery_bundle
                 (createdby, updatedby, line)
                 VALUES('${m_user_id}', '${m_user_id}',${bundle})`;
                 await request.query(sqlinsertbundleid);
   
               
                 let filterdata = data.filter(e => e.m_distributor_id == ruteTujuan);
                 
               
   
                         for (let i = 0; i < filterdata.length; i++) {
   
                           let delivery_order_id = uuid();
                           let sqlgetOrder = `SELECT * FROM c_order WHERE nomor_sap='${data[i].nomor_so}'`;
                           let getorder = await request.query(sqlgetOrder);
                           let dataorder = getorder.recordset[0];
                           let dataorderdo = dataorder ? `'${dataorder.c_order_id}'` : 'NULL';    
   
                           let sqlInsertDo = `INSERT INTO delivery_order
                           (delivery_order_id,
                           createdby, 
                           updatedby, 
                           c_order_id, 
                           schedule_delivery_date, 
                           nomor_do,
                           m_distributor_id,
                           r_kendaraan_id,
                           m_transporter_id,
                           tanggal_sampai_tujuan, 
                           alamat, 
                           kode_pos, 
                           tonase, 
                           kubikasi, 
                           status, 
                           kode_status, 
                           tujuan, 
                           tanggal_do,
                           delivery_note,
                           bundle_id,
                           nomor_so,
                           tanggal_penjemputan,
                           console_number,route,reason_lifetime,
                           type_inner_outer,
                           jumlah_rate,
                           rate_multidrop,
                           delivery_order_header_id
                           )
                           VALUES('${delivery_order_id}',
                           '${m_user_id}',
                           '${m_user_id}', 
                           ${dataorderdo}, 
                           '${filterdata[i].tanggal_sampai_tujuan}', 
                           '${filterdata[i].nomor_do}', 
                           '${filterdata[i].m_distributor_id}',
                           '${filterdata[i].r_kendaraan_id}', 
                           '${filterdata[i].m_transporter_id}',
                           '${filterdata[i].tanggal_sampai_tujuan}',
                           '${filterdata[i].alamat}', 
                           '${filterdata[i].kode_pos}', 
                           ${filterdata[i].total_tonase}, 
                           ${filterdata[i].total_kubikasi}, 
                           'Draft',
                           'DOD',
                           '${filterdata[i].tujuan.replace("'", "")}', 
                           '${filterdata[i].tanggal_do}',
                           ${delverynotes},
                           '${bundle_id}',
                           '${filterdata[i].nomor_so}',
                           '${tanggal_jemput}',
                           ${consolenumber},'${filterdata[i].route}',${reasonlifetime},
                           ${typeouterinner},${valuerate},0,'${delivery_order_header_id}')`;
   
                           await request.query(sqlInsertDo);
                           for (let j = 0; j < filterdata[i].details.length; j++) {
   
                             filterdata[i].delivery_order_id = delivery_order_id;
                             
                             let batch = filterdata[i].details[j].batch ? `'${filterdata[i].details[j].batch}'` : 'NULL';
                             let satuan = filterdata[i].details[j].satuan ? `'${filterdata[i].details[j].satuan}'` : 'NULL';
                             let location_storage = filterdata[i].details[j].location_storage ? `'${filterdata[i].details[j].location_storage}'` : 'NULL';
                             let expired_date = filterdata[i].details[j].expired_date && !filterdata[i].details[j].expired_date == '0000-00-00' ? `'${filterdata[i].details[j].expired_date}'` : 'NULL';
                             let insertDetailDO = `INSERT INTO delivery_order_detail
                                 (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                                 batch,satuan,location_storage,expired_date)
                                 VALUES('${filterdata[i].m_user_id}','${filterdata[i].m_user_id}', '${delivery_order_id}', ${filterdata[i].details[j].line}, 
                                 '${filterdata[i].details[j].m_produk_id}', 
                                 ${filterdata[i].details[j].jumlah}, ${filterdata[i].details[j].tonase}, ${filterdata[i].details[j].kubikasi}, ${batch}, ${satuan}, ${location_storage},${expired_date})`;
                             
                             await request.query(insertDetailDO);
           
                           }  


                           let c_shipment_id = uuid();
                           let total_biaya = 0;
                           const sqlInsertShipment = `INSERT INTO c_shipment
                               (c_shipment_id,createdby,updatedby, 
                               m_transporter_id,
                               total_biaya, 
                               status, 
                               status_dokumen,delivery_order_id)
                               VALUES('${c_shipment_id}','${filterdata[i].m_user_id}',
                               '${filterdata[i].m_user_id}', 
                               '${filterdata[i].m_transporter_id}', 
                               ${total_biaya}, 
                               'Vendor Transporter Terpilih',
                               'VALID','${delivery_order_id}')`;
               
                           await request.query(sqlInsertShipment);
                           
                           
                         }

               }
   
               return res.success({
                 result: data,
                 message: "Assign DO Non Bidding Successfully"
               });
   
     
           }
         }
         
         } catch (err) {
          console.log(err);
          return res.error(err);
        }
      },

  
  
   proveDelivery_new: async function (req, res) {
     // const {m_user_id,delivery_order_id,details} = req.body;
     const { doc_ba, m_user_id, delivery_order_id, documentname, details } = JSON.parse(req.body.document);
     console.log(`disini new ....`, details);
 
     await DB.poolConnect;
 
     try {
       const request = DB.pool.request();
 
       let sqlgetdeliveryorder = `SELECT * FROM delivery_order_v WHERE delivery_order_id='${delivery_order_id}'`;
       let getdeliveryorder = await request.query(sqlgetdeliveryorder);
       let nomor_do = getdeliveryorder.recordset[0].nomor_do
       let kode_status_do = getdeliveryorder.recordset.length > 0 ? getdeliveryorder.recordset[0].kode_status : undefined;
 
 
 
 
       let sqlgetrole = `SELECT nama FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
       let datarole = await request.query(sqlgetrole);
       let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : 'NOTACCES';
 
       let fieldupdate = ``;
       let updatepod = ``;
       let kode_status = ``;
       let status = ``;
 
       // force script disini
       rolename = `DISTRIBUTOR`
       kode_status_do = `SPL`
       if (rolename == 'DISTRIBUTOR') {
         fieldupdate = 'jumlah_approve_distributor';
         kode_status = 'PODDIST';
         status = 'POD Distributor';
 
         if (kode_status_do == 'SPL') {
           // console.log("cvcvc");
           // return res.error("dd")
           try {
             for (let i = 0; i < details.length; i++) {
               let sqlupdate = `UPDATE delivery_order_detail
                   SET ${fieldupdate} = ${details[i].actual_quantity}
                   WHERE delivery_order_detail_id = '${details[i].delivery_order_detail_id}'`;
               await request.query(sqlupdate);
 
               console.log(sqlupdate);
 
             }
           } catch (error) {
             console.log(error);
           }
 
 
           let sqlupdateHeader = `UPDATE delivery_order
               SET kode_status = '${kode_status}',
               status = '${status}' ${updatepod},
               tanggal_pod_distributor = getdate()
               WHERE delivery_order_id = '${delivery_order_id}'`;
           await request.query(sqlupdateHeader);
 
           let queryDataTable = `SELECT * FROM delivery_order_v WHERE delivery_order_id ='${delivery_order_id}'`;
 
           console.log("xxxxx", delivery_order_id);
           request.query(queryDataTable, async (err, result) => {
             if (err) {
               return res.error(err);
             }
             const row = result.recordset[0];
             const delivery_order_id = result.recordset[0].delivery_order_id;
             console.log("yyy", delivery_order_id);
 
             let cekSelisih = `select *,jumlah - jumlah_approve_distributor as selisih ,delivery_order_detail_id as xx
                 from delivery_order_detail where delivery_order_id = '${delivery_order_id}' 
                 and jumlah > jumlah_approve_distributor `
 
             console.log(cekSelisih);
             let dtSelisih = await request.query(cekSelisih);
             if (dtSelisih.recordset.length > 0) {
               let misspart_id = uuid();
               let dsMisspart = dtSelisih.recordset
               console.log(dsMisspart);
               for (let i = 0; i < dsMisspart.length; i++) {
                 let delivery_order_detail_id = dsMisspart[i].xx
                 let m_produk_id = dsMisspart[i].m_produk_id
                 let qty = dsMisspart[i].selisih
                 let alasan = dsMisspart[i].alasan
 
                 let insertDtl = `insert into delivery_order_misspart_detail 
                     (delivery_order_misspart_id,delivery_order_detail_id,m_produk_id,qty,alasan) values
                     ('${misspart_id}','${delivery_order_detail_id}','${m_produk_id}',${qty},'${alasan ? alasan : ''}')`
 
                 // console.log(insertDtl);
                 await request.query(insertDtl);
               }
               var uploadFile = req.file("doc_ba");
               var doc = await uploadFiles(misspart_id, uploadFile)
 
 
               let insHeader = `insert into delivery_order_misspart (delivery_order_misspart_id,delivery_order_id,
                     createby,kode_status,status,nomor_ba, document_ba) values ('${misspart_id}','${delivery_order_id}',
                       '${m_user_id}','WT1','Pengajuan','001','${documentname}')`
               await request.query(insHeader);
             }
             // return res.error(err);
 
             const sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
                 CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
                 CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
                 dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
                 dod.jumlah_approve_distributor,dod.jumlah_approve_transporter,
                 CASE WHEN '${rolename}'='DISTRIBUTOR' THEN dod.jumlah
                 WHEN '${rolename}'='TRANSPORTER' THEN dod.jumlah_approve_transporter ELSE dod.jumlah END AS actual_quantity,
                 do.bundle_id
                 FROM delivery_order_detail dod,m_produk mp,delivery_order do 
                 WHERE dod.delivery_order_id= '${delivery_order_id}'
                 AND dod.delivery_order_id = do.delivery_order_id
                 AND dod.jumlah > 0
                 AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
 
             const datadetail = await request.query(sqlDetail);
             row.details = datadetail.recordset;
 
             for (let j = 0; j < row.details.length; j++) {
 
               row.details[j].expired_date = row.details[j].expired_date ? moment(row.details[j].expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
             }
 
 
             let sqlDetailTracking = `SELECT * FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created ASC`;
             let datadetailTracking = await request.query(sqlDetailTracking);
             if (datadetailTracking.recordset.length > 0) {
               row.tracking = datadetailTracking.recordset;
               for (let j = 0; j < row.tracking.length; j++) {
 
                 row.tracking[j].datetracking = row.tracking[j].created ? moment(row.tracking[j].created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
               }
             }
 
 
 
             let sqlDetailLocation = `SELECT TOP 1 created,latitude,longitude FROM delivery_order_tracking 
                 WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
             let datadetailLocation = await request.query(sqlDetailLocation);
             if (datadetailLocation.recordset.length > 0) {
 
               row.location = datadetailLocation.recordset[0];
               row.location.datelocation = row.location.created ? moment(row.location.created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
               delete row.location.created;
 
 
             }


 
 
             return res.success({
               result: row,
               message: `${status} successfully`
             });
           });
 
         }
       }
       // return res.error(err)
 
     } catch (err) {
       return res.error(err)
     }
 
   },
 
   proveDelivery: async function (req, res) {
     const { m_user_id, delivery_order_id,file_pod_distributor, details } = req.body;
 
    //  console.log(`disini....`, req.body);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let sqlgetdeliveryorder = `SELECT * FROM delivery_order_v WHERE delivery_order_id='${delivery_order_id}'`;
       let getdeliveryorder = await request.query(sqlgetdeliveryorder);
       let kode_status_do = getdeliveryorder.recordset.length > 0 ? getdeliveryorder.recordset[0].kode_status : undefined;
       let nomor_do = getdeliveryorder.recordset.length > 0 ? getdeliveryorder.recordset[0].nomor_do : undefined;
       let tanggal_pod_distributor = getdeliveryorder.recordset.length > 0 ? moment(getdeliveryorder.recordset[0].tanggal_pod_distributor,'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;

       console.log('nomor_do ',nomor_do);
       console.log('tanggal_pod_distributor ',tanggal_pod_distributor);
 
       let sqlgetdeliveryorderdetail = `SELECT dod.*,mp.kode_sap AS kode_barang FROM delivery_order_detail dod,m_produk mp
       WHERE dod.delivery_order_id='${delivery_order_id}' AND dod.m_produk_id = mp.m_produk_id`;
       let getdeliveryorderdetail = await request.query(sqlgetdeliveryorderdetail);
       let deliveryorderdetail = getdeliveryorderdetail.recordset;
 
       let sqlgetrole = `SELECT nama FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
       let datarole = await request.query(sqlgetrole);
       let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : 'NOTACCES';
       console.log("kode_status_do",kode_status_do);
      console.log("rolename",rolename);
      // return res.error("ERROR");
       let fieldupdate = ``;
       let updatepod = ``;
       let kode_status = ``;
       let status = ``;
 
       console.log("masdijdaskj");
       // force script disini
       // rolename = `DISTRIBUTOR`
       // kode_status_do = `SPL`
 
       if (rolename == 'DISTRIBUTOR') {
         fieldupdate = 'jumlah_approve_distributor';
         kode_status = 'PODDIST';
         status = 'POD Distributor';
 
         if (kode_status_do == 'SPL') {
 
           for (let i = 0; i < details.length; i++) {
             let sqlupdate = `UPDATE delivery_order_detail
             SET ${fieldupdate} = ${details[i].jumlah_approve_distributor}
             WHERE delivery_order_detail_id = '${details[i].delivery_order_detail_id}'`;
             await request.query(sqlupdate);
 
           }

           let updateFilePod = ``;
           if(file_pod_distributor){
              updateFilePod = `, file_pod_distributor = '${file_pod_distributor}'`
           }
 
 
           let sqlupdateHeader = `UPDATE delivery_order
           SET kode_status = '${kode_status}',
           status = '${status}' ${updateFilePod},
           tanggal_pod_distributor = getdate()
           WHERE delivery_order_id = '${delivery_order_id}'`;
           await request.query(sqlupdateHeader);


           let queryAuditTracking = `INSERT INTO audit_tracking
           (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status)
           VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', '${m_user_id}', 
           '${kode_status}', '${status}')`;
           await request.query(queryAuditTracking);
 
           let queryDataTable = `SELECT * FROM delivery_order_v WHERE delivery_order_id ='${delivery_order_id}'`;
 
          //  console.log("dasdsadsa");
           request.query(queryDataTable, async (err, result) => {
             if (err) {
               return res.error(err);
             }
 
             const row = result.recordset[0];
             const delivery_order_id = result.recordset[0].delivery_order_id;
             const sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
             CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
             CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
             dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
             dod.jumlah_approve_distributor,dod.jumlah_approve_transporter,
             CASE WHEN '${rolename}'='DISTRIBUTOR' THEN dod.jumlah
             WHEN '${rolename}'='TRANSPORTER' THEN dod.jumlah_approve_transporter ELSE dod.jumlah END AS actual_quantity,
             do.bundle_id
             FROM delivery_order_detail dod,m_produk mp,delivery_order do 
             WHERE dod.delivery_order_id= '${delivery_order_id}'
             AND dod.delivery_order_id = do.delivery_order_id
             AND dod.jumlah > 0
             AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
 
             const datadetail = await request.query(sqlDetail);
             row.details = datadetail.recordset;
 
             for (let j = 0; j < row.details.length; j++) {
 
               row.details[j].expired_date = row.details[j].expired_date ? moment(row.details[j].expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
             }
 
 
             let sqlDetailTracking = `SELECT * FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created ASC`;
             let datadetailTracking = await request.query(sqlDetailTracking);
             if (datadetailTracking.recordset.length > 0) {
               row.tracking = datadetailTracking.recordset;
               for (let j = 0; j < row.tracking.length; j++) {
 
                 row.tracking[j].datetracking = row.tracking[j].created ? moment(row.tracking[j].created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
               }
             }
 
 
 
             let sqlDetailLocation = `SELECT TOP 1 created,latitude,longitude FROM delivery_order_tracking 
             WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
             let datadetailLocation = await request.query(sqlDetailLocation);
             if (datadetailLocation.recordset.length > 0) {
 
               row.location = datadetailLocation.recordset[0];
               row.location.datelocation = row.location.created ? moment(row.location.created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
               delete row.location.created;
 
 
             }
 
             return res.success({
               result: row,
               message: `${status} successfully`
             });
           });
 
 
         } else {
 
           return res.error({
             message: `Belum bisa melakukan POD`
           });
 
         }
 
       } else if(rolename=='TRANSPORTER' && kode_status_do == 'PODLOG'){
        console.log("MASUKK123");
        // console.log("details",details);

        fieldupdate = ' jumlah_approve_transporter';
        kode_status = 'PODTRANS';
        status = 'POD Transporter';
        updatepod = `, tanggal_pod_transporter = getdate()`;
        
        for (let i = 0; i < details.length; i++) {
        console.log("MASUK11");
        // try {
          let sqlupdate = `UPDATE delivery_order_detail
          SET ${fieldupdate} = ${details[i].jumlah_approve_transporter}
          WHERE delivery_order_detail_id = '${details[i].delivery_order_detail_id}'`;
          console.log(sqlupdate);

          await request.query(sqlupdate);
          // return res.error("ERORRRR");
        // } catch (error) {
        //   console.log(error);
        //   // return res.error(error)
        // }
        console.log("MASUK12");
       }

       let sqlupdateHeader = `UPDATE delivery_order
       SET kode_status = '${kode_status}',
       status = '${status}' ${updatepod}
       WHERE delivery_order_id = '${delivery_order_id}'`;
       await request.query(sqlupdateHeader);

       let queryAuditTracking = `INSERT INTO audit_tracking
       (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status)
       VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', '${m_user_id}', 
       '${kode_status}', '${status}')`;
       await request.query(queryAuditTracking);

        return res.success({
          message: `${status} successfully`
        });

       } else {
          console.log("popopop"); 
         if (kode_status_do == 'FNS' || kode_status_do == 'PODLOG') {
          console.log("kode_status_do", kode_status_do);
           if(rolename=='LOGISTIK'){
          //  if(rolename=='TRANSPORTER'){
            console.log("rolename logistic", rolename);
             fieldupdate = ', jumlah_approve_logistik';
             kode_status = 'PODLOG';
             status = 'POD Logistik';
             updatepod = `, tanggal_pod_logistik = getdate()`;
            
             let datasdetail = [];
             // Proses pembentukan SOAP
             for (let i = 0; i < deliveryorderdetail.length; i++) {
              console.log("datasdetail",datasdetail);

              let jumlahAbsolute = details[i].jumlah_approve_logistik - details[i].jumlah;
              let grund = ``;
              console.log("jumlahAbsolute",jumlahAbsolute);
              console.log("details",details);
                if(jumlahAbsolute > 0){
                  grund = `ZLBH`;
                }else{
                  grund = `ZKRG`;
                }
                console.log("MASUK GROUND",datasdetail);

                  datasdetail.push({
                    POSNR  : deliveryorderdetail[i].line,
                    POSNR2 : deliveryorderdetail[i].item_head,
                    MATNR : deliveryorderdetail[i].kode_barang,
                    LFIMG_DIFF:abs(jumlahAbsolute),
                    CHARG : deliveryorderdetail[i].batch,
                    VRKME : deliveryorderdetail[i].satuan,
                    GRUND : grund,
                    LGORT1 : '',
                    LGORT2 : ''
                  });
    
             }
             console.log("LKLKDSLK");
 

            //LOGIC POD SAP
             let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
             let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
             let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
             console.log("MASUK 3");
             let usernamesoap = sails.config.globals.usernamesoap;
             let passwordsoap = sails.config.globals.passwordsoap;
             console.log("MASUK 4");
             let url = ``;
             if (statusIntegasi == 'DEV') {
              console.log("MASUK 5 DEV");
              usernamesoap = sails.config.globals.usernamesoapdev;
              passwordsoap = sails.config.globals.passwordsoapdev;
   
               url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_pod2/120/zws_sales_pod2/zbn_sales_pod2'; //development
   
             } else {
              
              url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_pod2/120/zws_sales_pod2/zbn_sales_pod2'; //development
              //  url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_pod2/zbn_sales_pod2'; // production
               console.log("MASUK 5 DEV",url);
             }

             let xml = fs.readFileSync('soap/ZBN_SALES_POD2.xml', 'utf-8');
             console.log("MASUK KE XML",xml);
             let hasil1 = racikXML2(xml, datasdetail, 'ITEM');
             let hasil2 = hasil1.replace('tgl_pod_distributor', tanggal_pod_distributor);
             let hasil3 = hasil2.replace('nomor_do', nomor_do);
             console.log("MASUK 6",hasil3);
             const tok = `${usernamesoap}:${passwordsoap}`;
             const hash = Base64.encode(tok);
             const Basic = 'Basic ' + hash;
             console.log("MASUK 7");
             let Headers = {
              'Authorization': Basic,
              'user-agent': 'ESALES',
              'Content-Type': 'text/xml;charset=UTF-8',
              'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_sales_pod2:ZIFSD_POST_VLPOD2Request',
            };
            console.log("MASUK 8");

            // try {
             let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil3, timeout: 1000000 });
             let { body, statusCode } = response;
            // } catch (error) {
            //     return res.error("MASALAHNYA DISININIH");
            //   }

             console.log("MASUK LAGI",response);

             if (statusCode == 200) {
              console.log("MASUK 9",statusCode);
              var parser = new xml2js.Parser({ explicitArray: false });
              parser.parseString(body, async function (err, result) {
               console.log("MASUK 9");
              const RETURN = result['soap-env:Envelope']['soap-env:Body']['n0:ZIFSD_POST_VLPOD2Response'].RETURN;
              console.log("MASUK 10");
              let isArray = Array.isArray(RETURN);
              let messageError = [];
              if(!isArray){
                messageError.push(RETURN.item.MESSAGE);
              }else{
                for (let index = 0;  index < RETURN.item.length; index++) {
                  messageError.push(RETURN.item[index].MESSAGE);
                }
              }
              console.log('messageError ',messageError.toString());

              if(messageError.length > 0){
                
                return res.error({
                  message: messageError.toString()
                });

              }else{  

                console.log("MASUK 6");
              for (let i = 0; i < details.length; i++) {
 
                  let sqlupdate = `UPDATE delivery_order_detail
                  SET actual_quantity = ${details[i].jumlah_approve_logistik}
                  ${fieldupdate} = ${details[i].jumlah_approve_logistik}
                  WHERE delivery_order_detail_id = '${details[i].delivery_order_detail_id}'`;
                  await request.query(sqlupdate);
                
               }
   
               let sqlupdateHeader = `UPDATE delivery_order
               SET kode_status = '${kode_status}',
               status = '${status}' ${updatepod}
               WHERE delivery_order_id = '${delivery_order_id}'`;
               await request.query(sqlupdateHeader);

                return res.success({
                  message: `${status} successfully`
                });
             
             
              }

              
              });

             }


       

 

 
           }else if(rolename=='TRANSPORTER'){
 
 
             kode_status = 'PODTRANS';
             status = 'POD Transporter';
             updatepod = `, tanggal_pod_transporter = getdate()`;
 
 
 
             for (let i = 0; i < details.length; i++) {
 
               let sqlupdate = `UPDATE delivery_order_detail
               SET jumlah_approve_transporter = ${details[i].jumlah_approve_transporter}
               WHERE delivery_order_detail_id = '${details[i].delivery_order_detail_id}'`;
 
               console.log(sqlupdate);
 
               await request.query(sqlupdate);
   
             
             }
 
  
             return res.success({
               message: `${status} successfully`
             });
   
   
           }
 
           // fieldupdate = ', jumlah_approve_transporter';
           // kode_status = 'PODTRANS';
           // status = 'POD Transporter';
           // updatepod = `, tanggal_pod_transporter = getdate()`;
 
 
 
 
           // let queryDataTable = `SELECT * FROM delivery_order_v WHERE delivery_order_id ='${delivery_order_id}'`;
 
 
           // request.query(queryDataTable, async (err, result) => {
           //   if (err) {
           //     return res.error(err);
           //   }
 
           //   const row = result.recordset[0];
           //   const delivery_order_id = result.recordset[0].delivery_order_id;
           //   const sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
           //   CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
           //   CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
           //   dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
           //   dod.jumlah_approve_distributor,dod.jumlah_approve_transporter,
           //   CASE WHEN '${rolename}'='DISTRIBUTOR' THEN dod.jumlah
           //   WHEN '${rolename}'='TRANSPORTER' THEN dod.jumlah_approve_transporter ELSE dod.jumlah END AS actual_quantity,
           //   do.bundle_id
           //   FROM delivery_order_detail dod,m_produk mp,delivery_order do 
           //   WHERE dod.delivery_order_id= '${delivery_order_id}'
           //   AND dod.delivery_order_id = do.delivery_order_id
           //   AND dod.jumlah > 0
           //   AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
 
           //   const datadetail = await request.query(sqlDetail);
           //   row.details = datadetail.recordset;
 
           //   for (let j = 0; j < row.details.length; j++) {
 
           //     row.details[j].expired_date = row.details[j].expired_date ? moment(row.details[j].expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
           //   }
 
 
           //   let sqlDetailTracking = `SELECT * FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created DESC`;
           //   let datadetailTracking = await request.query(sqlDetailTracking);
           //   if (datadetailTracking.recordset.length > 0) {
           //     row.tracking = datadetailTracking.recordset;
           //     for (let j = 0; j < row.tracking.length; j++) {
 
           //       row.tracking[j].datetracking = row.tracking[j].created ? moment(row.tracking[j].created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
           //     }
           //   }
 
 
 
           //   let sqlDetailLocation = `SELECT TOP 1 created,latitude,longitude FROM delivery_order_tracking 
           //   WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
           //   let datadetailLocation = await request.query(sqlDetailLocation);
           //   if (datadetailLocation.recordset.length > 0) {
 
           //     row.location = datadetailLocation.recordset[0];
           //     row.location.datelocation = row.location.created ? moment(row.location.created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
           //     delete row.location.created;
 
 
           //   }
 
           //   return res.success({
           //     result: row,
           //     message: `${status} successfully`
           //   });
           // });
  
 
         } else {
 
           return res.error({
             message: `Belum bisa melakukan POD`
           });
 
         }
 
       }
 
     } catch (err) {
       return res.error(err);
     }
   },
   simpanDo: async function (req, res) {
     const {
       m_user_id,
       m_transporter_id,
       r_kendaraan_id,
       email_konfirmasi,
       delivery_notes,
       data,
     } = req.body;
 
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       // return res.error("ccc");
       if (!data.delivery_order_id) {
 
 
 
         let catatan = delivery_notes ? `'${delivery_notes}'` : 'NULL';
         let delivery_order_id = uuid();
         let sqlgetOrder = `SELECT * FROM c_order WHERE nomor_sap='${data.nomor_so}'`;
         let getorder = await request.query(sqlgetOrder);
         let dataorder = getorder.recordset[0];
 
         let sqlInsertDo = `INSERT INTO delivery_order
         (delivery_order_id,
         createdby, 
         updatedby, 
         c_order_id, 
         schedule_delivery_date, 
         nomor_do, 
         r_kendaraan_id,
         m_transporter_id,
         tanggal_sampai_tujuan, 
         alamat, 
         kode_pos, 
         tonase, 
         kubikasi, 
         status, 
         kode_status, 
         tujuan, 
         tanggal_do,
         delivery_note)
         VALUES('${delivery_order_id}',
         '${m_user_id}',
         '${m_user_id}', 
         '${dataorder.c_order_id}', 
         '${data.tanggal_sampai_tujuan}', 
         '${data.nomor_do}', 
         '${r_kendaraan_id}', 
         '${m_transporter_id}',
         '${data.tanggal_sampai_tujuan}', 
         '${data.tujuan}', 
         '${data.kode_pos}', 
         ${data.total_tonase}, 
         ${data.total_kubikasi}, 
         'Draft',
         'DOD',
         '${data.tujuan}', 
         '${data.tanggal_do}',
         ${catatan})`;
 
 
         request.query(sqlInsertDo, async (err, result) => {
           if (err) {
             return res.error(err);
           }
           for (let i = 0; i < data.details.length; i++) {
 
 
             let batch = data.details[i].batch ? `'${data.details[i].batch}'` : 'NULL';
             let satuan = data.details[i].satuan ? `'${data.details[i].satuan}'` : 'NULL';
             let location_storage = data.details[i].location_storage ? `'${data.details[i].location_storage}'` : 'NULL';
             let expired_date = data.details[i].expired_date ? `'${data.details[i].expired_date}'` : 'NULL';
             let insertDetailDO = `INSERT INTO delivery_order_detail
             (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, batch,satuan,location_storage,expired_date)
             VALUES('${data.m_user_id}','${data.m_user_id}', '${delivery_order_id}', ${data.details[i].line}, 
             '${data.details[i].m_produk_id}', 
             ${data.details[i].jumlah}, ${data.details[i].tonase}, ${data.details[i].kubikasi}, ${batch}, ${satuan}, ${location_storage},${expired_date})`;
 
             await request.query(insertDetailDO);
 
           }
 
           data.delivery_order_id = delivery_order_id;
           return res.success({
             result: data,
             message: "Update DO Successfully"
           });
 
 
         });
 
 
       }
     } catch (err) {
       return res.error(err);
     }
   },
 
   pushTrackingDo: async function (req, res) {
     const { m_user_id, delivery_order_id, latitude, longitude } = req.body;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let sql = `INSERT INTO delivery_order_tracking
       (createdby, updatedby, delivery_order_id, latitude, longitude)
       VALUES('${m_user_id}', '${m_user_id}, '${delivery_order_id}', '${latitude}', '${longitude}')`;
 
       request.query(sql, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         return res.success({
           data: result,
           message: "Approve FKR successfully"
         });
       });
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   pushStatusDo: async function (req, res) {
     const { m_user_id, delivery_order_id, kode_status, latitude, longitude } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
 
       let status = ``;
       if (kode_status == 'SGE') {
         status = 'Sampai gudang Enesis';
       } else if (kode_status == 'PIC') {
         status = 'Picking barang';
       } else if (kode_status == 'OTW') {
         status = 'Proses Pengantaran';
       } else if (kode_status == 'SPL') {
         status = 'Driver Telah Sampai lokasi';
       } else if (kode_status == 'CHG') {
         status = 'Driver melakukan pergantian driver';
       } else if (kode_status == 'FNS') {
         status = 'Finish';
 
         let sqlgetdatado = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}' AND kode_status IN('PODDIST')`;
         let datado = await request.query(sqlgetdatado);
 
         if (datado.recordset.length == 0) {
 
           return res.error("Distributor Belum Melakukan Konfirmasi Penerimaan");
 
         }
       }
 
       let updateKodestatus = ``;
       if (kode_status == 'CHG') {
         updateKodestatus = ``;
       } else {
         updateKodestatus = `, kode_status='${kode_status}'`;
       }
 
  
 
   
         if (kode_status == 'PIC') {
 
 
           let sqlgetdatado = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
           let datado = await request.query(sqlgetdatado);
           let nomor_do = datado.recordset[0].nomor_do;
 
 
           let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
           let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
           let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
 
           let url = ``;
           if (statusIntegasi == 'DEV') {
 
            //  url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_do/120/zws_sales_do/zbn_sales_do'; //development
             url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production
 
           } else {
 
             url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production
 
           }
 
 
           let usernamesoap = sails.config.globals.usernamesoap;
           let passwordsoap = sails.config.globals.passwordsoap;
           const tok = `${usernamesoap}:${passwordsoap}`;
           const hash = Base64.encode(tok);
           const Basic = 'Basic ' + hash;
 
           let datas = [];
           datas.push({
             VBELN: nomor_do
           });
 
 
 
           if (datas.length > 0) {
             let Headers = {
               'Authorization': Basic,
               'user-agent': 'sampleTest',
               'Content-Type': 'text/xml;charset=UTF-8',
               'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_DO:ZFM_WS_DORequest',
             };
 
 
             let xml = fs.readFileSync('soap/ZFM_SW_DO_DRAFT.xml', 'utf-8');
             let hasil = racikXML(xml, datas, 'urn:ZFM_WS_DO');
 
            //  console.log(hasil);
             let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
             let { body, statusCode } = response;
 
             let audit_gi_id = uuid();
             let sqlauditgi = `INSERT INTO audit_gi (audit_gi_id, delivery_order_id, m_user_id, kode_status, param_gi,statusCode) 
             VALUES('${audit_gi_id}', '${delivery_order_id}', '${m_user_id}', '${kode_status}', '${hasil}','${statusCode}')`;
             await request.query(sqlauditgi);
             if (statusCode == 200) {
 
 
               var parser = new xml2js.Parser({ explicitArray: false });
               parser.parseString(body, async function (err, result) {
                 const populatedHeader = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOHEAD'].item;
                 const populatedLine = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOITEM'].item;

 
                 if(populatedHeader){
                  let tanggal_gi = populatedHeader.WADAT_IST;
                  let updateAudit = `UPDATE audit_gi SET tgl_gi='${tanggal_gi}' WHERE audit_gi_id='${audit_gi_id}'`;
                  await request.query(updateAudit);
                  if (tanggal_gi !== '0000-00-00') {
  
                    if (tanggal_gi) {


                      let sql = `UPDATE delivery_order
                      SET updated=getdate(), updatedby='${m_user_id}',
                      status='${status}' ${updateKodestatus}
                      WHERE delivery_order_id='${delivery_order_id}'`;
                      await request.query(sql);

                      let sqlpushlocation = `INSERT INTO delivery_order_tracking (createdby, updatedby, delivery_order_id, latitude, longitude) 
                      VALUES('${m_user_id}', '${m_user_id}', '${delivery_order_id}', '${latitude}', '${longitude}')`;
                      await request.query(sqlpushlocation);
              
              
                      let queryAuditTracking = `INSERT INTO audit_tracking (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status) 
                      VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
                      await request.query(queryAuditTracking);
              
                      let sqlcekstatusterakhir = `SELECT TOP 1 audit_tracking_id,kode_status FROM audit_tracking 
                      WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
                      let datastatusterakhir = await request.query(sqlcekstatusterakhir);
                      let kodestatus = ``;
                      let actionstatus = 0;
                      let audit_tracking_id = ``;
              
                      if (datastatusterakhir.recordset.length > 0) {
                        kodestatus = datastatusterakhir.recordset[0].kode_status;
                        audit_tracking_id = datastatusterakhir.recordset[0].audit_tracking_id;
                        actionstatus = 1;
                      }
              
                      if (actionstatus > 0) {
                        if (kodestatus == kode_status) {
              
                          let queryAuditTracking = `UPDATE audit_tracking 
                                SET updated=getdate(),updatedby='${m_user_id}' WHERE audit_tracking_id = '${audit_tracking_id}'`;
                          await request.query(queryAuditTracking);
              
                        } else {
              
                          let queryAuditTracking = `INSERT INTO audit_tracking
                                (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
                                VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
                          await request.query(queryAuditTracking);
              
                        }
                      }

                      if (populatedLine.VBELN) {
  
                        let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                        await request.query(deletelines);
  
                        let kode_sap = Number(populatedLine.MATNR);
                        let quantity = Number(populatedLine.LFIMG);
                        let line = parseInt(populatedLine.POSNR);
                        let batch = populatedLine.CHARG;
  
                        let location_storage = populatedLine.LGORT;
                        let expired_date = populatedLine.VFDAT;
                        let nomor_so = populatedLine.VGBEL;
                        let item_head = populatedLine.UECHA;
  
                        let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                        let dataproduct = await request.query(sqldataproduk);
                        let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                        let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                        let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                        let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                        let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                        let satuan = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].satuan : 0;
                        let tonase_detail = tonase * quantity;
                        let kubikasi_detail = kubikasi * quantity;
  
                        let data = {
  
                          line: line,
                          m_produk_id: m_produk_id,
                          kode_barang: kode_barang,
                          nama_barang: nama_barang,
                          jumlah: quantity,
                          tonase: tonase_detail,
                          kubikasi: kubikasi_detail,
                          batch: batch,
                          satuan: satuan,
                          location_storage: location_storage,
                          expired_date: expired_date,
                          nomor_so: nomor_so,
                          item_head:item_head
  
                        }
  
                        let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                        let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                        let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                        let dataexpired_date = data.expired_date ? `'${data.expired_date}'` : 'NULL';
                        let insertDetailDO = `INSERT INTO delivery_order_detail 
                        (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase,kubikasi,batch,satuan,location_storage,expired_date,nomor_so)
                        VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line}, '${data.m_produk_id}',${data.jumlah}, ${data.tonase}, 
                        ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},${dataexpired_date},'${nomor_so}')`;
                        await request.query(insertDetailDO);
  
                        let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                        await request.query(updateTglGi);
  
                      } else {
  
                        let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                        await request.query(deletelines);
                        let total_tonase = 0;
                        let total_kubikasi = 0;
                        for (let i = 0; i < populatedLine.length; i++) {
  
                          let kode_sap = Number(populatedLine[i].MATNR);
                          let quantity = Number(populatedLine[i].LFIMG);
                          let line = parseInt(populatedLine[i].POSNR);
                          let batch = populatedLine[i].CHARG;
                          let satuan = populatedLine[i].VRKME;
                          let location_storage = populatedLine[i].LGORT;
                          let expired_date = populatedLine[i].VFDAT;
                          let nomor_so = populatedLine[i].VGBEL;
  
                          let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                          let dataproduct = await request.query(sqldataproduk);
                          let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                          let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                          let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                          let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                          let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                          let tonase_detail = tonase * quantity;
                          let kubikasi_detail = kubikasi * quantity;
  
                          total_tonase = total_tonase + tonase;
                          total_kubikasi = total_kubikasi + kubikasi;
  
                          let data = {
  
                            line: line,
                            m_produk_id: m_produk_id,
                            kode_barang: kode_barang,
                            nama_barang: nama_barang,
                            jumlah: quantity,
                            tonase: tonase_detail,
                            kubikasi: kubikasi_detail,
                            batch: batch,
                            satuan: satuan,
                            location_storage: location_storage,
                            expired_date: expired_date
  
                          }
  
                          let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                          let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                          let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                          let dataexpired_date = data.expired_date && !data.expired_date == '0000-00-00' ? `'${data.expired_date}'` : 'NULL';
                          let insertDetailDO = `INSERT INTO delivery_order_detail (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi,batch,satuan,location_storage,expired_date,nomor_so) 
                          VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line},'${data.m_produk_id}',${data.jumlah}, ${data.tonase}, ${data.kubikasi}, 
                          ${databatch}, ${datasatuan}, ${datalocation_storage},${dataexpired_date},'${nomor_so}')`;
  
                          await request.query(insertDetailDO);
  
                          let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                          await request.query(updateTglGi);
  
                        }
  
                      }
                    } else {
  
                      let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',
                      status='Sampai gudang Enesis',kode_status='SGE' WHERE delivery_order_id='${delivery_order_id}'`;
                      await request.query(sql);
                      let sqlDelete = `DELETE FROM audit_tracking WHERE delivery_order_id='${delivery_order_id}' AND kode_status='PIC'`;
                      await request.query(sqlDelete);
                      return res.error("Picking Belum Selesai");
  
  
                    }
  
  
                    return res.success({
                      data: resultheade,
                      message: "Update Status successfully"
                    });
  
                  } else {
  
                    let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',
                    status='Sampai gudang Enesis', kode_status='SGE' 
                    WHERE delivery_order_id='${delivery_order_id}'`;
                    await request.query(sql);
  
                    let sqlDelete = `DELETE FROM audit_tracking WHERE delivery_order_id='${delivery_order_id}' AND kode_status='PIC'`;
                    await request.query(sqlDelete);

                    return res.error("Picking Belum Selesai");
  
  
                  }
                 }else{

                  let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',
                  status='Sampai gudang Enesis',kode_status='SGE'
                  WHERE delivery_order_id='${delivery_order_id}'`;
                  await request.query(sql);


                  let sqlDelete = `DELETE FROM audit_tracking WHERE delivery_order_id='${delivery_order_id}' AND kode_status='PIC'`;
                  await request.query(sqlDelete);
                  return res.error("Picking Belum Selesai");
  
                   
                 }

                 
               });
 
             } else {


               let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',
               status='Sampai gudang Enesis',kode_status='SGE'
               WHERE delivery_order_id='${delivery_order_id}'`;
               await request.query(sql);
 
               return res.error("SAP tidak meresponse coba ulangi lagi");
             }
           }
 
         } else {


            //kondisikan update ketika berhasil
            let sql = `UPDATE delivery_order
            SET updated=getdate(), updatedby='${m_user_id}',
            status='${status}' ${updateKodestatus}
            WHERE delivery_order_id='${delivery_order_id}'`;
            await request.query(sql);
 
 
           return res.success({
             message: "Update Status successfully"
           });
 
         }
 


     } catch (err) {
       return res.error(err);
     }
   },
 
 
   pushStatusDoMultiple: async function (req, res) {
     const { m_user_id, kode_status, latitude, longitude, data } = req.body;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let errorMessage = [];
       let responseData = [];
       for (let i = 0; i < data.length; i++) {
 
         let bundle_id = data[i].bundle_id;
         let sqlgetdeliveryorder = `SELECT * FROM delivery_order_v WHERE bundle_id='${bundle_id}'`;
         let datadeliveryorder = await request.query(sqlgetdeliveryorder);
         let deliveryorder = datadeliveryorder.recordset;
 
 
         for (let j = 0; j < deliveryorder.length; j++) {
 
           let delivery_order_id = deliveryorder[j].delivery_order_id;
           let kode_statusExisting = deliveryorder[j].kode_status;
           let statusExisting = deliveryorder[j].kode_status;
 
 
 
           let status = ``;
           if (kode_status == 'SGE') {
             status = 'Sampai gudang Enesis';
             if (!kode_statusExisting == 'DOD') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
 
           } else if (kode_status == 'PIC') {
             status = 'Picking barang';
             if (!kode_statusExisting == 'SGE') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
           } else if (kode_status == 'OTW') {
             status = 'Proses Pengantaran';
             if (!kode_statusExisting == 'PIC') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
           } else if (kode_status == 'SPL') {
             status = 'Driver Telah Sampai lokasi';
             if (!kode_statusExisting == 'OTW') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
           } else if (kode_status == 'CHG') {
             status = 'Driver melakukan pergantian driver';
             if (!kode_statusExisting == 'OTW') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
           } else if (kode_status == 'FNS') {
             status = 'Finish';
             if (!kode_statusExisting == 'PODDIST') {
 
               return res.error(`Status sudah ${statusExisting} tidak dapat melakukan perubahan status`);
 
             }
 
             let sqlgetdatado = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}' AND kode_status IN('PODDIST')`;
             let datado = await request.query(sqlgetdatado);
 
             if (datado.recordset.length == 0) {
 
               return res.error("Distributor Belum Melakukan Konfirmasi Penerimaan");
               //errorMessage.push('Distributor Belum Melakukan Konfirmasi Penerimaan');
 
             }
 
 
           }
 
           if (kode_statusExisting == kode_status) {
 
             return res.error(`Status sudah ${status} tidak dapat melakukan perubahan status`);
 
           }


           if (kode_status == 'PIC') {

              let sqlgetdatado = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
              let datado = await request.query(sqlgetdatado);
              let nomor_do = datado.recordset[0].nomor_do;

                
    
              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
              let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

              let url = ``;
              if (statusIntegasi == 'DEV') {

                // url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_do/120/zws_sales_do/zbn_sales_do'; //development
                url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production

              } else {

                url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production

              }
    
    
              let usernamesoap = sails.config.globals.usernamesoap;
              let passwordsoap = sails.config.globals.passwordsoap;
              const tok = `${usernamesoap}:${passwordsoap}`;
              const hash = Base64.encode(tok);
              const Basic = 'Basic ' + hash;

              let datas = [];
              datas.push({
                VBELN: nomor_do
              });

              
              if (datas.length > 0) {
                let Headers = {
                  'Authorization': Basic,
                  'user-agent': 'EIS',
                  'Content-Type': 'text/xml;charset=UTF-8',
                  'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_WMS_DO:ZFM_WS_DORequest',
              };


              let xml = fs.readFileSync('soap/ZFM_SW_DO_DRAFT.xml', 'utf-8');
              let hasil = racikXML(xml, datas, 'urn:ZFM_WS_DO');


              let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
              let { body, statusCode } = response;

              if (statusCode == 200) {


                var parser = new xml2js.Parser({ explicitArray: false });
                parser.parseString(body, async function (err,result) {
                
                const populatedHeader = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOHEAD'].item;
                const populatedLine = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOITEM'].item;
  
                  let tanggal_gi = populatedHeader.WADAT_IST;
  
                  let audit_gi_id = uuid();
                  let sqlauditgi = `INSERT INTO audit_gi (audit_gi_id, delivery_order_id, m_user_id, kode_status, param_gi,tgl_gi,statuscode) 
                  VALUES('${audit_gi_id}', '${delivery_order_id}', '${m_user_id}', '${kode_status}', '${hasil}','${tanggal_gi}','${statusCode}')`;
                  await request.query(sqlauditgi);
  
                  if (tanggal_gi !== '0000-00-00') {
  
                    if (tanggal_gi) {
  
                     let data = {
                       delivery_order_id: delivery_order_id,
                       kode_status: kode_status,
                       status: status
                     }
                     responseData.push(data);
  
  
  
                     //kondisikan update ketika berhasil
                     let sql = `UPDATE delivery_order
                     SET updated=getdate(), updatedby='${m_user_id}',
                     status='${status}', 
                     kode_status='${kode_status}'
                     WHERE delivery_order_id='${delivery_order_id}'`;
                     await request.query(sql);
  
  
                     let sqlpushlocation = `INSERT INTO delivery_order_tracking
                     (createdby, updatedby, delivery_order_id, latitude, longitude)
                     VALUES('${m_user_id}', '${m_user_id}', '${delivery_order_id}', '${latitude}', '${longitude}')`;
                     await request.query(sqlpushlocation);
       
       
                     let queryAuditTracking = `INSERT INTO audit_tracking
                     (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
                     VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', 
                     '${delivery_order_id}','${kode_status}','${status}')`;
                     await request.query(queryAuditTracking);
       
                     let sqlcekstatusterakhir = `SELECT TOP 1 audit_tracking_id,kode_status 
                     FROM audit_tracking 
                     WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
                     let datastatusterakhir = await request.query(sqlcekstatusterakhir);
                     let kodestatus = ``;
                     let actionstatus = 0;
                     let audit_tracking_id = ``;
           
                     if (datastatusterakhir.recordset.length > 0) {
                       kodestatus = datastatusterakhir.recordset[0].kode_status;
                       audit_tracking_id = datastatusterakhir.recordset[0].audit_tracking_id;
                       actionstatus = 1;
                     }
  
                     if (actionstatus > 0) {
                       if (kodestatus == kode_status) {
         
                         let queryAuditTracking = `UPDATE audit_tracking SET updated=getdate(),updatedby='${m_user_id}' WHERE audit_tracking_id = '${audit_tracking_id}'`;
                         await request.query(queryAuditTracking);
         
                       } else {
         
                         let queryAuditTracking = `INSERT INTO audit_tracking
                         (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
                         VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
                         await request.query(queryAuditTracking);
         
                       }
                     }
  
                      if (populatedLine.VBELN) {
  
                        let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                        await request.query(deletelines);
  
                        let kode_sap = Number(populatedLine.MATNR);
                        let quantity = Number(populatedLine.LFIMG);
                        let line = parseInt(populatedLine.POSNR);
                        let batch = populatedLine.CHARG;
  
                        let location_storage = populatedLine.LGORT;
                        let expired_date = populatedLine.VFDAT;
                        let nomor_so = populatedLine.VGBEL;
  
                        let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                        let dataproduct = await request.query(sqldataproduk);
                        let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                        let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                        let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                        let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                        let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                        let satuan = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].satuan : 0;
                        let tonase_detail = tonase * quantity;
                        let kubikasi_detail = kubikasi * quantity;
  
                        let data = {
  
                          line: line,
                          m_produk_id: m_produk_id,
                          kode_barang: kode_barang,
                          nama_barang: nama_barang,
                          jumlah: quantity,
                          tonase: tonase_detail,
                          kubikasi: kubikasi_detail,
                          batch: batch,
                          satuan: satuan,
                          location_storage: location_storage,
                          expired_date: expired_date,
                          nomor_so: nomor_so
  
                        }
  
                        let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                        let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                        let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                        let dataexpired_date = data.expired_date ? `'${data.expired_date}'` : 'NULL';
                        let insertDetailDO = `INSERT INTO delivery_order_detail (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi,batch,satuan,location_storage,expired_date,nomor_so) 
                        VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line},'${data.m_produk_id}', 
                        ${data.jumlah}, ${data.tonase}, ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},
                        ${dataexpired_date},'${nomor_so}')`;
                        await request.query(insertDetailDO);
  
                        let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                        await request.query(updateTglGi);
  
                      } else {
  
                        let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                        await request.query(deletelines);
                        let total_tonase = 0;
                        let total_kubikasi = 0;
                        for (let i = 0; i < populatedLine.length; i++) {
  
                         let kode_sap = Number(populatedLine[i].MATNR);
                         let quantity = Number(populatedLine[i].LFIMG);
                         let line = parseInt(populatedLine[i].POSNR);
                         let batch = populatedLine[i].CHARG;
                         let satuan = populatedLine[i].VRKME;
                         let location_storage = populatedLine[i].LGORT;
                         let expired_date = populatedLine[i].VFDAT;
                         let nomor_so = populatedLine[i].VGBEL;
  
                         let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                         let dataproduct = await request.query(sqldataproduk);
                         let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                         let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                         let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                         let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                         let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                         let tonase_detail = tonase * quantity;
                         let kubikasi_detail = kubikasi * quantity;
  
                         total_tonase = total_tonase + tonase;
                         total_kubikasi = total_kubikasi + kubikasi;
  
                         let data = {
  
                           line: line,
                           m_produk_id: m_produk_id,
                           kode_barang: kode_barang,
                           nama_barang: nama_barang,
                           jumlah: quantity,
                           tonase: tonase_detail,
                           kubikasi: kubikasi_detail,
                           batch: batch,
                           satuan: satuan,
                           location_storage: location_storage,
                           expired_date: expired_date
  
                         }
  
                         let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                         let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                         let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                         let dataexpired_date = data.expired_date && !data.expired_date == '0000-00-00' ? `'${data.expired_date}'` : 'NULL';
                         let insertDetailDO = `INSERT INTO delivery_order_detail
                         (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi,
                         batch,satuan,location_storage,expired_date,nomor_so) 
                         VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line},'${data.m_produk_id}',${data.jumlah}, ${data.tonase}, 
                         ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},${dataexpired_date},'${nomor_so}')`;
                         await request.query(insertDetailDO);
  
                         let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                         await request.query(updateTglGi);
  
                        }
  
                      }
  
                    } else {
  
                      let sql = `UPDATE delivery_order
                      SET updated=getdate(), updatedby='${m_user_id}',status='Sampai gudang Enesis',
                      kode_status='SGE' 
                      WHERE delivery_order_id='${delivery_order_id}'`;
                      await request.query(sql);
                     //  return res.error("Picking Belum Selesai");
                      errorMessage.push('Picking Belum Selesai');
  
                    }
  
                  } else {
  
                    let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',status='Sampai gudang Enesis',kode_status='SGE' 
                    WHERE delivery_order_id='${delivery_order_id}'`;
                    await request.query(sql);
                    errorMessage.push('Picking Belum Selesai');
  
                  }
                });
  
              } else {
  
                let sql = `UPDATE delivery_order SET updated=getdate(), updatedby='${m_user_id}',
                status='Sampai gudang Enesis',kode_status='SGE' 
                WHERE delivery_order_id='${delivery_order_id}'`;
                await request.query(sql);
                errorMessage.push('SAP tidak meresponse coba ulangi lagi');
  
              }
          
            }
        }else{


          //kondisikan update ketika berhasil
          let sql = `UPDATE delivery_order
          SET updated=getdate(), updatedby='${m_user_id}',
          status='${status}', 
          kode_status='${kode_status}'
          WHERE delivery_order_id='${delivery_order_id}'`;
          await request.query(sql);


          let sqlpushlocation = `INSERT INTO delivery_order_tracking
          (createdby, updatedby, delivery_order_id, latitude, longitude)
          VALUES('${m_user_id}', '${m_user_id}', '${delivery_order_id}', '${latitude}', '${longitude}')`;
          await request.query(sqlpushlocation);


          let queryAuditTracking = `INSERT INTO audit_tracking
          (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
          VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', 
          '${delivery_order_id}','${kode_status}','${status}')`;
          await request.query(queryAuditTracking);


        }
      
      }
    }
 
    if (errorMessage.length > 0) {
 
      return res.error(errorMessage);

    } else {

      return res.success({
        data: responseData,
        message: "Update Status successfully"
      });

    }

 
     } catch (err) {
       return res.error(err);
     }
   },
 
   dobyDriverId: async function (req, res) {
     const {
       query: { m_driver_id }
     } = req;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT * FROM delivery_order_v 
       WHERE kode_status IN('DOD','SGE','PIC','OTW','SPL','CHG','PODDIST')
       AND m_driver_id ='${m_driver_id}' ORDER BY created DESC`;
 
       console.log(queryDataTable);
 
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
 
         for (let i = 0; i < result.recordset.length; i++) {

           console.log(i);
 
           let kode_status = rows[i].kode_status;
           let issge = 'N';
           let ispicking = 'N';
           let isstart = 'N';
           let issampailokasi = 'N';
           let ispoddist = 'N';
           let isfinish = 'N';
           let ispodtransporter = 'N';
           let isgantidriverbymobile = 'N';
           let isprovedelivery = 'N';
           let isgantidriver = 'N';
 
 
           if (kode_status == 'DOD') {
             issge = 'Y';
           } else if (kode_status == 'SGE') {
             ispicking = 'Y';
           } else if (kode_status == 'PIC') {
             isstart = 'Y';
           } else if (kode_status == 'OTW') {
             issampailokasi = 'Y';
             isgantidriverbymobile = 'Y';
             isprovedelivery = 'N';
             isgantidriver = 'Y';
           } else if (kode_status == 'SPL') {
             ispoddist = 'Y';
             isgantidriver = 'N';
             isprovedelivery = 'Y';
           } else if (kode_status == 'PODDIST') {
             isfinish = 'Y';
             isgantidriver = 'N';
           } else if (kode_status == 'FNS') {
             ispodtransporter = 'Y';
             isprovedelivery = 'N';
             isgantidriver = 'N';
           } else if (kode_status == 'PODTRANS') {
             isfinish = 'N';
             isgantidriver = 'N';
             isprovedelivery = 'N';
           } else if (kode_status == 'CHG') {
 
             issge = 'N';
             ispicking = 'N';
             isstart = 'N';
             issampailokasi = 'N';
             isfinish = 'N';
 
           }
 
           rows[i].isgantidriver = isgantidriver;
           rows[i].isgantidriverbymobile = isgantidriverbymobile;
           rows[i].isprovedelivery = isprovedelivery;
           rows[i].issge = issge;
           rows[i].ispicking = ispicking;
           rows[i].isstart = isstart;
           rows[i].issampailokasi = issampailokasi;
           rows[i].ispoddist = ispoddist;
           rows[i].ispodtransporter = ispodtransporter;
           rows[i].isfinish = isfinish;
 
           let delivery_order_id = result.recordset[i].delivery_order_id;
           let sqlDetail = `SELECT dod.delivery_order_detail_id,dod.line,mp.kode_sap AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
           CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
           CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi,
           dod.batch, dod.satuan, dod.location_storage, dod.expired_date,
           dod.jumlah_approve_distributor,dod.jumlah_approve_transporter,
           dod.actual_quantity,do.bundle_id
           FROM delivery_order_detail dod,m_produk mp,delivery_order do 
           WHERE dod.delivery_order_id= '${delivery_order_id}'
           AND dod.delivery_order_id = do.delivery_order_id
           AND dod.jumlah > 0
           AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
           console.log(sqlDetail);
           let datadetail = await request.query(sqlDetail);
           rows[i].details = datadetail.recordset;
 
           for (let j = 0; j < rows[i].details.length; j++) {
 
             rows[i].details[j].expired_date = rows[i].details[j].expired_date ? moment(rows[i].details[j].expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
           }
 
           let sqlDetailTracking = `SELECT * FROM audit_tracking WHERE delivery_order_id = '${delivery_order_id}' ORDER BY created ASC`;
           let datadetailTracking = await request.query(sqlDetailTracking);
           if (datadetailTracking.recordset.length > 0) {
             rows[i].tracking = datadetailTracking.recordset;
             for (let j = 0; j < rows[i].tracking.length; j++) {
 
               rows[i].tracking[j].datetracking = rows[i].tracking[j].created ? moment(rows[i].tracking[j].created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
 
             }
           }
 
 
 
 
           let sqlDetailLocation = `SELECT TOP 1 created,latitude,longitude FROM delivery_order_tracking 
             WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
           let datadetailLocation = await request.query(sqlDetailLocation);
           if (datadetailLocation.recordset.length > 0) {
 
             rows[i].location = datadetailLocation.recordset[0];
             rows[i].location.datelocation = rows[i].location.created ? moment(rows[i].location.created, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
             delete rows[i].location.created;
 
 
           }
 
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

   uploadFilePod: async function (req, res) {
    const { m_user_id, delivery_order_id, file_pod_distributor, file_pod_logistik, file_name} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      var uploadFile = req.file("file");

      uploadFile.upload({},
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message
            return res.error(errMsg)
          }

          for (const file of files) {
            fs.mkdirSync(dokumentPath('deliveryorder/status/filepod', delivery_order_id), {
              recursive: true
            })

            fs.renameSync(file.fd, path.resolve(dokumentPath('deliveryorder/status/filepod', delivery_order_id), file_name));

          }
          let status = `POD Distributor`;
          let kode_status = 'PODDIST';


          let sql = ``;

          if(file_pod_distributor){
            
            status = `POD Distributor`;
            kode_status = 'PODDIST';

            sql = `UPDATE delivery_order
            SET updated=getdate(),
            actual_sampai_tujuan=getdate(),
            updatedby='${m_user_id}',
            status='${status}', 
            kode_status='${kode_status}',
            file_pod_distributor='${file_pod_distributor}'
            WHERE delivery_order_id='${delivery_order_id}'`;
  
          }else if(file_pod_logistik){
            status = `POD Logistik`;
            kode_status = 'PODLOG';

            sql = `UPDATE delivery_order
            SET updated=getdate(),
            actual_sampai_tujuan=getdate(),
            updatedby='${m_user_id}',
            status='${status}', 
            kode_status='${kode_status}',
            file_pod_logistik='${file_pod_logistik}'
            WHERE delivery_order_id='${delivery_order_id}'`;
          }

          if(sql){
            request.query(sql, async (err) => {
              if (err) {
                return res.error(err);
              }
  
  
              let queryAuditTracking = `INSERT INTO audit_tracking
              (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
              VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
              await request.query(queryAuditTracking);
  
              let sqlcekstatusterakhir = `SELECT TOP 1 audit_tracking_id,kode_status FROM audit_tracking 
                WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
              let datastatusterakhir = await request.query(sqlcekstatusterakhir);
              let kodestatus = ``;
              let actionstatus = 0;
              let audit_tracking_id = ``;
  
              if (datastatusterakhir.recordset.length > 0) {
                kodestatus = datastatusterakhir.recordset[0].kode_status;
                audit_tracking_id = datastatusterakhir.recordset[0].audit_tracking_id;
                actionstatus = 1;
              }
  
              if (actionstatus > 0) {
                if (kodestatus == kode_status) {
  
                  let queryAuditTracking = `UPDATE audit_tracking 
                    SET updated=getdate(),updatedby='${m_user_id}' WHERE audit_tracking_id = '${audit_tracking_id}'`;
                  await request.query(queryAuditTracking);
  
                } else {
  
                  let queryAuditTracking = `INSERT INTO audit_tracking
                    (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status)
                    VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', '${m_user_id}', 
                    '${kode_status}', '${status}')`;
                    await request.query(queryAuditTracking);
  
                }
  
  
              }
  
              return res.success({
                message: "Upload POD successfully"
              });
            });
          }else{
            return res.error({
              message: "Upload POD Gagal Karena file kosong"
            });
          }

        });

    } catch (err) {
      return res.error(err);
    }
  },

  uploadAddCost: async function (req, res) {
    const { nomor_id, filename,m_user_id} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlUpdateDataUpload = `UPDATE delivery_order SET file_add_cost = '${filename}' 
      WHERE (console_number = '${nomor_id}' OR bundle_id = '${nomor_id}')`;
      console.log(sqlUpdateDataUpload);
      await request.query(sqlUpdateDataUpload);

      // PROSES PEMBENTUKAN DATA APPROVAL ADD COST

      let sqlDeleteData = `SELECT delivery_order_add_cost_id FROM delivery_order_add_cost WHERE nomor_id = '${nomor_id}'`;
      let dataDeliveryAddCost = await request.query(sqlDeleteData);
      let jumlahData = dataDeliveryAddCost.recordset.length;


      let sqlDataUser = `SELECT nik,nama FROM m_user WHERE m_user_id = '${m_user_id}'`;
      console.log(sqlDataUser);
      let dataUser = await request.query(sqlDataUser);

      // console.log(dataUser);

      let nik = dataUser.recordset.length > 0 ? dataUser.recordset[0].nik : null;
      let nama = dataUser.recordset.length > 0 ? dataUser.recordset[0].nama : null;


      let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
      let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);

      let namaUser = `'${nama}'`;
      if(getNamaByNik.rows.length > 0){
        namaUser = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
      }      

      if(jumlahData > 0){

        let delivery_order_add_cost_id = dataDeliveryAddCost.recordset[0].delivery_order_add_cost_id;


        let updateData = `UPDATE delivery_order_add_cost 
        SET file_name = '${filename}', kode_status = 'DR', status = 'Pengajuan',
        createdby = ${namaUser}, updatedby = ${namaUser}
        WHERE nomor_id = '${nomor_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO delivery_order_add_cost_audit
        (createdby, updatedby, delivery_order_add_cost_id, kode_status, status)
        VALUES(${namaUser},${namaUser}, '${delivery_order_add_cost_id}','DR','Revisi Upload')`;

        console.log(insertAudit);
        await request.query(insertAudit);


      }else{

        let delivery_order_add_cost_id = uuid();


        let insertDataApproval = `INSERT INTO delivery_order_add_cost
        (delivery_order_add_cost_id,createdby, updatedby, nomor_id, kode_status, status,file_name)
        VALUES('${delivery_order_add_cost_id}',${namaUser},${namaUser}, '${nomor_id}', 'DR', 'Pengajuan','${filename}')`;
        await request.query(insertDataApproval);

        let insertAudit = `INSERT INTO delivery_order_add_cost_audit
        (createdby, updatedby, delivery_order_add_cost_id, kode_status, status)
        VALUES(${namaUser},${namaUser}, '${delivery_order_add_cost_id}','DR','Pengajuan')`;
        await request.query(insertAudit);

      }




      return res.success({
        message: "Upload Data Add Cost Berhasil"
      });
     
    } catch (err) {
      return res.error(err);
    }
  },

   Takedestination: async function (req, res) {
     const { m_user_id, delivery_order_id, file_do, latitude, longitude } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       var uploadFile = req.file("file");
 
       uploadFile.upload({},
         async function onUploadComplete(err, files) {
           if (err) {
             let errMsg = err.message
             return res.error(errMsg)
           }
 
           for (const file of files) {
             fs.mkdirSync(dokumentPath('deliveryorder/status', delivery_order_id), {
               recursive: true
             })
 
             const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('deliveryorder/status', delivery_order_id), file.filename.replace(/\.[^/.]+$/, "")) + '*');
             if (filesamaDir.found.length > 0) {
               fs.unlinkSync(filesamaDir.found[0])
             }
             fs.renameSync(file.fd, path.resolve(dokumentPath('deliveryorder/status', delivery_order_id), file.filename));
 
           }
 
           let status = `Driver Telah Sampai lokasi`;
           let kode_status = 'SPL';
 
           let sql = `UPDATE delivery_order
             SET updated=getdate(),
             actual_sampai_tujuan=getdate(),
             updatedby='${m_user_id}',
             status='${status}', 
             kode_status='${kode_status}',
             file_bukti_do_sampai_tujuan='${file_do}'
             WHERE delivery_order_id='${delivery_order_id}'`;
 
           request.query(sql, async (err, result) => {
             if (err) {
               return res.error(err);
             }
 
             let sqlpushlocation = `INSERT INTO delivery_order_tracking
               (createdby, updatedby, delivery_order_id, latitude, longitude)
               VALUES('${m_user_id}', '${m_user_id}', '${delivery_order_id}', '${latitude}', '${longitude}')`;
             await request.query(sqlpushlocation);
 
             let queryAuditTracking = `INSERT INTO audit_tracking
               (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
               VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
             await request.query(queryAuditTracking);
 
             let sqlcekstatusterakhir = `SELECT TOP 1 audit_tracking_id,kode_status FROM audit_tracking 
               WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
             let datastatusterakhir = await request.query(sqlcekstatusterakhir);
             let kodestatus = ``;
             let actionstatus = 0;
             let audit_tracking_id = ``;
 
             if (datastatusterakhir.recordset.length > 0) {
               kodestatus = datastatusterakhir.recordset[0].kode_status;
               audit_tracking_id = datastatusterakhir.recordset[0].audit_tracking_id;
               actionstatus = 1;
             }
 
             if (actionstatus > 0) {
               if (kodestatus == kode_status) {
 
                 let queryAuditTracking = `UPDATE audit_tracking 
                   SET updated=getdate(),updatedby='${m_user_id}' WHERE audit_tracking_id = '${audit_tracking_id}'`;
                 await request.query(queryAuditTracking);
 
               } else {
 
                 let queryAuditTracking = `INSERT INTO audit_tracking
                   (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status)
                   VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', '${m_user_id}', 
                   '${kode_status}', '${status}')`;
                 await request.query(queryAuditTracking);
 
               }

             }
             return res.success({
               data: result,
               message: "Update Status successfully"
             });
           });
 
         });
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   TakedestinationMultiple: async function (req, res) { //xxx
     const { m_user_id, file_do, latitude, longitude } = req.body;
     let combinedata = `{
       "data" :${req.body.data}
     }`;
 
    //  console.log(combinedata);
    //  console.log(req.body);
     let hasilcombine = JSON.parse(combinedata);
     const data = hasilcombine.data;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       var uploadFile = req.file("file");
       let response = [];
       uploadFile.upload({},
         async function onUploadComplete(err, files) {
           if (err) {
             let errMsg = err.message
             return res.error(errMsg)
           }
 
           for (let i = 0; i < data.length; i++) {
             console.log('data[i].bundle_id ', data[i]);
 
             let bundle_id = data[i].bundle_id;
             let sqlgetdeliveryorder = `SELECT * FROM delivery_order_v WHERE bundle_id='${bundle_id}'`;
             console.log(sqlgetdeliveryorder);
             let datadeliveryorder = await request.query(sqlgetdeliveryorder);
             let deliveryorder = datadeliveryorder.recordset;
 
             for (let j = 0; j < deliveryorder.length; j++) {
 
 
 
               let delivery_order_id = deliveryorder[j].delivery_order_id;
               let status = `Driver Telah Sampai lokasi`;
               let kode_status = 'SPL';
               let kode_statusExisting = deliveryorder[j].kode_status;
 
               if (kode_statusExisting == kode_status) {
 
                 return res.error(`Status sudah ${status} tidak dapat melakukan perubahan status`);
 
               }
 
               let data = {
                 delivery_order_id: delivery_order_id,
                 kode_status: kode_status,
                 status: status
               }
               response.push(data);
 
               for (const file of files) {
                 fs.mkdirSync(dokumentPath('deliveryorder/status', delivery_order_id), {
                   recursive: true
                 })
                 console.log(file.filename);
                 let filesamaDir = glob.GlobSync(path.resolve(dokumentPath('deliveryorder/status', delivery_order_id), file.filename.replace(/\.[^/.]+$/, "")) + '*');
                 if (filesamaDir.found.length > 0) {
                   fs.unlinkSync(filesamaDir.found[0])
                 }
                 if ((j + 1) < deliveryorder.length) {
                   fs.copyFileSync(file.fd, path.resolve(dokumentPath('deliveryorder/status', delivery_order_id), file.filename));
                 } else {
                   fs.renameSync(file.fd, path.resolve(dokumentPath('deliveryorder/status', delivery_order_id), file.filename));
                 }
 
               }
 
               let sql = `UPDATE delivery_order
                 SET updated=getdate(),
                 actual_sampai_tujuan=getdate(),
                 updatedby='${m_user_id}',
                 status='${status}', 
                 kode_status='${kode_status}',
                 file_bukti_do_sampai_tujuan='${file_do}'
                 WHERE delivery_order_id='${delivery_order_id}'`;
 
               //console.log(sql);
 
               request.query(sql, async (err, result) => {
                 if (err) {
                   return res.error(err);
                 }
 
                 let sqlpushlocation = `INSERT INTO delivery_order_tracking
                   (createdby, updatedby, delivery_order_id, latitude, longitude)
                   VALUES('${m_user_id}', '${m_user_id}', '${delivery_order_id}', '${latitude}', '${longitude}')`;
                 await request.query(sqlpushlocation);
 
                 let queryAuditTracking = `INSERT INTO audit_tracking
                   (createdby, updatedby, m_user_id,delivery_order_id,kode_status,status)
                   VALUES('${m_user_id}', '${m_user_id}','${m_user_id}', '${delivery_order_id}','${kode_status}','${status}')`;
                 await request.query(queryAuditTracking);
 
                 let sqlcekstatusterakhir = `SELECT TOP 1 audit_tracking_id,kode_status FROM audit_tracking 
                   WHERE delivery_order_id='${delivery_order_id}' ORDER BY created DESC`;
                 let datastatusterakhir = await request.query(sqlcekstatusterakhir);
                 let kodestatus = ``;
                 let actionstatus = 0;
                 let audit_tracking_id = ``;
 
                 if (datastatusterakhir.recordset.length > 0) {
                   kodestatus = datastatusterakhir.recordset[0].kode_status;
                   audit_tracking_id = datastatusterakhir.recordset[0].audit_tracking_id;
                   actionstatus = 1;
                 }
 
                 if (actionstatus > 0) {
                   if (kodestatus == kode_status) {
 
                     let queryAuditTracking = `UPDATE audit_tracking 
                       SET updated=getdate(),updatedby='${m_user_id}' WHERE audit_tracking_id = '${audit_tracking_id}'`;
                     await request.query(queryAuditTracking);
 
                   } else {
 
                     let queryAuditTracking = `INSERT INTO audit_tracking
                       (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status)
                       VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', '${m_user_id}', 
                       '${kode_status}', '${status}')`;
                     await request.query(queryAuditTracking);
 
                   }
 
 
                 }
 
               });
 
             }
           }
 
           return res.success({
             data: response,
             message: "Update Status successfully"
           });
 
         });
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   changeDriver: async function (req, res) {
     const { m_user_id, m_driver_id, delivery_order_id, plat_nomor_kendaraan, nomor_resi } = req.body;
     console.log(req.body);
     await DB.poolConnect;
     try {
 
       const request = DB.pool.request();
 
       let sqlgetBundleID = `SELECT bundle_id FROM delivery_order WHERE delivery_order_id='${delivery_order_id}'`;
       let databundle = await request.query(sqlgetBundleID);
       let bundle_id = databundle.recordset[0].bundle_id;
 
 
       let plat_nomor = plat_nomor_kendaraan ? ` , t1.plat_nomor_kendaraan = '${plat_nomor_kendaraan}'` : '';
       let noresi = nomor_resi ? ` , t1.nomor_resi = '${nomor_resi}'` : '';
 
 
       let sql =
         `UPDATE t1
       SET 
           t1.updated = getdate(),
           t1.updatedby = '${m_user_id}',
           t1.m_driver_id = '${m_driver_id}'
           ${plat_nomor}
           ${noresi}
       FROM 
           c_shipment t1
           LEFT JOIN delivery_order t2 ON (t1.delivery_order_id = t2.delivery_order_id)
       WHERE 
       t2.bundle_id = '${bundle_id}'`;
 
  
 
       request.query(sql, async (err) => {
         if (err) {
           return res.error(err);
         }
 
         const InserDriverDo = `INSERT INTO
         delivery_order_driver
         (delivery_order_id, m_driver_id)
         VALUES('${delivery_order_id}', '${m_driver_id}')`;
         await request.query(InserDriverDo);
 
         const selectResult = `SELECT m_driver_id,plat_nomor_kendaraan,nama_driver,
         nomor_resi,nomor_hp_driver,nama_assisten_driver,nomor_hp_assisten_driver 
         FROM delivery_order_v WHERE delivery_order_id = '${delivery_order_id}'`;
         let dataresult = await request.query(selectResult);
         let resultdo = dataresult.recordset[0];
 
         return res.success({
           data: resultdo,
           message: "Update data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   doReadytoInvoice: async function (req, res) {
     const {
       query: { m_user_id }
     } = req;
 
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
 
 
       let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
       let orgs = await request.query(org);
       let organization = orgs.recordset.map(function (item) {
         return item['r_organisasi_id'];
       });
 
 
 
 
       let sqlTrasporterId = `SELECT mt.m_transporter_id FROM m_user mu , m_transporter mt 
       WHERE mu.m_user_id='${m_user_id}'
       AND mu.r_organisasi_id = mt.r_organisasi_id`;
       let trasporter = await request.query(sqlTrasporterId);
       let m_transporter_id = trasporter.recordset[0].m_transporter_id;
 
       let filterbytransporter = ``;
       if (trasporter.recordset.length > 0) {
         filterbytransporter = `AND m_transporter_id = '${m_transporter_id}'`;
       }
 
 
 
       let queryDataTable = `SELECT * FROM do_ready_invoice_v 
       WHERE 1=1 ${whereClause} ${filterbytransporter}
       ORDER BY tgl_do`;
 
 
       request.query(queryDataTable,async (err, result) => {
         if (err) {
           return res.error(err);
         }


         const rows = result.recordset;
        //  let xml = fs.readFileSync('soap/ZFM_WS_PODO.xml', 'utf-8');
        //  let parser = new xml2js.Parser({ explicitArray: false });


        //  let usernamesoap = sails.config.globals.usernamesoap;
        //  let passwordsoap = sails.config.globals.passwordsoap;

        //  let url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_dopo/300/zws_ws_dopo/zbn_ws_dopo`;


        //  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        //  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        //  let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
       
        //  if(statusIntegasi=='DEV'){
         
        //      usernamesoap = sails.config.globals.usernamesoapdev;
        //      passwordsoap = sails.config.globals.passwordsoapdev;

        //      url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zfm_ws_dopo/120/zws_sales_dopo/zbn_sales_dopo`;
             
        //  }

            
 
        //  const tok = `${usernamesoap}:${passwordsoap}`;
        //  const hash = Base64.encode(tok);
        //  const Basic = 'Basic ' + hash;

        //  console.log('usernamesoap ',usernamesoap);
        //  console.log('passwordsoap ',passwordsoap);

        //  let Headers = {
        //    'Authorization': Basic,
        //    'user-agent': 'apiesales',
        //    'Content-Type': 'text/xml;charset=UTF-8',
        //    'soapAction': 'urn:sap-com:document:sap:rfc:functions:zfm_ws_dopo:ZFM_WS_PODORequest',
        //  };



        //  let dataDo = [];
        //  for (let i = 0; i < rows.length; i++) {

        //   const nomor_do = rows[i].nomor_do;
        //   const bundle_id = rows[i].bundle_id;

        //   let hasil = racikXMLGetDo(xml, nomor_do);

        //   let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 10000000 }); // Optional timeout parameter(milliseconds)
        //   let { body, statusCode } = response;


        //   console.log('statusCode ',statusCode);


        //   let rincian_biaya = [];
        //   let obj = {};
        //   if(statusCode==200){
      
        //       parser.parseString(body, async function (err, result) {
        
        //           console.log(result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse']);
        //           const GJAHR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].GJAHR;
        //           const PESAN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].PESAN;

        //           if(GJAHR!='0000' || PESAN==''){

        //             console.log('PERTAHANKAN ',nomor_do);

        //               const EBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].EBELN;
        //               const MBLNR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNR;
        //               const ITEMO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMO;
        //               const ITEMR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMR;
        //               const MBLNO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNO;
        //               const NETWO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWO;
        //               const NETWR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWR;


        //               rows[i].tahun = GJAHR;
        //               rows[i].nomor_po = EBELN;
        //               rows[i].nomor_gr = MBLNR;
        //               rows[i].item_additional_cost = ITEMO;
        //               rows[i].item_cost_shipment = ITEMR;
        //               rows[i].nomor_gr_additional_cost = MBLNO;
        //               rows[i].additional_cost = Number(NETWO) * 100;
        //               rows[i].cost_shipment = Number(NETWR) * 100;
        //               rows[i].pesan = null;

        //               dataDo.push(rows[i]);

        //               obj = {
        //                   tahun : GJAHR,
        //                   nomor_po : EBELN,
        //                   nomor_gr : MBLNR,
        //                   item_additional_cost : ITEMO,
        //                   item_cost_shipment : ITEMR,
        //                   nomor_gr_additional_cost : MBLNO,
        //                   additional_cost : Number(NETWO) * 100,
        //                   cost_shipment : Number(NETWR) * 100,
        //                   pesan : null
        //               }
      
      
        //               if(Number(NETWO) * 100 > 0){
        //                 rincian_biaya.push({
        //                   keterangan : 'Additional Cost',
        //                   nominal : Number(NETWO) * 100
        //                 });
        //               }

        //               if(Number(NETWR) * 100 > 0){
        //                 rincian_biaya.push({
        //                   keterangan : 'Shipment Cost',
        //                   nominal : Number(NETWR) * 100
        //                 });
        //               }

        //               obj.rincian_biaya = rincian_biaya;
        //               rows[i].rincian_biaya = rincian_biaya;

            
        //           }             
        //         });      
                
        //     }
        
        // }

        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });

         
       });
     } catch (err) {
       return res.error(err);
     }
   },
   bundleReadytoInvoice: async function (req, res) {
    const {
      query: { m_user_id }
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";




      let sqlTrasporterId = `SELECT mt.m_transporter_id FROM m_user mu , m_transporter mt 
      WHERE mu.m_user_id='${m_user_id}'
      AND mu.r_organisasi_id = mt.r_organisasi_id`;
      let trasporter = await request.query(sqlTrasporterId);
      let m_transporter_id = trasporter.recordset[0].m_transporter_id;

      let filterbytransporter = ``;
      if (trasporter.recordset.length > 0) {
        filterbytransporter = `AND m_transporter_id = '${m_transporter_id}'`;
      }

      let queryDataTable = `SELECT * FROM bundle_ready_invoice_v 
      WHERE 1=1 ${whereClause} ${filterbytransporter}
      ORDER BY tanggal_pod_transporter`;

      // console.log(queryDataTable);
      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }


        const rows = result.recordset;
        let xml = fs.readFileSync('soap/ZFM_WS_PODO.xml', 'utf-8');
        let parser = new xml2js.Parser({ explicitArray: false });


        let usernamesoap = sails.config.globals.usernamesoap;
        let passwordsoap = sails.config.globals.passwordsoap;

        let url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_dopo/300/zws_ws_dopo/zbn_ws_dopo`;

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        if(statusIntegasi=='DEV'){

          usernamesoap = sails.config.globals.usernamesoapdev;
          passwordsoap = sails.config.globals.passwordsoapdev;

          url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zfm_ws_dopo/120/zws_ws_dopo/zbin_ws_dopo`;
          
        }
          
        const tok = `${usernamesoap}:${passwordsoap}`;
        const hash = Base64.encode(tok);
        const Basic = 'Basic ' + hash;


        let Headers = {
          'Authorization': Basic,
          'user-agent': 'apiesales',
          'Content-Type': 'text/xml;charset=UTF-8',
          'soapAction': 'urn:sap-com:document:sap:rfc:functions:zfm_ws_dopo:ZFM_WS_PODORequest',
        };



        let dataDo = [];
        for (let i = 0; i < rows.length; i++) {

         let sqlGetStatusNonPodTransporter = `SELECT COUNT(1) AS totalNonPodTransporter 
         FROM delivery_order WHERE (console_number = '${rows[i].nomor_id}' OR bundle_id = '${rows[i].nomor_id}') 
         AND kode_status <> 'PODTRANS'`;
         let getTotalNonPodTransporter = await request.query(sqlGetStatusNonPodTransporter);
         let totalNonPodTransporter = getTotalNonPodTransporter.recordset[0].totalNonPodTransporter;


         if(totalNonPodTransporter == 0){

          const nomor_id = padGetReady(rows[i].nomor_id);
          let hasil = racikXMLGetDo(xml, nomor_id);

          let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 10000000 }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;
          // console.log('statusCode ',statusCode);
          let rincian_biaya = [];
          let obj = {};
          if(statusCode==200){
      
              parser.parseString(body, async function (err, result) {
        
                  const GJAHR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].GJAHR;
                  const PESAN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].PESAN;
 
                  if(GJAHR!='0000' || PESAN==''){
 
                   //  console.log('PERTAHANKAN ',nomor_id);
 
                      const EBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].EBELN;
                      const MBLNR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNR;
                      const ITEMO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMO;
                      const ITEMR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMR;
                      const MBLNO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNO;
                      const NETWO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWO;
                      const NETWR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWR;
                      const ADDCS = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ADDCS;
 
                      
                      let totalAdditionalCost = 0;
                      if(ADDCS){
                       // console.log('ADDCS ',ADDCS);
                       const arrayOrNo = Array.isArray(ADDCS.item);
                       // console.log('arrayOrNo ',arrayOrNo);
 
                         if(arrayOrNo){
 
 
                           for (let i = 0; i < ADDCS.item.length; i++) {
 
                             const namaBiaya = ADDCS.item[i].WGBEZ;
                             const kodeMaterial= ADDCS.item[i].EBELP;
                             const kodeItem = ADDCS.item[i].ITEMO;
                             const nomorGr = ADDCS.item[i].MBLNO;
                             const nominalBiaya = Number(ADDCS.item[i].NETWO) * 100;
                             const fiscalYear = ADDCS.item[i].GJAHO;
                             
                             totalAdditionalCost = totalAdditionalCost + nominalBiaya;
 
                             rincian_biaya.push({
                               keterangan : namaBiaya,
                               nominal : nominalBiaya,
                               nomor_gr :nomorGr,
                               kode_item:kodeItem,
                               kode_material:kodeMaterial,
                               nomor_id:nomor_id,
                               fiscal_year:fiscalYear,
                               nomor_po:EBELN
                             });
                             
                           }
 
                           
                         }else{
 
 
                           const namaBiaya = ADDCS.item.WGBEZ;
                           const kodeMaterial= ADDCS.item.EBELP;
                           const kodeItem = ADDCS.item.ITEMO;
                           const nomorGr = ADDCS.item.MBLNO;
                           const nominalBiaya = Number(ADDCS.item.NETWO) * 100;
                           const fiscalYear = ADDCS.item.GJAHO;
 
                           totalAdditionalCost = totalAdditionalCost + nominalBiaya;
                   
                           rincian_biaya.push({
                             keterangan : namaBiaya,
                             nominal : nominalBiaya,
                             nomor_gr :nomorGr,
                             kode_item:kodeItem,
                             kode_material:kodeMaterial,
                             nomor_id:nomor_id,
                             fiscal_year:fiscalYear,
                             nomor_po:EBELN
                           });
 
                         }
                      }
 
                      
 
                      rows[i].tahun = GJAHR;
                      rows[i].nomor_po = EBELN;
                      rows[i].nomor_gr = MBLNR;
                      rows[i].item_additional_cost = ITEMO ? ITEMO : null;
                      rows[i].item_cost_shipment = ITEMR;
                      rows[i].nomor_gr_additional_cost = MBLNO;
                      rows[i].additional_cost = totalAdditionalCost;
                      rows[i].cost_shipment = Number(NETWR) * 100;
                      rows[i].total = (Number(NETWR) * 100) + totalAdditionalCost;
                      rows[i].pesan = null;
 
                      dataDo.push(rows[i]);
 
                      obj = {
                          tahun : GJAHR,
                          nomor_po : EBELN,
                          nomor_gr : MBLNR,
                          item_additional_cost : ITEMO,
                          item_cost_shipment : ITEMR,
                          nomor_gr_additional_cost : MBLNO,
                          additional_cost : Number(NETWO) * 100,
                          cost_shipment : Number(NETWR) * 100,
                          pesan : null
                      }
      
 
                      if(Number(NETWR) * 100 > 0){
                        rincian_biaya.push({
                          keterangan : 'Shipment Cost',
                          nominal : Number(NETWR) * 100,
                          nomor_gr :MBLNR,
                          kode_item:ITEMO,
                          kode_material:ITEMR,
                          nomor_id:nomor_id,
                          fiscal_year:GJAHR,
                          nomor_po:EBELN
                        });
                      }
 
               
                      obj.rincian_biaya = rincian_biaya;
                      rows[i].rincian_biaya = rincian_biaya;
 
            
                  }             
                });      
               
           }

         }
       }

       return res.success({
         result: dataDo,
         message: "Fetch data successfully"
       });

        
      });
    } catch (err) {
      return res.error(err);
    }
  },
   pickingDoMultiple: async function (req, res) {
     const { m_user_id, kode_status } = req.body;
 
     //console.log(req.query);
     await DB.poolConnect;
     try {
 
 
       const request = DB.pool.request();
       let sqlgetdatado = `select tanggal_gi,nomor_do,delivery_order_id from delivery_order where tanggal_gi is null and m_transporter_id is not null
       and kode_status = '${kode_status}' and tanggal_gi is null and isactive='Y' 
       group by tanggal_gi,nomor_do,delivery_order_id`;
 
 
       let datado = await request.query(sqlgetdatado);
 
       for (let i = 0; i < datado.recordset.length; i++) {
 
         let nomor_do = datado.recordset[i].nomor_do;
         let delivery_order_id = datado.recordset[i].delivery_order_id;
 
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
 
         let url = ``;
         if (statusIntegasi == 'DEV') {
 
           url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_do/120/zws_sales_do/zbn_sales_do'; //development
 
         } else {
 
           url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production
 
         }
 
 
         let usernamesoap = sails.config.globals.usernamesoap;
         let passwordsoap = sails.config.globals.passwordsoap;
         const tok = `${usernamesoap}:${passwordsoap}`;
         const hash = Base64.encode(tok);
         const Basic = 'Basic ' + hash;
 
         let datas = [];
         datas.push({
           VBELN: nomor_do
         });
 
 
         //console.log(url);
         if (datas.length > 0) {
           let Headers = {
             'Authorization': Basic,
             'user-agent': 'sampleTest',
             'Content-Type': 'text/xml;charset=UTF-8',
             'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_DO:ZFM_WS_DORequest',
           };
 
 
           let xml = fs.readFileSync('soap/ZFM_SW_DO_DRAFT.xml', 'utf-8');
           let hasil = racikXML(xml, datas, 'urn:ZFM_WS_DO');
 
           //console.log(hasil);
 
           let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
           let { body, statusCode } = response;
           //console.log('body', body);
           if (statusCode == 200) {
 
 
             var parser = new xml2js.Parser({ explicitArray: false });
             await parser.parseString(body, async function (err, result) {
 
               const populatedHeader = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOHEAD'].item;
               const populatedLine = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOITEM'].item;
               let tanggal_gi = undefined;
               //console.log(populatedHeader);
 
               if (populatedHeader && populatedLine) {
                 tanggal_gi = populatedHeader.WADAT_IST;
                 if (tanggal_gi !== '0000-00-00') {
                   if (tanggal_gi) {
                     if (populatedLine.VBELN) {
 
                       let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                       await request.query(deletelines);
 
                       let kode_sap = Number(populatedLine.MATNR);
                       let quantity = Number(populatedLine.LFIMG);
                       let line = parseInt(populatedLine.POSNR);
                       let batch = populatedLine.CHARG;
 
                       let location_storage = populatedLine.LGORT;
                       let expired_date = populatedLine.VFDAT;
                       let nomor_so = populatedLine.VGBEL;
 
                       let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                       let dataproduct = await request.query(sqldataproduk);
                       let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                       let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                       let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                       let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                       let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                       let satuan = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].satuan : 0;
                       let tonase_detail = tonase * quantity;
                       let kubikasi_detail = kubikasi * quantity;
 
                       let data = {
 
                         line: line,
                         m_produk_id: m_produk_id,
                         kode_barang: kode_barang,
                         nama_barang: nama_barang,
                         jumlah: quantity,
                         tonase: tonase_detail,
                         kubikasi: kubikasi_detail,
                         batch: batch,
                         satuan: satuan,
                         location_storage: location_storage,
                         expired_date: expired_date,
                         nomor_so: nomor_so
 
                       }
 
                       let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                       let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                       let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                       let dataexpired_date = data.expired_date ? `'${data.expired_date}'` : 'NULL';
                       let insertDetailDO = `INSERT INTO delivery_order_detail
                             (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                             batch,satuan,location_storage,expired_date,nomor_so)
                             VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line}, 
                             '${data.m_produk_id}', 
                             ${data.jumlah}, ${data.tonase}, ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},
                             ${dataexpired_date},'${nomor_so}')`;
 
                       await request.query(insertDetailDO);
 
                       let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                       await request.query(updateTglGi);
 
 
                     } else {
 
                       let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                       await request.query(deletelines);
                       let total_tonase = 0;
                       let total_kubikasi = 0;
                       for (let i = 0; i < populatedLine.length; i++) {
 
                         let kode_sap = Number(populatedLine[i].MATNR);
                         let quantity = Number(populatedLine[i].LFIMG);
                         let line = parseInt(populatedLine[i].POSNR);
                         let batch = populatedLine[i].CHARG;
                         let satuan = populatedLine[i].VRKME;
                         let location_storage = populatedLine[i].LGORT;
                         let expired_date = populatedLine[i].VFDAT;
                         let nomor_so = populatedLine[i].VGBEL;
 
                         let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                         let dataproduct = await request.query(sqldataproduk);
                         let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                         let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                         let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                         let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                         let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                         let tonase_detail = tonase * quantity;
                         let kubikasi_detail = kubikasi * quantity;
 
                         total_tonase = total_tonase + tonase;
                         total_kubikasi = total_kubikasi + kubikasi;
 
                         let data = {
 
                           line: line,
                           m_produk_id: m_produk_id,
                           kode_barang: kode_barang,
                           nama_barang: nama_barang,
                           jumlah: quantity,
                           tonase: tonase_detail,
                           kubikasi: kubikasi_detail,
                           batch: batch,
                           satuan: satuan,
                           location_storage: location_storage,
                           expired_date: expired_date
 
                         }
 
                         let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                         let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                         let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                         let dataexpired_date = data.expired_date && !data.expired_date == '0000-00-00' ? `'${data.expired_date}'` : 'NULL';
                         let insertDetailDO = `INSERT INTO delivery_order_detail
                         (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                          batch,satuan,location_storage,expired_date,nomor_so)
                          VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line}, 
                          '${data.m_produk_id}', 
                          ${data.jumlah}, ${data.tonase}, ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},
                          ${dataexpired_date},'${nomor_so}')`;
                         await request.query(insertDetailDO);
 
                         let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                         await request.query(updateTglGi);
 
                       }
 
                     }
 
                   } else {
                     console.log('Picking Belum Selesai');
                   }
 
                 } else {
 
                   console.log('Picking Belum Selesai');
                 }
 
               }
 
 
             });
 
           } else {
 
             console.log('SAP ga response');
 
           }
         }
 
 
       }
 
       return res.success({
         message: "Update Status successfully"
       });
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   pickingDo: async function (req, res) {
     const { m_user_id, delivery_order_id } = req.body;
 
     //console.log(req.query);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let sqlgetdatado = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
       let datado = await request.query(sqlgetdatado);
       let nomor_do = datado.recordset[0].nomor_do;
 
 
       let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
       let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
       let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
 
       let url = ``;
       if (statusIntegasi == 'DEV') {
 
         url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_do/120/zws_sales_do/zbn_sales_do'; //development
 
       } else {
 
         url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_do/300/zws_sales_do/zbn_sales_do'; // production
 
       }
 
 
       let usernamesoap = sails.config.globals.usernamesoap;
       let passwordsoap = sails.config.globals.passwordsoap;
       const tok = `${usernamesoap}:${passwordsoap}`;
       const hash = Base64.encode(tok);
       const Basic = 'Basic ' + hash;
 
       // loop disini harusnya
       let datas = [];
       datas.push({
         VBELN: nomor_do
       });
 
 
       console.log(url);
       if (datas.length > 0) {
         let Headers = {
           'Authorization': Basic,
           'user-agent': 'sampleTest',
           'Content-Type': 'text/xml;charset=UTF-8',
           'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_DO:ZFM_WS_DORequest',
         };
 
 
         let xml = fs.readFileSync('soap/ZFM_SW_DO_DRAFT.xml', 'utf-8');
         let hasil = racikXML(xml, datas, 'urn:ZFM_WS_DO');
 
         console.log(hasil);
         let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
         let { body, statusCode } = response;
         console.log(statusCode);
         if (statusCode == 200) {
 
 
           var parser = new xml2js.Parser({ explicitArray: false });
           parser.parseString(body, async function (err, result) {
             const populatedHeader = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOHEAD'].item;
             const populatedLine = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_DOResponse']['DOITEM'].item;
             let tanggal_gi = '';
             try {
               tanggal_gi = populatedHeader.WADAT_IST;
             } catch (error) {
               return res.error("Nomor DO bermasalah...");
             }
             //console.log('tanggal_gi ',tanggal_gi);
             if (tanggal_gi !== '0000-00-00') {
               if (tanggal_gi) {
                 if (populatedLine.VBELN) {
 
                   let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                   await request.query(deletelines);
 
                   let kode_sap = Number(populatedLine.MATNR);
                   let quantity = Number(populatedLine.LFIMG);
                   let line = parseInt(populatedLine.POSNR);
                   let batch = populatedLine.CHARG;
 
                   let location_storage = populatedLine.LGORT;
                   let expired_date = populatedLine.VFDAT;
                   let nomor_so = populatedLine.VGBEL;
 
                   let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                   let dataproduct = await request.query(sqldataproduk);
                   let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                   let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                   let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                   let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                   let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                   let satuan = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].satuan : 0;
                   let tonase_detail = tonase * quantity;
                   let kubikasi_detail = kubikasi * quantity;
 
                   let data = {
 
                     line: line,
                     m_produk_id: m_produk_id,
                     kode_barang: kode_barang,
                     nama_barang: nama_barang,
                     jumlah: quantity,
                     tonase: tonase_detail,
                     kubikasi: kubikasi_detail,
                     batch: batch,
                     satuan: satuan,
                     location_storage: location_storage,
                     expired_date: expired_date,
                     nomor_so: nomor_so
 
                   }
 
                   let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                   let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                   let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                   let dataexpired_date = data.expired_date ? `'${data.expired_date}'` : 'NULL';
                   let insertDetailDO = `INSERT INTO delivery_order_detail
                         (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                         batch,satuan,location_storage,expired_date,nomor_so)
                         VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line}, 
                         '${data.m_produk_id}', 
                         ${data.jumlah}, ${data.tonase}, ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},
                         ${dataexpired_date},'${nomor_so}')`;
 
                   await request.query(insertDetailDO);
 
                   let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                   await request.query(updateTglGi);
 
                 } else {
 
                   let deletelines = `DELETE FROM delivery_order_detail WHERE delivery_order_id='${delivery_order_id}'`;
                   await request.query(deletelines);
                   let total_tonase = 0;
                   let total_kubikasi = 0;
                   for (let i = 0; i < populatedLine.length; i++) {
 
                     let kode_sap = Number(populatedLine[i].MATNR);
                     let quantity = Number(populatedLine[i].LFIMG);
                     let line = parseInt(populatedLine[i].POSNR);
                     let batch = populatedLine[i].CHARG;
                     let satuan = populatedLine[i].VRKME;
                     let location_storage = populatedLine[i].LGORT;
                     let expired_date = populatedLine[i].VFDAT;
                     let nomor_so = populatedLine[i].VGBEL;
 
                     let sqldataproduk = `SELECT * FROM m_produk WHERE kode_sap='${kode_sap}'`;
                     let dataproduct = await request.query(sqldataproduk);
                     let m_produk_id = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].m_produk_id : null;
                     let kode_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kode : null;
                     let nama_barang = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].nama : null;
                     let tonase = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].tonase : 0;
                     let kubikasi = dataproduct.recordset.length > 0 ? dataproduct.recordset[0].kubikasi : 0;
                     let tonase_detail = tonase * quantity;
                     let kubikasi_detail = kubikasi * quantity;
 
                     total_tonase = total_tonase + tonase;
                     total_kubikasi = total_kubikasi + kubikasi;
 
                     let data = {
 
                       line: line,
                       m_produk_id: m_produk_id,
                       kode_barang: kode_barang,
                       nama_barang: nama_barang,
                       jumlah: quantity,
                       tonase: tonase_detail,
                       kubikasi: kubikasi_detail,
                       batch: batch,
                       satuan: satuan,
                       location_storage: location_storage,
                       expired_date: expired_date
 
                     }
 
                     let databatch = data.batch ? `'${data.batch}'` : 'NULL';
                     let datasatuan = data.satuan ? `'${data.satuan}'` : 'NULL';
                     let datalocation_storage = data.location_storage ? `'${data.location_storage}'` : 'NULL';
                     let dataexpired_date = data.expired_date && !data.expired_date == '0000-00-00' ? `'${data.expired_date}'` : 'NULL';
                     let insertDetailDO = `INSERT INTO delivery_order_detail
                           (createdby,updatedby, delivery_order_id, line, m_produk_id, jumlah, tonase, kubikasi, 
                           batch,satuan,location_storage,expired_date,nomor_so)
                           VALUES('${m_user_id}','${m_user_id}', '${delivery_order_id}', ${data.line}, 
                           '${data.m_produk_id}', 
                           ${data.jumlah}, ${data.tonase}, ${data.kubikasi}, ${databatch}, ${datasatuan}, ${datalocation_storage},
                           ${dataexpired_date},'${nomor_so}')`;
 
                     await request.query(insertDetailDO);
 
                     let updateTglGi = `UPDATE delivery_order SET tanggal_gi='${tanggal_gi}' WHERE delivery_order_id = '${delivery_order_id}'`;
                     await request.query(updateTglGi);
 
                   }
 
                 }
               } else {
                 return res.error("Picking Belum Selesai");
               }
 
 
               return res.success({
                 message: "Update Status successfully"
               });
 
             } else {
  
               return res.error("Picking Belum Selesai");

             }
           });
 
         }
       }
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   delete: async function (req, res) {
     const { delivery_order_id,delete_bidding } = req.body;
 
     console.log( "indra....",delivery_order_id,delete_bidding);
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       if(delete_bidding == true){
         console.log("hapus bidding....");
         let sel  = `select * from delivery_order where delivery_order_id = '${delivery_order_id}'`
         let resp = await request.query(sel);
         resp = resp.recordset[0]
         let bidding_id = resp.r_log_bidding_id
         let m_transporter_id = resp.m_transporter_id
         let bundle_id = resp.bundle_id
 
         let act1 = `update delivery_order set m_transporter_id = null
         , kode_status = 'WT1',status ='Placed Order' where r_log_bidding_id = '${bidding_id}'`
         // console.log(act1);
 
         await request.query(act1);
 
         let act2 = `delete from c_shipment where delivery_order_id in (
           select delivery_order_id from delivery_order do where r_log_bidding_id = '${bidding_id}')`
         // console.log(act2);
         await request.query(act2);
 
 
         let act3 = `update r_log_bidding set isactive = 1, isclosed = 0,isallowed = 0
                     where delivery_order_id = '${bidding_id}' and isclosed = 1`
         // console.log(act3);
         await request.query(act3);
 
         
         let act4 = `update r_log_bidding set isactive = 1, isclosed = 0 where delivery_order_id = '${bidding_id}'`
         // console.log(act3);
         await request.query(act4);
 
         // blast ulang ring 1
         let selx = `select a.r_log_bidding_id,b.nama,a.email,c.kendaraan,sum(total_kubikasi)total_kubikasi
           ,sum(total_tonase)total_tonase,max(harga)as harga
           from r_log_bidding a
           inner join m_transporter_v b on a.m_transporter_id = b.m_transporter_id
           inner join delivery_order_v c on c.r_log_bidding_id = a.delivery_order_id
           where a.delivery_order_id = '${bidding_id}' and a.isactive = 1 and a.isallowed is null
           group by a.r_log_bidding_id,b.nama,a.email,c.kendaraan,harga`
 
         
         let ds = await request.query(selx);
         ds = ds.recordset
 
         let arrayEmail = [];
         for (let i = 0; i < ds.length; i++) {

           arrayEmail = [];
           let log_id = ds[i].r_log_bidding_id;
           let email = ds[i].email;
           let nama = ds[i].nama
           let tujuan = ds[i].tujuan
           let kendaraan = ds[i].kendaraan
           let total_kubikasi = ds[i].total_kubikasi
           let total_tonase = ds[i].total_tonase
           let harga = ds[i].harga
 
           arrayEmail.push(email);

          

           let param = {
 
             subject: `Penawaran Kontrak Logistik PT. Marketama Indah`,
             transporter: `${nama}`,
             bundle_id: bundle_id,
             tujuan: `${tujuan}`,
             kendaraan: `${kendaraan}`,
             kubikasi: `${total_kubikasi}`,
             tonase: `${total_tonase}`,
             biaya: `${harga}`,
             // link:`localhost:1337/do/getbidding/${log_id}`
             link: `http://stock.enesis.com/esales/bidding.php?tx=${log_id}`
           }
           let template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'biddingklaim', templateparam: param });
           SendEmail(arrayEmail.toString(), param.subject, template);
 
 
         }
 
         return res.success({
           data: null,
           message: "Pembatalan Pemenang Berhasil dilakukan.."
         });
       }else{
         let queryUpdate = `DELETE FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
 
 
         request.query(queryUpdate, (err, result) => {
           if (err) {
             return res.error(err);
           }
   
           return res.success({
             data: result,
             message: "Delete data successfully"
           });
         });
 
       }
     } catch (err) {
       console.log(err);
       return res.error(err);
     }
   },


   cancelOrder: async function (req, res) {
    const { m_user_id, delivery_order_id} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      console.log('delete cuy');

      console.log('m_user_id ',m_user_id);
      console.log('delivery_order_id ',delivery_order_id);

        let sqlgetdo = `SELECT * FROM delivery_order_v WHERE delivery_order_id = '${delivery_order_id}'`;
        let datado = await request.query(sqlgetdo);
        let row = datado.recordset[0]


        let bundle_id = row.bundle_id;
        let m_transporter_id = row.m_transporter_id;
        let r_kendaraan_id = row.r_kendaraan_id;
        let console_number = row.console_number;
        let kode_status = row.kode_status;
        let schedule_delivery_date = moment(row.schedule_delivery_date,'YYYY-MM-DD').format('YYYY-MM-DD');


        console.log('schedule_delivery_date ',schedule_delivery_date);


        if(kode_status=='DOD'){
          let conditionConsoleNumber = ``;
          if(console_number){
            conditionConsoleNumber = ` AND console_number = '${console_number}'`;
          }
  
          let sqlGetListDo = `SELECT delivery_order_id FROM delivery_order_v WHERE bundle_id = '${bundle_id}' AND kode_status='DOD'
          AND m_transporter_id = '${m_transporter_id}' 
          AND r_kendaraan_id = '${r_kendaraan_id}' AND schedule_delivery_date = '${schedule_delivery_date}' ${conditionConsoleNumber}`;
  

          console.log(sqlGetListDo);
          let datado2 = await request.query(sqlGetListDo);
          let rows = datado2.recordset;
  
          for (let i = 0; i < rows.length; i++) {
            let delivery_order_id = rows[i].delivery_order_id;
            let sqlUpdateDo = `UPDATE delivery_order SET isactive = 'N',updatedby = '${m_user_id}' WHERE delivery_order_id = '${delivery_order_id}'`;
            await request.query(sqlUpdateDo);
          }
        }else if(kode_status=='WT1'){

          if(console_number){

            let sqlGetListDo = `SELECT delivery_order_id FROM delivery_order_v WHERE r_kendaraan_id = '${r_kendaraan_id}' 
            AND console_number = '${console_number}' AND kode_status='WT1' AND schedule_delivery_date = '${schedule_delivery_date}'`;
    
            let datado2 = await request.query(sqlGetListDo);
            let rows = datado2.recordset;
    
            for (let i = 0; i < rows.length; i++) {
              let delivery_order_id = rows[i].delivery_order_id;
              let sqlUpdateDo = `UPDATE delivery_order SET isactive = 'N',updatedby = '${m_user_id}' WHERE delivery_order_id = '${delivery_order_id}' AND schedule_delivery_date = '${schedule_delivery_date}'`;
              await request.query(sqlUpdateDo);
            }

            
          }else{

            let sqlGetListDo = `SELECT delivery_order_id FROM delivery_order_v WHERE bundle_id = '${bundle_id}' 
            AND r_kendaraan_id = '${r_kendaraan_id}' AND kode_status='WT1' AND schedule_delivery_date = '${schedule_delivery_date}'`;
    
            let datado2 = await request.query(sqlGetListDo);
            let rows = datado2.recordset;
    
            for (let i = 0; i < rows.length; i++) {
              let delivery_order_id = rows[i].delivery_order_id;
              let sqlUpdateDo = `UPDATE delivery_order SET isactive = 'N',updatedby = '${m_user_id}' WHERE delivery_order_id = '${delivery_order_id}'`;
              await request.query(sqlUpdateDo);
            }

          }
  
          
        }

    
        return res.success({
          message: "Cancel order successfully"
        });

    } catch (err) {
      return res.error(err);
    }
  },


  updateDataTransporter: async function (req, res) {
    const { m_user_id, delivery_order_id, bundle_id, console_number,m_transporter_id } = req.body;

    console.log(req.body);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let nomor_id = bundle_id;

      let console_text = '';
      if(console_number){
         console_text = `'${console_number}'`;
      }else{
         console_text = 'NULL';
      }

      let bundle_id_text = '';
      if(bundle_id){
       bundle_id_text = `'${bundle_id}'`;
      }else{
       bundle_id_text = 'NULL';
      }


      let m_user_id_text = '';
      if(m_user_id){
        m_user_id_text = `'${m_user_id}'`;
      }else{
        m_user_id_text = `'SYSTEM'`;
      }
      

      let m_transporter_id_text = '';
      if(m_transporter_id){
       m_transporter_id_text = `'${m_transporter_id}'`;
      }else{
       m_transporter_id_text = 'NULL';
      }


      let sqlGetDataDoSpesifik = `SELECT r_kendaraan_id FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
      let getDataDoSpesifik = await request.query(sqlGetDataDoSpesifik);
      let datakendaraan = getDataDoSpesifik.recordset;
      let r_kendaraan_id = datakendaraan.length > 0 ? datakendaraan[0].r_kendaraan_id : null;

      let queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},kode_status = 'DOD',updatedby = ${m_user_id_text},
      catatan_bidding = 'Penunjukan Langsung Oleh Procurement'
      WHERE bundle_id = '${bundle_id}' AND r_kendaraan_id = '${r_kendaraan_id}'`;


      let sqlGetDataTransporter = `SELECT TOP 1 kode FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
      let dataTransporter = await request.query(sqlGetDataTransporter);
      let transporter = dataTransporter.recordset;
      let kodeTransporter = transporter.length > 0 ? transporter[0].kode : null;
  
      let sqlCheckDataBucketBidding = `SELECT COUNT(1) AS totalData FROM delivery_order_v do,bucket_bidding bb
      WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')
      AND bb.rute = do.route
      AND bb.jenis_kendaraan = do.jenis_kendaraan
      AND bb.kode = '${kodeTransporter}'`;
  
      let jumlahBucketBidding = await request.query(sqlCheckDataBucketBidding);
      let bucketBidding = jumlahBucketBidding.recordset;
      let totalData = bucketBidding.length > 0 ? bucketBidding[0].totalData : 0;

      if(totalData == 0){

        return res.error({
          message: "Transporter tidak terdaftar dalam ACP harap pilih transporter yang memenuhi kriteria jenis kendaraan dan rute tujuan yang sesuai dengan data ACP !"
        });
  
      }else{
  
        if(console_number){
          queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},kode_status = 'DOD',updatedby = ${m_user_id_text},
          catatan_bidding = 'Penunjukan Langsung Oleh Procurement'
          WHERE console_number = '${console_number}' AND r_kendaraan_id = '${r_kendaraan_id}'`;
  
  
  
          let sqlGetDeliveryOrder = `SELECT * FROM delivery_order WHERE console_number = '${console_number}' AND r_kendaraan_id = '${r_kendaraan_id}'`;
          let getdataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
          let datado = getdataDeliveryOrder.recordset;
  
  
          for (let i = 0; i < datado.length; i++) {
  
            console.log('logic console');
            
            let delivery_order_id = datado[i].delivery_order_id;
  
            let c_shipment_id = uuid();
            let total_biaya = 0;
            let sqlInsertShipment = `INSERT INTO c_shipment
            (c_shipment_id,createdby,updatedby, 
            m_transporter_id,
            total_biaya, 
            status, 
            status_dokumen,delivery_order_id)
            VALUES('${c_shipment_id}','${m_user_id}',
            '${m_user_id}', 
            '${m_transporter_id}', 
            ${total_biaya}, 
            'Vendor Transporter Terpilih',
            'VALID','${delivery_order_id}')`;
  
            console.log(sqlInsertShipment);
  
      
            await request.query(sqlInsertShipment);
            
          }
  
  
        }else{
  
          let sqlGetDeliveryOrder = `SELECT * FROM delivery_order WHERE bundle_id = '${bundle_id}' AND r_kendaraan_id = '${r_kendaraan_id}'`;
          let getdataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
          let datado = getdataDeliveryOrder.recordset;
    
    
          for (let i = 0; i < datado.length; i++) {
            
    
            console.log('logic bundle');
    
    
             let delivery_order_id = datado[i].delivery_order_id;
    
             let c_shipment_id = uuid();
             let total_biaya = 0;
             let sqlInsertShipment = `INSERT INTO c_shipment
             (c_shipment_id,createdby,updatedby, 
             m_transporter_id,
             total_biaya, 
             status, 
             status_dokumen,delivery_order_id)
             VALUES('${c_shipment_id}','${m_user_id}',
             '${m_user_id}', 
             '${m_transporter_id}', 
             ${total_biaya}, 
             'Vendor Transporter Terpilih',
             'VALID','${delivery_order_id}')`;
    
    
             console.log(sqlInsertShipment);
       
             await request.query(sqlInsertShipment);
            
          }
    
        }
  
        console.log(queryUpdate);
  
        request.query(queryUpdate, async (err, result) => {
          if (err) {
            return res.error(err);
          }
  
          let sqlgetdo = `SELECT * FROM delivery_order_v WHERE delivery_order_id = '${delivery_order_id}'`;
          let datado = await request.query(sqlgetdo);
          let row = datado.recordset[0]
  
          return res.success({
            data: row,
            message: "Update data successfully"
          });
        });
  
      }
    } catch (err) {
      return res.error(err);
    }
  },

   updateBundleAndConsole: async function (req, res) {
     const { m_user_id, delivery_order_id, bundle_id, console_number,m_transporter_id } = req.body;
 
     console.log(req.body);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();

       let console_text = '';
       if(console_number){
          console_text = `'${console_number}'`;
       }else{
          console_text = 'NULL';
       }

       let bundle_id_text = '';
       if(bundle_id){
        bundle_id_text = `'${bundle_id}'`;
       }else{
        bundle_id_text = 'NULL';
       }

       let m_transporter_id_text = '';
       if(m_transporter_id){
        m_transporter_id_text = `'${m_transporter_id}'`;
       }else{
        m_transporter_id_text = 'NULL';
       }
 
       let queryUpdate = `UPDATE delivery_order SET bundle_id=${bundle_id_text},console_number=${console_text},
       catatan_bidding = 'Bundle susulan atau bundle diedit'
       WHERE delivery_order_id = '${delivery_order_id}'`;
 
       if(m_transporter_id){
        queryUpdate = `UPDATE delivery_order SET bundle_id= ${bundle_id_text},console_number= ${console_text},
        m_transporter_id = ${m_transporter_id_text},
        catatan_bidding = 'Bundle susulan atau bundle diedit'
        WHERE delivery_order_id = '${delivery_order_id}'`;
       }

       console.log(queryUpdate);
 
       request.query(queryUpdate, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         let sqlgetdo = `SELECT * FROM delivery_order_v WHERE delivery_order_id = '${delivery_order_id}'`;
         let datado = await request.query(sqlgetdo);
         let row = datado.recordset[0]
 
         return res.success({
           data: row,
           message: "Update data successfully"
         });
       });
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   getBundleIdBydriver: async function (req, res) {
     const {
       query: { m_driver_id, kode_status }
     } = req;
 
     //console.log(req.query);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let muststatus = ``;
       if (kode_status == 'SGE') {
         muststatus = 'DOD';
       } else if (kode_status == 'PIC') {
         muststatus = 'SGE';
       } else if (kode_status == 'OTW') {
         muststatus = 'PIC';
       } else if (kode_status == 'SPL') {
         muststatus = 'OTW';
       } else if (kode_status == 'CHG') {
         muststatus = 'OTW';
       } else if (kode_status == 'FNS') {
         muststatus = 'PODDIST';
       }
 
 
 
       let queryDataTable = `SELECT DISTINCT bundle_id,status,penerima,route 
       FROM delivery_order_v WHERE
       m_driver_id = '${m_driver_id}' 
       AND kode_status='${muststatus}' ORDER BY bundle_id`;
 
       console.log(queryDataTable);
 
       request.query(queryDataTable, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
         for (let i = 0; i < rows.length; i++) {
 
           rows[i].nomor = i + 1;
 
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
 
   getBundleIdnotYetAssignDriver: async function (req, res) {
     const {
       query: { m_user_id }
     } = req;
 
     //console.log(req.query);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
 
       console.log(m_user_id);
       let getTransporter = `SELECT * FROM m_transporter_v WHERE m_user_id = '${m_user_id}'`;
       let datatransporter = await request.query(getTransporter);
       let m_transporter_id = datatransporter.recordset[0].m_transporter_id;
 
       let sql = `SELECT DISTINCT bundle_id,penerima FROM contract_v WHERE m_driver_id IS NULL AND m_transporter_id='${m_transporter_id}'`;
 
       request.query(sql, (err, result) => {
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
   },
   getExportExcel: async function (req, res) {
     const {
       query: { m_user_id, bundle_id, searchText, planner, transporter, startdate, enddate, m_distributor_id, kode_status }
     } = req;
 
     //console.log(req.query);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let sqlGetRole = `SELECT murv.nama,mtp.m_transporter_id,md.m_driver_id FROM m_user_role_v murv
       LEFT JOIN m_user mu ON(mu.m_user_id = murv.m_user_id) 
       LEFT JOIN m_transporter mtp ON(mtp.r_organisasi_id = mu.r_organisasi_id)
       LEFT JOIN m_driver md ON(md.r_organisasi_id = mu.r_organisasi_id) 
       WHERE murv.m_user_id='${m_user_id}'`;
 
 
       let datarole = await request.query(sqlGetRole);
       let rolename = datarole.recordset[0].nama;
       let transporter_id = datarole.recordset[0].m_transporter_id;
       let m_driver_id = datarole.recordset[0].m_driver_id;
 
 
       let sqlDateGi = ``;
       if (startdate && enddate) {
         sqlDateGi = `AND CONVERT(VARCHAR(10),rencana_jemput_gudang,120) BETWEEN '${startdate}' AND '${enddate}'`;
       }
 
 
 
       let WherePlannerId = ``;
       if (planner) {
         WherePlannerId = `AND planner_id = '${planner}'`;
       }
 
       let WhereTranspoterId = ``;
       if (transporter) {
         WhereTranspoterId = `AND m_transporter_id = '${transporter}'`;
       }
 
 
 
       let transporterlist = '';
       let driverlist = '';
       let valueIN = '';
       let listOrg = '';
 
 
       if (rolename == 'TRANSPORTER') {
 
         transporterlist = `AND m_transporter_id='${transporter_id}'`;
 
       } else if (rolename == 'DRIVER') {
         driverlist = `AND m_driver_id='${m_driver_id}'`;
       } else {
         let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
         let orgs = await request.query(org);
         let organization = orgs.recordset.map(function (item) {
           return item['r_organisasi_id'];
         });
 
         for (const datas of organization) {
           valueIN += ",'" + datas + "'"
         }
         valueIN = valueIN.substring(1)
         listOrg = organization.length > 0 ? `AND r_organisasi_id IN (${valueIN})` : "";
       }
 
       let wheredistributor = ``;
       if (m_distributor_id) {
         wheredistributor = ` and m_distributor_id = '${m_distributor_id}' `
       }
 
       let wherekode = ``;
       if (kode_status) {
         wherekode = ` and kode_status = '${kode_status}' `
       }
 
 
       let filtersearchtext = ``;
       if (searchText || bundle_id) {
         filtersearchtext = `AND nomor_cmo LIKE '%${searchText}%' OR console_number LIKE '%${searchText}%' OR bundle_id LIKE '%${searchText}%'  
         OR nomor_do LIKE '%${searchText}%' OR nomor_po LIKE '%${searchText}%' OR nomor_sap LIKE '%${searchText}%'`;
       }
 
 
       let queryDataTable = `SELECT * FROM delivery_order_to_excel_v WHERE 1=1 ${wherekode} ${wheredistributor} ${transporterlist} ${driverlist} ${filtersearchtext} ${WherePlannerId} ${WhereTranspoterId} ${sqlDateGi}`;
 
       console.log("queryDataTable",queryDataTable);
 
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
         let arraydetailsforexcel = [];
         for (let i = 0; i < rows.length; i++) {


          let bundle_id = rows[i].bundle_id;
          let console_number = rows[i].console_number;

  
          let sqlApproval = `SELECT TOP 1 * FROM delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
          let getApproval = await request.query(sqlApproval);
          let tglCreatedAppr = getApproval.recordset.length > 0 ? getApproval.recordset[0].tanggal_approve : null;
          let statusApproval = 'Auto';
  
          if(!tglCreatedAppr){
  
            if(getApproval.recordset.length > 0 ){
              statusApproval = 'Auto';
            }else{
              statusApproval = 'Manual';
            }
  
          }


  
          rows[i].tanggal_approval = tglCreatedAppr;
          rows[i].status_place_order = statusApproval;  

          
           let obj = {
 
             "NO DO": rows[i].nomor_do,
             "NO SO": rows[i].nomor_so,
             "NO CMO SAP": rows[i].nomor_sap,
             "BULAN": rows[i].bulan,
             "TAHUN": rows[i].tahun,
             "PLANNER": rows[i].planner,
             "BUNDLE ID": rows[i].bundle_id,
             "CONSOLE NUMBER": rows[i].console_number,
             "KODE SOLDTO": rows[i].kode_soldto,
             "NAMA SOLDTO": rows[i].nama_soldto,
             "KODE SHIPTO": rows[i].kode_shipto,
             "NAMA SHIPTO": rows[i].nama_shipto,
             "ALAMAT": rows[i].alamat,
             "KODE TRANSPORTER": rows[i].kode_transporter,
             "NAMA TRANSPORTER": rows[i].nama_transporter,
             "KENDARAAN": rows[i].kendaraan,
             "PLAT NOMOR KENDARAAN": rows[i].plat_nomor_kendaraan,
             "TANGGAL GI": rows[i].tanggal_gi ? moment(rows[i].tanggal_gi, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD') : '',
             "PLANNED GI": rows[i].plan_gi_date ? moment(rows[i].plan_gi_date, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD') : '',
             "RENCANA JEMPUT GUDANG": rows[i].rencana_jemput_gudang ? rows[i].rencana_jemput_gudang : '',
             "ACTUAL JEMPUT GUDANG": rows[i].actual_jemput_gudang ? moment(rows[i].actual_jemput_gudang, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DD HH:mm') : '',
             "TANGGAL TERIMA BARANG": rows[i].tanggal_pod_distributor ? rows[i].tanggal_pod_distributor : moment(rows[i].actual_sampai_tujuan, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD'),
             "STATUS PENGIRIMAN": rows[i].status,
             "LEAD TIME": rows[i].leadtime,
             "ETA": rows[i].eta ? rows[i].eta : '',
             "ACTUAL SAMPAI TUJUAN": rows[i].ata ? moment(rows[i].ata, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm') : '',
             "PRODUCT ID": rows[i].kode_barang,
             "PRODUCT DESC": rows[i].nama_barang,
             "SATUAN": rows[i].satuan,
             "QTY DO": rows[i].jumlah,
             "QTY ACTUAL": rows[i].actual_quantity,
             "SELISIH": rows[i].selisih,
             "LOKASI PICKUP": rows[i].lokasi_pickup,
             "KOTA DESTINASI": rows[i].kota_destinasi,
             "CREATED DATE": rows[i].created ? moment(rows[i].created,'YYYY-MM-DD').format('YYYY-MM-DD') : '',
             "TANGGAL APPROVAL": rows[i].tanggal_approval ? moment(rows[i].tanggal_approval,'YYYY-MM-DD').format('YYYY-MM-DD') : '',
             "STATUS PLACE ORDER": rows[i].status_place_order ,
             "ROUTE": rows[i].route ,
             "REGION": rows[i].region ,
             "CHANNEL": rows[i].channel ,
             "KAPASITAS TONASE": rows[i].kapasitas_tonase ,
             "KAPASITAS KUBIKASI": rows[i].kapasitas_kubikasi ,
             "TOTAL TONASE": rows[i].total_tonase ,
             "TOTAL KUBIKASI": rows[i].total_kubikasi ,
             "BIAYA KIRIM": rows[i].biaya_kirim 

 
           }

           arraydetailsforexcel.push(obj);
 
         }
 
 
         if (arraydetailsforexcel.length > 0) {
           let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
           let namafile = 'delivery_order_'.concat(tglfile).concat('.xlsx');
 
           var hasilXls = json2xls(arraydetailsforexcel);
           res.setHeader('Content-Type', 'application/vnd.openxmlformats');
           res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
           res.end(hasilXls, 'binary');
         } else {
 
           return res.error({
             message: "Data tidak ada"
           });
 
         }
 
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
 
   getfilePod: async function (req, res) {
    //   const user = req.param('user')

    const {
      query: { record, filename }
    } = req;

    console.log('record ',record);
    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('deliveryorder/status', record), filename + '*'))
    if (filesamaDir.found.length > 0) {

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0])
      return res.download(filesamaDir.found[0], lastItemAkaFilename)
    }
    return res.error('Failed, File Not Found');
  },
 
   getfile: async function (req, res) {
     //   const user = req.param('user')
     const record = req.param('record')
     const filename = req.param('filename')
 
     console.log('record ',record);
     // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename
 
     const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('deliveryorder/status', record), filename + '*'))
     if (filesamaDir.found.length > 0) {
 
       // return res.send(filesamaDir.found[0]);
       // return res.success('OK');
       var lastItemAkaFilename = path.basename(filesamaDir.found[0])
       return res.download(filesamaDir.found[0], lastItemAkaFilename)
     }
     return res.error('Failed, File Not Found');
   },
 
   showimage: async function (req, res) {
     //   const user = req.param('user')
     const record = req.param('record')
     const filename = req.param('filename')
 
     // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename
 
     const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('deliveryorder/status', record), filename + '*'))
     if (filesamaDir.found.length > 0) {
 
       // return res.send(filesamaDir.found[0]);
       // return res.success('OK');
       var lastItemAkaFilename = path.basename(filesamaDir.found[0])
       // return res.download(filesamaDir.found[0], lastItemAkaFilename)
       return res.sendFile(filesamaDir.found[0])
     }
     return res.error('Failed, File Not Found');
   },

   podDist_manual: async function (req, res) {
    const { bundle_id,m_user_id } = req.body; // --> terima request user
    console.log("PARAM ",bundle_id," muser ",m_user_id);

    // return res.error("xxxx")
    await DB.poolConnect; //--> inisialisasi variable DB
    try {
        const request = DB.pool.request(); //--> init var request koneksi

        // query buat ambil console_bumbernya 
        let qcek = `select delivery_order_id,console_number from delivery_order do where bundle_id in (${bundle_id.map(item => `'${item}'`).join(',')}) and console_number is not NULL `;
        let data_qcek = await request.query(qcek) // --> execute
        let data = data_qcek.recordset // --> ambil recordset nya aja

        let console_number = data.map(item => item.console_number);
        console.log("console_number: ", console_number);


        if (!console_number.length) {
          // logic jika console_number null > update pake bundle_id in ()
          const sqlUpd1 = `UPDATE delivery_order set status = 'POD Distributor', kode_status = 'PODDIST', ismanual_pod = 'Y' , tanggal_pod_distributor = GETDATE()
          where bundle_id in (${bundle_id.map(item => `'${item}'`).join(',')}) `
          console.log(sqlUpd1);

          await request.query(sqlUpd1);
          
        } else {
          // logic jika console_number tidak null > update pake bundle_id in () or console_number in ()
          const sqlUpd2 = `UPDATE delivery_order set status = 'POD Distributor', kode_status = 'PODDIST', ismanual_pod = 'Y' , tanggal_pod_distributor = GETDATE()
          where bundle_id in (${bundle_id.map(item => `'${item}'`).join(',')})
          or console_number in (${console_number.map(item2 => `'${item2}'`).join(',')})  `
          console.log(sqlUpd2);

          await request.query(sqlUpd2);
        }

        //** PROSES INSERT AUDIT BERDASARKAN DELIVERY_ORDER_ID **/        
        let qcek1 = `select delivery_order_id,createdby from delivery_order do where bundle_id in (${bundle_id.map(item => `'${item}'`).join(',')}) `;
        let data_qcek1 = await request.query(qcek1) // --> execute
        let data1 = data_qcek1.recordset 
        
        let do_id = data1.map(item => item.delivery_order_id);
        console.log("delivery_order_id: ", do_id);

        for (const item of do_id) {
          console.log("ITEM: ", item);
        
          // value m_user_id tidak bisa diisi SYS harus berelasi ke m_user jadi pake user ilyas
          const sqlIns = `INSERT INTO audit_tracking (isactive,delivery_order_id,m_user_id,kode_status,status) 
          VALUES ('Y','${item}','2490888c-216c-4562-b84b-d4f042be5969','PODDIST','POD Distributor');  `
          console.log(sqlIns);
        
          await request.query(sqlIns);
        }

        return res.success({
          message: "UPDATE POD DISTIBUTOR SUCCESS DILAKUKAN :) ",
        });

    } catch (err) {
        return res.error(err);
    }
    },

    inject_shipment: async function (req, res) {
      const { bundle_id,m_user_id } = req.body; // --> terima request user
      console.log("PARAM ",bundle_id," muser ",m_user_id);
  
      // return res.error("xxxx")
      await DB.poolConnect; //--> inisialisasi variable DB
      try {
          const request = DB.pool.request(); //--> init var request koneksi
  
          //** PROSES INSERT AUDIT BERDASARKAN DELIVERY_ORDER_ID **/        
          let qcek1 = `select delivery_order_id,m_transporter_id from delivery_order do where bundle_id in (${bundle_id.map(item => `'${item}'`).join(',')}) `;
          console.log("QUERY 1 ", qcek1);
          let data_qcek1 = await request.query(qcek1) // --> execute
          let data1 = data_qcek1.recordset ;
          

          for (let i = 0; i < data1.length; i++) {
            let delivery_order_id = data1[i].delivery_order_id;
            let m_transporter_id = data1[i].m_transporter_id;

            let qcek2 = `select * from c_shipment where delivery_order_id = '${delivery_order_id}' `;
            let data_qcek2 = await request.query(qcek2) // --> execute
            let data2 = data_qcek2.recordset ;

            if (data2.length > 0) {
              console.log("SKIP DO INI KARNA UDAH ADA >> ",delivery_order_id);
              // SKIP 
            } else {
              let sqlInsertShipment = `INSERT INTO  c_shipment
                  (c_shipment_id,createdby,updatedby, 
                  m_transporter_id,
                  total_biaya, 
                  status, 
                  status_dokumen,delivery_order_id)
                  VALUES(newid(),'${m_user_id}',
                  '${m_user_id}', 
                  '${m_transporter_id}', 
                  0, 
                  'Vendor Transporter Terpilih',
                  'VALID','${delivery_order_id}')`;   
                  console.log("QUERY 2 ", sqlInsertShipment);
                  await request.query(sqlInsertShipment);
            }
            
          }

          return res.success({
            message: "Berhasil Inject C_SHIPMENT :) ",
          });
  
      } catch (err) {
          return res.error(err);
      }
    }

 
 };

 
 
 
 
 
 function racikXML(xmlTemplate, jsonArray, rootHead) {
   var builder = new xml2js.Builder({ headless: true, rootName: rootHead })
   const result = builder.buildObject(jsonArray[0])
 
 
   return xmlTemplate.replace('?', result)
 }


 function racikXMLGetDo(xmlTemplate, result) {
  return xmlTemplate.replace('?', result)
}
 

  
 function racikXML2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })
  const result = builder.buildObject(addTemplate)
  

  return xmlTemplate.replace('?', result)
}

 
 function pad(d) {
   var str = "" + d
   var pad = "00000"
   var ans = pad.substring(0, pad.length - str.length) + str
   return ans;
 }
 
 function padGetReady(d) {
  var str = "" + d
  var pad = "0000000000"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}
 function padnumber(d) {
   return (d < 10) ? '0' + d.toString() : d.toString();
 }
 
 async function uploadFiles(id, file) {
   var uploadFile = file;
   // console.log(uploadFile);
   let filenames = ``
   uploadFile.upload({ maxBytes: 500000000000 },
     async function onUploadComplete(err, files) {
       if (err) {
         let errMsg = err.message
         console.log(errMsg);
         return res.error(errMsg)
       }
       //console.log(id, "px");
       let nama = ``
       for (const file of files) {
         console.log('filename', file.filename)
         let nama = file.filename
         filenames = file.filenam;
         fs.mkdirSync(dokumentPath('ba_misspart', id), {
           recursive: true
         })
         const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('ba_misspart', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
         if (filesamaDir.found.length > 0) {
           console.log('isexist file nama sama', filesamaDir.found[0])
           fs.unlinkSync(filesamaDir.found[0])
         }
         console.log(file.fd);
         fs.renameSync(file.fd, path.resolve(dokumentPath('ba_misspart', id), file.filename))
         console.log("asdas");
 
       }
       console.log("asdas", nama);
 
     })
 
 }
 
 
 