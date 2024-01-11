/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const uuid = require("uuid/v4");
const soapRequest = require('easy-soap-request');
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const json2xls = require('json2xls');
const moment = require('moment');
const axios = require("axios");
const fs = require('fs')
const xml2js = require('xml2js');
const path = require('path')
const Base64 = require('base-64');
const ClientSFTP = require('ssh2-sftp-client');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
var shell = require('shelljs');
const _ = require('lodash');
module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_user_id,bulan, tahun, distributor,startdate,enddate,status}
    } = req;
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let WhereBulan = ``;
      let WhereTahun = ``;
      let WhereDistributor = ``;


      let WhereStatus=``;
      let WhereRangeRsdh=``;
      let WhereRangeDPD=``;
      if(status){
        WhereStatus = `AND flow='${status}'`;
        if(status==3 && startdate && enddate){
          WhereRangeRsdh = `AND tanggal_approve_rsdh BETWEEN '${startdate}' AND '${enddate}'`;
        }else if(status==4 && startdate && enddate){
          WhereRangeDPD = `AND tanggal_approve_dpd BETWEEN '${startdate}' AND '${enddate}'`;
        }
      }else{

        if(startdate && enddate){
          WhereRangeRsdh = `AND tanggal_approve_rsdh BETWEEN '${startdate}' AND '${enddate}'`;
        }

      }


      let sqlgetuser = `SELECT * FROM m_user WHERE m_user_id='${m_user_id}'`;
      let datausers = await request.query(sqlgetuser);
      let user = datausers.recordset[0];
      let r_distribution_channel_id = user.r_distribution_channel_id;



      let WhereChannel = ``;
      if(r_distribution_channel_id){

        if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
          WhereChannel = `AND (r_distribution_channel_id IN ('${r_distribution_channel_id}','AD89DBFA-200C-4C2C-9D56-F507771BED9E','CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800') OR m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
        }else{

          //WhereChannel = `AND (a.r_distribution_channel_id = '${r_distribution_channel_id}' OR a.m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
          WhereChannel = `AND (r_distribution_channel_id = '${r_distribution_channel_id}')`;
        }
      }

      //console.log(req.query);
      // console.log(tahun);
      // console.log(distributor);

      if(bulan){
        WhereBulan = `AND bulan='${bulan}'`;
      }else{
        WhereBulan = ``;
      }

      if(tahun){
        WhereTahun = `AND tahun='${tahun}'`;
      }else{
        WhereTahun = ``;
      }

      if(distributor !== 'ALL'){
        WhereDistributor = `AND m_distributor_id='${distributor}'`;
      }else{
        WhereDistributor = ``;
      }


      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM cmo_report_v WHERE 1=1 ${WhereBulan} ${WhereTahun} 
      ${WhereRangeRsdh} ${WhereRangeDPD} ${WhereStatus}
      ${WhereDistributor} ${WhereChannel}`;
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;    

      let queryDataTable = `SELECT * FROM cmo_report_v WHERE 1=1 
                            ${WhereBulan} ${WhereTahun} 
                            ${WhereRangeRsdh} ${WhereRangeDPD} ${WhereStatus}
                            ${WhereDistributor} ${WhereChannel}
                            and status
                            not in ('Direject DPD','Direject RSM','Direject RSM')
                            ORDER BY created desc
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;                    

      console.log(queryDataTable);
      request.query(queryDataTable, (err, result) => {
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
  getExportExcel: async function(req, res) {
    const {
      query: {m_user_id,bulan,tahun,distributor,startdate,enddate,status}
    } = req;
    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let WhereBulan = ``;
      let WhereTahun = ``;
      let WhereDistributor = ``;

      let sqlgetUserChannel = `SELECT * FROM m_user_v WHERE m_user_id='${m_user_id}'`;
      let datauserchannel = await request.query(sqlgetUserChannel);
      console.log(datauserchannel);
      let r_distribution_channel_id = datauserchannel.recordset.length > 0 ? datauserchannel.recordset[0].r_distribution_channel_id : null;

      let WhereChannel = ``;
      if(r_distribution_channel_id){

        if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
          WhereChannel = `AND (r_distribution_channel_id IN ('${r_distribution_channel_id}','AD89DBFA-200C-4C2C-9D56-F507771BED9E','CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800') OR m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
        }else{

          //WhereChannel = `AND (r_distribution_channel_id = '${r_distribution_channel_id}' OR m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
          WhereChannel = `AND (r_distribution_channel_id = '${r_distribution_channel_id}')`;

        }

      }
      //console.log(WhereChannel);

      if(bulan){
        WhereBulan = `AND a.bulan='${bulan}'`;
      }else{
        WhereBulan = ``;
      }

      if(tahun){
        WhereTahun = `AND a.tahun='${tahun}'`;
      }else{
        WhereTahun = ``;
      }

      if(distributor !== 'ALL'){
        WhereDistributor = `AND m_distributor_id='${distributor}'`;
      }else{
        WhereDistributor = ``;
      }


      let queryDataTable = `SELECT a.*,isnull(kode_aktif,kode_produk) as kode_sap_baru,isnull(nama,nama_produk) as produk_baru,convert(varchar(10),a.created ,120) AS tanggal_upload 
                            FROM cmo_report_v a left join m_produk_replacement_v b on a.kode_produk = b.kode_non_aktif WHERE 1=1 
                            and status not in ('Direject DPD','Direject RSM','Direject RSM')
                            ${WhereBulan} ${WhereTahun} ${WhereDistributor} ${WhereChannel}`;
                            // nambah logic where reject               

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
        
          let obj = {

            'NO': i + 1,
            'NO CMO ESALES' : rows[i].nomor_cmo,
            'NOMOR SAP' : rows[i].no_sap,
            'TANGGAL UPLOAD' : rows[i].tanggal_upload,
            'CATEGORI': rows[i].kategori,
            'RSDH': rows[i].rsdh,
            'ASDH': rows[i].asdh,
            'CUSTOMER ID': rows[i].customer_id,
            'CUSTOMER': rows[i].customer,
            'CHANNEL': rows[i].channel,
            'SKU NUMBER': rows[i].kode_lama,
            'SKU NUMBER': rows[i].kode_sap_baru,
            'PRODUCT': rows[i].produk_baru,
            'BRAND': rows[i].brand,
            'KEMASAN': rows[i].satuan,
            'STOCK AWAL CYCLE': rows[i].stok_awal,
            'TOTAL STOCK': rows[i].total_stok,
            'STOCK PENDING': rows[i].stok_pending,
            'ESTIMASI SALES BULAN LALU': rows[i].estimasi_sales_bulan_lalu,
            'ESTIMASI STOCK AKHIR': rows[i].estimasi_stok_akhir_cycle,
            'ESTIMASI SALES BULAN DEPAN' : rows[i].estimasi_sales_bulan_depan,
            'ESTIMASI SALES DUA BULAN DEPAN' : rows[i].estimasi_sales_dua_bulan_kedepan,
            'AVG 3 MONTH': rows[i].avarage_sales_tiga_bulan,
            'GROWTH': rows[i].growth,
            'ESTIMASI SALES BULAN BERJALAN': rows[i].estimasi_sales_bulan_berjalan,
            'STOCK AKHIR': rows[i].stock_akhir_bulan_berjalan,
            'BUFFER STOCK': rows[i].buffer_stok,
            'DOI': rows[i].doi,
            'CMO REVISI': rows[i].cmo_revisi,
            'WEEK 1': rows[i].week1,
            'WEEK 2': rows[i].week2,
            'WEEK 3': rows[i].week3,
            'WEEK 4': rows[i].week4,
            'TOTAL': rows[i].cmo_add_po,
            'ADD PO': rows[i].add_po,
            'CMO ORIGINAL + ADD PO': rows[i].total,
            'PRICE': rows[i].price,
            'No SO WEEK 1': rows[i].nomor_so_1,
            'Status SO WEEK 1': rows[i].status_so_1,
            'No SO WEEK 2': rows[i].nomor_so_2,
            'Status SO WEEK 2': rows[i].status_so_2,
            'No SO WEEK 3': rows[i].nomor_so_3,
            'Status SO WEEK 3': rows[i].status_so_3,
            'No SO WEEK 4': rows[i].nomor_so_4,
            'Status SO WEEK 4': rows[i].status_so_4
          }
          console.log('lihat excel');
          arraydetailsforexcel.push(obj);

        }


        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'cmo_report_'.concat(tglfile).concat('.xlsx');          
          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats');
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
  },
  getExportExcelActual: async function(req, res) {
    const {
      query: {m_user_id,bulan,tahun,distributor,startdate,enddate,status}
    } = req;
    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let WhereBulan = ``;
      let WhereTahun = ``;
      let WhereDistributor = ``;

      let sqlgetUserChannel = `SELECT * FROM m_user_v WHERE m_user_id='${m_user_id}'`;
      let datauserchannel = await request.query(sqlgetUserChannel);
      let r_distribution_channel_id = datauserchannel.recordset[0].r_distribution_channel_id;


      let WhereChannel = ``;
      if(r_distribution_channel_id){

        if(r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
          WhereChannel = `AND (r_distribution_channel_id IN ('${r_distribution_channel_id}','AD89DBFA-200C-4C2C-9D56-F507771BED9E','CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800') OR m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
        }else{

          //WhereChannel = `AND (r_distribution_channel_id = '${r_distribution_channel_id}' OR m_distributor_id IN('246E03C7-7B5C-4F17-ACDA-7E78106DE15F','DAD970A3-8464-4150-B700-2A71C2336598'))`;
          WhereChannel = `AND (r_distribution_channel_id = '${r_distribution_channel_id}')`;

        }
      }

      if(bulan){
        WhereBulan = `AND a.bulan='${bulan}'`;
      }else{
        WhereBulan = ``;
      }

      if(tahun){
        WhereTahun = `AND a.tahun='${tahun}'`;
      }else{
        WhereTahun = ``;
      }

      if(distributor !== 'ALL'){
        WhereDistributor = `AND m_distributor_id='${distributor}'`;
      }else{
        WhereDistributor = ``;
      }


      let queryDataTable = `SELECT a.*,isnull(kode_aktif,kode_produk) as kode_sap_baru,isnull(nama,nama_produk) as produk_baru 
                            FROM cmo_report_actual_v a left join m_produk_replacement_v b on a.kode_produk = b.kode_non_aktif WHERE 1=1 
                            ${WhereBulan} ${WhereTahun} ${WhereDistributor} ${WhereChannel}`;              

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
        
          let obj = {

            'NO': i + 1,
            'NO CMO ESALES' : rows[i].nomor_cmo,
            'CATEGORI': rows[i].kategori,
            'RSDH': rows[i].rsdh,
            'ASDH': rows[i].asdh,
            'CUSTOMER ID': rows[i].customer_id,
            'CUSTOMER': rows[i].customer,
            'CHANNEL': rows[i].channel,
            'SKU NUMBER': rows[i].kode_lama,
            'SKU NUMBER': rows[i].kode_sap_baru,
            'PRODUCT': rows[i].produk_baru,
            'BRAND': rows[i].brand,
            'KEMASAN': rows[i].satuan,
            'STOCK AWAL CYCLE': rows[i].stok_awal,
            'TOTAL STOCK': rows[i].total_stok,
            'STOCK PENDING': rows[i].stok_pending,
            'ESTIMASI SALES BULAN LALU': rows[i].estimasi_sales_bulan_lalu,
            'ESTIMASI STOCK AKHIR': rows[i].estimasi_stok_akhir_cycle,
            'ESTIMASI SALES BULAN DEPAN' : rows[i].estimasi_sales_bulan_depan,
            'ESTIMASI SALES DUA BULAN DEPAN' : rows[i].estimasi_sales_dua_bulan_kedepan,
            'AVG 3 MONTH': rows[i].avarage_sales_tiga_bulan,
            'GROWTH': rows[i].growth,
            'ESTIMASI SALES BULAN BERJALAN': rows[i].estimasi_sales_bulan_berjalan,
            'STOCK AKHIR': rows[i].stock_akhir_bulan_berjalan,
            'BUFFER STOCK': rows[i].buffer_stok,
            'DOI': rows[i].doi,
            'CMO REVISI': rows[i].cmo_revisi,
            'WEEK 1': rows[i].week1,
            'WEEK 2': rows[i].week2,
            'WEEK 3': rows[i].week3,
            'WEEK 4': rows[i].week4,
            'TOTAL': rows[i].cmo_add_po,
            'ADD PO': rows[i].add_po,
            'CMO ORIGINAL + ADD PO': rows[i].total,
            'PRICE': rows[i].price,
            'No SO WEEK 1': rows[i].nomor_so_1,
            'Status SO WEEK 1': rows[i].status_so_1,
            'No SO WEEK 2': rows[i].nomor_so_2,
            'Status SO WEEK 2': rows[i].status_so_2,
            'No SO WEEK 3': rows[i].nomor_so_3,
            'Status SO WEEK 3': rows[i].status_so_3,
            'No SO WEEK 4': rows[i].nomor_so_4,
            'Status SO WEEK 4': rows[i].status_so_4
          }

          arraydetailsforexcel.push(obj);

        }


        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'cmo_report_'.concat(tglfile).concat('.xlsx');          
          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats');
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
  },
  getsodobill2 : async function(req, res){
    const {
      query: {m_user_id,startdate,enddate,soldtofrom,soldtoto,shiptofrom,shiptoto,itemfrom,itemto,
        statusdo,statusbilling,doctypefrom,doctypeto,channelfrom,channelto,startdate_,enddate_}
    } = req;
    try {
      const request = DB.pool.request();
      // let sodobilpath = sails.config.globals.sodobill;
      let sodobilpath = dokumentPath('sodobil','return').replace(/\\/g, '/');;
      console.log(sodobilpath);
      let sftp = new ClientSFTP();
      const config = {
        host: "192.168.1.148",
        port:22,
        user: "root",
        password: "P@ssw0rd1988"
      };

      itemfrom_v = '0';
      if(itemfrom){
        itemfrom_v = itemfrom;
      }
      itemto_v = '0';
      if(itemto){
        itemto_v = itemto;
      }

      let channel = ``;
      let q = `select b.nama from m_user a
      left join r_distribution_channel b on a.r_distribution_channel_id = b.r_distribution_channel_id
      where m_user_id = '${m_user_id}' `
      let resdatachannel = await request.query(q);
      if(resdatachannel.recordset.length > 0){
        if(resdatachannel.recordset[0].nama){
          channel = resdatachannel.recordset[0].nama
        }
      }
      
      let role = `select b.nama from m_user a
      inner join m_role b on a.role_default_id = b.m_role_id
      where m_user_id = '${m_user_id}'`
      //console.log(role)
      let rsRole = await request.query(role);
      let rolename = rsRole.recordset[0].nama
      
      //console.log(rolename);
      let data_date = []
      let datadate = {
        START_DATE : startdate,
        END_DATE : enddate ? enddate : startdate
      }

      let remotePath = '/home/sapftp/esales/sodobil/sodobil.xml';
      let dst = dokumentPath('sodobil','return') + '/' +'sodobil.xml';
      let localPath = dst.replace(/\\/g, '/');
      let locationFiles = dokumentPath('sodobil','return').replace(/\\/g, '/');
      console.log(locationFiles);
      shell.mkdir('-p', locationFiles);

      // await sftp.connect(config)
      // .then(() => {
      //   return sftp.fastGet(remotePath, localPath);
      // })
      // .then(() => {
      //   sftp.end();
      // })
      // .catch(err => {
      //   console.error("----",err.message);
      // });

      //sodobilpath = sodobilpath.replace(/\\/g, '/');
      fs.readdir(locationFiles, (err, files) => {
        if(err){
          console.log("xxxxxxx ",err);
        }
        if(files){
          // console.log("ada...",files,sodobilpath);
          files.forEach(file => {
            console.log(sodobilpath+"/"+file);
            fs.readFile(sodobilpath+"/"+file, function(err, data) {  
              if (err){
                return res.error({
                  error : 'true',
                  message : err
                })
              }
              // console.log("pas ada.......",data);
              var parser = new xml2js.Parser({explicitArray : false});
              let arraydetailsforexcel = [];
              parser.parseString(data, async function (err, result) { 
                    console.log(result);
                    let dt = null;
                    try {
                        const Header = result['asx:abap']['asx:values'].ITAB;  
                        
                        console.log(startdate,enddate);
                        dt = Header.ZSZVR003
                        dt = dt.filter(datanya => datanya.AUDAT.replace('-','') >= startdate_.replace('-','') && datanya.AUDAT.replace('-','') <= enddate_.replace('-',''));
                        // dt = dt.filter(datanya => Number(datanya.AUDAT.replace('-','')) >= 20201201 && Number(datanya.AUDAT.replace('-','')) <= 20201201);
                        console.log(doctypefrom);
                        if(doctypefrom == 'ZCI1'){
                            dt = dt.filter(datanya => datanya.AUART === doctypefrom || datanya.AUART === 'ZCC1')
                        }
                        dt = dt.filter(datanya => datanya.AUART === doctypefrom || datanya.AUART === doctypeto)
                        
                        if(soldtofrom){
                          dt = dt.filter(datanya => datanya.KUNNR >= soldtofrom && datanya.KUNNR <= soldtoto)
                        }
                        if(shiptofrom){
                          dt = dt.filter(datanya => datanya.KUNAG >= shiptofrom && datanya.KUNAG <= shiptoto)
                        }
                        if(channelfrom){
                          dt = dt.filter(datanya => datanya.KUNAG >= shiptofrom && datanya.KUNAG <= shiptoto)
                        }

                    } catch (error) {
                      return res.error({  
                        error : 'true',
                        message : `Data Tidak ada...`
                      })
                    }
                    
                    if(dt.length == 0){
                      return res.error({  
                        error : 'true',
                        message : `Data Tidak ada...`
                      })
                    }


                    // console.log(dt[0],dt[0].AUDAT,dt[0].VGBEL);
                    console.log(dt.length);
                    for(var i = 0 ; i < dt.length; i++){
                      let objek = {};

                      let schedule = dt[i].VBELL+""
                      if(rolename == "LOGISTIK" || rolename == "LOGISTIKHEAD"){
                        // console.log(x,"--",dt[x].VGBEL,dt[x].ARKTX); 
                          objek = {
                            'Nomer CMO' : dt[i].VGBEL,
                            'SO Date' : dt[i].AUDAT,
                            'Delivery No' : schedule,
                            'SO Number' : dt[i].VBELN,
                            'SO Doc Type' : dt[i].AUART,
                            'SO Doc Type' : dt[i].TEXTA,
                            'Channel Code' : dt[i].VTWEG,
                            'Channel Desc' : dt[i].TEXTV,
                            'Region Code' : dt[i].REGIO,
                            'Region Desc' : dt[i].BEZEI,
                            'Sales District' : dt[i].BZIRK,
                            'District Desc' : dt[i].BZTXT,
                            'ASDH' : dt[i].NAME1,
                            'Sold to Party' :  dt[i].KUNNR,
                            'Sold to Name' :  dt[i].NAME2,
                            'Ship to Party Code' :  dt[i].KUNAG,
                            'Ship to Party Name' :  dt[i].NAME3,
                            'Item Category' :  dt[i].PSTYV,
                            'Item SO' :  dt[i].POSNR,
                            'Material No' :  dt[i].MATNR,
                            'Material Desc' :  dt[i].ARKTX,
                            'Material Group' :  dt[i].WGBEZ,
                            'Harga Per Karton' :  dt[i].KBETR,
                            'Volume' :  dt[i].VOLUM,
                            'Gross Weight' :  dt[i].BRGEW,
                            'Order Qty' :  dt[i].KWMENG,
                            'Delivered Qty' :  dt[i].LFIMS,
                            'Sisa Qty' :  dt[i].SISA,
                            'SU' :  dt[i].VRKME,
                            'Tgl SO Release' :  dt[i].UDATE,
                            'Schedule Date' :  dt[i].EDATU,
                            'Gross Val' :  dt[i].GROSS1,
                            'Include tax' :  dt[i].GROSS,
                            'Gross Billing' :  dt[i].GROSS,
                            'Gross Val Inc Tax Billing' :  dt[i].GROSB,
                            'Add Discount Billing' :  dt[i].DISCB,
                            'Discount 1' :  dt[i].DISC,
                            'Add Discount' :  dt[i].DISC1,
                            'Rejection Status' :  dt[i].FKSTO,
                            'Reason for Reject' :  dt[i].ABGRU,
                            'Status SO' :  dt[i].LFGSA,
                            'Status DO' :  dt[i].LFSTA,
                            'DO Item' :  dt[i].POSNL,
                            'DO Date' :  dt[i].DLVDT,
                            'DO Qty' :  dt[i].LFIMG,
                            'Status GI' :  dt[i].WBSTK,
                            'Planned GI Date' :  dt[i].WADAT,
                            'Actual GI Date' :  dt[i].WADAT_IST,
                            'PO Number' :  dt[i].EBELN,
                            // 'Bundle ID' : bundle,
                            'No Shipment Cost' :  dt[i].FKNUM,
                            'Plant' :  dt[i].WERKS,
                            'SLoc' :  dt[i].LGORT,
                            'No Shipment' :  dt[i].TKNUM,
                            'Transportir' :  dt[i].NAMEV,
                            'kendaraan' :  dt[i].VSART,
                            'Driver' :  dt[i].EXTI1,
                            'Nomor Polisi' :  dt[i].SIGNI,
                            'Biaya Kirim' :  dt[i].NETWP,
                          }
                      }else{
                        objek = {
                            'Nomer CMO' :  dt[i].VGBEL,
                            'SO Date' :  dt[i].AUDAT,
                            'Cust Ref' :  dt[i].BSTNK+".",
                            'SO Number' :  dt[i].VBELN,
                            'SO Doc Type' :  dt[i].AUART,
                            'SO Doc. Type' :  dt[i].TEXTA,
                            'Channel Code' :  dt[i].VTWEG,
                            'Channel Desc' :  dt[i].TEXTV,
                            'Region Code' :  dt[i].REGIO,
                            'Region Desc' :  dt[i].BEZEI,
                            'Sales District' :  dt[i].BZIRK,
                            'District Desc' :  dt[i].BZTXT,
                            'ASDH' :  dt[i].NAME1,
                            'Ship to Party Code' :  dt[i].KUNAG,
                            'Ship to Name' : dt[i].NAME3,
                            'Sold to Name' :  dt[i].NAME2,
                            'Sold to Code' :  dt[i].KUNNR,
                            'Ship to District' :  dt[i].BZTXS,
                            'Item Category' :  dt[i].PSTYV,
                            'Item SO' :  dt[i].POSNR,
                            'Material No' :  dt[i].MATNR,
                            'Material Desc' :  dt[i].ARKTX,
                            'Material Group' :  dt[i].WGBEZ,
                            'Order Qty' :  dt[i].KWMENG,
                            'Delivered Qty' :  dt[i].LFIMS,
                            'Sisa Qty' :  dt[i].SISA,
                            'Schedule Date' :  dt[i].EDATU,
                            'Gross Val' :  dt[i].GROSS1,
                            'Gross Val Include tax' :  dt[i].GROSS,
                            'Net Val Exc tax' :  dt[i].NETWR,
                            // 'Gross Billing' :  dt[i].GROSS,
                            'Net Val inc TAX' :  dt[i].NETWE,
                            'Discount 1' :  dt[i].DISC,
                            'Add Discount' :  dt[i].DISC1,
                            // 'Net Val Incl Tax Billing' :  dt[i].GROSB,
                            // 'Discount 1 Billing' :  dt[i].DISB,
                            // 'Add Discount Billing' :  dt[i].DISCB,
                            'Tax' :  dt[i].MWSBP,
                            'Rejection Status' :  dt[i].FKSTO,
                            'Reason for Reject' :  dt[i].ABGRU,
                            'Status SO' :  dt[i].LFGSA,
                            'Status DO' :  dt[i].LFSTA,
                            'Status Billing' :  dt[i].FKSAA,
                            'Delivery No' : schedule,
                            'DO Item' :  dt[i].POSNL,
                            'DO Date' :  dt[i].DLVDT,
                            'DO Qty' :  dt[i].LFIMG,
                            'Status GI' :  dt[i].WBSTK,
                            'Planned GI Date' :  dt[i].WADAT,
                            'Actual GI Date' :  dt[i].WADAT_IST,
                            'No Billing' :  dt[i].VBELB,
                            'No Invoice' :  dt[i].VBELA,
                            'Tgl Billing' :  dt[i].ERDAB,
                            'Gross Val Billing' :  dt[i].GROSB1,
                            'Gross Val Inc Tax Billing' :  dt[i].GROSB,
                            'Discount Billing 1' :  dt[i].DISB,
                            'Add  Discount Billing' :  dt[i].DISCB,
                            'Net Val Exc Tax Billing' :  dt[i].NETWB,
                            'Net Val Inc Tax Billing' :  dt[i].NETWC,
                            'Tax Billing' :  dt[i].MWSBB,
                        }
                      }
                      arraydetailsforexcel.push(objek);
                    }  
              })
              
              // console.log(arraydetailsforexcel);
              if(arraydetailsforexcel.length > 0){
                let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
                let namafile = 'sodobill_'.concat(tglfile).concat('.xlsx');          
                
                var hasilXls = json2xls(arraydetailsforexcel);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats');
                res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
                res.end(hasilXls, 'binary');
              }else{
                return res.error({
                  message: "Data tidak ada"
                });
      
              }
          })
          }
        ) 
        }else{
          return res.error({
            error : 'true',
            message : `File does't exists...`
          })
        }
      });


    } catch (error) {
      console.log(error);
      return res.error({
        error : 'true',
        message : error
      })
    }


  },
  getsodobill : async function(req, res){
    const {
      query: {m_user_id,startdate,enddate,soldtofrom,soldtoto,shiptofrom,shiptoto,itemfrom,itemto,
        statusdo,statusbilling,doctypefrom,doctypeto,channelfrom,channelto}
    } = req;
    
    console.log(req.query);

    itemfrom_v = '0';
    if(itemfrom){
      itemfrom_v = itemfrom;
    }
    itemto_v = '0';
    if(itemto){
      itemto_v = itemto;
    }

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let channel = ``;
      let q = `select b.nama from m_user a
      left join r_distribution_channel b on a.r_distribution_channel_id = b.r_distribution_channel_id
      where m_user_id = '${m_user_id}' `
      let resdatachannel = await request.query(q);
      if(resdatachannel.recordset.length > 0){
        if(resdatachannel.recordset[0].nama){
          channel = resdatachannel.recordset[0].nama
        }
      }
      
      let role = `select b.nama from m_user a
      inner join m_role b on a.role_default_id = b.m_role_id
      where m_user_id = '${m_user_id}'`
      console.log(role)
      let rsRole = await request.query(role);
      let rolename = rsRole.recordset[0].nama
      
      console.log(rolename);
      let data_date = []
      let datadate = {
        START_DATE : startdate,
        END_DATE : enddate ? enddate : startdate
      }

      let data_doc = []
      let datadoc = {
        START_AUART : doctypefrom ,
        END_AUART : doctypeto
      }

      let data_channel = []
      let datachannel = {
        START_DS : channelfrom ? channelfrom : '0',
        END_DS : channelto ? channelto : '0'
      }

      let data_material = []
      let datamaterial = {
        START_MATNR : itemfrom ? itemfrom : '0',
        END_MATNR : itemto ? itemto : '0'
      }
      
      let data_shipto = []
      let datashipto = {
        START_KUNNR : shiptofrom ? shiptofrom : '0',
        END_KUNNR : shiptoto ? shiptoto : '0'
      }

      let data_soldto = []
      let datasoldto = {
        START_KUNNR : soldtofrom ? soldtofrom : '0',
        END_KUNNR : soldtoto ? soldtoto : '0'
      }

      let data_bill = {
        I_STATUS_BILL : statusbilling ? statusbilling : '0'
      }
      let data_status_do = {
        I_STATUS_DO : statusdo ? statusdo : '0'
      }


      let paramuser = 'S'
      if(rolename == "LOGISTIK"){
        paramuser = "L"
      }

      let data_user = {
        I_USER : paramuser 
      }

      data_material.push(datamaterial)
      data_channel.push(datachannel)
      data_date.push(datadate)
      data_doc.push(datadoc)
      data_shipto.push(datashipto)
      console.log(data_shipto);
      data_soldto.push(datasoldto)

    
      let xml = fs.readFileSync('soap/ZFM_WS_SODOBILX.xml', 'utf-8');
      let hasilDate = racikXMLSodobill(xml, data_date, 'I_DATE');
      let hasilDoc = racikXMLSodobill(xml, data_doc, 'I_DOC_TYPE');
      let hasilchannel = racikXMLSodobill(xml, data_channel, 'I_DS');
      let hasilmaterial = racikXMLSodobill(xml, data_material, 'I_MATERIAL');
      let hasilshipto = racikXMLSodobill(xml, data_shipto, 'I_SHIP_TO');
      let hasilsoldto = racikXMLSodobill(xml, data_soldto, 'I_SOLD_TO');
      let hasilbillto =  racikXMLSodobill_item(xml, data_bill);
      let hasilstatusdo =  racikXMLSodobill_item(xml, data_status_do);
      let hasiluser =  racikXMLSodobill_item(xml, data_user);

      
      let hasiloke  = await racikXMLSodobill_oke(xml,hasilDate+hasilDoc+hasilchannel+hasilmaterial+hasilsoldto+hasilshipto+hasilbillto+hasilstatusdo+hasiluser,"ZFM_WS_SODOBILX")
      
      console.log(hasiloke);
      // let url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sodobil/120/zws_sales_sodo/zbn_sales_sodo"
      let url = "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sodobil/300/zws_sales_sodo/zbn_sales_sodo"
      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;
      let sampleHeaders = {
        'Authorization':Basic,
        'user-agent': 'sampleTest',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions/ZWS_SALES_SODOBIL/ZFM_WS_SODOBIL',
      };
      let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasiloke, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;
      // console.log(body,statusCode);
      try {
        xml2js.parseString(body,async function (err, result) {
          let temp = result['soap-env:Envelope']['soap-env:Body'];
          let json = JSON.stringify(temp[0]);
          let json2 = JSON.parse(json)
          let json3 = json2['n0:ZFM_WS_SODOBILXResponse'][0]
          let json4 = json3['T_DATA'][0];

          // console.log(json4.item);
          let arraydetailsforexcel = [];
          // json4.item.length
          for(let i = 0; i < json4.item.length; i++){

            console.log(json4.item[i].BSTNK[0]+".");
            
           
            let schedule = json4.item[i].VBELL[0]+""
            let cekdo = `select * from delivery_order where nomor_do = '${schedule}'`
            let bundle = ``;
            console.log(cekdo);
            let ref = "kuhsgjkdfjkwhdgf"+json4.item[i].BSTNK[0].tostring
            console.log(schedule, ref);
            
            let objek = {} 
            if(rolename == "LOGISTIK" || rolename == "LOGISTIKHEAD"){
              let ds = await request.query(cekdo)
              if (ds.recordset.length > 0){
                bundle = ds.recordset[0].bundle_id
              }
              objek = {
                  'Nomer CMO' : json4.item[i].VGBEL[0],
                  'SO Date' : json4.item[i].AUDAT[0],
                  'Delivery No' : schedule,
                  'SO Number' : json4.item[i].VBELN[0],
                  'SO Doc Type' : json4.item[i].AUART[0],
                  'SO Doc Type' : json4.item[i].TEXTA[0],
                  'Channel Code' : json4.item[i].VTWEG[0],
                  'Channel Desc' : json4.item[i].TEXTV[0],
                  'Region Code' : json4.item[i].REGIO[0],
                  'Region Desc' : json4.item[i].BEZEI[0],
                  'Sales District' : json4.item[i].BZIRK[0],
                  'District Desc' : json4.item[i].BZTXT[0],
                  'ASDH' : json4.item[i].NAME1[0],
                  'Sold to Party' : json4.item[i].KUNNR[0],
                  'Sold to Name' : json4.item[i].NAME2[0],
                  'Ship to Party Code' : json4.item[i].KUNAG[0],
                  'Ship to Party Name' : json4.item[i].NAME3[0],
                  'Item Category' : json4.item[i].PSTYV[0],
                  'Item SO' : json4.item[i].POSNR[0],
                  'Material No' : json4.item[i].MATNR[0],
                  'Material Desc' : json4.item[i].ARKTX[0],
                  'Material Group' : json4.item[i].WGBEZ[0],
                  'Harga Per Karton' : json4.item[i].KBETR[0],
                  'Volume' : json4.item[i].VOLUM[0],
                  'Gross Weight' : json4.item[i].BRGEW[0],
                  'Order Qty' : json4.item[i].KWMENG[0],
                  'Delivered Qty' : json4.item[i].LFIMS[0],
                  'Sisa Qty' : json4.item[i].SISA[0],
                  'SU' : json4.item[i].VRKME[0],
                  'Tgl SO Release' : json4.item[i].UDATE[0],
                  'Schedule Date' : json4.item[i].EDATU[0],
                  'Gross Val' : json4.item[i].GROSS1[0],
                  'Include tax' : json4.item[i].GROSS[0],
                  'Gross Billing' : json4.item[i].GROSS[0],
                  'Gross Val Inc Tax Billing' : json4.item[i].GROSB[0],
                  'Add Discount Billing' : json4.item[i].DISCB[0],
                  'Discount 1' : json4.item[i].DISC[0],
                  'Add Discount' : json4.item[i].DISC1[0],
                  'Rejection Status' : json4.item[i].FKSTO[0],
                  'Reason for Reject' : json4.item[i].ABGRU[0],
                  'Status SO' : json4.item[i].LFGSA[0],
                  'Status DO' : json4.item[i].LFSTA[0],
                  'DO Item' : json4.item[i].POSNL[0],
                  'DO Date' : json4.item[i].DLVDT[0],
                  'DO Qty' : json4.item[i].LFIMG[0],
                  'Status GI' : json4.item[i].WBSTK[0],
                  'Planned GI Date' : json4.item[i].WADAT[0],
                  'Actual GI Date' : json4.item[i].WADAT_IST[0],
                  'PO Number' : json4.item[i].EBELN[0],
                  'Bundle ID' : bundle,
                  'No Shipment Cost' : json4.item[i].FKNUM[0],
                  'Plant' : json4.item[i].WERKS[0],
                  'SLoc' : json4.item[i].LGORT[0],
                  'No Shipment' : json4.item[i].TKNUM[0],
                  'Transportir' : json4.item[i].NAMEV[0],
                  'kendaraan' : json4.item[i].VSART[0],
                  'Driver' : json4.item[i].EXTI1[0],
                  'Nomor Polisi' : json4.item[i].SIGNI[0],
                  'Biaya Kirim' : json4.item[i].NETWP[0],
              }
            }else{
              objek = {
                  'Nomer CMO' : json4.item[i].VGBEL[0],
                  'SO Date' : json4.item[i].AUDAT[0],
                  'Cust Ref' : json4.item[i].BSTNK[0]+".",
                  'SO Number' : json4.item[i].VBELN[0],
                  'SO Doc Type' : json4.item[i].AUART[0],
                  'SO Doc. Type' : json4.item[i].TEXTA[0],
                  'Channel Code' : json4.item[i].VTWEG[0],
                  'Channel Desc' : json4.item[i].TEXTV[0],
                  'Region Code' : json4.item[i].REGIO[0],
                  'Region Desc' : json4.item[i].BEZEI[0],
                  'Sales District' : json4.item[i].BZIRK[0],
                  'District Desc' : json4.item[i].BZTXT[0],
                  'ASDH' : json4.item[i].NAME1[0],
                  'Ship to Party Code' : json4.item[i].KUNAG[0],
                  'Ship to Name' :json4.item[i].NAME3[0],
                  'Sold to Name' : json4.item[i].NAME2[0],
                  'Sold to Code' : json4.item[i].KUNNR[0],
                  'Ship to District' : json4.item[i].BZTXS[0],
                  'Item Category' : json4.item[i].PSTYV[0],
                  'Item SO' : json4.item[i].POSNR[0],
                  'Material No' : json4.item[i].MATNR[0],
                  'Material Desc' : json4.item[i].ARKTX[0],
                  'Material Group' : json4.item[i].WGBEZ[0],
                  'Order Qty' : json4.item[i].KWMENG[0],
                  'Delivered Qty' : json4.item[i].LFIMS[0],
                  'Sisa Qty' : json4.item[i].SISA[0],
                  'Schedule Date' : json4.item[i].EDATU[0],
                  'Gross Val' : json4.item[i].GROSS1[0],
                  'Gross Val Include tax' : json4.item[i].GROSS[0],
                  'Net Val Exc tax' : json4.item[i].NETWR[0],
                  // 'Gross Billing' : json4.item[i].GROSS[0],
                  'Net Val inc TAX' : json4.item[i].NETWE[0],
                  'Discount 1' : json4.item[i].DISC[0],
                  'Add Discount' : json4.item[i].DISC1[0],
                  // 'Net Val Incl Tax Billing' : json4.item[i].GROSB[0],
                  // 'Discount 1 Billing' : json4.item[i].DISB[0],
                  // 'Add Discount Billing' : json4.item[i].DISCB[0],
                  'Tax' : json4.item[i].MWSBP[0],
                  'Rejection Status' : json4.item[i].FKSTO[0],
                  'Reason for Reject' : json4.item[i].ABGRU[0],
                  'Status SO' : json4.item[i].LFGSA[0],
                  'Status DO' : json4.item[i].LFSTA[0],
                  'Status Billing' : json4.item[i].FKSAA[0],
                  'Delivery No' : schedule,
                  'DO Item' : json4.item[i].POSNL[0],
                  'DO Date' : json4.item[i].DLVDT[0],
                  'DO Qty' : json4.item[i].LFIMG[0],
                  'Status GI' : json4.item[i].WBSTK[0],
                  'Planned GI Date' : json4.item[i].WADAT[0],
                  'Actual GI Date' : json4.item[i].WADAT_IST[0],
                  'No Billing' : json4.item[i].VBELB[0],
                  'No Invoice' : json4.item[i].VBELA[0],
                  'Tgl Billing' : json4.item[i].ERDAB[0],
                  'Gross Val Billing' : json4.item[i].GROSB1[0],
                  'Gross Val Inc Tax Billing' : json4.item[i].GROSB[0],
                  'Discount Billing 1' : json4.item[i].DISB[0],
                  'Add  Discount Billing' : json4.item[i].DISCB[0],
                  'Net Val Exc Tax Billing' : json4.item[i].NETWB[0],
                  'Net Val Inc Tax Billing' : json4.item[i].NETWC[0],
                  'Tax Billing' : json4.item[i].MWSBB[0],

              }
            }
            
            // console.log(schedule);
            // console.log(objek);
            arraydetailsforexcel.push(objek);
          }
          // console.log(arraydetailsforexcel);
          if(arraydetailsforexcel.length > 0){
            // console.log("xxxx");
            let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
            let namafile = 'sodobill_'.concat(tglfile).concat('.xlsx');          
            
            var hasilXls = json2xls(arraydetailsforexcel);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats');
            res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
            res.end(hasilXls, 'binary');

            // fs.writeFileSync('data.xlsx', hasilXls, 'binary');
          }else{
            return res.error({
              message: "Data tidak ada"
            });
  
          }
        })
      } catch (error) {
        console.log(error);
        return res.error({
          message: "Data tidak ada"
        });
      }

      
     
    } catch (err) {
      console.log(err);
      return res.error(err);
    }
  }

  

};

