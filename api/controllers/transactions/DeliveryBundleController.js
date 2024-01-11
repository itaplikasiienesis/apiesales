const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");
const { head } = require('lodash');
const { func } = require('joi');
const { Table } = require('mssql');
const path = require('path');
const glob = require("glob");
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const DBPROCUREMENT = require('./../../services/DBPROCUREMENT');
const DBPORTAL = require('./../../services/DBPORTAL');
const _ = require('lodash');
const json2xls = require('json2xls');

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
    
    find: async function (req, res) {
        const {
          query: { currentPage, pageSize, bundle_id,searchText, planner, transporter, startdate, enddate, m_distributor_id, kode_status,nip}
        } = req;
         console.log(req.query);
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

          let filtersearchtext = ``;
          if (searchText) {
            filtersearchtext = `AND (ltbv.console_number LIKE '%${searchText}%' OR ltbv.nomor_id LIKE '%${searchText}%'  
              OR ltbv.planner LIKE '%${searchText}%' OR ltbv.nama_transporter LIKE '%${searchText}%')`;
          }
        
          let WhereBundleId = ``;
          if (bundle_id) {
            WhereBundleId = `AND ltbv.nomor_id = '${bundle_id}'`;
          }



          let whereRange = ``;
          if (startdate && enddate) {
              whereRange = `AND CONVERT(VARCHAR(10),ltbv.tanggal_penjemputan,120) BETWEEN '${startdate}' AND '${enddate}'`;
          }else if(startdate && !enddate) {
              whereRange = `AND CONVERT(VARCHAR(10),ltbv.tanggal_penjemputan,120) BETWEEN '${startdate}' AND '${startdate}'`;
          }
    
          
    
    
          let WherePlannerId = ``;
          if (planner) {
            WherePlannerId = `AND ltbv.planner_id = '${planner}'`;
          }
    
          let WhereTranspoterId = ``;
          if (transporter) {
            WhereTranspoterId = `AND ltbv.m_transporter_id = '${transporter}'`;
          }

          let WhereKodeStatus = ``;
          if (kode_status) {
            WhereKodeStatus = `AND ltbv.kode_status = '${kode_status}'`;
          }

    

          let queryCountTable = `SELECT COUNT(1) AS total_rows
          FROM listing_tracking_bundle_unique_v ltbv WHERE 1=1 ${WhereBundleId} ${whereRange} ${WherePlannerId} 
          ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}`;

          // console.log(queryCountTable);

          
          const totalItems = await request.query(queryCountTable);
          const count = totalItems.recordset[0].total_rows || 0;

          
          let queryDataTable = `SELECT *,(SELECT TOP 1 CONVERT(VARCHAR(16),at2.created,120) FROM audit_tracking at2 
            WHERE at2.delivery_order_id = (SELECT TOP 1 delivery_order_id FROM delivery_order 
            WHERE console_number = ltbv.nomor_id OR bundle_id = ltbv.nomor_id) AND at2.kode_status='SGE' AND isactive='Y') AS actual_tiba_digudang,
           (SELECT TOP 1 CONVERT(VARCHAR(16),tanggal_gi,120)
            FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') tanggal_gi,
            (SELECT TOP 1 CONVERT(VARCHAR(16),schedule_delivery_date,120) 
              FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') schedule_delivery_date,
              ( SELECT TOP 1 COALESCE(rlt.waktu,0) AS waktu
                FROM delivery_order do, m_distributor md,r_organisasi ro,r_late_time rlt 
                WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) 
                AND do.m_distributor_id = md.m_distributor_id  AND do.isactive='Y'
                AND md.r_organisasi_id = ro.r_organisasi_id
                AND rlt.kode_distributor = ro.kode ) leadtime,
                (SELECT TOP 1 CONVERT(VARCHAR(16),actual_sampai_tujuan,120) 
                  FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') actual_sampai_tujuan,
                  (SELECT TOP 1 CONVERT(VARCHAR(16),tanggal_pod_distributor,120) 
                    FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') tanggal_pod_distributor,
                    (SELECT TOP 1 DATEDIFF(day, tanggal_gi,tanggal_pod_distributor) 
                      FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') actual_leadtime,
                      (SELECT TOP 1 mdv.region AS region
                        FROM delivery_order do,m_distributor_v mdv WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id)
                         AND do.m_distributor_id = mdv.m_distributor_id AND do.isactive='Y'
                        ) region
            FROM listing_tracking_bundle_unique_v ltbv
            WHERE 1=1
          ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
          ORDER BY tanggal_penjemputan ASC
          OFFSET ${offset} ROWS
          FETCH NEXT ${limit} ROWS ONLY`;

         
        console.log(queryDataTable);
    
          request.query(queryDataTable, async (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset;


            for (let i = 0; i < rows.length; i++) {



              let nomor_id = rows[i].nomor_id;

              rows[i].eta = moment(rows[i].schedule_delivery_date, 'YYYY-MM-DD').add(rows[i].leadtime, 'days').format('YYYY-MM-DD');

              // GET DATA LOG BIDDING
              let sqlgetDoRlogBidding = `SELECT r_log_bidding_id FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
              let checkdataRlogbidding = await request.query(sqlgetDoRlogBidding); 
              let r_log_bidding_id = checkdataRlogbidding.recordset.length > 0 ? checkdataRlogbidding.recordset[0].r_log_bidding_id : null;

              if(r_log_bidding_id){
                r_log_bidding_id = _.uniq(r_log_bidding_id);
              }



              // AMBIL DATA STATUS PERBUNDLE
              let sqlgetDoStatus = `SELECT bundle_id,status FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
              let checkdataStatus = await request.query(sqlgetDoStatus); 
              let arrayStatusPebundle = [];

              for (let i = 0; i < checkdataStatus.recordset.length; i++) {

                let data_bundle_id = checkdataStatus.recordset[i].bundle_id;
                let data_status = checkdataStatus.recordset[i].status;
                let dataInfo = data_bundle_id+' - '+data_status;
                arrayStatusPebundle.push(dataInfo);

              }

              if(arrayStatusPebundle.length > 0){
                arrayStatusPebundle = _.uniq(arrayStatusPebundle);
              }



              let info_ring = null;
              let info_max_ring = null;
              let info_ring_winner = null;
              
              if(r_log_bidding_id){


                let sqlGetDataRing = `SELECT DISTINCT max_ring,CASE WHEN isactive = 0 THEN max_ring ELSE ring_transporter END AS ring 
                FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}'`;
                let checkGetDataRing = await request.query(sqlGetDataRing); 
                let max_ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].max_ring : 0;
                let ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].ring : 0;

                info_max_ring = max_ring;


                let sqlGetRingWinner = `SELECT TOP 1 ring_transporter 
                FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}' AND winner_date IS NOT NULL`;
                let checkGetDataRingWinner = await request.query(sqlGetRingWinner); 
                let ring_winner = checkGetDataRingWinner.recordset.length > 0 ? checkGetDataRingWinner.recordset[0].ring_transporter : null;
                info_ring_winner = ring_winner;
                info_ring = ring_winner ? ring_winner : ring;


              }
              


              // PROSES CEK BUNDLE ATAU CONSOLE

              let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order dov WHERE bundle_id = '${nomor_id}' AND isactive='Y'`;
              let dataCheckBundleOrConsole = await request.query(sqlGetChekbundleOrConsole);
              let jumlah_data = dataCheckBundleOrConsole.recordset.length > 0 ? dataCheckBundleOrConsole.recordset[0].jumlah_data : 0;

              let bundle_id = '';
              let console_number = '';

              if(jumlah_data > 0){
                bundle_id = nomor_id;
              }else{
                console_number = nomor_id;
              }

      
              let kapasitas_tonase = rows[i].kapasitas_tonase;
              let kapasitas_kubikasi = rows[i].kapasitas_kubikasi;

              rows[i].status = arrayStatusPebundle.toString();


              let sqlGetDateCreated = `SELECT TOP 1 CONVERT(VARCHAR(10),created,120) AS created FROM delivery_order do 
              WHERE do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}' ORDER BY created ASC`;

              let getDateCreated = await request.query(sqlGetDateCreated);
              let datecreated = getDateCreated.recordset.length > 0 ? getDateCreated.recordset[0].created : null;
              rows[i].created = datecreated;


              if(console_number){

                // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
                // FROM delivery_order WHERE isactive = 'Y' AND console_number = '${console_number}'`;

                let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
                COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                        delivery_order_detail dod,m_produk mp 
                        WHERE do.isactive = 'Y' AND do.console_number = '${console_number}'
                        AND dod.delivery_order_id = do.delivery_order_id
                        AND mp.m_produk_id = dod.m_produk_id`;

                let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
                let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
                let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


                let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
                let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
                let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
                rows[i].tonase = Number(total_tonase).toFixed(2);
                rows[i].kubikasi = Number(total_kubikasi).toFixed(2);

                rows[i].vso_tonase = vso_tonase;
                rows[i].vso_kubikasi = vso_kubikasi;
                rows[i].vso_final = vso_final;

                rows[i].info_ring = info_ring ? info_ring : '-';
                rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
                rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada pemenang';

              }else{

                // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
                // FROM delivery_order WHERE isactive = 'Y' AND bundle_id = '${bundle_id}'`;

                let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
                COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                        delivery_order_detail dod,m_produk mp 
                        WHERE do.isactive = 'Y' AND do.bundle_id = '${bundle_id}'
                        AND dod.delivery_order_id = do.delivery_order_id
                        AND mp.m_produk_id = dod.m_produk_id`;
                let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
                let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
                let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


                let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
                let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
                let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;

                rows[i].tonase = Number(total_tonase).toFixed(2);
                rows[i].kubikasi = Number(total_kubikasi).toFixed(2);

                rows[i].vso_tonase = vso_tonase;
                rows[i].vso_kubikasi = vso_kubikasi;
                rows[i].vso_final = vso_final;

                rows[i].info_ring = info_ring ? info_ring : '-';
                rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
                rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada pemenang';

              }


              
              let sqlApproval = `SELECT TOP 1 CONVERT(VARCHAR(10),tanggal_approve,120) AS tanggal_approve FROM delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
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
                  
            }


            // console.log(rows);


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


      findPlacedOrderAll: async function (req, res) {
        const {
          query: { currentPage, pageSize, bundle_id,searchText, planner, transporter, startdate, enddate, kode_status}
        } = req;
        // console.log(req.query);
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          let { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

          let filtersearchtext = ``;
          if (searchText) {
            filtersearchtext = `AND (console_number LIKE '%${searchText}%' OR nomor_id LIKE '%${searchText}%'  
              OR planner LIKE '%${searchText}%' OR nama_transporter LIKE '%${searchText}%')`;
          }
        
          let WhereBundleId = ``;
          if (bundle_id) {
            WhereBundleId = `AND nomor_id = '${bundle_id}'`;
          }

          let whereRange = ``;
          if (startdate && enddate) {
              whereRange = `AND CONVERT(VARCHAR(10),tanggal_penjemputan,120) BETWEEN '${startdate}' AND '${enddate}'`;
          }
    
    
    
          let WherePlannerId = ``;
          if (planner) {
            WherePlannerId = `AND planner_id = '${planner}'`;
          }
    
          let WhereTranspoterId = ``;
          if (transporter) {
            WhereTranspoterId = `AND m_transporter_id = '${transporter}'`;
          }

          let WhereKodeStatus = ``;
          if (kode_status) {
            WhereKodeStatus = `AND kode_status = '${kode_status}'`;
          }

    

          let queryCountTable = `SELECT COUNT(1) AS total_rows
          FROM listing_placed_order_v WHERE 1=1 ${WhereBundleId} 
          ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}`;

          let totalItems;
          let count;
          try {
            totalItems = await request.query(queryCountTable);
            count = totalItems.recordset[0].total_rows || 0;
    
          } catch (error) {
            console.log(error);
          }
          

          if (searchText) {
            offset = 0;
            limit = count;
          }


          if(count > 0 && count < 10){
            limit = count;
          }else{
            limit = 10;
          }

          

       
          let queryDataTable = `SELECT * FROM listing_placed_order_v WHERE 1=1 ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
          ORDER BY tanggal_penjemputan ASC
          OFFSET ${offset} ROWS
          FETCH NEXT ${limit} ROWS ONLY`;


          if(count == 0){
    
            queryDataTable = `SELECT * FROM listing_placed_order_v WHERE 1=1
            ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
            ORDER BY tanggal_penjemputan ASC`;
           
          }
     
    
         
        //  console.log(queryDataTable);
    
          request.query(queryDataTable, async (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset;


            for (let i = 0; i < rows.length; i++) {



              let nomor_id = rows[i].nomor_id;



              // PROSES PENGECEKAN PROGRESS RING

              
              let sqlgetDoRlogBidding = `SELECT DISTINCT r_log_bidding_id FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
              let checkdataRlogbidding = await request.query(sqlgetDoRlogBidding); 
              let r_log_bidding_id = checkdataRlogbidding.recordset.length > 0 ? checkdataRlogbidding.recordset[0].r_log_bidding_id : null;

              let info_ring = null;
              let info_max_ring = null;
              let info_ring_winner = null;
              
              if(r_log_bidding_id){


                let sqlGetDataRing = `SELECT DISTINCT max_ring,CASE WHEN isactive = 0 THEN max_ring ELSE ring_transporter END AS ring 
                FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}'`;
                let checkGetDataRing = await request.query(sqlGetDataRing); 
                let max_ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].max_ring : 0;
                let ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].ring : 0;

                info_max_ring = max_ring;


                let sqlGetRingWinner = `SELECT TOP 1 ring_transporter 
                FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}' AND winner_date IS NOT NULL`;
                let checkGetDataRingWinner = await request.query(sqlGetRingWinner); 
                let ring_winner = checkGetDataRingWinner.recordset.length > 0 ? checkGetDataRingWinner.recordset[0].ring_transporter : null;
                info_ring_winner = ring_winner;
                info_ring = ring_winner ? ring_winner : ring;


              }


              // PROSES CEK BUNDLE ATAU CONSOLE

              let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order dov WHERE bundle_id = '${nomor_id}' AND isactive='Y'`;
              let dataCheckBundleOrConsole = await request.query(sqlGetChekbundleOrConsole);
              let jumlah_data = dataCheckBundleOrConsole.recordset.length > 0 ? dataCheckBundleOrConsole.recordset[0].jumlah_data : 0;

              let bundle_id = '';
              let console_number = '';

              if(jumlah_data > 0){
                bundle_id = nomor_id;
              }else{
                console_number = nomor_id;
              }

      
              let kapasitas_tonase = rows[i].kapasitas_tonase;
              let kapasitas_kubikasi = rows[i].kapasitas_kubikasi;


              let sqlGetDateCreated = `SELECT TOP 1 CONVERT(VARCHAR(10),created,120) AS created FROM delivery_order do 
              WHERE do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}' ORDER BY created ASC`;

              let getDateCreated = await request.query(sqlGetDateCreated);
              let datecreated = getDateCreated.recordset.length > 0 ? getDateCreated.recordset[0].created : null;
              rows[i].created = datecreated;


              if(console_number){

                // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
                // FROM delivery_order WHERE isactive = 'Y' AND console_number = '${console_number}'`;

                let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
                COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                        delivery_order_detail dod,m_produk mp 
                        WHERE do.isactive = 'Y' AND do.console_number = '${console_number}'
                        AND dod.delivery_order_id = do.delivery_order_id
                        AND mp.m_produk_id = dod.m_produk_id`;

                let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
                let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
                let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


                let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
                let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
                let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
                rows[i].tonase = Number(total_tonase).toFixed(2);
                rows[i].kubikasi = Number(total_kubikasi).toFixed(2);

                rows[i].vso_tonase = vso_tonase;
                rows[i].vso_kubikasi = vso_kubikasi;
                rows[i].vso_final = vso_final;


                rows[i].info_ring = info_ring ? info_ring : '-';
                rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
                rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada pemenang';

              }else{

                // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
                // FROM delivery_order WHERE isactive = 'Y' AND bundle_id = '${bundle_id}'`;

                let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
                COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                        delivery_order_detail dod,m_produk mp 
                        WHERE do.isactive = 'Y' AND do.bundle_id = '${bundle_id}'
                        AND dod.delivery_order_id = do.delivery_order_id
                        AND mp.m_produk_id = dod.m_produk_id`;

                let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
                let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
                let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


                let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
                let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
                let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
                rows[i].tonase = Number(total_tonase).toFixed(2);
                rows[i].kubikasi = Number(total_kubikasi).toFixed(2);

                rows[i].vso_tonase = vso_tonase;
                rows[i].vso_kubikasi = vso_kubikasi;
                rows[i].vso_final = vso_final;

                rows[i].info_ring = info_ring ? info_ring : '-';
                rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
                rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada pemenang';

              }


              let sqlApproval = `SELECT TOP 1 CONVERT(VARCHAR(10),tanggal_approve,120) AS tanggal_approve FROM delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
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
              
            }

            const meta = paginate(currentPage, count, rows, pageSize);
            // console.log(rows);

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

      findOne: async function (req, res) {
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          
          let nomor_id = req.param("id");
          
          console.log('kesini semuanya');

          // AMBIL r_log_bidding_id UNTUK KEPERLUAN PENGECEKAN RING
          let sqlgetDoRlogBidding = `SELECT DISTINCT r_log_bidding_id FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
          let checkdataRlogbidding = await request.query(sqlgetDoRlogBidding); 
          let r_log_bidding_id = checkdataRlogbidding.recordset.length > 0 ? checkdataRlogbidding.recordset[0].r_log_bidding_id : null;

          let info_ring = 0;
          let info_max_ring = 0;
          let info_ring_winner = null;

          let lokasi_pickup = null;
          let kota_destinasi = null;
          
          if(r_log_bidding_id){


            let sqlGetDataRing = `SELECT DISTINCT max_ring,CASE WHEN isactive = 0 THEN max_ring ELSE ring_transporter END AS ring 
            FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}'`;
            let checkGetDataRing = await request.query(sqlGetDataRing); 
            let max_ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].max_ring : 0;
            let ring = checkGetDataRing.recordset.length > 0 ? checkGetDataRing.recordset[0].ring : 0;

            info_max_ring = max_ring;


            let sqlGetRingWinner = `SELECT TOP 1 ring_transporter 
            FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}' AND winner_date IS NOT NULL`;
            let checkGetDataRingWinner = await request.query(sqlGetRingWinner); 
            let ring_winner = checkGetDataRingWinner.recordset.length > 0 ? checkGetDataRingWinner.recordset[0].ring_transporter : null;
            info_ring_winner = ring_winner;
            info_ring = ring_winner ? ring_winner : ring;



            let sqlGetRoute = `SELECT DISTINCT route FROM delivery_order do WHERE do.r_log_bidding_id  = '${r_log_bidding_id}'`;
            let dataroute = await request.query(sqlGetRoute);
            let route = dataroute.recordset;


            let arrayRoute = [];
            for (let j = 0; j < route.length; j++) {
                let element = route[j].route;
                arrayRoute.push(element);
            }
            let listRoute = '';


            for (const datas of arrayRoute) {
                listRoute += ',\'' + datas + '\'';
            }
            
            // eslint-disable-next-line no-unused-vars
            listRoute = listRoute.substring(1)


            let sqlgetVendorName = `SELECT trim(split_part(description , '-', 1)) as lokasi_pickup,
            trim(split_part(description , '-', 2)) as kota_destinasi FROM master_routes WHERE code IN (${listRoute})`;
        
            let dataRoute = await DBPROCUREMENT.query(sqlgetVendorName);
            dataRoute = dataRoute.rows;

            let arrayLokasiPickup = [];
            let arrayKotaDestinasi = [];

            for (let o = 0; o < dataRoute.length; o++) {
                let locpickup = dataRoute[o].lokasi_pickup;
                let kotades = dataRoute[o].kota_destinasi;

                arrayLokasiPickup.push(locpickup);
                arrayKotaDestinasi.push(kotades);
                
            }

            arrayLokasiPickup = _.uniq(arrayLokasiPickup);
            arrayKotaDestinasi = _.uniq(arrayKotaDestinasi);


            lokasi_pickup = arrayLokasiPickup.length > 0 ? arrayLokasiPickup.toString() : '';
            kota_destinasi = arrayKotaDestinasi.length > 0 ? arrayKotaDestinasi.toString(): '';


          }


          let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order dov WHERE bundle_id = '${nomor_id}' AND isactive='Y'`;
          let dataCheckBundleOrConsole = await request.query(sqlGetChekbundleOrConsole);
          let jumlah_data = dataCheckBundleOrConsole.recordset.length > 0 ? dataCheckBundleOrConsole.recordset[0].jumlah_data : 0;

          let bundle_id = '';

          if(jumlah_data > 0){
            bundle_id = nomor_id;
          }else{

            let sqlgetNomorBundle = `SELECT top 1 bundle_id FROM delivery_order dov WHERE console_number = '${nomor_id}' AND isactive='Y'`;
            let dataNomorBundle = await request.query(sqlgetNomorBundle);
            bundle_id = dataNomorBundle.recordset.length > 0 ? dataNomorBundle.recordset[0].bundle_id : nomor_id;

          }


          
          let queryDataTable = `SELECT * FROM delivery_order_bundle_v WHERE bundle_id='${bundle_id}'`;

          //console.log(queryDataTable);
    
          request.query(queryDataTable, async (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset[0];
            let bundle_id = nomor_id;

            let sqlGetNamaDistributor = `SELECT *,rk.tonase AS kapasitas_tonase,rk.kubikasi AS kapasitas_kubikasi,mdv.nama AS penerima 
            FROM delivery_order do,r_kendaraan rk,m_distributor_v mdv  
            WHERE (do.bundle_id='${nomor_id}' OR do.console_number = '${nomor_id}') AND do.isactive='Y'
            AND rk.r_kendaraan_id = do.r_kendaraan_id
            AND mdv.m_distributor_id = do.m_distributor_id`;

            // let sqlGetNamaDistributor = `SELECT * FROM delivery_order WHERE bundle_id='${nomor_id}' OR console_number = '${nomor_id}' AND isactive='Y'`;
            console.log(sqlGetNamaDistributor);
            let data = await request.query(sqlGetNamaDistributor);
            data = data.recordset;

            let kapasitas_tonase = data.length > 0 ? data[0].kapasitas_tonase : 0;
            let kapasitas_kubikasi = data.length > 0 ? data[0].kapasitas_kubikasi : 0;

            let console_number = data.length > 0 ? data[0].console_number : null;


            let sqlGetDateCreated = `SELECT TOP 1 CONVERT(VARCHAR(10),created,120) AS created FROM delivery_order do 
            WHERE do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}' ORDER BY created ASC`;

            let getDateCreated = await request.query(sqlGetDateCreated);
            let datecreated = getDateCreated.recordset.length > 0 ? getDateCreated.recordset[0].created : null;

            console.log('datecreated ',datecreated);
            rows.created = datecreated;


            if(console_number){

              // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
              // FROM delivery_order WHERE console_number = '${console_number}' AND isactive='Y'`;


              let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
              COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                      delivery_order_detail dod,m_produk mp 
                      WHERE do.isactive = 'Y' AND do.console_number = '${console_number}'
                      AND dod.delivery_order_id = do.delivery_order_id
                      AND mp.m_produk_id = dod.m_produk_id`;

              let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
              let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
              let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;

              let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
              let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
              let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;

              rows.tonase = Number(total_tonase).toFixed(2);
              rows.kubikasi = Number(total_kubikasi).toFixed(2);
              console.log('total_tonase ',total_tonase);
              console.log('total_kubikasi ',total_kubikasi);
              console.log('kapasitas_tonase ',kapasitas_tonase);
              console.log('kapasitas_kubikasi ',kapasitas_kubikasi);

              rows.vso_tonase = vso_tonase;
              rows.vso_kubikasi = vso_kubikasi;
              rows.vso_final = vso_final;
              rows.lokasi_pickup = lokasi_pickup;
              rows.kota_destinasi = kota_destinasi;
              // SET NIP APROVAL CURRENT

              let sqlGetApprovalUser = `SELECT TOP 1 nip FROM delivery_bundle_approval_v dbav where bundle_id = '${console_number}' 
              AND flag = 0 ORDER BY urutan ASC`;

              let dataNipApproval = await request.query(sqlGetApprovalUser);
              let nip_approval = dataNipApproval.recordset.length > 0 ? dataNipApproval.recordset[0].nip : null;
              rows.nip_approval = nip_approval;

              // SET DETAIL APPROVAL
              let sqlGetDetailApprovalUser = `SELECT * FROM delivery_bundle_approval_v dbav where bundle_id = '${console_number}' ORDER BY urutan ASC`;
              let dataApproval = await request.query(sqlGetDetailApprovalUser);
              rows.listApproval = dataApproval.recordset;


              // SET DETAIL BUNDLE
              let sqlGetDetailBundle = `SELECT bundle_id FROM delivery_order dbav WHERE console_number = '${console_number}' AND isactive='Y'`;
              let dataBundleId = await request.query(sqlGetDetailBundle);


              let arrayBundleId = [];
              for (let i = 0; i < dataBundleId.recordset.length; i++) {
                const bundle_id = dataBundleId.recordset[i].bundle_id;
                if(bundle_id){
                  arrayBundleId.push(bundle_id);
                }
              }
              

              rows.bundle_id = _.uniq(arrayBundleId).toString();


            }else{

              // let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
              // FROM delivery_order WHERE (bundle_id = '${bundle_id}' OR console_number='${bundle_id}') AND isactive='Y'`;


              let sqlGetTotalTonaseDanKubikasi = `SELECT COALESCE(SUM(dod.jumlah * mp.tonase),0) AS total_tonase,
              COALESCE(SUM(dod.jumlah * mp.kubikasi),0) AS total_kubikasi FROM delivery_order do,
                      delivery_order_detail dod,m_produk mp 
                      WHERE do.isactive = 'Y' AND do.bundle_id = '${bundle_id}'
                      AND dod.delivery_order_id = do.delivery_order_id
                      AND mp.m_produk_id = dod.m_produk_id`;

              let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
              let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
              let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


              let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
              let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
              let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;


              rows.tonase = Number(total_tonase).toFixed(2);
              rows.kubikasi = Number(total_kubikasi).toFixed(2);

              rows.vso_tonase = vso_tonase;
              rows.vso_kubikasi = vso_kubikasi;
              rows.vso_final = vso_final;

              rows.lokasi_pickup = lokasi_pickup;
              rows.kota_destinasi = kota_destinasi;

              let sqlGetApprovalUser = `SELECT TOP 1 nip FROM delivery_bundle_approval_v dbav where bundle_id = '${bundle_id}' 
              AND flag = 0 ORDER BY urutan ASC`;
              let dataNipApproval = await request.query(sqlGetApprovalUser);
              let nip_approval = dataNipApproval.recordset.length > 0 ? dataNipApproval.recordset[0].nip : null;
              rows.nip_approval = nip_approval;


              // SET DETAIL APPROVAL
              let sqlGetDetailApprovalUser = `SELECT * FROM delivery_bundle_approval_v dbav where bundle_id = '${bundle_id}' ORDER BY urutan ASC`;
              let dataApproval = await request.query(sqlGetDetailApprovalUser);
              rows.listApproval = dataApproval.recordset;


              


            }


            let sqlApproval = `SELECT TOP 1 CONVERT(VARCHAR(10),tanggal_approve,120) AS tanggal_approve FROM delivery_bundle_approval dba where bundle_id = '${bundle_id}' or bundle_id = '${console_number}' order by urutan DESC `;
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

            rows.tanggal_approval = tglCreatedAppr;
            rows.status_place_order = statusApproval;

            rows.kapasitas_kubikasi = kapasitas_kubikasi;
            rows.kapasitas_tonase = kapasitas_tonase;

            let arrayTujuan = [];
            for (let i = 0; i < data.length; i++) {
              const tujuan = data[i].tujuan;
              if(tujuan){
                arrayTujuan.push(tujuan);
              }
              
            }

            arrayTujuan = _.uniq(arrayTujuan);
            rows.tujuan = arrayTujuan.length > 0 ? arrayTujuan.toString() : null;


            let arrayAlamat = [];
            for (let i = 0; i < data.length; i++) {
              const alamat = data[i].alamat;
              if(alamat){
                arrayAlamat.push(alamat);
              }              
            }

            arrayAlamat = _.uniq(arrayAlamat);
            rows.alamat = arrayAlamat.length > 0 ? arrayAlamat.toString() : null;

            let arrayRegion = [];
            for (let i = 0; i < data.length; i++) {
              const region = data[i].region;

              if(region){
                arrayRegion.push(region);
              }
              
            }

            arrayRegion = _.uniq(arrayRegion);
            rows.region = arrayRegion.length > 0 ? arrayRegion.toString() : null;


            let arrayChannel = [];
            for (let i = 0; i < data.length; i++) {
              const channel = data[i].channel;

              if(channel){
                arrayChannel.push(channel);
              }
              
            }

            arrayChannel = _.uniq(arrayChannel);
            rows.channel = arrayChannel.length > 0 ? arrayChannel.toString() : null;


            let arrayPenerima = [];
            for (let i = 0; i < data.length; i++) {
              const penerima = data[i].penerima;

              if(penerima){
                arrayPenerima.push(penerima);
              }
              
            }


            // console.log('arrayPenerima ',arrayPenerima);

            arrayPenerima = _.uniq(arrayPenerima);
            rows.penerima = arrayPenerima.length > 0 ? arrayPenerima.toString() : null;



              // AMBIL DATA STATUS PERBUNDLE
              let sqlgetDoStatus = `SELECT DISTINCT bundle_id,status FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
              let checkdataStatus = await request.query(sqlgetDoStatus); 
              let arrayStatusPebundle = [];

              for (let i = 0; i < checkdataStatus.recordset.length; i++) {

                let data_bundle_id = checkdataStatus.recordset[i].bundle_id;
                let data_status = checkdataStatus.recordset[i].status;
                let dataInfo = data_bundle_id+' - '+data_status;
                arrayStatusPebundle.push(dataInfo);

              }


              arrayStatusPebundle = _.uniq(arrayStatusPebundle);
              rows.status = arrayStatusPebundle.length > 0 ? arrayStatusPebundle.toString() : null;



            let arrayTanggalSampaiTujuan = [];
            for (let i = 0; i < data.length; i++) {
              const tanggal_sampai_tujuan = data[i].tanggal_sampai_tujuan ? moment(data[i].tanggal_sampai_tujuan,'YYYY-MM-DD').format('DD-MMM-YYYY') : null;

              if(tanggal_sampai_tujuan){
                arrayTanggalSampaiTujuan.push(tanggal_sampai_tujuan);
              }
              
            }

            arrayTanggalSampaiTujuan = _.uniq(arrayTanggalSampaiTujuan);
            rows.tanggal_sampai_tujuan = arrayTanggalSampaiTujuan.length > 0 ? arrayTanggalSampaiTujuan.toString() : null;



            let arrayDriver = [];
            for (let i = 0; i < data.length; i++) {
              const nama_driver = data[i].nama_driver;
              if(nama_driver){
                arrayDriver.push(nama_driver);
              }
              
            }

            arrayDriver = _.uniq(arrayDriver);
            rows.nama_driver = arrayDriver.length > 0 ? arrayDriver.toString() : null;


            let arrayNomorSimDriver = [];
            for (let i = 0; i < data.length; i++) {
              const nomor_sim_driver = data[i].nomor_sim_driver;
              if(nomor_sim_driver){
                arrayNomorSimDriver.push(nomor_sim_driver);
              }
              
            }

            arrayNomorSimDriver = _.uniq(arrayNomorSimDriver);
            rows.nomor_sim_driver = arrayNomorSimDriver.length > 0 ? arrayNomorSimDriver.toString() : null;


            let arrayNomorHpDriver = [];
            for (let i = 0; i < data.length; i++) {
              const nomor_hp_driver = data[i].nomor_hp_driver;
              if(nomor_hp_driver){
                arrayNomorHpDriver.push(nomor_hp_driver);
              }
              
            }

            arrayNomorHpDriver = _.uniq(arrayNomorHpDriver);
            rows.nomor_hp_driver = arrayNomorHpDriver.length > 0 ? arrayNomorHpDriver.toString() : null;



            let arrayNamaAsistenDriver = [];
            for (let i = 0; i < data.length; i++) {
              const nama_assisten_driver = data[i].nama_assisten_driver;
              if(nama_assisten_driver){
                arrayNamaAsistenDriver.push(nama_assisten_driver);
              }
              
            }

            arrayNamaAsistenDriver = _.uniq(arrayNamaAsistenDriver);
            rows.nama_assisten_driver = arrayNamaAsistenDriver.length > 0 ? arrayNamaAsistenDriver.toString() : null;


            let arrayNomorHpsistenDriver = [];
            for (let i = 0; i < data.length; i++) {
              const nomor_hp_assisten_driver = data[i].nomor_hp_assisten_driver;
              if(nomor_hp_assisten_driver){
                arrayNomorHpsistenDriver.push(nomor_hp_assisten_driver);
              }
              
            }

            arrayNomorHpsistenDriver = _.uniq(arrayNomorHpsistenDriver);
            rows.nomor_hp_assisten_driver = arrayNomorHpsistenDriver.length > 0 ? arrayNomorHpsistenDriver.toString() : null;


            let arrayNomorDo = [];
            for (let i = 0; i < data.length; i++) {
              const nomor_do = data[i].nomor_do;
              if(nomor_do){
                arrayNomorDo.push(nomor_do);
              }
              
            }

            arrayNomorDo = _.uniq(arrayNomorDo);
            rows.nomor_do = arrayNomorDo.length > 0 ? arrayNomorDo.toString() : null;


            let arrayNomorSo = [];
            for (let i = 0; i < data.length; i++) {
              const nomor_so = data[i].nomor_so;
              if(nomor_so){
                arrayNomorSo.push(nomor_so);
              }
              
            }

            arrayNomorSo = _.uniq(arrayNomorSo);
            rows.nomor_so = arrayNomorSo.length > 0 ? arrayNomorSo.toString() : null;



            let arrayPlatNomorKendaraan = [];
            for (let i = 0; i < data.length; i++) {
              const plat_nomor_kendaraan = data[i].plat_nomor_kendaraan;
              if(plat_nomor_kendaraan){
                arrayPlatNomorKendaraan.push(plat_nomor_kendaraan);
              }
              
            }



            arrayPlatNomorKendaraan = _.uniq(arrayPlatNomorKendaraan);
            rows.plat_nomor_kendaraan = arrayPlatNomorKendaraan.length > 0 ? arrayPlatNomorKendaraan.toString() : null;    

            // let sqlGetDataDetail = `SELECT * FROM delivery_order_detail_bundle_v WHERE bundle_id IN(
            //   SELECT do.bundle_id FROM delivery_order do WHERE do.bundle_id = '${bundle_id}' OR do.console_number = '${bundle_id}'
            // )`;

            let sqlGetDataDetail = `SELECT m_produk_id,SUM(jumlah) jumlah,SUM(tonase) AS tonase,SUM(kubikasi) AS kubikasi,batch,satuan,bundle_id,kode_barang,nama_barang FROM delivery_order_detail_bundle_v WHERE bundle_id IN(
              SELECT do.bundle_id FROM delivery_order do WHERE do.bundle_id = '${bundle_id}' OR do.console_number = '${bundle_id}' AND isactive='Y'
            )
            GROUP BY m_produk_id,batch,satuan,bundle_id,kode_barang,nama_barang;`

            console.log(sqlGetDataDetail);
            let dataDetail = await request.query(sqlGetDataDetail);

            rows.details = dataDetail.recordset;
            rows.info_ring = info_ring;
            rows.info_max_ring = info_max_ring;
            rows.info_ring_winner = info_ring_winner;
            
            
            return res.success({
              result: rows,
              message: "Fetch data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },


      konfirmLogistik: async function (req, res) {
        const { bundle_id,nip } = req.body; // --> terima request user
    
        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi


            let sqlGetDo = `SELECT delivery_order_id FROM delivery_order WHERE bundle_id = '${bundle_id}' AND isactive='Y'`;
            let datado = await request.query(sqlGetDo) // --> execute
            let datadeliveryorder = datado.recordset // --> ambil recordset nya aja


          

            let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order dov WHERE bundle_id = '${bundle_id}' AND isactive='Y'`;
            let dataCheckBundleOrConsole = await request.query(sqlGetChekbundleOrConsole);
            let jumlah_data = dataCheckBundleOrConsole.recordset.length > 0 ? dataCheckBundleOrConsole.recordset[0].jumlah_data : 0;


            let delivery_order_id = null;

            if(jumlah_data > 0){

              delivery_order_id = datadeliveryorder.length > 0 ? datadeliveryorder[0].delivery_order_id : null;

            }else{

              let sqlGetDo = `SELECT delivery_order_id FROM delivery_order WHERE console_number = '${bundle_id}' AND isactive='Y'`;
              let datado = await request.query(sqlGetDo) // --> execute
              let datadeliveryorder = datado.recordset // --> ambil recordset nya aja
              delivery_order_id = datadeliveryorder.length > 0 ? datadeliveryorder[0].delivery_order_id : null;

            }



            if(delivery_order_id){


                    let qcek = `select * from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0' AND isactive='Y'` //--> initialisasi vr cek
                    let data_qcek = await request.query(qcek) // --> execute
                    let data = data_qcek.recordset // --> ambil recordset nya aja
                
                    let jml = data.length // jumlah baris di recordset
            
                    if (jml > 0) {
                      
                      let ambilValue = `select delivery_order_id,bundle_id,console_number from delivery_order do where delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0' AND isactive='Y'`;
                      let execData = await request.query(ambilValue)
                      let getBundle = execData.recordset[0].bundle_id;
                      let getConsolNumber = execData.recordset[0].console_number;
            
                      if (getConsolNumber == null || !getConsolNumber ) {
                        // console.log('Kesini coyy');

                        // CEK APPROVAL TERLEBIH DAHULU

                        let sqlGetDataApproval = `SELECT TOP 1 * FROM delivery_bundle_approval 
                        WHERE bundle_id = '${getBundle}' 
                        AND flag = 0 AND nip='${nip}' 
                        ORDER BY urutan ASC`;
                        
                        // console.log(sqlGetDataApproval);

                        let dataApproval = await request.query(sqlGetDataApproval)
                        let delivery_bundle_approval_id = dataApproval.recordset.length > 0 ? dataApproval.recordset[0].delivery_bundle_approval_id : null;

                        // PROSES UPDATE FLAG APPROVAL

                        if(delivery_bundle_approval_id){
                          
                          const sql2 = `UPDATE delivery_bundle_approval SET flag = 1,isstatus = 2,tanggal_approve = CURRENT_TIMESTAMP 
                          WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_id}'`;
                          // console.log(sql2);
                          await request.query(sql2);


                          // PROSES CEK APAKAH ADA APPROVAL SELANJUTNYA
                          let sqlGetDataApprovalNext = `SELECT TOP 1 * FROM delivery_bundle_approval 
                          WHERE bundle_id = '${getBundle}' 
                          AND flag = 0 ORDER BY urutan ASC`;

                          // console.log(sqlGetDataApprovalNext);

                          let dataApprovalNext = await request.query(sqlGetDataApprovalNext)
                          let delivery_bundle_approval_next_id = dataApprovalNext.recordset.length > 0 ? dataApprovalNext.recordset[0].delivery_bundle_approval_id : null;
                          let jabatanNext = dataApprovalNext.recordset.length > 0 ? dataApprovalNext.recordset[0].jabatan : null;

                          // JIKA APPROVAL SELANJUTNYA ADA
                          if(delivery_bundle_approval_next_id){

                            const updatedataApprovalNext = `UPDATE delivery_bundle_approval SET isstatus = 1
                            WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_next_id}'  `
                            await request.query(updatedataApprovalNext);

                            const updateDataDo = `UPDATE delivery_order SET status = 'Waiting Approval' WHERE bundle_id = '${getBundle}' AND isactive='Y'`;
                            await request.query(updateDataDo);
                          
                          }else{

                            // JIKA PROSES HIRARKI APPROVAL SUDAH HABIS
                            const updateDataDo = `UPDATE delivery_order set kode_status = 'WT1' , status = 'Placed Order' WHERE bundle_id = '${getBundle}' AND isactive='Y'`;
                            await request.query(updateDataDo);

                          }
  
                        }
                        
                      }else{

                        let sqlGetDataApproval = `SELECT TOP 1 * FROM delivery_bundle_approval 
                        WHERE bundle_id = '${getConsolNumber}' 
                        AND flag = 0 AND nip='${nip}' 
                        ORDER BY urutan ASC`;

                        let dataApproval = await request.query(sqlGetDataApproval)
                        let delivery_bundle_approval_id = dataApproval.recordset.length > 0 ? dataApproval.recordset[0].delivery_bundle_approval_id : null;

         
                        // PROSES UPDATE FLAG APPROVAL

                        if(delivery_bundle_approval_id){
                          
                          const sql3 = `UPDATE delivery_bundle_approval SET flag = 1,isstatus = 2,tanggal_approve = CURRENT_TIMESTAMP
                          WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_id}'  `
                          await request.query(sql3);


                          // PROSES CEK APAKAH ADA APPROVAL SELANJUTNYA

                          let sqlGetDataApprovalNext = `SELECT TOP 1 * FROM delivery_bundle_approval 
                          WHERE bundle_id = '${getBundle}' 
                          AND flag = 0 ORDER BY urutan ASC`;
                          let dataApprovalNext = await request.query(sqlGetDataApprovalNext)
                          let delivery_bundle_approval_next_id = dataApprovalNext.recordset.length > 0 ? dataApprovalNext.recordset[0].delivery_bundle_approval_id : null;
                          let jabatanNext = dataApprovalNext.recordset.length > 0 ? dataApprovalNext.recordset[0].jabatan : null;


                          // JIKA APPROVAL SELANJUTNYA ADA
                          if(delivery_bundle_approval_next_id){

                            const updatedataApprovalNext = `UPDATE delivery_bundle_approval SET isstatus = 1
                            WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_next_id}'  `
                            await request.query(updatedataApprovalNext);

                            const updateDataDo = `UPDATE delivery_order SET status = 'Waiting Approval' WHERE bundle_id = '${getBundle}' AND isactive='Y'`;
                            await request.query(updateDataDo);
                          
                          }else{

                            // JIKA PROSES HIRARKI APPROVAL SUDAH HABIS
                            const updateDataDo = `UPDATE delivery_order SET kode_status = 'WT1' , status = 'Placed Order' WHERE console_number = '${getConsolNumber}' AND isactive='Y'`;
                            await request.query(updateDataDo);

                          }
  
                        }
                      
                      }            
                      return res.success({
                        message: "Berhasil "
                      });
            
                    } else {
                        return res.error({
                            message: "Data tidak terdaftar untuk konfirmasi logistik ! "
                        });
                    }

            }else{

              return res.error({
                message: "Data tidak terdaftar untuk konfirmasi logistik ! "
              });
            
            }
    
            
    
        } catch (err) {
            return res.error(err);
        }
      },


      rejectLogistik: async function (req, res) {
        const { bundle_id,m_user_id } = req.body; // --> terima request user
        // console.log("PARAM bundle_id ",bundle_id," muser ",m_user_id);
    
        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi            
            let sqlGetDo = `SELECT delivery_order_id FROM delivery_order WHERE bundle_id = '${bundle_id}' OR console_number = '${bundle_id}' AND isactive='Y'`;
            let datado = await request.query(sqlGetDo) // --> execute
            let datadeliveryorder = datado.recordset // --> ambil recordset nya aja
            let nip = m_user_id;

            let delivery_order_id = datadeliveryorder.length > 0 ? datadeliveryorder[0].delivery_order_id : null;
            if(delivery_order_id){

                    let qcek = `SELECT * FROM delivery_order do WHERE delivery_order_id = '${delivery_order_id}' and kode_status = 'WT0' AND isactive='Y'`; //--> initialisasi vr cek
                    let data_qcek = await request.query(qcek) // --> execute
                    let data = data_qcek.recordset // --> ambil recordset nya aja
                  
            
                    let jml = data.length // jumlah baris di recordset
                    if (jml > 0) {
                      
                      let ambilValue = `SELECT delivery_order_id,bundle_id,console_number FROM delivery_order do WHERE delivery_order_id = '${delivery_order_id}' AND kode_status = 'WT0' AND isactive='Y'`;
                      let execData = await request.query(ambilValue)
                      let getBundle = execData.recordset[0].bundle_id;
                      let getConsolNumber = execData.recordset[0].console_number;
            
                      if (getConsolNumber == null || !getConsolNumber ) {


                        // CEK APPROVAL TERLEBIH DAHULU

                        let sqlGetDataApproval = `SELECT TOP 1 * FROM delivery_bundle_approval 
                        WHERE bundle_id = '${getBundle}' 
                        AND flag = 0 AND nip='${nip}' 
                        ORDER BY urutan ASC`;

                        let dataApproval = await request.query(sqlGetDataApproval)
                        let delivery_bundle_approval_id = dataApproval.recordset.length > 0 ? dataApproval.recordset[0].delivery_bundle_approval_id : null;





                         // PROSES UPDATE FLAG APPROVAL

                         if(delivery_bundle_approval_id){
                          
                          const updateDataApproval = `UPDATE delivery_bundle_approval SET flag = 2,isstatus = 2,tanggal_reject = CURRENT_TIMESTAMP 
                          WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_id}'`;
                          await request.query(updateDataApproval);

                          const updateDataApprovalSemua = `UPDATE delivery_bundle_approval SET isstatus = 2
                          WHERE bundle_id = '${bundle_id}'`;
                          await request.query(updateDataApprovalSemua);


                        }

                        const updateDataDo = `UPDATE delivery_order SET kode_status = 'RJF' , status = 'Reject', updatedby = '${m_user_id}', updated = GETDATE(),isactive='N' WHERE bundle_id = '${getBundle}' AND isactive='Y'`;
                        await request.query(updateDataDo);
            
                      }else{


                         // CEK APPROVAL TERLEBIH DAHULU

                        let sqlGetDataApproval = `SELECT TOP 1 * FROM delivery_bundle_approval 
                        WHERE bundle_id = '${getConsolNumber}' 
                        AND flag = 0 AND nip='${nip}' 
                        ORDER BY urutan ASC`;
 
                        let dataApproval = await request.query(sqlGetDataApproval)
                        let delivery_bundle_approval_id = dataApproval.recordset.length > 0 ? dataApproval.recordset[0].delivery_bundle_approval_id : null;
  
                          // PROSES UPDATE FLAG APPROVAL
                        if(delivery_bundle_approval_id){
                            
                            const updateDataApproval = `UPDATE delivery_bundle_approval 
                            SET flag = 2,isstatus = 2,tanggal_reject = CURRENT_TIMESTAMP 
                            WHERE delivery_bundle_approval_id = '${delivery_bundle_approval_id}'  `
                            await request.query(updateDataApproval);

                        }
                          
                        
                        const updateDataDo = `UPDATE delivery_order 
                        SET kode_status = 'RJF' , status = 'Reject', 
                        updatedby = '${m_user_id}', updated = GETDATE() 
                        WHERE console_number = '${getConsolNumber}' AND isactive='Y'`;
                        await request.query(updateDataDo);
                      
                      }
            
                      return res.success({
                        message: "Berhasil "
                      });
            
                    } else {
                        return res.error({
                            message: "Data tidak terdaftar untuk konfirmasi logistik ! "
                        });
                    }

              }else{
                
                return res.error({
                  message: "Data tidak terdaftar untuk konfirmasi logistik ! "
                });
              
              }
    
            } catch (err) {
                return res.error(err);
            }
        },


        
