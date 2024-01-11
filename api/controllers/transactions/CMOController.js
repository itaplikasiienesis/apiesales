/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * CMOController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// eslint-disable-next-line no-undef
const { calculateLimitAndOffset, paginate } = require("paginate-info");
// eslint-disable-next-line no-undef
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail')
const moment = require('moment');
const numeral = require('numeral');
const fs = require('fs');
const xml2js = require('xml2js');
const Base64 = require('base-64');
// eslint-disable-next-line no-undef
const path = require('path');
const glob = require('glob');
const json2xls = require('json2xls');
const { request } = require("http");
const { Request } = require("mssql");
const { replace } = require("lodash");
var shell = require('shelljs');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templatecmo');
const ClientSFTP = require('ssh2-sftp-client');

let sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "root",
  password: "P@ssw0rd1988"
};
module.exports = {

  find: async function (req, res) {
    const {
      query: { currentPage, pageSize, field, order, searchText, m_user_id,periode,status,m_distributor_id,m_pajak_v_id,credit,nik}
    } = req;

    // console.log(req.query);
    await DB.poolConnect;
    try {
      
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

      let sqlGetRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let roleAcess = datarole.recordset;      

      // console.log(roleAcess);

      if(roleAcess.length > 0){


      let kode_status = parseInt(status);
      let bulan = parseInt(moment(periode,'YYYY-MM').format('MM'));
      let tahun = parseInt(moment(periode,'YYYY-MM').format('YYYY'));

      let WherePeriode = ``;
      if(periode){
        WherePeriode = `AND a.bulan = '${bulan}' AND a.tahun = '${tahun}'`;
      }

      let WhereStatus = ``;
      if(status){
        if(kode_status == 4){
          WhereStatus = ` AND a.flow = '${kode_status}' and status <> 'Approved'`;
        }else if(kode_status == 5){
          WhereStatus = ` AND (a.flow = '4' and status = 'Approved') or a.flow = ${kode_status}`;
        }else{
          WhereStatus = ` AND a.flow = '${kode_status}'`;
        }
        
      }

      let WhereSoldto = ``;
      if(m_pajak_v_id){
        WhereSoldto = `AND a.m_pajak_id = '${m_pajak_v_id}'`;
      }

      let orderBy = `ORDER BY created desc`;
      if (order) {
        let orderType = (order === 'ascend') ? 'ASC' : 'DESC';
        orderBy = `ORDER BY ${field} ${orderType}`;
      }

      let WhereCreditStatus = ``;
      if(credit=='N'){
        WhereCreditStatus = ` and a.no_sap is not null 
        AND (a.kode_status1 = '${credit}' OR a.kode_status2 = '${credit}' OR a.kode_status3 = '${credit}' 
        OR a.kode_status4 = '${credit}' OR a.kode_status1 IS NULL OR a.kode_status2 IS NULL 
        OR a.kode_status3 IS NULL OR a.kode_status4 IS NULL)`;
      }else if(credit=='A'){
        WhereCreditStatus = `AND (a.kode_status1 = '${credit}' AND a.kode_status2 = '${credit}' 
        AND a.kode_status3 = '${credit}' AND a.kode_status4 = '${credit}')`;
      }

  
      let WhereOrgAccess = ``;
      if(checkRole(roleAcess, ['DISTRIBUTOR'])){

          WhereOrgAccess = `AND a.r_organisasi_id IN(SELECT DISTINCT r_organisasi_id FROM m_user_organisasi 
          WHERE isactive='Y' AND m_user_id = '${m_user_id}')`;

      }else{

        WhereOrgAccess = `AND a.m_distributor_id IN(SELECT DISTINCT m_distributor_id  
        FROM data_approval_cmo dac WHERE nik_rsm = '${nik}' OR nik_channel_head = '${nik}' OR nik_dpd = '${nik}' )`;

      }

      if(checkRole(roleAcess, ['SYSTEM','ADMINCMO','SALESADMINFKR','DPD'])){
        WhereOrgAccess = ``;
      }

      // UNTUK FILTER SEARCH
      let whereClause = ``;
      if (searchText) {
        whereClause = `AND a.nomor_cmo LIKE '%${searchText}%'
        OR a.no_sap LIKE '%${searchText}%' OR a.bulan LIKE '%${searchText}%'
        OR a.tahun LIKE '%${searchText}%' OR a.nomor_po LIKE '%${searchText}%'`;

      }

      
      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM cmo_v a 
                            WHERE 1=1 ${whereClause} ${WhereOrgAccess} ${WherePeriode} 
                            ${WhereStatus} ${WhereSoldto} ${WhereCreditStatus}`;

      let queryDataTable = `SELECT * FROM cmo_v a 
                            WHERE 1=1 ${whereClause} ${WhereOrgAccess} ${WherePeriode} 
                            ${WhereStatus} ${WhereSoldto} ${WhereCreditStatus} ${orderBy} 
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;                      
      
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

      }else{

        return res.error({
          message: "Role access tidak diizinkan"
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },


  inactive: async function(req,res){
      const {cmo_id} = req.body
      await DB.poolConnect;
      try {
          const request = DB.pool.request();

          let upd = `UPDATE cmo SET isactive = 'N',
          status='Reject'
          where cmo_id = '${cmo_id}'`

          await request.query(upd);            
          return res.success({
              message: "Berhasil Reject Inactive CMO"
          });
      } catch (error) {
          console.log(error);
          return res.error(error)
      }
  },

  view: async function (req, res) {
    const {
      query: { m_user_id,nik }
    } = req;    
    try {
      await DB.poolConnect;
      const request = DB.pool.request();
      let queryDataTable = `SELECT *,'' as isedit FROM cmo_v a WHERE a.isactive='Y' AND a.kategori='CMO' AND a.cmo_id = '${req.param("id")}'`;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        if (result.recordset.length > 0) {

          let m_distributor_id = row.m_distributor_id;
          let cmo_id = row.cmo_id;
          let flow = row.flow;
       
          let sqlGetDataApproval = `SELECT nik_asm,nik_rsm,nik_channel_head,nik_dpd FROM data_approval_cmo WHERE m_distributor_id = '${m_distributor_id}'`;
          // console.log(sqlGetDataApproval);
          let getDataApproval = await request.query(sqlGetDataApproval);
          let dataApproval = getDataApproval.recordset.length > 0 ? getDataApproval.recordset[0] : null;

          let nik_asm = dataApproval ? dataApproval.nik_asm : null;
          let nik_rsm = dataApproval ? dataApproval.nik_rsm : null;
          let nik_channel_head = dataApproval ? dataApproval.nik_channel_head : null;
          let nik_dpd = dataApproval ? dataApproval.nik_dpd : null;


          if(flow == 1 && nik == nik_asm){
            row.action=`Y`;
          }else if(flow == 2 && nik == nik_rsm){
            row.action=`Y`;
          }else if(flow == 3 && nik == nik_channel_head){
            row.action=`Y`;
          }else if(flow == 4 && nik == nik_dpd){
            row.action=`Y`;
          }else{
            row.action=`N`;
          }

          // console.log('flow ',flow);
          // console.log('nik_asm ',nik_asm);
          // console.log('nik_rsm ',nik_rsm);
          // console.log('nik_channel_head ',nik_channel_head);
          // console.log('nik_dpd ',nik_dpd);
          // console.log('row.action ',row.action);

  
          let sqlgetSummaryBrand = `SELECT DISTINCT co.cmo_id,
          mp.kode_brand,mp.brand,uom.nama AS satuan,
          CASE WHEN sov1.schedule_date IS NOT NULL THEN sov1.schedule_date ELSE NULL END AS schedule_date1,
          CASE WHEN sov1.quantity IS NOT NULL THEN sov1.quantity ELSE 0 END AS qty1,
          CASE WHEN sov1.amount IS NOT NULL THEN sov1.amount ELSE 0 END AS amount1,
					CASE WHEN floor(sov1.amount_nett) IS NOT NULL THEN floor(sov1.amount_nett) ELSE 0 END AS amount1_nett,
          CASE WHEN sov2.schedule_date IS NOT NULL THEN sov2.schedule_date ELSE NULL END AS schedule_date2,
          CASE WHEN sov2.quantity IS NOT NULL THEN sov2.quantity ELSE 0 END AS qty2,
          CASE WHEN sov2.amount IS NOT NULL THEN sov2.amount ELSE 0 END AS amount2,
					CASE WHEN floor(sov2.amount_nett) IS NOT NULL THEN floor(sov2.amount_nett) ELSE 0 END AS amount2_nett,
          CASE WHEN sov3.schedule_date IS NOT NULL THEN sov3.schedule_date ELSE NULL END AS schedule_date3,
          CASE WHEN sov3.quantity IS NOT NULL THEN sov3.quantity ELSE 0 END AS qty3,
          CASE WHEN sov3.amount IS NOT NULL THEN sov3.amount ELSE 0 END AS amount3,
					CASE WHEN floor(sov3.amount_nett) IS NOT NULL THEN floor(sov3.amount_nett) ELSE 0 END AS amount3_nett,
          CASE WHEN sov4.schedule_date IS NOT NULL THEN sov4.schedule_date ELSE NULL END AS schedule_date4,
          CASE WHEN sov4.quantity IS NOT NULL THEN sov4.quantity ELSE 0 END AS qty4,
          CASE WHEN sov4.amount IS NOT NULL THEN sov4.amount ELSE 0 END AS amount4,
					CASE WHEN floor(sov4.amount_nett) IS NOT NULL THEN floor(sov4.amount_nett) ELSE 0 END AS amount4_nett
          FROM c_order co,c_orderdetail cod
          LEFT JOIN r_uom uom ON(uom.r_uom_id = cod.r_uom_id),
          m_produk mp 
          LEFT JOIN summary_order1_v sov1 ON(sov1.kode_brand = mp.kode_brand AND sov1.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order2_v sov2 ON(sov2.kode_brand = mp.kode_brand AND sov2.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order3_v sov3 ON(sov3.kode_brand = mp.kode_brand AND sov3.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order4_v sov4 ON(sov4.kode_brand = mp.kode_brand AND sov4.cmo_id = '${cmo_id}')
          WHERE 
          co.cmo_id = '${cmo_id}'
          AND co.c_order_id = cod.c_order_id
          AND cod.m_produk_id = mp.m_produk_id
          AND co.isactive = 'Y'
          AND cod.qty > 0
          GROUP BY co.cmo_id,mp.kode_brand,mp.brand,
          sov1.schedule_date,sov1.quantity,sov1.amount,floor(sov1.amount_nett),
          sov2.schedule_date,sov2.quantity,sov2.amount,floor(sov2.amount_nett),
          sov3.schedule_date,sov3.quantity,sov3.amount,floor(sov3.amount_nett),
          sov4.schedule_date,sov4.quantity,sov4.amount,floor(sov4.amount_nett),
          uom.nama`;

          // console.log(sqlgetSummaryBrand);
          let getsummaryorder = await request.query(sqlgetSummaryBrand);
          let temp = getsummaryorder.recordset;
          //console.log(getsummaryorder);


          var helper = {};
          var resultnya = temp.reduce(function(r, o) {
            var key = o.cmo_id + '-' + o.kode_brand + '-' + o.brand;
            
            if(!helper[key]) {
              helper[key] = Object.assign({}, o); // create a copy of o
              r.push(helper[key]);
            } else {
              helper[key].qty1 += o.qty1;
              helper[key].qty2 += o.qty2;
              helper[key].qty3 += o.qty3;
            }

            return r;
          }, []);

          //console.log(resultnya.length);
                    
          getsummaryorder.recordset = resultnya;
          row.summaryorder = getsummaryorder.recordset;

          let totalQuantity1 = 0;
          let totalQuantity2 = 0;
          let totalQuantity3 = 0;
          let totalQuantity4 = 0;

          let totalAmount1 = 0;
          let totalAmount2 = 0;
          let totalAmount3 = 0;
          let totalAmount4 = 0;

          let totalAmount1_nett = 0;
          let totalAmount2_nett = 0;
          let totalAmount3_nett = 0;
          let totalAmount4_nett = 0;

          let totalQuantityAll = 0;
          let totalAmountAll = 0;
          let totalAmountAll_nett = 0;

          for (let i = 0; i < getsummaryorder.recordset.length; i++) {
            
            totalQuantity1 = totalQuantity1 + getsummaryorder.recordset[i].qty1;
            totalQuantity2 = totalQuantity2 + getsummaryorder.recordset[i].qty2;
            totalQuantity3 = totalQuantity3 + getsummaryorder.recordset[i].qty3;
            totalQuantity4 = totalQuantity4 + getsummaryorder.recordset[i].qty4;

            getsummaryorder.recordset[i].totalQuantity = 
            getsummaryorder.recordset[i].qty1 + 
            getsummaryorder.recordset[i].qty2 + 
            getsummaryorder.recordset[i].qty3 + 
            getsummaryorder.recordset[i].qty4;

            totalQuantityAll = totalQuantityAll + getsummaryorder.recordset[i].qty1 + 
            getsummaryorder.recordset[i].qty2 + 
            getsummaryorder.recordset[i].qty3 + 
            getsummaryorder.recordset[i].qty4;


            totalAmount1 = totalAmount1 + getsummaryorder.recordset[i].amount1;
            totalAmount2 = totalAmount2 + getsummaryorder.recordset[i].amount2;
            totalAmount3 = totalAmount3 + getsummaryorder.recordset[i].amount3;
            totalAmount4 = totalAmount4 + getsummaryorder.recordset[i].amount4;

            totalAmount1_nett = totalAmount1_nett + getsummaryorder.recordset[i].amount1_nett;
            totalAmount2_nett = totalAmount2_nett + getsummaryorder.recordset[i].amount2_nett;
            totalAmount3_nett = totalAmount3_nett + getsummaryorder.recordset[i].amount3_nett;
            totalAmount4_nett = totalAmount4_nett + getsummaryorder.recordset[i].amount4_nett;


            getsummaryorder.recordset[i].totalAmount = 
            getsummaryorder.recordset[i].amount1 + 
            getsummaryorder.recordset[i].amount2 + 
            getsummaryorder.recordset[i].amount3 + 
            getsummaryorder.recordset[i].amount4;

            getsummaryorder.recordset[i].totalAmount_nett = 
            getsummaryorder.recordset[i].amount1_nett + 
            getsummaryorder.recordset[i].amount2_nett + 
            getsummaryorder.recordset[i].amount3_nett + 
            getsummaryorder.recordset[i].amount4_nett;


            totalAmountAll = totalAmountAll + getsummaryorder.recordset[i].amount1 + 
            getsummaryorder.recordset[i].amount2 + 
            getsummaryorder.recordset[i].amount3 + 
            getsummaryorder.recordset[i].amount4;

            totalAmountAll_nett = totalAmountAll_nett + getsummaryorder.recordset[i].amount1_nett + 
            getsummaryorder.recordset[i].amount2_nett + 
            getsummaryorder.recordset[i].amount3_nett + 
            getsummaryorder.recordset[i].amount4_nett;
            
            
          }

          row.totalQuantity1 = totalQuantity1;
          row.totalQuantity2 = totalQuantity2;
          row.totalQuantity3 = totalQuantity3;
          row.totalQuantity4 = totalQuantity4;

          row.totalAmount1 = totalAmount1;
          row.totalAmount2 = totalAmount2;
          row.totalAmount3 = totalAmount3;
          row.totalAmount4 = totalAmount4;

          row.totalAmount1_nett = totalAmount1_nett;
          row.totalAmount2_nett = totalAmount2_nett;
          row.totalAmount3_nett = totalAmount3_nett;
          row.totalAmount4_nett = totalAmount4_nett;

          row.totalQuantityAll = totalQuantityAll;
          row.totalAmountAll = totalAmountAll;
          row.totalAmountAll_nett = totalAmountAll_nett;


          let distributor = await request.query(`SELECT a.*,b.nama,b.kode FROM m_distributor a,r_organisasi b
                                    WHERE m_distributor_id='${m_distributor_id}' AND a.r_organisasi_id = b.r_organisasi_id`)
          row.distributor = distributor.recordset[0];

          let m_pajak_id = distributor.recordset[0].m_pajak_id;
          let r_distribution_channel_id = distributor.recordset[0].r_distribution_channel_id;

          let pajak = await request.query(`SELECT a.*,b.nama FROM m_pajak a,r_organisasi b WHERE m_pajak_id='${m_pajak_id}' AND a.r_organisasi_id = b.r_organisasi_id`)
          row.pajak = pajak.recordset[0];

          let distributor_channel = await request.query(`SELECT * FROM r_distribution_channel WHERE r_distribution_channel_id='${r_distribution_channel_id}'`)
          row.distributor_channel = distributor_channel.recordset[0];

          let order1 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=1`)
          //row.order1 = order1.recordset[0];
          let tonase_1 = (order1.recordset[0]) ? order1.recordset[0].tonase : 0;
          let kubikasi_1 = (order1.recordset[0]) ? order1.recordset[0].kubikasi : 0;


          let order2 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=2`)
          //row.order2 = order2.recordset[0];
          let tonase_2 = (order2.recordset[0]) ? order2.recordset[0].tonase : 0;
          let kubikasi_2 = (order2.recordset[0]) ? order2.recordset[0].kubikasi : 0;

          let order3 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=3`)
          //row.order3 = order3.recordset[0];
          let tonase_3 = (order3.recordset[0]) ? order3.recordset[0].tonase : 0;
          let kubikasi_3 = (order3.recordset[0]) ? order3.recordset[0].kubikasi : 0;

          let order4 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=4`)
          //row.order4 = order4.recordset[0];
          let tonase_4 = (order4.recordset[0]) ? order4.recordset[0].tonase : 0;
          let kubikasi_4 = (order4.recordset[0]) ? order4.recordset[0].kubikasi : 0;

          let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`)
          row.kendaraan1 = kendaraan1.recordset;

          let totalTonaseKendaraan1 = 0
          let totalKubikasiKendaraan1 = 0
          let nama1 = [];
          let datakendaraan1 = [];
          let nama2 = [];
          let datakendaraan2 = [];
          let nama3 = [];
          let datakendaraan3 = [];
          let nama4 = [];
          let datakendaraan4 = [];

          for (let i = 0; i < kendaraan1.recordset.length; i++) {

            totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase
            totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi
            nama1.push(kendaraan1.recordset[i].nama)


          }

          let dataken1 = nama1.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing1 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken1, function(value, key) {  //Function looping tiap object beserta nilainya
              hasilParsing1 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing1 = hasilParsing1.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan1 = hasilParsing1;
          row.namakendaraan1 = keterangankendaraan1;
          let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100
          let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100

          row.totalPercentaseTonaseOrder1 = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
          row.totalPercentaseKubikasiOrder1 = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
          row.totalTonaseKendaraan1 = totalTonaseKendaraan1
          row.totalKubikasiKendaraan1 = totalKubikasiKendaraan1



          let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`)
          row.kendaraan2 = kendaraan2.recordset;


          let totalTonaseKendaraan2 = 0
          let totalKubikasiKendaraan2 = 0

          for (let i = 0; i < kendaraan2.recordset.length; i++) {

            totalTonaseKendaraan2 = totalTonaseKendaraan2 + kendaraan2.recordset[i].tonase
            totalKubikasiKendaraan2 = totalKubikasiKendaraan2 + kendaraan2.recordset[i].kubikasi
            nama2.push(kendaraan2.recordset[i].nama)
          }

          let dataken2 = nama2.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing2 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken2, function(value, key) {  //Function looping tiap object beserta nilainya
              hasilParsing2 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing2 = hasilParsing2.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan2 = hasilParsing2;
          row.namakendaraan2 = keterangankendaraan2;

          let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100
          let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100

          row.totalPercentaseTonaseOrder2 = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
          row.totalPercentaseKubikasiOrder2 = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));

          row.totalTonaseKendaraan2 = totalTonaseKendaraan2
          row.totalKubikasiKendaraan2 = totalKubikasiKendaraan2

          let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=3`)
          row.kendaraan3 = kendaraan3.recordset;

          let totalTonaseKendaraan3 = 0
          let totalKubikasiKendaraan3 = 0

          for (let i = 0; i < kendaraan3.recordset.length; i++) {

            totalTonaseKendaraan3 = totalTonaseKendaraan3 + kendaraan3.recordset[i].tonase
            totalKubikasiKendaraan3 = totalKubikasiKendaraan3 + kendaraan3.recordset[i].kubikasi
            nama3.push(kendaraan3.recordset[i].nama)
          }

          let dataken3 = nama3.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing3 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken3, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing3 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing3 = hasilParsing3.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan3 = hasilParsing3;
          row.namakendaraan3 = keterangankendaraan3;


          let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100
          let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100

          row.totalPercentaseTonaseOrder3 = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
          row.totalPercentaseKubikasiOrder3 = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));

          row.totalTonaseKendaraan3 = totalTonaseKendaraan3
          row.totalKubikasiKendaraan3 = totalKubikasiKendaraan3

          let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`)
          row.kendaraan4 = kendaraan4.recordset;


          let totalTonaseKendaraan4 = 0
          let totalKubikasiKendaraan4 = 0

          for (let i = 0; i < kendaraan4.recordset.length; i++) {

            totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase
            totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi
            nama4.push(kendaraan4.recordset[i].nama)
          }
          row.namakendaraan4 = nama4.join(",");

          let dataken4 = nama4.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing4 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken4, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing4 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing4 = hasilParsing4.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan4 = hasilParsing4;
          row.namakendaraan4 = keterangankendaraan4;

          let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100
          let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100

          row.totalPercentaseTonaseOrder4 = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
          row.totalPercentaseKubikasiOrder4 = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));

          row.totalTonaseKendaraan4 = totalTonaseKendaraan4
          row.totalKubikasiKendaraan4 = totalKubikasiKendaraan4

          // let queryDetails = await request.query(`SELECT *,'2020-11-01' as order_1 FROM cmo_detail 
          // WHERE cmo_id='${cmo_id}' AND total_order > 0  ORDER BY line`)

          let queryDetails = await request.query(`SELECT a.*,convert(varchar(10),[1],120) as order_1,convert(varchar(10),[2],120) as order_2
                  , convert(varchar(10),[3],120) as order_3, convert(varchar(10),[4],120) as order_4
                  FROM cmo_detail a 
                  left join v_schedule_cmo b on a.cmo_id = b.cmo_id and a.m_produk_id = b.m_produk_id
                  WHERE a.cmo_id='${cmo_id}' 
                  AND total_order >= 0  ORDER BY line`)

          let details = queryDetails.recordset;

          let error_counter = 0;
          let error_data = [];
          let error = undefined;
          let headWeek1 = 0, headWeek2 = 0; headWeek3 = 0, headWeek4 = 0;
          for (let i = 0; i < details.length; i++) {

            let cmo = details[i].cmo;
            let order_week1 = details[i].qty_order_1 ?  details[i].qty_order_1 : 0;
            let order_week2 = details[i].qty_order_2 ?  details[i].qty_order_2 : 0;
            let order_week3 = details[i].qty_order_3 ?  details[i].qty_order_3 : 0;
            let order_week4 = details[i].qty_order_4 ?  details[i].qty_order_4 : 0;

            
            
            if (details[i].total_order > 0) {
              if (details[i].cmo > details[i].total_order) {
                error_data.push({
                  validation: `Jumlah order dibawah standart`
                });
                error_counter + 1;
              }
            }

            let zero_pass = false;
            if (order_week1 == 0 && order_week2 == 0 && order_week2 == 0 && order_week2 == 0) {
              zero_pass = true;
            }

            

            headWeek1 = headWeek1 + order_week1;
            headWeek2 = headWeek2 + order_week2;
            headWeek3 = headWeek3 + order_week3;
            headWeek4 = headWeek4 + order_week4;
            
            
            let error_status = (error_counter > 0) ? true : false;

            if(error_counter > 0){
              console.log('details ',details[i]);             
            }

            if(error_status==false){
              error_data = [];
            }else{
              error_data = _.uniq(error_data);
            }
            error_data = _.uniq(error_data);
            error = {
              error_status,
              error_counter,
              error_data,
              zero_pass
            };

            details[i].error = error;
            details[i].line = i + 1;
            error_data = [];
          
          }

          

          delete row.r_kendaraan_1_id
          delete row.r_kendaraan_2_id
          delete row.r_kendaraan_3_id
          delete row.r_kendaraan_4_id
          delete row.m_distributor_id
          delete row.r_distribution_channel_id

          let totalCarton1 = 0;
          let totalCarton2 = 0;
          let totalCarton3 = 0;
          let totalCarton4 = 0;
          let totalBruto = 0;
          let totalNett = 0;
          for (let i = 0; i < queryDetails.recordset.length; i++) {

            let m_produk_id = details[i].m_produk_id
            let produk = await request.query(`SELECT * FROM m_produk WHERE m_produk_id='${m_produk_id}'`)
            details[i].produk = produk.recordset[0];

            let r_uom_id = details[i].r_uom_id
            let uom = await request.query(`SELECT * FROM r_uom WHERE r_uom_id='${r_uom_id}'`)
            details[i].uom = uom.recordset[0];

            totalCarton1 = totalCarton1 + details[i].qty_order_1;
            totalCarton2 = totalCarton2 + details[i].qty_order_2;
            totalCarton3 = totalCarton3 + details[i].qty_order_3;
            totalCarton4 = totalCarton4 + details[i].qty_order_4;
            totalBruto = totalBruto + (details[i].harga * details[i].total_order);
            totalNett = totalNett + (details[i].harga_nett * details[i].total_order);

            delete details[i].m_produk_id
            delete details[i].r_uom_id

          }


          row.totalCarton1 = totalCarton1;
          row.totalCarton2 = totalCarton2;
          row.totalCarton3 = totalCarton3;
          row.totalCarton4 = totalCarton4;
          row.totalBruto = totalBruto;
          row.totalNett = totalNett;

          row.details = details

        }

        //console.log('actionnya coy ',row.action);

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  new: async function (req, res) {
    const { m_user_id, nomor_cmo, bulan, tahun,
      m_distributor_id, schedule_1,
      tonase_1, kubikasi_1, jenis_kendaraan_1,
      schedule_2, tonase_2, kubikasi_2,
      jenis_kendaraan_2, schedule_3, tonase_3,
      kubikasi_3, jenis_kendaraan_3, schedule_4,
      tonase_4, kubikasi_4, jenis_kendaraan_4, 
      status, details,kategori,nomor_po,r_distribution_channel_id } = req.body;      
    // eslint-disable-next-line no-undef
    console.log(">>>> ",details);

    // return res.error("coba test......");

    if(!schedule_1 && !schedule_2 && !schedule_3 && !schedule_4){
      res.error({
        message: `Schedule pengiriman tidak boleh kosong pastikan isi schedule pengiriman dalam 4 minggu di form cmo`
      });
      return false;  
    }else{
      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
        let getcmo = await request.query(`SELECT mdv.region,r_organisasi_id,kode
        FROM m_distributor_v mdv 
        WHERE mdv.m_distributor_id = '${m_distributor_id}'`);
        let region = getcmo.recordset[0].region;
        let r_organisasi_id = getcmo.recordset[0].r_organisasi_id;
        let kode_shipto = getcmo.recordset[0].kode;

        let totalTonase = (tonase_1 ? tonase_1 : 0) + (tonase_2 ? tonase_2 : 0) + (tonase_3 ? tonase_3 : 0) + (tonase_4 ? tonase_4 : 0)

        let datauser = await request.query(`SELECT mu.r_organisasi_id,
        mu.nama FROM m_user mu
        WHERE mu.m_user_id = '${m_user_id}'`);
        let usernama = datauser.recordset[0].nama
        
        //let cmoattribute = usernama.concat('-').concat(nomor_cmo).concat('-').concat(bulan).concat('-').concat(tahun);
        
        let getdataemail = await request.query(`
        SELECT DISTINCT mu.email_verifikasi,mfa.nama as flowjabatan
        FROM m_user_organisasi muo,m_user mu,m_role mr 
        left join m_flow_approve mfa ON(mfa.nama = mr.nama)
        WHERE muo.r_organisasi_id = '${r_organisasi_id}'
        AND muo.m_user_id = mu.m_user_id
        AND mu.role_default_id = mr.m_role_id
        AND mfa.line = 2
        AND mu.email_verifikasi IS NOT NULL
        AND mu.isactive = 'Y'`);



        let sqlgetdocumentno= `SELECT document_number_id FROM document_number WHERE kode = 'CMO'`;
        let getdocument = await request.query(sqlgetdocumentno);
        let document_number_id = getdocument.recordset.length > 0 ? getdocument.recordset[0].document_number_id : '';

        
        let queryDataTable = `
        SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
        WHERE dn.document_number_id='${document_number_id}'
        AND dn.document_number_id = dnl.document_number_id
        AND dnl.r_organisasi_id = '${r_organisasi_id}'`;

        let getsequence = await request.query(queryDataTable);
        const row = getsequence.recordset[0];
        let linenumber = parseInt(row.totalrows);
        let totalrows = pad(row.totalrows);
        let bulanconvert = moment(bulan,'MM').format('MMM');
        let nomor_dokumen_klaim = tahun+"/CMO/"+bulanconvert.toLocaleUpperCase()+"/"+kode_shipto+"/"+totalrows;
        
        
        let flowjabatan = ``;
        if(getdataemail.recordset.length > 0){
          
          flowjabatan = getdataemail.recordset[0].flowjabatan;

        }else{
          flowjabatan = `RSM`;
        }
        
        let dataemail = []
        if( getdataemail.recordset.length > 0){
          for (let i = 0; i < getdataemail.recordset.length; i++) {
          
            dataemail.push(getdataemail.recordset[i].email_verifikasi);
          
          }
        }

        let cmo_id = uuid();
        let dateshedule1 = undefined;
        let dateshedule2 = undefined;
        let dateshedule3 = undefined;
        let dateshedule4 = undefined;

        let datatonase_1 = undefined;
        let datatonase_2 = undefined;
        let datatonase_3 = undefined;
        let datatonase_4 = undefined;

        let datakubikasi_1 = undefined;
        let datakubikasi_2 = undefined;
        let datakubikasi_3 = undefined;
        let datakubikasi_4 = undefined;

        let r_kendaraan_1_id = undefined;
        let r_kendaraan_2_id = undefined;
        let r_kendaraan_3_id = undefined;
        let r_kendaraan_4_id = undefined;
        

        if(schedule_1==undefined){
          dateshedule1 = null;
          datatonase_1 = 0;
          datakubikasi_1 = 0;
          r_kendaraan_1_id = null;
        }else{
          dateshedule1 = `'${schedule_1}'`;
          datatonase_1 = tonase_1;
          datakubikasi_1 = kubikasi_1;
          r_kendaraan_1_id = `'${jenis_kendaraan_1[0].r_kendaraan_id}'`;
        }

        if(schedule_2==undefined){
          dateshedule2 = null;
          datatonase_2 = 0;
          datakubikasi_2 = 0;
          r_kendaraan_2_id = null;
        }else{
          dateshedule2 = `'${schedule_2}'`;
          datatonase_2 = tonase_2;
          datakubikasi_2 = kubikasi_2;
          r_kendaraan_2_id = `'${jenis_kendaraan_2[0].r_kendaraan_id}'`;
        }


        if(schedule_3==undefined){
          dateshedule3 = null;
          datatonase_3 = 0;
          datakubikasi_3 = 0;
          r_kendaraan_3_id = null;
        }else{
          dateshedule3 = `'${schedule_3}'`;
          datatonase_3 = tonase_3;
          datakubikasi_3 = kubikasi_3;
          r_kendaraan_3_id = `'${jenis_kendaraan_3[0].r_kendaraan_id}'`;
        }


        if(schedule_4==undefined){
          dateshedule4 = null;
          datatonase_4 = 0;
          datakubikasi_4 = 0;
          r_kendaraan_4_id = null;
        }else{
          dateshedule4 = `'${schedule_4}'`;
          datatonase_4 = tonase_4;
          datakubikasi_4 = kubikasi_4;
          r_kendaraan_4_id = `'${jenis_kendaraan_4[0].r_kendaraan_id}'`
        }

        let category = undefined
        if(kategori){

          category='CMO';

        }else{

          category='CMO';

        }



        let nomorpo = '';
        if(nomor_po){

          nomorpo = `'${nomor_po}'`;

        }else{

          nomorpo = `NULL`;

        }

        let channelid = ``;
        if(r_distribution_channel_id){

          channelid = `'${r_distribution_channel_id}'`;
        
        }else{

          channelid = `NULL`;

        }


        const sql = `INSERT INTO cmo
          ( cmo_id,createdby, updatedby,
            nomor_cmo, bulan, tahun,
            m_distributor_id, schedule_1,
            tonase_1, kubikasi_1, jenis_kendaraan_1,
            schedule_2,tonase_2, kubikasi_2,
            jenis_kendaraan_2, schedule_3, tonase_3,
            kubikasi_3,jenis_kendaraan_3, schedule_4,
            tonase_4, kubikasi_4, jenis_kendaraan_4,
            status,
            kategori,
            nomor_po,
            r_distribution_channel_id)
            VALUES (
              '${cmo_id}',
              '${m_user_id}',
              '${m_user_id}',
              '${nomor_dokumen_klaim}',
              ${bulan},
              '${tahun}',
              '${m_distributor_id}',
              ${dateshedule1},
              ${datatonase_1},
              ${datakubikasi_1},
              ${r_kendaraan_1_id},
              ${dateshedule2},
              ${datatonase_2},
              ${datakubikasi_2},
              ${r_kendaraan_2_id},
              ${dateshedule3},
              ${datatonase_3},
              ${datakubikasi_3},
              ${r_kendaraan_3_id},
              ${dateshedule4},
              ${datatonase_4},
              ${datakubikasi_4},
              ${r_kendaraan_4_id},
              '${status}',
              '${category}',
              ${nomorpo},
              ${channelid}
          )`;


            
        request.query(sql, async (err, result) => {
          if (err) {
            return res.error(err);
          }

          let insertDocumentNo = `INSERT INTO document_number_line
          (document_number_id, r_organisasi_id, line)
          VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
          await request.query(insertDocumentNo);


        
          let data = details;
        

          if (data.length > 0) {

            for (let i = 0; i < data.length; i++) {

              // let ceknett = `select top 1 * from m_pricelist_nett where m_distributor_id = '${m_distributor_id}' 
              //                and m_produk_id = '${data[i].m_produk_id}'`;

              let ceknett = `select top 1 *,nett AS price,gross as harga  from m_pricelist_grossnet where m_distributor_id = '${m_distributor_id}' 
                            and m_produk_id = '${data[i].m_produk_id}'`;
              
              let dsnett = await request.query(ceknett);       
              let harga_nett = 0;
              let total_nett = 0;
                

              let harga = data[i].harga ? data[i].harga : 0; // akan mengambil dari service lain
              let total_order = (parseInt(data[i].qty_order_1 ? data[i].qty_order_1 : 0) + parseInt(data[i].qty_order_2 ? data[i].qty_order_2 : 0) + parseInt(data[i].qty_order_3 ? data[i].qty_order_3 : 0) + parseInt(data[i].qty_order_4 ? data[i].qty_order_4 : 0))
              if(dsnett.recordset.length > 0){
                harga_nett = dsnett.recordset[0].price;
                total_nett = harga_nett * total_order
                harga = dsnett.recordset[0].harga; 
              }
              
              let bruto = total_order * harga;

              let doi = Number(data[i].doi) >= 37000 ?  32000 : Number(data[i].doi) <= -37000 ? 32000 : Number(data[i].doi);
              let cmo_detail_id = uuid();
              let j = i + 1;
              
              let sqlInsertDetail = `INSERT INTO cmo_detail
              (
              cmo_detail_id,
              createdby,
              updatedby,
              cmo_id,
              line,
              m_produk_id,
              r_uom_id,
              stok_awal,
              stok_pending,
              total_stok,
              estimasi_sales_bulan_lalu,
              estimasi_sales_bulan_berjalan,
              stok_akhir,
              estimasi_sales_bulan_depan,
              buffer_stok,
              avarage_sales_tiga_bulan,
              doi,
              cmo,
              qty_order_1,
              qty_order_2,
              qty_order_3,
              qty_order_4,
              total_order,
              harga,
              bruto,
              estimasi_sales_duabulan_kedepan,
              status,
              harga_nett,
              total_nett,
              estimasi_next1,
              estimasi_next2)
              VALUES(
              '${cmo_detail_id}',
              '${m_user_id}',
              '${m_user_id}',
              '${cmo_id}',
              ${j},
              '${data[i].m_produk_id}',
              '${data[i].r_uom_id}',
              ${data[i].stok_awal ? data[i].stok_awal : 0},
              ${data[i].stok_pending ? data[i].stok_pending : 0},
              ${data[i].total_stok ? data[i].total_stok : 0},
              ${data[i].estimasi_sales_bulan_lalu ? data[i].estimasi_sales_bulan_lalu : 0},
              ${data[i].estimasi_sales_bulan_berjalan ? data[i].estimasi_sales_bulan_berjalan : 0},
              ${data[i].stok_akhir ? data[i].stok_akhir : 0},
              ${data[i].estimasi_sales_bulan_depan ? data[i].estimasi_sales_bulan_depan : 0},
              ${data[i].buffer_stok ? data[i].buffer_stok : 0},
              ${data[i].avarage_sales_tiga_bulan ? data[i].avarage_sales_tiga_bulan : 0},
              ${doi},
              ${data[i].cmo},
              ${data[i].qty_order_1 ? data[i].qty_order_1 : 0},
              ${data[i].qty_order_2 ? data[i].qty_order_2 : 0},
              ${data[i].qty_order_3 ? data[i].qty_order_3 : 0},
              ${data[i].qty_order_4 ? data[i].qty_order_4 : 0},
              ${total_order},
              ${harga},
              ${bruto},
              ${data[i].estimasi_sales_duabulan_kedepan},
              '${data[i].status}',${harga_nett},${total_nett},'',''
              )`;
          
              //console.log(sqlInsertDetail);
              await request.query(sqlInsertDetail);


            }

          }


          let cmodetail = await request.query(`SELECT * FROM cmo_detail WHERE cmo_id = '${cmo_id}' AND total_order > 0`)

          for (let transform = 1; transform <= 4; transform++) {
            
            if (transform == 1 && ((schedule_1!=undefined || schedule_1) && (datatonase_1 + datakubikasi_1 > 0))) {

              for (let i = 0; i < jenis_kendaraan_1.length; i++) {
                let cmo_kendaraan_id = uuid();
                let insertKendaraan = `INSERT INTO cmo_kendaraan
                (createdby,updatedby,cmo_kendaraan_id, cmo_id, week_number, r_kendaraan_id)
                VALUES('${m_user_id}', '${m_user_id}','${cmo_kendaraan_id}', '${cmo_id}',1,'${jenis_kendaraan_1[i].r_kendaraan_id}')`;
                //console.log(insertKendaraan);
                await request.query(insertKendaraan);

              }



              let c_order_id = uuid();
              let SqlOrder = `INSERT INTO c_order
              (c_order_id,
              createdby,
              updatedby,  
              cmo_id, week_number, schedule_date,
              tonase, kubikasi,
              status)
              VALUES('${c_order_id}','${m_user_id}', '${m_user_id}','${cmo_id}', 1,'${schedule_1}',
              ${tonase_1},
              ${kubikasi_1},
              'Draft')`;
              console.log(SqlOrder);
              await request.query(SqlOrder)
              
              await request.query(`INSERT INTO audit_order
                      (createdby,updatedby, c_order_id, m_user_id, actions, status)
                      VALUES('${m_user_id}',
                      '${m_user_id}','${c_order_id}', '${m_user_id}',
                      'PENGAJUAN',
                      'Waiting ${flowjabatan}')`)

              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let c_orderdetail_id = uuid();
                let j = i + 1
                let total_order = parseInt(cmodetail.recordset[i].harga) * parseInt(cmodetail.recordset[i].qty_order_1)
                let total_order_nett = parseInt(cmodetail.recordset[i].harga_nett) * parseInt(cmodetail.recordset[i].qty_order_1)
                await request.query(`INSERT c_orderdetail
                            (c_orderdetail_id,
                            createdby,
                            updatedby,
                            c_order_id,
                            line,
                            cmo_detail_id,
                            m_produk_id,
                            r_uom_id, stok_awal,
                            stok_pending,
                            total_stok,
                            estimasi_sales_bulan_lalu,
                            estimasi_sales_bulan_berjalan,
                            stok_akhir,
                            estimasi_sales_bulan_depan,
                            buffer_stok,
                            avarage_sales_tiga_bulan,
                            doi,
                            cmo,
                            qty,
                            harga,
                            total_order,
                            estimasi_sales_duabulan_kedepan,
                            week_number,harga_nett,total_order_nett
                            )
                            VALUES(
                            '${c_orderdetail_id}',
                            '${m_user_id}',
                            '${m_user_id}',
                            '${c_order_id}',
                            ${j},
                            '${cmodetail.recordset[i].cmo_detail_id}',
                            '${cmodetail.recordset[i].m_produk_id}',
                            '${cmodetail.recordset[i].r_uom_id}',
                            ${cmodetail.recordset[i].stok_awal},
                            ${cmodetail.recordset[i].stok_pending},
                            ${cmodetail.recordset[i].total_stok},
                            ${cmodetail.recordset[i].estimasi_sales_bulan_lalu},
                            ${cmodetail.recordset[i].estimasi_sales_bulan_berjalan},
                            ${cmodetail.recordset[i].stok_akhir},
                            ${cmodetail.recordset[i].estimasi_sales_bulan_depan},
                            ${cmodetail.recordset[i].buffer_stok},
                            ${cmodetail.recordset[i].avarage_sales_tiga_bulan},
                            ${cmodetail.recordset[i].doi},
                            ${cmodetail.recordset[i].cmo},
                            ${cmodetail.recordset[i].qty_order_1},
                            ${cmodetail.recordset[i].harga},
                            ${total_order},
                            ${cmodetail.recordset[i].estimasi_sales_duabulan_kedepan},
                            1,
                            ${cmodetail.recordset[i].harga_nett},
                            ${total_order_nett}
                            )
                            `)
              }


            } else if(transform == 2 && ((schedule_2!=undefined || schedule_2) && (datatonase_2 + datakubikasi_2 > 0))) {      

              for (let i = 0; i < jenis_kendaraan_2.length; i++) {
                let cmo_kendaraan_id = uuid();

                let insertKendaraan = `INSERT INTO cmo_kendaraan
                (createdby,updatedby,cmo_kendaraan_id, cmo_id, week_number, r_kendaraan_id)
                VALUES('${m_user_id}', '${m_user_id}','${cmo_kendaraan_id}', '${cmo_id}',2,'${jenis_kendaraan_2[i].r_kendaraan_id}')`;
                //console.log(insertKendaraan);
                await request.query(insertKendaraan);
              }

              let c_order_id = uuid();
              await request.query(`INSERT INTO c_order
                      (createdby,updatedby,c_order_id,cmo_id, week_number, schedule_date,
                      tonase, kubikasi,
                      status)
                      VALUES('${m_user_id}',
                      '${m_user_id}','${c_order_id}','${cmo_id}',2,'${schedule_2}',
                      ${tonase_2},
                      ${kubikasi_2},
                      'Draft')`)


              await request.query(`INSERT INTO audit_order
                      (createdby,updatedby, c_order_id, m_user_id, actions, status)
                      VALUES('${m_user_id}',
                      '${m_user_id}','${c_order_id}', '${m_user_id}',
                      'PENGAJUAN',
                      'Draft')`)

              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let c_orderdetail_id = uuid();
                let j = i + 1
                let total_order = cmodetail.recordset[i].harga * cmodetail.recordset[i].qty_order_2;
                let total_order_nett = parseInt(cmodetail.recordset[i].harga_nett) * parseInt(cmodetail.recordset[i].qty_order_2)
                await request.query(`INSERT c_orderdetail
                          (c_orderdetail_id,
                          createdby,
                          updatedby,
                          c_order_id,
                          line,
                          cmo_detail_id,
                          m_produk_id,
                          r_uom_id, stok_awal,
                          stok_pending,
                          total_stok,
                          estimasi_sales_bulan_lalu,
                          estimasi_sales_bulan_berjalan,
                          stok_akhir,
                          estimasi_sales_bulan_depan,
                          buffer_stok,
                          avarage_sales_tiga_bulan,
                          doi,
                          cmo,
                          qty,
                          harga,
                          total_order,
                          estimasi_sales_duabulan_kedepan,
                          week_number,harga_nett,total_order_nett
                          )
                          VALUES('${c_orderdetail_id}',
                          '${m_user_id}',
                          '${m_user_id}',
                          '${c_order_id}',
                          ${j},
                          '${cmodetail.recordset[i].cmo_detail_id}',
                          '${cmodetail.recordset[i].m_produk_id}',
                          '${cmodetail.recordset[i].r_uom_id}',
                          ${cmodetail.recordset[i].stok_awal},
                          ${cmodetail.recordset[i].stok_pending},
                          ${cmodetail.recordset[i].total_stok},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_lalu},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_berjalan},
                          ${cmodetail.recordset[i].stok_akhir},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_depan},
                          ${cmodetail.recordset[i].buffer_stok},
                          ${cmodetail.recordset[i].avarage_sales_tiga_bulan},
                          ${cmodetail.recordset[i].doi},
                          ${cmodetail.recordset[i].cmo},
                          ${cmodetail.recordset[i].qty_order_2},
                          ${cmodetail.recordset[i].harga},
                          ${total_order},
                          ${cmodetail.recordset[i].estimasi_sales_duabulan_kedepan},
                          2,
                          ${cmodetail.recordset[i].harga_nett},
                          ${total_order_nett}
                          )
                          `)
              }

            } else if (transform == 3 && ((schedule_3!=undefined || schedule_3) && (datatonase_3 + datakubikasi_3 > 0))) {

              for (let i = 0; i < jenis_kendaraan_3.length; i++) {
                let cmo_kendaraan_id = uuid();

                let insertKendaraan = `INSERT INTO cmo_kendaraan
                (createdby,updatedby,cmo_kendaraan_id, cmo_id, week_number, r_kendaraan_id)
                VALUES('${m_user_id}', '${m_user_id}','${cmo_kendaraan_id}', '${cmo_id}',3,'${jenis_kendaraan_3[i].r_kendaraan_id}')`;
                //console.log(insertKendaraan);
                await request.query(insertKendaraan);

      

              }

              let c_order_id = uuid();
              await request.query(`INSERT INTO c_order
                      (createdby,updatedby,c_order_id,cmo_id, week_number, schedule_date,
                      tonase, kubikasi,
                      status)
                      VALUES(
                      '${m_user_id}',
                      '${m_user_id}',
                      '${c_order_id}','${cmo_id}',3,'${schedule_3}',
                      ${tonase_3},
                      ${kubikasi_3},
                      'Draft')`)

              await request.query(`INSERT INTO audit_order
                      (createdby,updatedby, c_order_id, m_user_id, actions, status)
                      VALUES('${m_user_id}',
                      '${m_user_id}','${c_order_id}', '${m_user_id}',
                      'PENGAJUAN',
                      'Draft')`)

              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let c_orderdetail_id = uuid();
                let j = i + 1
                let total_order = cmodetail.recordset[i].harga * cmodetail.recordset[i].qty_order_3
                let total_order_nett = parseInt(cmodetail.recordset[i].harga_nett) * parseInt(cmodetail.recordset[i].qty_order_3)
                await request.query(`INSERT c_orderdetail
                          (createdby,
                          updatedby,
                          c_orderdetail_id,
                          c_order_id,
                          line,
                          cmo_detail_id,
                          m_produk_id,
                          r_uom_id, stok_awal,
                          stok_pending,
                          total_stok,
                          estimasi_sales_bulan_lalu,
                          estimasi_sales_bulan_berjalan,
                          stok_akhir,
                          estimasi_sales_bulan_depan,
                          buffer_stok,
                          avarage_sales_tiga_bulan,
                          doi,
                          cmo,
                          qty,
                          harga,
                          total_order,
                          estimasi_sales_duabulan_kedepan,
                          week_number,harga_nett,total_order_nett
                          )
                          VALUES(
                          '${m_user_id}',
                          '${m_user_id}',
                          '${c_orderdetail_id}','${c_order_id}',${j},
                          '${cmodetail.recordset[i].cmo_detail_id}',
                          '${cmodetail.recordset[i].m_produk_id}',
                          '${cmodetail.recordset[i].r_uom_id}',
                          ${cmodetail.recordset[i].stok_awal},
                          ${cmodetail.recordset[i].stok_pending},
                          ${cmodetail.recordset[i].total_stok},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_lalu},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_berjalan},
                          ${cmodetail.recordset[i].stok_akhir},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_depan},
                          ${cmodetail.recordset[i].buffer_stok},
                          ${cmodetail.recordset[i].avarage_sales_tiga_bulan},
                          ${cmodetail.recordset[i].doi},
                          ${cmodetail.recordset[i].cmo},
                          ${cmodetail.recordset[i].qty_order_3},
                          ${cmodetail.recordset[i].harga},
                          ${total_order},
                          ${cmodetail.recordset[i].estimasi_sales_duabulan_kedepan},
                          3,${cmodetail.recordset[i].harga_nett},
                          ${total_order_nett}
                          )
                          `)
              }

            } else if (transform == 4 && ((schedule_4!=undefined || schedule_4) && (datatonase_4 + datakubikasi_4 > 0))) {

              for (let i = 0; i < jenis_kendaraan_4.length; i++) {
                let cmo_kendaraan_id = uuid();
                let insertKendaraan = `INSERT INTO cmo_kendaraan
                (createdby,updatedby,cmo_kendaraan_id, cmo_id, week_number, r_kendaraan_id)
                VALUES('${m_user_id}', '${m_user_id}','${cmo_kendaraan_id}', '${cmo_id}',4,'${jenis_kendaraan_4[i].r_kendaraan_id}')`;
                //console.log(insertKendaraan);
                await request.query(insertKendaraan);

              }

              let c_order_id = uuid();
              await request.query(`INSERT INTO c_order
                      (createdby,updatedby,
                      c_order_id,cmo_id, week_number, schedule_date,
                      tonase, kubikasi,
                      status)
                      VALUES(
                      '${m_user_id}',
                      '${m_user_id}',
                      '${c_order_id}','${cmo_id}',4,'${schedule_4}',
                      ${tonase_4},
                      ${kubikasi_4},
                      'Draft')`)


              await request.query(`INSERT INTO audit_order
                      (createdby,updatedby, c_order_id, m_user_id, actions, status)
                      VALUES('${m_user_id}',
                      '${m_user_id}','${c_order_id}', '${m_user_id}',
                      'PENGAJUAN',
                      'Draft')`)

              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let c_orderdetail_id = uuid();
                let j = i + 1
                let total_order = cmodetail.recordset[i].harga * cmodetail.recordset[i].qty_order_4
                let total_order_nett = parseInt(cmodetail.recordset[i].harga_nett) * parseInt(cmodetail.recordset[i].qty_order_4)
                await request.query(`INSERT c_orderdetail
                          (c_orderdetail_id,
                          createdby,
                          updatedby,
                          c_order_id,
                          line,
                          cmo_detail_id,
                          m_produk_id,
                          r_uom_id, stok_awal,
                          stok_pending,
                          total_stok,
                          estimasi_sales_bulan_lalu,
                          estimasi_sales_bulan_berjalan,
                          stok_akhir,
                          estimasi_sales_bulan_depan,
                          buffer_stok,
                          avarage_sales_tiga_bulan,
                          doi,
                          cmo,
                          qty,
                          harga,
                          total_order,
                          estimasi_sales_duabulan_kedepan,
                          week_number,harga_nett,total_order_nett
                          )
                          VALUES('${c_orderdetail_id}',
                          '${m_user_id}',
                          '${m_user_id}',
                          '${c_order_id}',
                          ${j},
                          '${cmodetail.recordset[i].cmo_detail_id}',
                          '${cmodetail.recordset[i].m_produk_id}',
                          '${cmodetail.recordset[i].r_uom_id}',
                          ${cmodetail.recordset[i].stok_awal},
                          ${cmodetail.recordset[i].stok_pending},
                          ${cmodetail.recordset[i].total_stok},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_lalu},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_berjalan},
                          ${cmodetail.recordset[i].stok_akhir},
                          ${cmodetail.recordset[i].estimasi_sales_bulan_depan},
                          ${cmodetail.recordset[i].buffer_stok},
                          ${cmodetail.recordset[i].avarage_sales_tiga_bulan},
                          ${cmodetail.recordset[i].doi},
                          ${cmodetail.recordset[i].cmo},
                          ${cmodetail.recordset[i].qty_order_4},
                          ${cmodetail.recordset[i].harga},
                          ${total_order},
                          ${cmodetail.recordset[i].estimasi_sales_duabulan_kedepan},
                          4,${cmodetail.recordset[i].harga_nett},
                          ${total_order_nett}
                          )`)
                }

            }

        }

        let audit_cmo_id = uuid();
        if(flowjabatan == 'ASDH'){
          flowjabatan = 'ASM'
        }else if(flowjabatan == 'RSDH'){
          flowjabatan = 'RSM'
        }
        console.log("jabatan.............",flowjabatan)
        await request.query(`INSERT INTO audit_cmo
        (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
        VALUES('${audit_cmo_id}','${m_user_id}',
        '${m_user_id}','${cmo_id}', '${m_user_id}',
        'Diajukan',
        'Waiting ${flowjabatan}')`)
        

        if(dataemail.length > 0){

          let sqlgetSummaryBrand = `SELECT DISTINCT co.cmo_id,
          mp.kode_brand,mp.brand,uom.nama AS satuan,
          CASE WHEN sov1.schedule_date IS NOT NULL THEN sov1.schedule_date ELSE NULL END AS schedule_date1,
          CASE WHEN sov1.quantity IS NOT NULL THEN sov1.quantity ELSE 0 END AS qty1,
          CASE WHEN sov1.amount IS NOT NULL THEN sov1.amount ELSE 0 END AS amount1,
          CASE WHEN sov2.schedule_date IS NOT NULL THEN sov2.schedule_date ELSE NULL END AS schedule_date2,
          CASE WHEN sov2.quantity IS NOT NULL THEN sov2.quantity ELSE 0 END AS qty2,
          CASE WHEN sov2.amount IS NOT NULL THEN sov2.amount ELSE 0 END AS amount2,
          CASE WHEN sov3.schedule_date IS NOT NULL THEN sov3.schedule_date ELSE NULL END AS schedule_date3,
          CASE WHEN sov3.quantity IS NOT NULL THEN sov3.quantity ELSE 0 END AS qty3,
          CASE WHEN sov3.amount IS NOT NULL THEN sov3.amount ELSE 0 END AS amount3,
          CASE WHEN sov4.schedule_date IS NOT NULL THEN sov4.schedule_date ELSE NULL END AS schedule_date4,
          CASE WHEN sov4.quantity IS NOT NULL THEN sov4.quantity ELSE 0 END AS qty4,
          CASE WHEN sov4.amount IS NOT NULL THEN sov4.amount ELSE 0 END AS amount4
          FROM c_order co,c_orderdetail cod
          LEFT JOIN r_uom uom ON(uom.r_uom_id = cod.r_uom_id),
          m_produk mp 
          LEFT JOIN summary_order1_v sov1 ON(sov1.kode_brand = mp.kode_brand AND sov1.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order2_v sov2 ON(sov2.kode_brand = mp.kode_brand AND sov2.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order3_v sov3 ON(sov3.kode_brand = mp.kode_brand AND sov3.cmo_id = '${cmo_id}')
          LEFT JOIN summary_order4_v sov4 ON(sov4.kode_brand = mp.kode_brand AND sov4.cmo_id = '${cmo_id}')
          WHERE 
          co.cmo_id = '${cmo_id}'
          AND co.c_order_id = cod.c_order_id
          AND cod.m_produk_id = mp.m_produk_id
          AND cod.qty > 0
          AND co.isactive = 'Y'
          GROUP BY co.cmo_id,mp.kode_brand,mp.brand,
          sov1.schedule_date,sov1.quantity,sov1.amount,
          sov2.schedule_date,sov2.quantity,sov2.amount,
          sov3.schedule_date,sov3.quantity,sov3.amount,
          sov4.schedule_date,sov4.quantity,sov4.amount,
          uom.nama`;

          
          
          let getsummaryorder = await request.query(sqlgetSummaryBrand);
          let totalAmountAll = 0;

          for (let i = 0; i < getsummaryorder.recordset.length; i++) {
          
            totalAmountAll = totalAmountAll + getsummaryorder.recordset[i].amount1 + 
            getsummaryorder.recordset[i].amount2 + 
            getsummaryorder.recordset[i].amount3 + 
            getsummaryorder.recordset[i].amount4;
            
          }

          const amount = numeral(totalAmountAll).format('0,0').replace(/,/g, '.');
          const bulannya =  moment(bulan,'MM').format('MMMM') 
          totalTonase = Math.round(totalTonase);
          
          const param = {
            
            subject: `CMO ${usernama} telah rilis`,
            distributor:usernama,
            nocmo:nomor_cmo,
            region:region,
            bulan:bulannya.concat('-').concat(tahun),
            minggu1:schedule_1 ? schedule_1 : 'Tidak ada order',
            minggu2:schedule_2 ? schedule_2 : 'Tidak ada order',
            minggu3:schedule_3 ? schedule_3 : 'Tidak ada order',
            minggu4:schedule_4 ? schedule_4 : 'Tidak ada order',
            totalbruto:`Rp. ${amount}`,
            totaltonase:`${totalTonase} Kg`,
            status:`Waiting ${flowjabatan}`

          }
        
          const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'cmotemplate', templateparam: param });

          if(statusIntegasi=='DEV'){
      
            dataemail = [];
            dataemail.push('tiasadeputra@gmail.com'); // development
              
          }

          SendEmail(dataemail.toString(), param.subject, template, (async (err, info) => {
            if (err) {
              console.log('error', err);
              await request.query(`INSERT INTO log_email
              (createdby, updatedby,proses,accepted,rejected,envelope, response)
              VALUES('${m_user_id}','${m_user_id}', 'Error Email','${err}',
              '${err}','${err}','${err}')`);
            } else {
              console.log('info', info);
              let from = info.envelope.from;
              let to = info.envelope.to.toString();
              let envelope = from.concat(' send to ');
              let combine = envelope.concat(to);
              await request.query(`INSERT INTO log_email
              (createdby, updatedby,proses,accepted,rejected,envelope, response,cmo_id)
              VALUES('${m_user_id}','${m_user_id}', 'New CMO','${info.accepted.toString()}',
              '${info.rejected.toString()}','${combine}','${info.response}','${cmo_id}')`);
            }
          }));

        }
        
        await request.query(`UPDATE cmo 
        SET status = 'Waiting RSM',flow=2
        WHERE cmo_id = '${cmo_id}'`);
          
        return res.success({
          data: result,
          message: "Insert data successfully"
        });

        });

      } catch (err) {
        return res.error(err);
      }
  }

    
  },
  update: async function (req, res) {
    const { cmo_id,m_user_id, schedule_1,schedule_2,schedule_3,schedule_4,
      jenis_kendaraan_1, jenis_kendaraan_2, jenis_kendaraan_3, jenis_kendaraan_4,
      tonase_1, kubikasi_1, tonase_2, kubikasi_2, tonase_3, kubikasi_3, tonase_4, kubikasi_4,
      details } = req.body;
      
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let getcmo = await request.query(`SELECT mdv.r_organisasi_id,c.flow + 1 AS flow,
      c.nomor_cmo,c.bulan,c.tahun,mdv.region,c.schedule_1,c.schedule_2,c.schedule_3,c.schedule_4
      FROM cmo c,m_distributor_v mdv 
      WHERE c.cmo_id = '${cmo_id}'
      AND mdv.m_distributor_id = c.m_distributor_id`);
      let r_organisasi_id = getcmo.recordset[0].r_organisasi_id;
      let flow = getcmo.recordset[0].flow;
      let region = getcmo.recordset[0].region;
      
      let getdataemail = await request.query(`
      SELECT DISTINCT mu.email_verifikasi,mfa.nama as flowjabatan
      FROM m_user_organisasi muo,m_user mu,m_role mr 
      left join m_flow_approve mfa ON(mfa.nama = mr.nama)
      WHERE muo.r_organisasi_id = '${r_organisasi_id}'
      AND muo.m_user_id = mu.m_user_id
      AND mu.role_default_id = mr.m_role_id
      AND mfa.line = ${flow}
      AND mu.email_verifikasi IS NOT NULL
      AND mu.isactive = 'Y'`);

      
      let dataemail = []
      if( getdataemail.recordset.length > 0){
        for (let i = 0; i < getdataemail.recordset.length; i++) {
        
          dataemail.push(getdataemail.recordset[i].email_verifikasi);
        
        }
      }      

      if(schedule_1){        
        await request.query(`DELETE FROM cmo_kendaraan WHERE cmo_id = '${cmo_id}' AND week_number=1`)
        for (let i = 0; i < jenis_kendaraan_1.length; i++) {
          let cmo_kendaraan_id = uuid();
  
          await request.query(`INSERT INTO cmo_kendaraan
                 (cmo_kendaraan_id,createdby,updatedby,cmo_id, week_number, r_kendaraan_id)
                 VALUES('${cmo_kendaraan_id}','${m_user_id}','${m_user_id}','${cmo_id}',1,'${jenis_kendaraan_1[i].r_kendaraan_id}')`)
  
        }

      } 
      if(schedule_2){
        await request.query(`DELETE FROM cmo_kendaraan WHERE cmo_id = '${cmo_id}' AND week_number=2`)
        for (let i = 0; i < jenis_kendaraan_2.length; i++) {
          let cmo_kendaraan_id = uuid();
  
          await request.query(`INSERT INTO cmo_kendaraan
                 (cmo_kendaraan_id,createdby,updatedby,cmo_id, week_number, r_kendaraan_id)
                 VALUES('${cmo_kendaraan_id}','${m_user_id}','${m_user_id}','${cmo_id}',2,'${jenis_kendaraan_2[i].r_kendaraan_id}')`)
  
        }

      }
      if(schedule_3){
        await request.query(`DELETE FROM cmo_kendaraan WHERE cmo_id = '${cmo_id}' AND week_number=3`)
        for (let i = 0; i < jenis_kendaraan_3.length; i++) {
          let cmo_kendaraan_id = uuid();
  
          await request.query(`INSERT INTO cmo_kendaraan
                 (cmo_kendaraan_id,createdby,updatedby,cmo_id, week_number, r_kendaraan_id)
                 VALUES('${cmo_kendaraan_id}', '${m_user_id}','${m_user_id}','${cmo_id}',3,'${jenis_kendaraan_3[i].r_kendaraan_id}')`)
  
        }

      }
      if(schedule_4){
        await request.query(`DELETE FROM cmo_kendaraan WHERE cmo_id = '${cmo_id}' AND week_number=4`)
        for (let i = 0; i < jenis_kendaraan_4.length; i++) {
          let cmo_kendaraan_id = uuid();
  
          await request.query(`INSERT INTO cmo_kendaraan
                 (cmo_kendaraan_id,createdby,updatedby,cmo_id, week_number, r_kendaraan_id)
                 VALUES('${cmo_kendaraan_id}','${m_user_id}','${m_user_id}','${cmo_id}',4,'${jenis_kendaraan_4[i].r_kendaraan_id}')`)
  
        }

      }

      
      

      if (details.length > 0) {
        
        for (let i = 0; i < details.length; i++) {

          let total_order = (parseInt(details[i].qty_order_1) + parseInt(details[i].qty_order_2) +
            parseInt(details[i].qty_order_3) + parseInt(details[i].qty_order_4));

          let sql = `UPDATE cmo_detail
          SET qty_order_1=${parseInt(details[i].qty_order_1)},
          qty_order_2=${parseInt(details[i].qty_order_2)},
          qty_order_3=${parseInt(details[i].qty_order_3)},
          qty_order_4=${parseInt(details[i].qty_order_4)},
          total_order=${total_order},
          bruto = ${total_order} * harga
          WHERE cmo_detail_id='${details[i].cmo_detail_id}' AND cmo_id= '${cmo_id}'`;

          
          await request.query(sql);
          
          for (let transform = 1; transform <= 4; transform++) {
            
            if (transform == 1 && ((schedule_1!=undefined || schedule_1))) {

            let cmodetail = await request.query(`SELECT a.*,
            b.c_order_id FROM cmo_detail a,c_orderdetail b
            WHERE a.cmo_id = '${cmo_id}'
            AND a.cmo_detail_id = '${details[i].cmo_detail_id}'
            AND a.cmo_detail_id = b.cmo_detail_id
            AND b.qty > 0
            AND b.week_number=1`)


              let sqlUpdateOrder = `UPDATE c_order
                     SET tonase=${tonase_1}, kubikasi=${kubikasi_1}
                     WHERE cmo_id='${cmo_id}' AND week_number=1`;


              await request.query(sqlUpdateOrder);
             
              for (let i = 0; i < cmodetail.recordset.length; i++) {


                let total_order = parseFloat(cmodetail.recordset[i].harga) * parseFloat(cmodetail.recordset[i].qty_order_1)

                let SqlUpdateOrderDetail = `
                           UPDATE c_orderdetail
                           SET qty=${cmodetail.recordset[i].qty_order_1},
                           harga=${cmodetail.recordset[i].harga},
                           total_order=${total_order}
                           WHERE cmo_detail_id='${cmodetail.recordset[i].cmo_detail_id}'
                           AND c_order_id='${cmodetail.recordset[i].c_order_id}'
                           AND week_number = 1`;

                await request.query(SqlUpdateOrderDetail);
                

              }


            } else if (transform == 2 && (schedule_2!=undefined || schedule_2)) {
              

              let cmodetail = await request.query(`SELECT a.*,b.c_order_id FROM cmo_detail a,c_orderdetail b
              WHERE a.cmo_id = '${cmo_id}'
              AND a.cmo_detail_id = '${details[i].cmo_detail_id}'
              AND a.cmo_detail_id = b.cmo_detail_id
              AND b.qty > 0
              AND b.week_number=2`)

              let sqlUpdateOrder = `UPDATE c_order
                     SET tonase=${tonase_2}, kubikasi=${kubikasi_2}
                     WHERE cmo_id='${cmo_id}' AND week_number=2`;
              await request.query(sqlUpdateOrder);


              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let total_order = parseFloat(cmodetail.recordset[i].harga) * parseFloat(cmodetail.recordset[i].qty_order_2)
                
                let SqlUpdateOrderDetail = `
                       UPDATE c_orderdetail
                       SET qty=${cmodetail.recordset[i].qty_order_2},
                       harga=${cmodetail.recordset[i].harga},
                       total_order=${total_order}
                       WHERE cmo_detail_id='${cmodetail.recordset[i].cmo_detail_id}'
                       AND c_order_id='${cmodetail.recordset[i].c_order_id}'
                       AND week_number = 2`;
                       
                await request.query(SqlUpdateOrderDetail);

              }

            } else if (transform == 3 && (schedule_3!=undefined || schedule_3)) {
              let cmodetail = await request.query(`SELECT a.*,b.c_order_id FROM cmo_detail a,c_orderdetail b
              WHERE a.cmo_id = '${cmo_id}'
              AND a.cmo_detail_id = '${details[i].cmo_detail_id}'
              AND b.qty > 0
              AND a.cmo_detail_id = b.cmo_detail_id
              AND b.week_number=3`)
              

              let sqlUpdateOrder = `UPDATE c_order
                     SET tonase=${tonase_3}, kubikasi=${kubikasi_3}
                     WHERE cmo_id='${cmo_id}' AND week_number=3`;
              await request.query(sqlUpdateOrder);


              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let total_order = parseFloat(cmodetail.recordset[i].harga) * parseFloat(cmodetail.recordset[i].qty_order_3)

                let SqlUpdateOrderDetail = `
                       UPDATE c_orderdetail
                       SET qty=${cmodetail.recordset[i].qty_order_3},
                       harga=${cmodetail.recordset[i].harga},
                       total_order=${total_order}
                       WHERE cmo_detail_id='${cmodetail.recordset[i].cmo_detail_id}'
                       AND c_order_id='${cmodetail.recordset[i].c_order_id}'
                       AND week_number = 3`;
                await request.query(SqlUpdateOrderDetail);

              }

         

            } else if (transform == 4 && (schedule_4!=undefined || schedule_4)) {

              let cmodetail = await request.query(`SELECT a.*,b.c_order_id FROM cmo_detail a,c_orderdetail b
              WHERE a.cmo_id = '${cmo_id}'
              AND a.cmo_detail_id = '${details[i].cmo_detail_id}'
              AND  b.qty > 0
              AND a.cmo_detail_id = b.cmo_detail_id
              AND b.week_number=4`)

              let sqlUpdateOrder = `UPDATE c_order
                     SET tonase=${tonase_4}, kubikasi=${kubikasi_4}
                     WHERE cmo_id='${cmo_id}' AND week_number=4`;

              await request.query(sqlUpdateOrder);


              for (let i = 0; i < cmodetail.recordset.length; i++) {

                let total_order = parseFloat(cmodetail.recordset[i].harga) * parseFloat(cmodetail.recordset[i].qty_order_4)

                let SqlUpdateOrderDetail = `
                       UPDATE c_orderdetail
                       SET qty=${cmodetail.recordset[i].qty_order_4},
                       harga=${cmodetail.recordset[i].harga},
                       total_order=${total_order}
                       WHERE cmo_detail_id='${cmodetail.recordset[i].cmo_detail_id}'
                       AND c_order_id='${cmodetail.recordset[i].c_order_id}'
                       AND week_number = 4`;

                await request.query(SqlUpdateOrderDetail);

              }


            }

          }


        }

      }

      let audit_cmo_id = uuid();
      await request.query(`INSERT INTO audit_cmo
      (audit_cmo_id,createdby,updatedby, cmo_id, 
        m_user_id, actions, status)
      VALUES('${audit_cmo_id}','${m_user_id}',
      '${m_user_id}','${cmo_id}', '${m_user_id}',
      'Direvisi',
      'Waiting ASM')`);

      await request.query(`
      UPDATE cmo SET status = 'Waiting RSM',flow=2
      WHERE cmo_id = '${cmo_id}'`);

      return res.success({
        data: details,
        message: "Update data successfully"
      });
    } catch (err) {
      return res.error(err);
    }

  },

  reject: async function (req, res) {
    const {cmo_id,m_user_id,reason} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();


      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      let url = ``;
      if(statusIntegasi=='DEV'){
    
        url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_soweek/120/zws_cmo_soweek/zbn_cmo_soweek'; // development
          
      }else{
    
        url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_soweek/300/zws_cmo_soweek/zbn_cmo_soweek'; // production
    
      }

      let getdatacmo = await request.query(`SELECT m_distributor_id,status
      FROM cmo 
      WHERE cmo_id = '${cmo_id}'`);
      let m_distributor_id = getdatacmo.recordset.length > 0 ? getdatacmo.recordset[0].m_distributor_id : null;
      let status = getdatacmo.recordset.length > 0 ? getdatacmo.recordset[0].status : null;

      console.log('m_distributor_id ',m_distributor_id);

      let dataemail = []
      if(m_distributor_id){

        let getorg = await request.query(`SELECT mdv.r_organisasi_id
        FROM m_distributor_v mdv 
        WHERE mdv.m_distributor_id = '${m_distributor_id}'`);
        let r_organisasi_id = getorg.recordset.length > 0 ? getorg.recordset[0].r_organisasi_id : 'KOSONG';


        let emailcase = await request.query(`SELECT email_verifikasi FROM m_distributor_profile_v mdpv 
        WHERE r_organisasi_id='${r_organisasi_id}' AND rolename IN('RSDH','ASDH')`);


        let emailcase2 = await request.query(`SELECT email_verifikasi FROM email_distributor 
        WHERE m_distributor_id = '${m_distributor_id}' and tipe = 'CMO' group by email_verifikasi`);


        let getdataemail = await request.query(`
       SELECT DISTINCT mu.email_verifikasi 
       FROM audit_cmo ac,m_user mu 
       WHERE ac.m_user_id = mu.m_user_id 
       AND ac.m_user_id <> '${m_user_id}' AND mu.email_verifikasi IS NOT NULL
       AND cmo_id='${cmo_id}'`);
 
       if( getdataemail.recordset.length > 0){
         for (let i = 0; i < getdataemail.recordset.length; i++) {
         
           dataemail.push(getdataemail.recordset[i].email_verifikasi);
         
         }
       }

       if( emailcase.recordset.length > 0){
        for (let i = 0; i < emailcase.recordset.length; i++) {
        
          dataemail.push(emailcase.recordset[i].email_verifikasi);
        
        }
      }

      if( emailcase2.recordset.length > 0){
        for (let i = 0; i < emailcase2.recordset.length; i++) {
        
          dataemail.push(emailcase2.recordset[i].email_verifikasi);
        
        }
      }

      dataemail = _.uniq(dataemail);
      console.log(dataemail.toString());


      }

        let audit_cmo_id = uuid();
        let statusReject = '';
        if(status == 'Waiting ASM'){
          statusReject = 'ASM'
        }else if(status == 'Waiting RSM'){
          statusReject = 'RSM'
        }else if(status == 'Waiting Sales Head'){
          statusReject = 'SALES HEAD'
        }else if(status == 'Waiting DPD'){
          statusReject = 'DPD'
        }else{
          statusReject = 'Distributor'
        }

      
        let sqlAuditCmo = `INSERT INTO audit_cmo
        (audit_cmo_id,createdby,updatedby, cmo_id, 
        m_user_id, actions, status)
        VALUES('${audit_cmo_id}','${m_user_id}',
        '${m_user_id}','${cmo_id}', '${m_user_id}',
        'Direject',
        'Direject ${statusReject}')`;

        console.log(sqlAuditCmo);


       await request.query(sqlAuditCmo);


      

       let getcmo = await request.query(`SELECT mdv.r_organisasi_id,c.flow + 1 AS flow,
       c.nomor_cmo,c.bulan,c.tahun,mdv.region,
       c.schedule_1,c.schedule_2,c.schedule_3,c.schedule_4,
       (COALESCE(c.tonase_1,0) + COALESCE(c.tonase_2,0) + COALESCE(c.tonase_3,0) + COALESCE(c.tonase_4,0)) AS totalTonase,
       mdv.nama AS usernama
       FROM cmo c,m_distributor_v mdv 
       WHERE c.cmo_id = '${cmo_id}'
       AND mdv.m_distributor_id = c.m_distributor_id`);

      //  let getcmo = await request.query(`SELECT nomor_cmo,bulan,tahun,schedule_1,
      //  schedule_2,schedule_3,schedule_4 FROM cmo WHERE cmo_id = '${cmo_id}'`);
       let nomor_cmo = getcmo.recordset.length > 0 ? getcmo.recordset[0].nomor_cmo : null;
       let bulan = getcmo.recordset.length > 0 ? getcmo.recordset[0].bulan : null;
       let tahun = getcmo.recordset.length > 0 ? getcmo.recordset[0].tahun : null;
       let totalTonase = getcmo.recordset.length > 0 ? getcmo.recordset[0].totalTonase : null;
       let usernama = getcmo.recordset.length > 0 ? getcmo.recordset[0].usernama : null;
       let region = getcmo.recordset.length > 0 ? getcmo.recordset[0].region: null;
       let schedule_1 = getcmo.recordset.length > 0 ? getcmo.recordset[0].schedule_1 : null;
       let schedule_2 = getcmo.recordset.length > 0 ? getcmo.recordset[0].schedule_2 : null;
       let schedule_3 = getcmo.recordset.length > 0 ? getcmo.recordset[0].schedule_3 : null;
       let schedule_4 = getcmo.recordset.length > 0 ? getcmo.recordset[0].schedule_4 : null;

       let alasan = ``;
       if(reason){
        alasan = `dengan alasan : ${reason}`;
       }


       if(dataemail.length > 0 && nomor_cmo){

        let sqlgetSummaryBrand = `SELECT DISTINCT co.cmo_id,
        mp.kode_brand,mp.brand,uom.nama AS satuan,
        CASE WHEN sov1.schedule_date IS NOT NULL THEN sov1.schedule_date ELSE NULL END AS schedule_date1,
        CASE WHEN sov1.quantity IS NOT NULL THEN sov1.quantity ELSE 0 END AS qty1,
        CASE WHEN sov1.amount IS NOT NULL THEN sov1.amount ELSE 0 END AS amount1,
        CASE WHEN sov2.schedule_date IS NOT NULL THEN sov2.schedule_date ELSE NULL END AS schedule_date2,
        CASE WHEN sov2.quantity IS NOT NULL THEN sov2.quantity ELSE 0 END AS qty2,
        CASE WHEN sov2.amount IS NOT NULL THEN sov2.amount ELSE 0 END AS amount2,
        CASE WHEN sov3.schedule_date IS NOT NULL THEN sov3.schedule_date ELSE NULL END AS schedule_date3,
        CASE WHEN sov3.quantity IS NOT NULL THEN sov3.quantity ELSE 0 END AS qty3,
        CASE WHEN sov3.amount IS NOT NULL THEN sov3.amount ELSE 0 END AS amount3,
        CASE WHEN sov4.schedule_date IS NOT NULL THEN sov4.schedule_date ELSE NULL END AS schedule_date4,
        CASE WHEN sov4.quantity IS NOT NULL THEN sov4.quantity ELSE 0 END AS qty4,
        CASE WHEN sov4.amount IS NOT NULL THEN sov4.amount ELSE 0 END AS amount4
        FROM c_order co,c_orderdetail cod
        LEFT JOIN r_uom uom ON(uom.r_uom_id = cod.r_uom_id),
        m_produk mp 
        LEFT JOIN summary_order1_v sov1 ON(sov1.kode_brand = mp.kode_brand AND sov1.cmo_id = '${cmo_id}')
        LEFT JOIN summary_order2_v sov2 ON(sov2.kode_brand = mp.kode_brand AND sov2.cmo_id = '${cmo_id}')
        LEFT JOIN summary_order3_v sov3 ON(sov3.kode_brand = mp.kode_brand AND sov3.cmo_id = '${cmo_id}')
        LEFT JOIN summary_order4_v sov4 ON(sov4.kode_brand = mp.kode_brand AND sov4.cmo_id = '${cmo_id}')
        WHERE 
        co.cmo_id = '${cmo_id}'
        AND co.c_order_id = cod.c_order_id
        AND cod.m_produk_id = mp.m_produk_id
        AND co.isactive = 'Y'
        AND cod.qty > 0
        GROUP BY co.cmo_id,mp.kode_brand,mp.brand,
        sov1.schedule_date,sov1.quantity,sov1.amount,
        sov2.schedule_date,sov2.quantity,sov2.amount,
        sov3.schedule_date,sov3.quantity,sov3.amount,
        sov4.schedule_date,sov4.quantity,sov4.amount,
        uom.nama`;

        let getsummaryorder = await request.query(sqlgetSummaryBrand);
        let totalAmountAll = 0;

        for (let i = 0; i < getsummaryorder.recordset.length; i++) {
        
          totalAmountAll = totalAmountAll + getsummaryorder.recordset[i].amount1 + 
          getsummaryorder.recordset[i].amount2 + 
          getsummaryorder.recordset[i].amount3 + 
          getsummaryorder.recordset[i].amount4;
          
        }

        const amount = numeral(totalAmountAll).format('0,0').replace(/,/g, '.');
        const bulannya =  moment(bulan,'MM').format('MMMM') 
        totalTonase = Math.round(totalTonase);
        
        
        const param = {
          
          subject: `CMO ditolak oleh ${statusReject} ${alasan}`,
          distributor:usernama,
          nocmo:nomor_cmo,
          region:region,
          bulan:bulannya.concat('-').concat(tahun),
          minggu1:schedule_1 ? moment(schedule_1,'YYYY-MM-DDTHH:mm:ss.SSS').format('YYYY-MM-DD') : 'Tidak ada order',
          minggu2:schedule_2 ? moment(schedule_2,'YYYY-MM-DDTHH:mm:ss.SSS').format('YYYY-MM-DD') : 'Tidak ada order',
          minggu3:schedule_3 ? moment(schedule_3,'YYYY-MM-DDTHH:mm:ss.SSS').format('YYYY-MM-DD') : 'Tidak ada order',
          minggu4:schedule_4 ? moment(schedule_4,'YYYY-MM-DDTHH:mm:ss.SSS').format('YYYY-MM-DD') : 'Tidak ada order',
          totalbruto:`Rp. ${amount}`,
          totaltonase:`${totalTonase} Kg`,
          status:`Reject ${statusReject}`

        }
        // dataemail.push("indra.suandi@enesis.com")
        const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'cmotemplate', templateparam: param }); 

        if(statusIntegasi=='DEV'){
      
          dataemail = [];
          dataemail.push('tiasadeputra@gmail.com'); // development
            
        }

        SendEmail(dataemail.toString(), param.subject, template, (async (err, info) => {
          if (err) {
            console.log('error', err);
            await request.query(`INSERT INTO log_email
            (createdby, updatedby,proses,accepted,rejected,envelope, response)
            VALUES('${m_user_id}','${m_user_id}', 'Error Email','${err}',
            '${err}','${err}','${err}')`);
          } else {
            console.log('info', info);
            let from = info.envelope.from;
            let to = info.envelope.to.toString();
            let envelope = from.concat(' send to ').concat(to);
            let combine = envelope.concat(to);
            await request.query(`INSERT INTO log_email
            (createdby, updatedby,proses,accepted,rejected,envelope, response,cmo_id)
            VALUES('${m_user_id}','${m_user_id}', 'Reject CMO','${info.accepted.toString()}',
            '${info.rejected.toString()}','${combine}','${info.response}','${cmo_id}')`);
          }
        }));

      }


      if(statusReject=='Distributor'){

        await request.query(`UPDATE cmo 
        SET status='Direject ${statusReject}',
        flow=0,isactive ='N' WHERE cmo_id = '${cmo_id}'`);
  
      }else{
        await request.query(`UPDATE cmo 
        SET status='Direject ${statusReject}',
        flow=0 WHERE cmo_id = '${cmo_id}'`);
  
      }


      return res.success({
        message: "Reject data successfully"
      });
    } catch (err) {
      return res.error(err);
    }

  },
  getPromo: async function (req, res) {
    const {m_user_id,awal,akhir} = req.body;
    // console.log(m_user_id,"xxxxxxxxxxxxxxxxxxx");
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sqlGetUser = `SELECT *,b.nama as role FROM m_user a
      left join m_role b on b.m_role_id = a.role_default_id
      WHERE m_user_id = '${m_user_id}'`;
      // console.log(sqlGetUser);

      let datausers = await request.query(sqlGetUser);
      let rolenama = datausers.recordset[0].role;


      let sel = ``;
      if(awal && akhir){
        sel = `select * FROM promo where 
        convert(varchar(6),getdate(),112) >= convert(varchar(6),${awal},112)
        and convert(varchar(6),getdate(),112) <= convert(varchar(6),${akhir},112)`;
      }else{
        sel = `select * FROM promo  
        where convert(varchar(8),getdate(),112) >= convert(varchar(8),period_start,112)
        and convert(varchar(8),getdate(),112) <= convert(varchar(8),period_end,112)
        and isactive = 1`;
        // sel = `select * FROM promo `;
      }

      if(rolenama == "DPD"){
          return res.success({
              error : "true",
              result: null,
              message: "Gagal ...."
          });
      }
      
      let dts = await request.query(sel)
      dts = dts.recordset
      if(dts.length > 0){
        console.log("ada..2");
        return res.success({
            error : "false",
            result: dts,
            message: "Berhasil ...."
        });
      }else{
        return res.success({
            error : "true",
            result: null,
            message: "Gagal ...."
        });
      }
    }catch(err){
      return res.success({
          error : "true",
          result: null,
          message: "Gagal ...."
      });
    }
  },
  edit: async function (req, res) {
    const {cmo_id,details} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlgetSummaryBrand = `SELECT c.cmo_id,cd.cmo_detail_id,
      mp.kode_brand,
      mp.brand,mp.satuan,
      c.schedule_1 AS schedule_date1,
      cd.qty_order_1 AS qty1,
      (cd.qty_order_1 * cd.harga) amount1,
      c.schedule_2 AS schedule_date2,
      cd.qty_order_2 AS qty2,
      (cd.qty_order_2 * cd.harga) amount2,
      c.schedule_3 AS schedule_date3,
      cd.qty_order_3 AS qty3,
      (cd.qty_order_3 * cd.harga) amount3,
      c.schedule_4 AS schedule_date4,
      cd.qty_order_4 AS qty4,
      (cd.qty_order_4 * cd.harga) amount4,
      harga
      FROM cmo c,cmo_detail cd,m_produk mp 
      WHERE c.cmo_id = '${cmo_id}'
      AND c.cmo_id = cd.cmo_id
      AND cd.m_produk_id = mp.m_produk_id`;

      let getsummaryorder = await request.query(sqlgetSummaryBrand);
      let datasummary = getsummaryorder.recordset;
      
      for (let i = 0; i < datasummary.length; i++) {

            for (let j = 0; j < details.length; j++) {
              
                let cmo_detail_id = details[j].cmo_detail_id;

                if(datasummary[i].cmo_detail_id==cmo_detail_id){
                    
                    let qty1 = details[j].qty_order_1 ? details[j].qty_order_1 : 0;
                    let qty2 = details[j].qty_order_2 ? details[j].qty_order_2 : 0;
                    let qty3 = details[j].qty_order_3 ? details[j].qty_order_3 : 0;
                    let qty4 = details[j].qty_order_4 ? details[j].qty_order_4 : 0;                    
    
                    let amount1 = details[j].qty_order_1 * datasummary[i].harga;
                    let amount2 = details[j].qty_order_2 * datasummary[i].harga;
                    let amount3 = details[j].qty_order_3 * datasummary[i].harga;
                    let amount4 = details[j].qty_order_4 * datasummary[i].harga;

                    datasummary[i].qty1 = qty1;
                    datasummary[i].qty2 = qty2;
                    datasummary[i].qty3 = qty3;
                    datasummary[i].qty4 = qty4;


                    datasummary[i].amount1 = amount1;
                    datasummary[i].amount2 = amount2;
                    datasummary[i].amount3 = amount3;
                    datasummary[i].amount4 = amount4;



                    datasummary[i].totalQuantity = qty1 + qty2 + qty3 + qty4;
                    datasummary[i].totalAmount = amount1 + amount2 + amount3 + amount4;

                }

                datasummary[i].totalQuantity = datasummary[i].qty1 + datasummary[i].qty2 + datasummary[i].qty3 + datasummary[i].qty4;
                datasummary[i].totalAmount = datasummary[i].amount1 + datasummary[i].amount2 + datasummary[i].amount3 + datasummary[i].amount4;
              
            }
            
            delete datasummary[i].cmo_detail_id;
            delete datasummary[i].harga;



      }

      var helper = {};
      var result = datasummary.reduce(function(r, o) {
      var key = o.cmo_id + '-' + o.kode_brand + '-' + o.brand + '-' + o.satuan + '-' + o.schedule_date1 + '-' + o.schedule_date2 + '-' + o.schedule_date3 + '-' + o.schedule_date4;
        
        if(!helper[key]) {
          helper[key] = Object.assign({}, o); // create a copy of o
          r.push(helper[key]);
        } else {
          helper[key].qty1 += o.qty1;
          helper[key].amount1 += o.amount1;
          helper[key].qty2 += o.qty2;
          helper[key].amount2 += o.amount2;
          helper[key].qty3 += o.qty3;
          helper[key].amount3 += o.amount3;
          helper[key].qty4 += o.qty4;
          helper[key].amount4 += o.amount4;
          helper[key].totalQuantity += o.totalQuantity;
          helper[key].totalAmount += o.totalAmount;
        }
      
        return r;
      }, []);
      


      let totalQuantity1 = 0;
      let totalQuantity2 = 0;
      let totalQuantity3 = 0;
      let totalQuantity4 = 0;
  
      let totalAmount1 = 0;
      let totalAmount2 = 0;
      let totalAmount3 = 0;
      let totalAmount4 = 0;
      let totalQuantityAll = 0;
      let totalAmountAll = 0;

      for (let i = 0; i < result.length; i++) {
        
          totalQuantity1 = totalQuantity1 + result[i].qty1;
          totalQuantity2 = totalQuantity2 + result[i].qty2;
          totalQuantity3 = totalQuantity3 + result[i].qty3;
          totalQuantity4 = totalQuantity4 + result[i].qty4;

          totalAmount1 = totalAmount1 + result[i].amount1;
          totalAmount2 = totalAmount2 + result[i].amount2;
          totalAmount3 = totalAmount3 + result[i].amount3;
          totalAmount4 = totalAmount4 + result[i].amount4;

          totalQuantityAll = totalQuantityAll + result[i].qty1 + result[i].qty2 + result[i].qty3 + result[i].qty4;
          totalAmountAll =  totalAmountAll + result[i].amount1 + result[i].amount2 + result[i].amount3 + result[i].amount4;
        
      }




      let obj = {
        datasummary:result,
        totalQuantity1:totalQuantity1,
        totalQuantity2:totalQuantity2,
        totalQuantity3:totalQuantity3,
        totalQuantity4:totalQuantity4,
        totalAmount1:totalAmount1,
        totalAmount2:totalAmount2,
        totalAmount3:totalAmount3,
        totalAmount4:totalAmount4,
        totalQuantityAll:totalQuantityAll,
        totalAmountAll:totalAmountAll,
        totalBruto:totalAmountAll
      }
     
      return res.success({
        data: obj
      });
    } catch (err) {
      return res.error(err);
    }
  },
  showimage: async function(req, res) {
    //   const user = req.param('user')
      const record = req.param('record')
      const filename = req.param('filename')
      // console.log("ccc");

      // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('promo', record), filename + '*'))
      if (filesamaDir.found.length > 0) {

          // return res.send(filesamaDir.found[0]);
          // return res.success('OK');
          var lastItemAkaFilename = path.basename(filesamaDir.found[0])
          // return res.download(filesamaDir.found[0], lastItemAkaFilename)
          return res.sendFile(filesamaDir.found[0])
      }
      return res.error('Failed, File Not Found');
  },
  showFile: async function(req, res) {
    //   const user = req.param('user')
      const record = req.param('record')
      const filename = req.param('filename')
      console.log("filepromo/"+record+"/"+filename);

      // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('filepromo', record), filename + '*'))
      if (filesamaDir.found.length > 0) {
          console.log(filesamaDir.found[0]);
          // return res.send(filesamaDir.found[0]);
          // return res.success('OK');
          var lastItemAkaFilename = path.basename(filesamaDir.found[0])
          // return res.download(filesamaDir.found[0], lastItemAkaFilename)
          return res.sendFile(filesamaDir.found[0])
      }
      return res.error('Failed, File Not Found');
  },
  getTemplatefile: async function(req, res) { 
    const filename = req.param('filename')
    console.log('te', filename)
    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(path.resolve(templatePath(), filename + '*'))
    if (filesamaDir.found.length > 0) {
        //console.log(filesamaDir.found[0])

        // return res.send(filesamaDir.found[0]);
        // return res.success('OK');
        var lastItemAkaFilename = path.basename(filesamaDir.found[0])
        return res.download(filesamaDir.found[0], lastItemAkaFilename)
    }
    return res.error('Failed, File Not Found');
},
edititemcmo : async function(req, res){
  const {cmo_id,cmo_detail_id,m_produk_id_old,m_product_change,weekbefore,weekbeafter,tglkirim
  ,w1,w2,w3,w4
  } = req.body;
  let id = uuid();
  //console.log("masuk edit",req.body);
  try {
    const request = DB.pool.request();

    // cek so week disini
    let cekstatus = `select * from cmo where cmo_id = '${cmo_id}'`;
    let dt_statuscmo = await request.query(cekstatus);
    let ds_statuscmo = dt_statuscmo.recordset;

    
    let status_cmo = ds_statuscmo.length > 0 ? ds_statuscmo[0].flow : 0 ;
    let nomor_cmo_sap = ds_statuscmo.length > 0 ? ds_statuscmo[0].no_sap : '' ;
    let nomor_cmo_esales = ds_statuscmo.length > 0 ? ds_statuscmo[0].nomor_cmo : '' ;
    let m_distributor_id = ds_statuscmo.length > 0 ? ds_statuscmo[0].m_distributor_id : '' ;
    let nomor_sap = ds_statuscmo.length > 0 ? ds_statuscmo[0].no_sap : 'WAITING' ;

    let cek = ``;
    let cek_produklama = ``;

    //cek nomor cmo apakah sudah terbentuk

    let sqlcekstatuscmo = `SELECT COUNT(1) AS statusnomorcmo FROM cmo 
    WHERE no_sap NOT IN ('WAITING') AND no_sap IS NOT NULL AND cmo_id = '${cmo_id}'`;
    let datacekstatuscmo = await request.query(sqlcekstatuscmo);
    console.log(datacekstatuscmo);
    let statusnomorcmo = datacekstatuscmo.recordset[0].statusnomorcmo;


    if(statusnomorcmo==0){
      console.log('ya sudah masuk sini');
      return res.success({
        error : `true`,
        message: `Nomor CMO ${nomor_sap} Belum Ready Pastikan Ready terlebih dahulu`
      });
    }else{

              if(weekbefore !== "0"){
                cek = `select count(*) jml from c_order where cmo_id = '${cmo_id}' and week_number = '${weekbefore}' 
                and (nomor_sap is not null or len(nomor_sap) <=4) `;
          
                cek_produklama = `select c.kode_sap,convert(varchar(8),schedule_date,112) schedule_date,
                        qty
                        from c_order a
                        inner join c_orderdetail b on a.c_order_id = b.c_order_id
                        inner join m_produk c on c.m_produk_id = b.m_produk_id
                        where a.cmo_id = '${cmo_id}' 
                        and b.m_produk_id = '${m_produk_id_old}' and a.week_number = ${weekbefore}`;
              }else{
                cek = `select count(*) jml from c_order where cmo_id = '${cmo_id}' 
                and (nomor_sap is not null or len(nomor_sap) <=4) `;
          
                cek_produklama = `select c.kode_sap,convert(varchar(8),schedule_date,112) schedule_date,
                        qty
                        from c_order a
                        inner join c_orderdetail b on a.c_order_id = b.c_order_id
                        inner join m_produk c on c.m_produk_id = b.m_produk_id
                        where a.cmo_id = '${cmo_id}' 
                        and b.m_produk_id = '${m_produk_id_old}'`;
              }

              
              let dt_prod_lama = await request.query(cek_produklama);
              let ds_prod_lama = dt_prod_lama.recordset
              let kode_lama = ds_prod_lama[0].kode_sap;
              let schedule_lama = ds_prod_lama[0].schedule_date;
              let qty_lama = ds_prod_lama[0].qty;

              let rescek = await request.query(cek);

              if(rescek.recordset[0].jml > 0){
                return res.success({
                  error : `true`,
                  message: `Sudah terbentuk nomor SO tidak bisa lagi di proses ....`
                });
              }else{
          
          
                    let cekItem = `select * from m_produk where kode_sap = '${m_product_change}'`;
                    // console.log(cekItem);
                    let resp = await request.query(cekItem);
                    let resdata = resp.recordset;
                    if(resdata.length > 0){
          
                      console.log("masuk x");
                      let m_produk_id = resdata[0].m_produk_id;
                      let kode_sap = resdata[0].kode_sap;
                      let nama_produk = resdata[0].nama;
          
                      let cekchannel = `select r_distribution_channel_id from cmo where cmo_id = '${cmo_id}'`;
                      let respchannel = await request.query(cekchannel);
                      let datachannel = respchannel.recordset;
                      let channel = datachannel[0].r_distribution_channel_id;
          
                      //let cekharga = `select * from m_pricelist where kode = '${m_product_change}' and r_distribution_channel_id = '${channel}'`;
                      let cekharga = `SELECT TOP 1 *,gross AS harga,nett AS price FROM m_pricelist_grossnet WHERE m_distributor_id ='${m_distributor_id}' and kode = '${m_product_change}'`;
                      let rest = await request.query(cekharga);
                      let harga = 0;
                      if(rest.recordset.length > 0){
                        harga = rest.recordset[0].harga;
                      }
                      console.log(status_cmo);
                      if(status_cmo == "4"){
                          // let objitab = [];
                          console.log(nomor_cmo_sap,nomor_cmo_esales,kode_lama,qty_lama,schedule_lama,m_product_change);
                          datas = [];
                          datas.push({
                              MANDT : "",
                              CMO : nomor_cmo_sap,
                              NO_CMO: "",
                              BSTKD: nomor_cmo_esales,
                              AUART: "",
                              VTWEG: "",
                              SPART: "",
                              KUNNR: "",
                              KUNSH: "",
                              GUEBG: "",
                              GUEEN: "",
                              MATNR: kode_lama,
                              SKU: "",
                              WMENG: qty_lama.toString(),
                              VRKME: "",
                              EDATU: schedule_lama,
                              STOKA: "",
                              DOI: "",
                              M1: "",
                              M2: "",
                              VBELN: "",
                              SMATN: m_product_change,
                              WEEK1: weekbefore
                          })
                          let statusCode = ''
                          let hasilxml = await requestSAP(datas,id);
                          try {
                            let remotePath = '/home/sapftp/esales/cmo/change/'+`${id}.xml`;
                            let locationFiles = dokumentPath('SO_Change','request').replace(/\\/g, '/');
                            let dst = dokumentPath('SO_Change','request') + '/' +`${id}.xml`;
                            let localPath = dst.replace(/\\/g, '/');
                            shell.mkdir('-p', locationFiles);
                            console.log(locationFiles+"/"+`${id}.xml`);
                            fs.writeFile(locationFiles+"/"+`${id}.xml`, hasilxml,async function (err) {
                              if (err) 
                              return err;
                              await sftp.connect(ftpconfig)
                              .then(() => {
                                return sftp.fastPut(localPath,remotePath);
                              })
                              .then(() => {
                                sftp.end();
                              })
                              .catch(err => {
                                console.error(err.message);
                              });
                        
                            })
                          } catch (error) {
                            console.log(error);
                            return res.success({
                              error : `true`,
                              message: `Gagal update di SAP ...`
                            });
                          }
          
                          let insertlog = `insert into log_change_so (log_id,created,m_user_id,request)
                          values ('${id}',getdate(),'','${hasilxml}')`;
                          
                          console.log(insertlog);
                          await request.query(insertlog);
                          statusCode = `I`;
                          // statusCode = await requestSAP(datas,id);
                          console.log(statusCode,"xxxx");
                          let obj = {
                            m_produk_id : m_produk_id,
                            nama : nama_produk,
                            kode : resdata[0].kode,
                            isactive : resdata[0].isactive,
                            tonase : resdata[0].tonase,
                            kubikasi : resdata[0].kubikasi,
                            satuan :resdata[0].satuan
                          };
                          if(statusCode == "I"){
                            console.log("berhasil responess");
                              let cekeksis = `select * from cmo_detail where cmo_id = '${cmo_id}' and m_produk_id = '${m_produk_id}'`
                              
                              let ds_cekeksis = await request.query(cekeksis);
                              let updateitem = ``;
                              let update_c_order = ``;
                              if(ds_cekeksis.recordset.length > 0){
                                
                                updateitem = `exec sp_ubah_material_cmo '${cmo_id}','${m_produk_id_old}','${m_produk_id}'` ;
                                console.log(updateitem);
                                update_c_order = `select '1' `;
          
                                request.query(updateitem, async (err, result) => {
                                  if (err) {
                                    return res.error(err);
                                  }
          
                                  return res.success({
                                    message: "Berhasil diubah...",
                                    data : obj
                                  });
                              });
                              }else{
                                  updateitem = `update cmo_detail set m_produk_id = '${m_produk_id}', harga = '${harga}' where cmo_detail_id = '${cmo_detail_id}' 
                                      and cmo_id = '${cmo_id}' and m_produk_id = '${m_produk_id_old}'`;
          
                                  update_c_order = `update b set b.m_produk_id = '${m_produk_id}' , b.harga = '${harga}' , total_order = qty * ${harga}
                                                    from c_order a
                                                    inner join c_orderdetail b on a.c_order_id = b.c_order_id
                                                    where a.cmo_id = '${cmo_id}' and (b.cmo_detail_id = '${cmo_detail_id}' or m_produk_id = '${m_produk_id_old}')`
          
                                  // console.log(updateitem);
                                  request.query(updateitem, async (err, result) => {
                                      if (err) {
                                        return res.error(err);
                                      }
                                      await request.query(update_c_order);
                                      return res.success({
                                        message: "Berhasil diubah...",
                                        data : obj
                                      });
                                  });
                              }
                          }else{
                                return res.success({
                                  error : `true`,
                                  message: `E : Gagal update di SAP ...`
                                });
                          }
                      }else{
                        let cekeksis = `select * from cmo_detail where cmo_id = '${cmo_id}' and m_produk_id = '${m_produk_id}'`
                        let ds_cekeksis = await request.query(cekeksis);
                        let updateitem = ``;
                        let update_c_order = ``;
                        if(ds_cekeksis.recordset.length > 0){
                          
                          updateitem = `exec sp_ubah_material_cmo '${cmo_id}','${m_produk_id_old}','${m_produk_id}'` ;
                          console.log(updateitem);
                          update_c_order = `select '1' `;
                        }else{
                          updateitem = `update cmo_detail set m_produk_id = '${m_produk_id}', harga = '${harga}' where cmo_detail_id = '${cmo_detail_id}' 
                          and cmo_id = '${cmo_id}' and m_produk_id = '${m_produk_id_old}'`;
          
                          update_c_order = `update b set b.m_produk_id = '${m_produk_id}' , b.harga = '${harga}' , total_order = qty * ${harga}
                                            from c_order a
                                            inner join c_orderdetail b on a.c_order_id = b.c_order_id
                                            where a.cmo_id = '${cmo_id}' and (b.cmo_detail_id = '${cmo_detail_id}' or m_produk_id = '${m_produk_id_old}')`
                                            await request.query(updateitem);
          
                        }
                          let obj = {
                            m_produk_id : m_produk_id,
                            nama : nama_produk,
                            kode : resdata[0].kode,
                            isactive : resdata[0].isactive,
                            tonase : resdata[0].tonase,
                            kubikasi : resdata[0].kubikasi,
                            satuan :resdata[0].satuan
                          };
          
                          // console.log(updateitem);
                          request.query(updateitem, async (err, result) => {
                              if (err) {
                                return res.error(err);
                              }
                              await request.query(update_c_order);
                              return res.success({
                                message: "Berhasil diubah...",
                                data : obj
                              });
                          });
                      }
          
                    }else{
                      if(tglkirim){
                        console.log("disini.......");
                        let cekold = `select * from m_produk where m_produk_id = '${m_produk_id_old}'`
                        let ds = await request.query(cekold)
                        let resdata = ds.recordset;
                        let m_produk_id = resdata[0].m_produk_id;
                        let nama_produk = resdata[0].nama;
          
          
                        // console.log(tglkirim,"masuk sini...",m_produk_id,nama_produk);
          
                        let update_cmo_detail = `exec sp_ganti_schedule_cmo '${cmo_id}','${m_produk_id_old}','${weekbefore}','${weekbeafter}','${tglkirim}','${cmo_detail_id}'`
                        // console.log(update_cmo_detail);
                        
                        let obj = {
                          m_produk_id : m_produk_id,
                          nama : nama_produk,
                          kode : resdata[0].kode,
                          isactive : resdata[0].isactive,
                          tonase : resdata[0].tonase,
                          kubikasi : resdata[0].kubikasi,
                          satuan :resdata[0].satuan
                        };
          
                        if(status_cmo == "4"){
                                    console.log("oke... schedule aja");
                                    datas = [];
                                    datas.push({
                                        MANDT : "",
                                        CMO : nomor_cmo_sap,
                                        NO_CMO: "",
                                        BSTKD: nomor_cmo_esales,
                                        AUART: "",
                                        VTWEG: "",
                                        SPART: "",
                                        KUNNR: "",
                                        KUNSH: "",
                                        GUEBG: "",
                                        GUEEN: "",
                                        MATNR: kode_lama,
                                        SKU: "",
                                        WMENG: "0",
                                        VRKME: "",
                                        EDATU: schedule_lama,
                                        STOKA: "",
                                        DOI: "",
                                        M1: "",
                                        M2: "",
                                        VBELN: "",
                                        SMATN: "",
                                        WEEK1: weekbefore
                                    })
          
          
                                    let qtyawal = 0;
                                    let qtyakhir = 0;
                                    let finalqty = 0;
                                    if(weekbefore == "1"){
                                      qtyawal = w1;
                                    }else if(weekbefore == "2"){
                                      qtyawal = w2;
                                    }else if(weekbefore == "3"){
                                      qtyawal = w3;
                                    }else if(weekbefore == "4"){
                                      qtyawal = w4;
                                    }
          
                                    if(weekbeafter == "1"){
                                      qtyakhir = w1;
                                    }else if(weekbeafter == "2"){
                                      qtyakhir = w2;
                                    }else if(weekbeafter == "3"){
                                      qtyakhir = w3;
                                    }else if(weekbeafter == "4"){
                                      qtyakhir = w4;
                                    }
                                    finalqty = qtyawal + qtyakhir;
                                    
          
                                    datas.push({
                                      MANDT : "",
                                      CMO : nomor_cmo_sap,
                                      NO_CMO: "",
                                      BSTKD: nomor_cmo_esales,
                                      AUART: "",
                                      VTWEG: "",
                                      SPART: "",
                                      KUNNR: "",
                                      KUNSH: "",
                                      GUEBG: "",
                                      GUEEN: "",
                                      MATNR: kode_lama,
                                      SKU: "",
                                      WMENG: finalqty.toString(),
                                      VRKME: "",
                                      EDATU: replace(replace(tglkirim,'-',''),'-',''),
                                      STOKA: "",
                                      DOI: "",
                                      M1: "",
                                      M2: "",
                                      VBELN: "",
                                      SMATN: "",
                                      WEEK1: weekbeafter
                                  })
                                  let statusCode = ''
                                  console.log(datas);
                                  let hasilxml = await requestSAP(datas,id);
                                  console.log("---");
                                  try {
                                    let remotePath = '/home/sapftp/esales/cmo/change/'+`${id}.xml`;
                                    let locationFiles = dokumentPath('SO_Change','request').replace(/\\/g, '/');
                                    let dst = dokumentPath('SO_Change','request') + '/' +`${id}.xml`;
                                    let localPath = dst.replace(/\\/g, '/');
                                    shell.mkdir('-p', locationFiles);
                                    console.log(locationFiles+"/"+`${id}.xml`);
                                    fs.writeFile(locationFiles+"/"+`${id}.xml`, hasilxml,async function (err) {
                                      if (err) 
                                      return err;
                                      await sftp.connect(ftpconfig)
                                      .then(() => {
                                        return sftp.fastPut(localPath,remotePath);
                                      })
                                      .then(() => {
                                        sftp.end();
                                      })
                                      .catch(err => {
                                        console.error(err.message);
                                      });
                                
                                    })
                                  } catch (error) {
                                    console.log(error);
                                    return res.success({
                                      error : `true`,
                                      message: `Gagal update di SAP ...`
                                    });
                                  }
                                  statusCode = `I`;
                                  try {
                                    let insertlog = `insert into log_change_so (log_id,created,m_user_id,request)
                                    values ('${id}',getdate(),'','${hasilxml}')`;
                                    console.log(insertlog);
                                    await request.query(insertlog);
                                  } catch (error) {
                                    console.log(error);
                                  }
                                  console.log(statusCode, "Respone SAP schedule..........");
                                  statusCode = `I`;
                                  // statusCode = await requestSAP(datas,id);
                                  if(statusCode == "I"){
                                      //console.log(update_cmo_detail);
                                      request.query(update_cmo_detail, async (err, result) => {
                                          if (err) {
                                            return res.error(err);
                                          }
                                          
                                          
                                          return res.success({
                                            message: "Berhasil diubah...",
                                            data : obj
                                          });
                              
                                      })
                                  }else{
                                      return res.success({
                                        error : `true`,
                                        message: `Gagal update di SAP ...`
                                      });
                                  }
                          }else{
                            request.query(update_cmo_detail, async (err, result) => {
                                if (err) {
                                  return res.error(err);
                                }
                                
                              
                                return res.success({
                                  message: "Berhasil diubah...",
                                  data : obj
                                });
                    
                            })
                          }
                      }else{
                        return res.success({
                          error : `true`,
                          message: `Data Tidak dikenali ...`
                        });
                      }
                    }
          
          
              }


    }

  } catch (err) {
      return res.error(err);
  }
},