// async function requestSAP(datas){
//   console.log("masuk function",datas);
//   let url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_cmochange/120/zws_sales_cmochange/zbn_sales_cmochange"
//   const tok = 'it_02:ademsari';
//   const hash = Base64.encode(tok);
//   const Basic = 'Basic ' + hash;
//   let sampleHeaders = {
//     'Authorization':Basic,
//     'user-agent': 'sampleTest',
//     'Content-Type': 'text/xml;charset=UTF-8',
//     'soapAction': 'urn:sap-com:document:sap:rfc:functions/ZWS_SALES_CMOCHANGE/ZFM_SALES_CMOCHANGE',
//   };

//   let xml = fs.readFileSync('soap/ZFM_SALES_CMOCHANGE.xml', 'utf-8');

// }
function racikXMLSodobill(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return data
  })
  const result = builder.buildObject(addTemplate)
 
  return  result
}

function racikXMLSodobill_item(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true })
  // const addTemplate = jsonArray.map(data => {
  //   return data
  // })
  const result = builder.buildObject(jsonArray)
 
  return  result
}

function racikXMLSodobill_oke(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  // const addTemplate = jsonArray.map(data => {
  //   return data
  // })
  // const result = builder.buildObject(addTemplate)
  // console.log(jsonArray);
 
  return xmlTemplate.replace('?', jsonArray)
}

async function requestSAP(datas){
  console.log("masuk function",datas);
  let url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sodobil/120/zws_sales_sodo/zbn_sales_sodo"
  let usernamesoap = sails.config.globals.usernamesoap;
  let passwordsoap = sails.config.globals.passwordsoap;
  const tok = `${usernamesoap}:${passwordsoap}`;
  const hash = Base64.encode(tok);
  const Basic = 'Basic ' + hash;
  let sampleHeaders = {
    'Authorization':Basic,
    'user-agent': 'sampleTest',
    'Content-Type': 'text/xml;charset=UTF-8',
    'soapAction': 'urn:sap-com:document:sap:rfc:functions/ZWS_SALES_SODOBIL/ZFM_WS_SODOBIL',
  };
  let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:datas, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
  let {body, statusCode } = response;
  // console.log(body);
  console.log(statusCode);
  return body

}