updateDataTransporter: async function (req, res) {
  const { m_user_id, bundle_id, console_number,m_transporter_id,nik } = req.body;

  // console.log(req.body);
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

    let data_user_eksekusi = '';
    let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
    let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
    let namaUserEksekusi = getNamaByNik.rows.length > 0 ? `${getNamaByNik.rows[0].name}` : null;


    if(nama){
      data_user_eksekusi = namaUserEksekusi;
    }else{
      data_user_eksekusi = namaUserEksekusi;
    }

    let olehUser = `${data_user_eksekusi} (${nik})`;


    let sqlGetDataDoSpesifik = `SELECT r_kendaraan_id FROM delivery_order WHERE bundle_id = '${bundle_id}' AND isactive='Y'`;
    let getDataDoSpesifik = await request.query(sqlGetDataDoSpesifik);
    let datakendaraan = getDataDoSpesifik.recordset;
    let r_kendaraan_id = datakendaraan.length > 0 ? datakendaraan[0].r_kendaraan_id : null;

    let queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},
    kode_status = 'DOD',status='Draft',updatedby = ${m_user_id_text},
    catatan_bidding = 'Penunjukan Langsung Oleh ${olehUser}',
    tanggal_assign_transporter=getdate(),
    nik_tunjuk_langsung = '${nik}'
    WHERE bundle_id = '${bundle_id}' AND r_kendaraan_id = '${r_kendaraan_id}' AND isactive='Y'`;

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


        queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},kode_status = 'DOD',status='Draft',updatedby = ${m_user_id_text},
        catatan_bidding = 'Penunjukan Langsung Oleh ${olehUser}',
        tanggal_assign_transporter=getdate(),
        nik_tunjuk_langsung = '${nik}'
        WHERE console_number = '${console_number}' AND r_kendaraan_id = '${r_kendaraan_id}' AND isactive='Y'`;
  
  
  
        let sqlGetDeliveryOrder = `SELECT * FROM delivery_order WHERE console_number = '${console_number}' 
        AND r_kendaraan_id = '${r_kendaraan_id}' AND isactive='Y'`;
        let getdataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
        let datado = getdataDeliveryOrder.recordset;
  
  
        for (let i = 0; i < datado.length; i++) {
  
          // console.log('logic console');
          
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
  
          //  console.log(sqlInsertShipment);
  
     
           await request.query(sqlInsertShipment);
          
        }
  
      }else{
  
        let sqlGetDeliveryOrder = `SELECT * FROM delivery_order WHERE bundle_id = '${bundle_id}' AND r_kendaraan_id = '${r_kendaraan_id}' AND isactive='Y'`;
        let getdataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
        let datado = getdataDeliveryOrder.recordset;
  
  
        for (let i = 0; i < datado.length; i++) {
          
  
          // console.log('logic bundle');
  
  
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
  
  
          //  console.log(sqlInsertShipment);
     
           await request.query(sqlInsertShipment);
          
        }
  
      }
  
      // console.log(queryUpdate);
  
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
    const { m_user_id, newEditBundleId, bundle_id, newEditConsoleNumber,console_number } = req.body;

    // console.log(req.body);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryUpdate = ``;
      let console_text = '';
      if(newEditConsoleNumber){
         console_text = `'${newEditConsoleNumber}'`;
      }else{
         console_text = 'NULL';
      }

      let bundle_id_text = '';
      if(newEditBundleId){
       bundle_id_text = `'${newEditBundleId}'`;
      }else{
       bundle_id_text = 'NULL';
      }


      let user_id_text = '';
      if(m_user_id){
        user_id_text = `${m_user_id}`;
      }else{
        user_id_text = 'SYSTEM';
      }



      if(newEditBundleId != bundle_id || newEditConsoleNumber != console_number){


        // BUTUH VALIDASI

        // CEK BUDLE TUJUAN ATAU BUNDLE LAMA APAKAH MEMILIKI CONSOLE
        // let sqlGetConsoleNumberTujuan = `SELECT TOP 1 console_number FROM delivery_order WHERE bundle_id = '${newEditBundleId}' AND console_number IS NOT NULL`;
        // let dataConsoleNumberTujuan = await request.query(sqlGetConsoleNumberTujuan);
        // let consoleNumberTujuan = dataConsoleNumberTujuan.recordset.length > 0 ? dataConsoleNumberTujuan.recordset[0].console_number : null;

        // // CEK BUDLE ASA; ATAU BUNDLE BARU APAKAH MEMILIKI CONSOLE
        // let sqlGetConsoleNumberAsal = `SELECT TOP 1 console_number FROM delivery_order WHERE bundle_id = '${bundle_id}' AND console_number IS NOT NULL`;
        // let dataConsoleNumberAsal = await request.query(sqlGetConsoleNumberAsal);
        // let consoleNumberAsal = dataConsoleNumberAsal.recordset.length > 0 ? dataConsoleNumberAsal.recordset[0].console_number : null;

        // if(consoleNumberTujuan!=newEditConsoleNumber){
          
        //   return res.error({
        //     message: "Data tidak sesuai dengan data bundle sebelumnya"
        //   });
        
        
        // }else{

          queryUpdate = `UPDATE delivery_order SET updatedby='${user_id_text}',bundle_id=${bundle_id_text},console_number=${console_text}
          WHERE console_number = '${console_number}' AND bundle_id = '${bundle_id}' AND isactive='Y',
          catatan_bidding = 'Bundle susulan atau bundle diedit'
          `;
          await request.query(queryUpdate);

          let sqlgetdo = `SELECT * FROM delivery_order_bundle_v WHERE bundle_id = '${newEditBundleId}'`;
          let datado = await request.query(sqlgetdo);
          let row = datado.recordset[0]
  
          return res.success({
            data: row,
            message: "Update data successfully"
          });

        // }


      }else{
        return res.success({
          message: "Update data successfully"
        });
      }

    } catch (err) {
      return res.error(err);
    }
  },


  switchTransporter: async function (req, res) {
    const { m_user_id, bundle_id,console_number,m_transporter_id,nik} = req.body;

    // console.log(req.body);
    console.log('Switch transporter');
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      // Ambil nama user

      let user_id_text = '';
      if(m_user_id){

        let sqlGetUser = `SELECT nama FROM m_user WHERE m_user_id = '${m_user_id}'`;
        let dataUser = await request.query(sqlGetUser);
        let namaUser = dataUser.recordset.length > 0 ? dataUser.recordset[0].nama : null;
        user_id_text = namaUser ? namaUser : m_user_id;

      }else{

        user_id_text = 'SYSTEM';
      
      }


      let data_user_eksekusi = '';
      let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
      let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
      let namaUserEksekusi = getNamaByNik.rows.length > 0 ? `${getNamaByNik.rows[0].name}` : null;
  
  
      if(namaUserEksekusi){
        data_user_eksekusi = namaUserEksekusi;
      }else{
        data_user_eksekusi = namaUserEksekusi;
      }
  
      let olehUser = `${data_user_eksekusi} (${nik})`;



      let checkMenggunkanConsoleAtauTidak = false;

      if(!m_transporter_id){

        return res.error({
          message: "Data Transporter tidak boleh kosong"
        });

      }else{

        if(console_number){
          checkMenggunkanConsoleAtauTidak = true;
        }

        // TRANSPORTER LAMA
  
        if(checkMenggunkanConsoleAtauTidak){
          
          //UPDATE BERDASARKAN CONSOLE

          let sqlGetDataDoSpesifik = `SELECT m_transporter_id FROM delivery_order WHERE console_number = '${console_number}' AND isactive='Y'`;
          let getDataDoSpesifik = await request.query(sqlGetDataDoSpesifik);
          let dataTransporter = getDataDoSpesifik.recordset;
          let m_transporter_id_asal = dataTransporter.length > 0 ? dataTransporter[0].m_transporter_id : null;

          let sqlGetDataTransporterAsal = `SELECT nama FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id_asal}'`;
          let getDataTransporterAsal = await request.query(sqlGetDataTransporterAsal);
          let dataTransporterAsal = getDataTransporterAsal.recordset;
          let namaTransporterAsal = dataTransporterAsal.length > 0 ? dataTransporterAsal[0].nama : null;


          
          let sqlGetDataTransporterPengganti = `SELECT nama FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
          let getDataTransporterPengganti = await request.query(sqlGetDataTransporterPengganti);
          let dataTransporterPengganti = getDataTransporterPengganti.recordset;
          let namaTransporterPengganti = dataTransporterPengganti.length > 0 ? dataTransporterPengganti[0].nama : null;

          let updadateDataDo = `UPDATE delivery_order 
          SET catatan_switch = 'Pergantian Transporter By ${user_id_text} dari transporter asal ${namaTransporterAsal} ke transporter pengganti ${namaTransporterPengganti}',
          m_transporter_id = '${m_transporter_id}',
          tanggal_switch = getdate(),
          nik_switch = '${nik}'
          WHERE console_number = '${console_number}'`;
          await request.query(updadateDataDo);

            
          return res.success({
            message: "Update data successfully"
          });


        }else{


          let sqlGetDataDoSpesifik = `SELECT m_transporter_id FROM delivery_order WHERE bundle_id = '${bundle_id}' AND isactive='Y'`;
          let getDataDoSpesifik = await request.query(sqlGetDataDoSpesifik);
          let dataTransporter = getDataDoSpesifik.recordset;
          let m_transporter_id_asal = dataTransporter.length > 0 ? dataTransporter[0].m_transporter_id : null;

          let sqlGetDataTransporterAsal = `SELECT nama FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id_asal}'`;
          let getDataTransporterAsal = await request.query(sqlGetDataTransporterAsal);
          let dataTransporterAsal = getDataTransporterAsal.recordset;
          let namaTransporterAsal = dataTransporterAsal.length > 0 ? dataTransporterAsal[0].nama : null;


          
          let sqlGetDataTransporterPengganti = `SELECT nama FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
          let getDataTransporterPengganti = await request.query(sqlGetDataTransporterPengganti);
          let dataTransporterPengganti = getDataTransporterPengganti.recordset;
          let namaTransporterPengganti = dataTransporterPengganti.length > 0 ? dataTransporterPengganti[0].nama : null;

          let updadateDataDo = `UPDATE delivery_order 
          SET catatan_switch = 'Pergantian Transporter By ${olehUser} dari transporter asal ${namaTransporterAsal} ke transporter pengganti ${namaTransporterPengganti}',
          m_transporter_id = '${m_transporter_id}',
          tanggal_switch = getdate(),
          nik_switch = '${nik}'
          WHERE bundle_id = '${bundle_id}'`;
          await request.query(updadateDataDo);

            
          return res.success({
            message: "Update data successfully"
          });


        }


      }

      

    } catch (err) {
      return res.error(err);
    }
  },


  findJumlahApprovalBidding: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let nip = req.param("id");
      let queryDataTable = `SELECT COUNT(1) AS jumlah FROM listing_approval_delivery_order_bundle_v dba WHERE nip = '${nip}'`;

      //console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        //console.log(result);

        const row = result.recordset[0].jumlah;
        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  deleteBundleOrConsole: async function(req, res) {
    const {m_user_id,bundle_id,console_number } = req.body;

    // console.log(req.body);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

        let msg = ``;
        let sqlUpdateDataBundleConsole = ``;
        if(console_number){
          msg = `Delete Console Number Successfully`;
          sqlUpdateDataBundleConsole = `UPDATE delivery_order SET isactive='N',
          status='Reject',
          kode_status='RJF',
          updated=getdate(),updatedby='${m_user_id}' 
          WHERE console_number = '${console_number}' AND isactive='Y'`;
        }else{
          msg = `Delete Bundle Successfully`;
          sqlUpdateDataBundleConsole = `UPDATE delivery_order SET isactive='N',
          status='Reject',
          kode_status='RJF',
          updated=getdate(),updatedby='${m_user_id}' 
          WHERE bundle_id = '${bundle_id}' AND isactive='Y'`;
        }

        // console.log(sqlUpdateDataBundleConsole);
        await request.query(sqlUpdateDataBundleConsole);

        return res.success({
          result: req.body,
          message: msg
        });
    } catch (err) {
      return res.error(err);
    }
  },

  exportExcel: async function(req, res) {
    const {
      query: {bundle_id,searchText, planner, transporter, startdate, enddate, m_distributor_id, kode_status,nip }
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let filtersearchtext = ``;
      if (searchText) {
        filtersearchtext = `AND (ltbv.console_number LIKE '%${searchText}%' OR ltbv.nomor_id LIKE '%${searchText}%'  
          OR ltbv.planner LIKE '%${searchText}%' OR ltbv.nama_transporter LIKE '%${searchText}%')`;
      }
    
      let WhereBundleId = ``;
      if (bundle_id) {
        WhereBundleId = `AND ltbv.nomor_id = '${bundle_id}'`;
      }



      let whereRange = ``;
      if (startdate && enddate) {
          whereRange = `AND CONVERT(VARCHAR(10),ltbv.tanggal_penjemputan,120) BETWEEN '${startdate}' AND '${enddate}'`;
      }



      let WherePlannerId = ``;
      if (planner) {
        WherePlannerId = `AND ltbv.planner_id = '${planner}'`;
      }

      let WhereTranspoterId = ``;
      if (transporter) {
        WhereTranspoterId = `AND ltbv.m_transporter_id = '${transporter}'`;
      }

      let WhereKodeStatus = ``;
      if (kode_status) {
        WhereKodeStatus = `AND ltbv.kode_status = '${kode_status}'`;
      }


      let queryDataTable = `SELECT ltbv.nomor_id,
      MONTH(tanggal_penjemputan) AS month,
      CONVERT(VARCHAR(10),ltbv.tanggal_penjemputan,120) AS tanggal_penjemputan_date, 
      CONVERT(VARCHAR(16),ltbv.tanggal_penjemputan,120) AS tanggal_penjemputan, 
      ltbv.nama_kendaraan,ltbv.nama_transporter,ltbv.tonase,ltbv.kubikasi,ltbv.kapasitas_tonase,ltbv.kapasitas_kubikasi,ltbv.planner,
      (SELECT TOP 1 CONVERT(VARCHAR(16),at2.created,120) FROM audit_tracking at2 
        WHERE at2.delivery_order_id = (SELECT TOP 1 delivery_order_id FROM delivery_order 
        WHERE console_number = ltbv.nomor_id OR bundle_id = ltbv.nomor_id) AND at2.kode_status='SGE' AND isactive='Y') AS actual_tiba_digudang,
        (SELECT TOP 1 CONVERT(VARCHAR(16),tanggal_gi,120)
          FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') tanggal_gi,
          (SELECT TOP 1 CONVERT(VARCHAR(16),schedule_delivery_date,120) 
            FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') schedule_delivery_date,
            ( SELECT TOP 1 COALESCE(rlt.waktu,0) AS waktu
              FROM delivery_order do, m_distributor md,r_organisasi ro,r_late_time rlt 
              WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) 
              AND do.m_distributor_id = md.m_distributor_id 
              AND md.r_organisasi_id = ro.r_organisasi_id
              AND rlt.kode_distributor = ro.kode 
              AND do.isactive='Y') leadtime,
              (SELECT TOP 1 CONVERT(VARCHAR(16),actual_sampai_tujuan,120) 
                FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') actual_sampai_tujuan,
                (SELECT TOP 1 CONVERT(VARCHAR(16),tanggal_pod_distributor,120) 
                  FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') tanggal_pod_distributor,
                  (SELECT TOP 1 DATEDIFF(day, tanggal_gi,tanggal_pod_distributor) 
                    FROM delivery_order do  WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AND isactive='Y') actual_leadtime,
                    (SELECT TOP 1  mdv.region AS region
                      FROM delivery_order do,m_distributor_v mdv WHERE (do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id)
                       AND do.m_distributor_id = mdv.m_distributor_id AND do.isactive='Y'
                      ) region,
                      (SELECT TOP 1 lokasi_pickup FROM delivery_order do WHERE do.console_number = ltbv.nomor_id OR do.bundle_id = ltbv.nomor_id) AS lokasi_pickup
        FROM listing_tracking_bundle_unique_v ltbv WHERE 1=1
       ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
        ORDER BY ltbv.tanggal_penjemputan ASC`;


      console.log("EXPORT MONITORING : ",queryDataTable);
      let data = await request.query(queryDataTable);
      let rows = data.recordset;

      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {


        let total_tonase = rows[i].tonase;
        let total_kubikasi = rows[i].kubikasi;
        let kapasitas_tonase = rows[i].kapasitas_tonase;
        let kapasitas_kubikasi = rows[i].kapasitas_kubikasi;
        let nomor_id =  rows[i].nomor_id;

        let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
        let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
        let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;

        // AMBIL DATA STATUS PERBUNDLE

        let sqlgetDoStatus = `SELECT DISTINCT bundle_id,status FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
        console.log("sqlgetDoStatus : ",sqlgetDoStatus);
        let checkdataStatus = await request.query(sqlgetDoStatus); 
        let arrayStatusPebundle = [];

        for (let i = 0; i < checkdataStatus.recordset.length; i++) {

          let data_bundle_id = checkdataStatus.recordset[i].bundle_id;
          let data_status = checkdataStatus.recordset[i].status;

          let dataInfo = data_bundle_id+' - '+data_status;

          arrayStatusPebundle.push(dataInfo);

        }

        arrayStatusPebundle = _.uniq(arrayStatusPebundle);            
        rows[i].status = arrayStatusPebundle.toString();
        
        
        let sqlGetDateCreated = `SELECT TOP 1 CONVERT(VARCHAR(10),created,120) AS created FROM delivery_order do 
        WHERE do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}' ORDER BY created ASC`;

        console.log("sqlGetDateCreated : ",sqlGetDateCreated);
        let getDateCreated = await request.query(sqlGetDateCreated);
        let datecreated = getDateCreated.recordset.length > 0 ? getDateCreated.recordset[0].created : null;
        rows[i].created = datecreated;


        let sqlApproval = `SELECT TOP 1 CONVERT(VARCHAR(10),tanggal_approve,120) AS tanggal_approve FROM delivery_bundle_approval dba where bundle_id = '${nomor_id}' or bundle_id = '${nomor_id}' order by urutan DESC `;
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

        let sqlgetDoRlogBidding = `SELECT DISTINCT r_log_bidding_id FROM delivery_order do WHERE (do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}')`;
        let checkdataRlogbidding = await request.query(sqlgetDoRlogBidding); 
        let r_log_bidding_id = checkdataRlogbidding.recordset.length > 0 ? checkdataRlogbidding.recordset[0].r_log_bidding_id : null;

        let info_ring_winner = 'Belum ada Pemenang';



        if(r_log_bidding_id){



          let sqlGetRingWinner = `SELECT TOP 1 ring_transporter 
          FROM r_log_bidding rlb WHERE delivery_order_id = '${r_log_bidding_id}' AND winner_date IS NOT NULL`;
          let checkGetDataRingWinner = await request.query(sqlGetRingWinner); 
          let ring_winner = checkGetDataRingWinner.recordset.length > 0 ? checkGetDataRingWinner.recordset[0].ring_transporter : null;
          info_ring_winner = ring_winner ? ring_winner : 'Belum ada Pemenang';

          

        }


        let sqlGetHarga = `SELECT TOP 1 bb.harga AS harga
        FROM delivery_order_v do,bucket_bidding bb 
        WHERE (do.console_number = '${nomor_id}' OR do.bundle_id = '${nomor_id}')
        AND do.jenis_kendaraan = bb.jenis_kendaraan AND do.route = bb.rute AND do.kode_transporter = bb.kode ORDER BY bb.harga DESC`;
        let getHargaPenawaran = await request.query(sqlGetHarga);
        let harga = getHargaPenawaran.recordset.length > 0 ? getHargaPenawaran.recordset[0].harga : 0;

        rows[i].info_ring_winner = info_ring_winner;

 
        let obj = {

          "NO BUNDLE ATAU CONSOLE": rows[i].nomor_id,
          "REGION": rows[i].region,
          "PLAN TIBA": rows[i].tanggal_penjemputan,
          "MONTH": rows[i].month,
          "PLAN TIBA DATE": rows[i].tanggal_penjemputan_date,
          "ACTUAL TIBA DI GUDANG": rows[i].actual_tiba_digudang,
          "TANGGAL GI": rows[i].tanggal_gi,
          "ETA": rows[i].tanggal_gi ? moment(rows[i].tanggal_gi,'YYYY-MM-DD').add(rows[i].leadtime ? rows[i].leadtime : 0, 'days').format('YYYY-MM-DD') : '',
          "STANDART LEADTIME": rows[i].leadtime,
          "ATA": rows[i].actual_sampai_tujuan,
          "TANGGAL BONGKAR": rows[i].tanggal_pod_distributor,
          "ACTUAL LEADTIME": rows[i].actual_leadtime,
          "KENDARAAN": rows[i].nama_kendaraan,
          "NAMA TRANSPORTER": rows[i].nama_transporter,
          "TONASE": rows[i].tonase,
          "KUBIKASI": rows[i].kubikasi,
          "KAPASITAS TONASE": rows[i].kapasitas_tonase,
          "KAPASITAS KUBIKASI": rows[i].kapasitas_kubikasi,
          "VSO TONASE %": vso_tonase,
          "VSO KUBIKASI %": vso_kubikasi,
          "VSO FINAL %": vso_final,
          "PLANNER": rows[i].planner,
          "STATUS": rows[i].status,
          "CREATED DATE": rows[i].created ? moment(rows[i].created,'YYYY-MM-DD').format('YYYY-MM-DD') : '',
          "TANGGAL APPROVAL": rows[i].tanggal_approval ? moment(rows[i].tanggal_approval,'YYYY-MM-DD').format('YYYY-MM-DD') : '',
          "STATUS PLACE ORDER": rows[i].status_place_order,
          "RING PEMENANG": rows[i].info_ring_winner,
          "BIAYA":harga,
          "LOKASI MUAT": rows[i].lokasi_pickup
        }

        arraydetailsforexcel.push(obj);

      }

      
      if (arraydetailsforexcel.length > 0) {
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'bundle_do_'.concat(tglfile).concat('.xlsx');

        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.end(hasilXls, 'binary');
      } else {

        return res.error({
          message: "Data tidak ada"
        });

      }

    } catch (err) {
      return res.error(err);
    }
  },

   
}