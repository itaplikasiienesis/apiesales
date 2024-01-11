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
const DBPORTAL = require('./../../services/DBPORTAL');
const _ = require('lodash');

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
  
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize, bundle_id,searchText, planner, transporter, startdate, enddate, m_distributor_id, kode_status}
    } = req;
    //console.log(req.query);
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
      FROM listing_switch_proc_v WHERE 1=1
      ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}`;

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
      FROM listing_switch_proc_v ltbv WHERE 1=1 ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
      ORDER BY tanggal_penjemputan ASC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;


      if(count == 0){

        queryDataTable = `SELECT *,(SELECT TOP 1 CONVERT(VARCHAR(16),at2.created,120) FROM audit_tracking at2 
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
        FROM listing_switch_proc_v ltbv WHERE 1=1
        ${WhereBundleId} ${whereRange} ${WherePlannerId} ${WhereTranspoterId} ${WhereKodeStatus} ${filtersearchtext}
        ORDER BY tanggal_penjemputan ASC`;
       
      }
 

     
     console.log(queryDataTable);

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


          let sqlGetDateCreated = `SELECT TOP 1 CONVERT(VARCHAR(10),created,120) AS created FROM delivery_order do 
          WHERE do.bundle_id = '${nomor_id}' OR do.console_number = '${nomor_id}' ORDER BY created DESC`;

          let getDateCreated = await request.query(sqlGetDateCreated);
          let datecreated = getDateCreated.recordset.length > 0 ? getDateCreated.recordset[0].created : null;
          rows[i].created = datecreated;


          // PROSES CEK BUNDLE ATAU CONSOLE

          let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order_v dov WHERE bundle_id = '${nomor_id}'`;
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

          if(console_number){

            let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
            FROM delivery_order WHERE isactive = 'Y' AND console_number = '${console_number}'`;
            let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
            let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
            let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


            let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
            let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
            let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
            rows[i].tonase = total_tonase;
            rows[i].kubikasi = total_kubikasi;

            rows[i].vso_tonase = vso_tonase;
            rows[i].vso_kubikasi = vso_kubikasi;
            rows[i].vso_final = vso_final;

            rows[i].info_ring = info_ring ? info_ring : '-';
            rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
            rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada Pemenang';

          }else{

            let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
            FROM delivery_order WHERE isactive = 'Y' AND bundle_id = '${bundle_id}'`;
            let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
            let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
            let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


            let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
            let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
            let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
            rows[i].tonase = total_tonase;
            rows[i].kubikasi = total_kubikasi;

            rows[i].vso_tonase = vso_tonase;
            rows[i].vso_kubikasi = vso_kubikasi;
            rows[i].vso_final = vso_final;

            rows[i].info_ring = info_ring ? info_ring : '-';
            rows[i].info_max_ring = info_max_ring ? info_max_ring : '-';
            rows[i].info_ring_winner = info_ring_winner ? info_ring_winner : 'Belum ada Pemenang';

          }
          
        }

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

  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      
      let nomor_id = req.param("id");
      


      let sqlGetChekbundleOrConsole = `SELECT COUNT(1) jumlah_data FROM delivery_order_v dov WHERE bundle_id = '${nomor_id}'`;
      let dataCheckBundleOrConsole = await request.query(sqlGetChekbundleOrConsole);
      let jumlah_data = dataCheckBundleOrConsole.recordset.length > 0 ? dataCheckBundleOrConsole.recordset[0].jumlah_data : 0;
      let bundle_id = '';

      if(jumlah_data > 0){
        bundle_id = nomor_id;
      }else{

        let sqlgetNomorBundle = `SELECT top 1 bundle_id FROM delivery_order_v dov WHERE console_number = '${nomor_id}'`;
        let dataNomorBundle = await request.query(sqlgetNomorBundle);
        bundle_id = dataNomorBundle.recordset.length > 0 ? dataNomorBundle.recordset[0].bundle_id : nomor_id;

      }
      
      let queryDataTable = `SELECT * FROM delivery_order_bundle_v WHERE bundle_id='${bundle_id}'`;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset[0];
        let bundle_id = rows.bundle_id;
        let r_log_bidding_id =  rows.r_log_bidding_id;

        let sqlGetNamaDistributor = `SELECT * FROM delivery_order_v WHERE bundle_id='${bundle_id}'`;
        let data = await request.query(sqlGetNamaDistributor);
        data = data.recordset;

        let kapasitas_tonase = data.length > 0 ? data[0].kapasitas_tonase : 0;
        let kapasitas_kubikasi = data.length > 0 ? data[0].kapasitas_kubikasi : 0;

        let console_number = data.length > 0 ? data[0].console_number : null;

        let sqlGetRoute = `SELECT DISTINCT route FROM delivery_order do WHERE do.r_log_bidding_id  = '${r_log_bidding_id}'`;
        console.log(sqlGetRoute);
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


        rows.lokasi_pickup = lokasi_pickup;
        rows.kota_destinasi = kota_destinasi;


        if(console_number){

          let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
          FROM delivery_order WHERE console_number = '${console_number}'`;
          let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
          let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
          let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;

          let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
          let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
          let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
          rows.tonase = total_tonase;
          rows.kubikasi = total_kubikasi;

          rows.vso_tonase = vso_tonase;
          rows.vso_kubikasi = vso_kubikasi;
          rows.vso_final = vso_final;

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
           let sqlGetDetailBundle = `SELECT bundle_id FROM delivery_order_v dbav WHERE console_number = '${console_number}'`;
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

          let sqlGetTotalTonaseDanKubikasi = `SELECT SUM(tonase) AS total_tonase,SUM(kubikasi) AS total_kubikasi 
          FROM delivery_order WHERE bundle_id = '${bundle_id}'`;
          let dataTotalTonaseDanKubikasi = await request.query(sqlGetTotalTonaseDanKubikasi);
          let total_tonase = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_tonase : 0;
          let total_kubikasi = dataTotalTonaseDanKubikasi.recordset.length > 0 ? dataTotalTonaseDanKubikasi.recordset[0].total_kubikasi : 0;


          let vso_tonase = Math.round((total_tonase / (total_tonase > 0 ? kapasitas_tonase : 1)) * 100);
          let vso_kubikasi = Math.round((total_kubikasi / (total_kubikasi > 0 ? kapasitas_kubikasi : 1)) * 100);
          let vso_final = vso_tonase >= vso_kubikasi ? vso_tonase : vso_kubikasi;
          rows.tonase = total_tonase;
          rows.kubikasi = total_kubikasi;

          rows.vso_tonase = vso_tonase;
          rows.vso_kubikasi = vso_kubikasi;
          rows.vso_final = vso_final;

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

        arrayPenerima = _.uniq(arrayPenerima);
        rows.penerima = arrayPenerima.length > 0 ? arrayPenerima.toString() : null;


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

        let sqlGetDataDetail = `SELECT * FROM delivery_order_detail_bundle_v WHERE bundle_id = '${bundle_id}'`;
        let dataDetail = await request.query(sqlGetDataDetail);

        rows.details = dataDetail.recordset;

        

        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findJumlahSwitchProc: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let nip = req.param("id");
      let queryDataTable = `SELECT COUNT(1) AS jumlah FROM listing_switch_proc_v`;

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

  assignProcurement: async function (req, res) {
    const {bundle_id,console_number,nik} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      // Ambil nama user

      let user_id_text = '';


      let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
      let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
      let nama = getNamaByNik.rows.length > 0 ? `${getNamaByNik.rows[0].name}` : null;


      if(nama){
        user_id_text = nama;
      }else{
        user_id_text = 'SYSTEM';
      }
      



      let checkMenggunkanConsoleAtauTidak = false;

      if(console_number){
        checkMenggunkanConsoleAtauTidak = true;
      }

      // TRANSPORTER LAMA

      if(checkMenggunkanConsoleAtauTidak){
        //UPDATE BERDASARKAN CONSOLE
        let olehUser = `${user_id_text} (${nik})`;

        let updadateDataDo = `UPDATE delivery_order 
        SET catatan_assign_proc = 'Data diassign ke procurement oleh ${olehUser}',
        tanggal_assign_proc = getdate(),
        isproc='Y'
        WHERE console_number = '${console_number}'`;
        console.log(updadateDataDo);
        await request.query(updadateDataDo);

          
        return res.success({
          message: "Update data successfully"
        });


      }else{



        let olehUser = `${user_id_text} (${nik})`;

        let updadateDataDo = `UPDATE delivery_order 
        SET catatan_assign_proc = 'Data diassign ke procurement oleh ${olehUser}',
        tanggal_assign_proc = getdate(),
        isproc='Y'
        WHERE bundle_id = '${bundle_id}'`;
        console.log(updadateDataDo);
        await request.query(updadateDataDo);

          
        return res.success({
          message: "Update data successfully"
        });

      } 

    } catch (err) {
      return res.error(err);
    }
  },

updateDataTransporter: async function (req, res) {
  const { m_user_id, bundle_id, console_number,m_transporter_id,nik } = req.body;

  //console.log(req.body);
  await DB.poolConnect;
  try {
    const request = DB.pool.request();

    let nomor_id = bundle_id;

    let console_text = '';
    if(console_number){
       console_text = `'${console_number}'`;
       nomor_id = console_number;
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


    if(namaUserEksekusi){
      data_user_eksekusi = namaUserEksekusi;
    }else{
      data_user_eksekusi = namaUserEksekusi;
    }

    let olehUser = `${data_user_eksekusi} (${nik})`;


    let sqlGetDataDoSpesifik = `SELECT r_kendaraan_id FROM listing_switch_proc_v WHERE nomor_id = '${nomor_id}'`;
    // console.log(sqlGetDataDoSpesifik);
    let getDataDoSpesifik = await request.query(sqlGetDataDoSpesifik);
    let datakendaraan = getDataDoSpesifik.recordset;
    let r_kendaraan_id = datakendaraan.length > 0 ? datakendaraan[0].r_kendaraan_id : null;

    let queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},
    kode_status = 'DOD',status='Draft',updatedby = ${m_user_id_text},
    catatan_bidding = 'Penunjukan Langsung Oleh ${olehUser}',
    tanggal_assign_transporter=getdate()
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
        queryUpdate = `UPDATE delivery_order SET m_transporter_id = ${m_transporter_id_text},kode_status = 'DOD',status='Draft',updatedby = ${m_user_id_text},
        catatan_bidding = 'Penunjukan Langsung Oleh ${olehUser}',
        tanggal_assign_transporter=getdate()
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
  
      // console.log(queryUpdate);
  
      request.query(queryUpdate, async (err, result) => {
        if (err) {
          return res.error(err);
        }
  
        let sqlgetdo = `SELECT * FROM listing_switch_proc_v WHERE nomor_id = '${nomor_id}'`;
        // console.log(sqlgetdo);
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
}