getExportExcel: async function (req, res) {
  const {
    query: {m_user_id,cmo_id }
  } = req;    

  //console.log(m_user_id);
  try {
    await DB.poolConnect;
    const request = DB.pool.request();
    let queryDataTable = `SELECT cd.cmo_id,cd.cmo_detail_id,cd.m_produk_id,
    cd.r_uom_id,mp.kode AS kode_produk,mp.nama AS nama_produk,
    uom.nama AS satuan,cd.stok_awal,cd.stok_pending,cd.total_stok,
    cd.estimasi_sales_bulan_lalu,
    cd.estimasi_sales_bulan_berjalan,
    cd.stok_akhir,
    cd.buffer_stok,
    cd.avarage_sales_tiga_bulan,
    cd.doi,
    cd.cmo,
    cd.qty_order_1,
    cd.qty_order_2,
    cd.qty_order_3,
    cd.qty_order_4,
    cd.total_order,
    cd.harga,
    cd.bruto,
    cd.estimasi_sales_bulan_depan,
    cd.estimasi_sales_duabulan_kedepan
    FROM cmo_detail cd
    LEFT JOIN m_produk mp ON(cd.m_produk_id=mp.m_produk_id)
    LEFT JOIN r_uom uom ON(uom.r_uom_id=cd.r_uom_id)
    WHERE cmo_id='${cmo_id}' ORDER BY cd.line`;

    // console.log(queryDataTable);
    request.query(queryDataTable, async (err, result) => {
      if (err) {
        return res.error(err);
      }
      const rows = result.recordset;
      let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
        
          let obj = {

            "Kode Product" : rows[i].kode_produk,
            "Product Group" : rows[i].nama_produk,
            "UOM" : rows[i].satuan,
            "Stock Awal Cycle" : rows[i].stok_awal,
            "SP" : rows[i].stok_pending, 
            "Total Stock" : rows[i].total_stok,
            "Est Sales - 1 Month" : rows[i].estimasi_sales_bulan_lalu, 
            "Est Stock Akhir Cycle" : rows[i].stok_akhir,
            "Est Sales" : rows[i].estimasi_sales_bulan_berjalan,
            "Buffer Stock" : rows[i].buffer_stok, 
            "Average Sales 3 Bulan" : rows[i].avarage_sales_tiga_bulan, 
            "DOI Distributor" : rows[i].doi,
            "CMO" : rows[i].cmo, 
            "Order Week 1" : rows[i].qty_order_1,
            "Order Week 2" : rows[i].qty_order_2,
            "Order Week 3" : rows[i].qty_order_3,
            "Order Week 4" : rows[i].qty_order_4,
            "Total Order" : rows[i].total_order, 
            "Harga per cartoon" : rows[i].harga, 
            "Bruto per cartoon" : rows[i].bruto, 
            "Est Sales + 1 Month" : rows[i].estimasi_sales_bulan_depan, 
            "Est Sales + 2 Month" : rows[i].estimasi_sales_duabulan_kedepan

          }

          arraydetailsforexcel.push(obj);

        }


        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'cmo_detail_'.concat(tglfile).concat('.xlsx');          
          
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
}

};



async function requestSAP(datas,uniqid){
  let responekode ;
  let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
  let hasil = racikXML(xml, datas, 'ITAB');
  responekode = hasil;
  return responekode
}

function racikXML(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })
  const result = builder.buildObject(addTemplate)
  

  return xmlTemplate.replace('#', result)
}


function pad(d) {
  var str = "" + d
  var pad = "00000"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}		                      


function checkRole(userRoles, roles) {
  const isTrue = userRoles.some((e) => roles.includes(e.nama));
  return isTrue;
}