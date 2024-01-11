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
// eslint-disable-next-line no-undef
module.exports = {
  find: async function (req, res) {
    const {
      query: { current, pageSize, field, order, searchText, m_user_id }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(current, pageSize);
      // const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";
      // UNTUK ORDER BY
      let orderBy = `ORDER BY created desc`;
      if (order) {
        let orderType = (order === 'ascend') ? 'ASC' : 'DESC';
        orderBy = `ORDER BY ${field} ${orderType}`;
      }

      // UNTUK FILTER SEARCH
      let whereClause = ``;
      if (searchText) {
        whereClause = `WHERE a.isactive='Y' AND a.kategori='CMO' AND a.nomor_cmo LIKE '%${searchText}%'
      OR a.no_sap LIKE '%${searchText}%' OR a.bulan LIKE '%${searchText}%'
      OR a.tahun LIKE '%${searchText}%'
      OR a.schedule_1 LIKE '%${searchText}%' OR a.tonase_1 LIKE '%${searchText}%'
      OR a.kubikasi_1 LIKE '%${searchText}%'
      OR a.schedule_2 LIKE '%${searchText}%' OR a.tonase_2 LIKE '%${searchText}%'
      OR a.kubikasi_2 LIKE '%${searchText}%'
      OR a.schedule_3 LIKE '%${searchText}%' OR a.tonase_3 LIKE '%${searchText}%'
      OR a.kubikasi_3 LIKE '%${searchText}%'
      OR a.schedule_4 LIKE '%${searchText}%' OR a.tonase_4 LIKE '%${searchText}%'
      OR a.kubikasi_4 LIKE '%${searchText}%'
      OR a.status LIKE '%${searchText}%'`;
      }else{

        whereClause = `WHERE a.isactive='Y' AND a.kategori='CMO'`;

      }

      let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function (item) {
        return item['r_organisasi_id'];
      });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN += ",'" + datas + "'"
      }

      valueIN = valueIN.substring(1)

      listOrg = organization.length > 0 && req.query.filter === undefined ? `AND b.r_organisasi_id IN (${valueIN})` : "";
      if(searchText)
      {
        listOrg = organization.length > 0 && req.query.filter ? `AND b.r_organisasi_id IN (${valueIN})` : "";
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM cmo a LEFT JOIN m_distributor b
                              ON(b.m_distributor_id = a.m_distributor_id)
                              ${whereClause} ${listOrg}`;

      let queryDataTable = `SELECT
                            a.cmo_id,
                            a.isactive,
                            a.created,
                            a.createdby,
                            a.updated,
                            a.updatedby,
                            a.nomor_cmo,
                            a.bulan,
                            a.tahun,
                            a.m_distributor_id,
                            a.jenis_kendaraan_1 as r_kendaraan_1_id,
                            a.jenis_kendaraan_2 as r_kendaraan_2_id,
                            a.jenis_kendaraan_3 as r_kendaraan_3_id,
                            a.jenis_kendaraan_4 as r_kendaraan_4_id,
                            a.schedule_1,
                            a.tonase_1,
                            a.kubikasi_1,
                            co1.nomor_sap AS nomor_so_1,
                            co1.status AS status_so_1,
                            a.schedule_2,
                            a.tonase_2,
                            a.kubikasi_2,
                            co2.nomor_sap AS nomor_so_2,
                            co2.status AS status_so_2,
                            a.schedule_3,
                            a.tonase_3,
                            a.kubikasi_3,
                            co3.nomor_sap AS nomor_so_3,
                            co3.status AS status_so_3,
                            a.schedule_4,
                            a.tonase_4,
                            a.kubikasi_4,
                            co4.nomor_sap AS nomor_so_4,
                            co4.status AS status_so_4,
                            a.no_sap,
                            b.r_organisasi_id,
                            a.flow
                            FROM cmo a 
                            LEFT JOIN m_distributor b ON(a.m_distributor_id = b.m_distributor_id)
                            LEFT JOIN c_order co1 ON(co1.cmo_id = a.cmo_id and co1.week_number=1)
                            LEFT JOIN c_order co2 ON(co2.cmo_id = a.cmo_id and co2.week_number=2)
                            LEFT JOIN c_order co3 ON(co3.cmo_id = a.cmo_id and co3.week_number=3)
                            LEFT JOIN c_order co4 ON(co4.cmo_id = a.cmo_id and co4.week_number=4)
                            ${whereClause}  ${listOrg} ${orderBy}
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;
      
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }
        const rows = result.recordset;
        const meta = paginate(current, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {

          let cmo_id = rows[i].cmo_id;
          let m_distributor_id = rows[i].m_distributor_id;
          let flow = rows[i].flow;
          
          let datajabatan = await request.query(`SELECT nama 
          FROM m_user_role_v 
          WHERE m_user_id = '${m_user_id}'`);
          let dataflow = await request.query(`SELECT nama FROM m_flow_approve WHERE line=${flow}`)

          let namajabatanuser = datajabatan.recordset[0].nama;
          let namaflowuser = dataflow.recordset[0].nama;          
          let action = `N`;
          if(namajabatanuser==namaflowuser){
            action=`Y`;
          }
          result.recordset[i].action = action;

          let audits = await request.query(`SELECT TOP 1 * FROM audit_cmo WHERE cmo_id = '${cmo_id}' ORDER BY created DESC`);
          
          if(audits.recordset.length > 0){
            result.recordset[i].status = audits.recordset[0].status;
          }else{
            result.recordset[i].status = 'Waiting ASDH';
          }
          

          let distributor = await request.query(`SELECT a.r_organisasi_id,a.m_pajak_id,
          a.r_distribution_channel_id,b.nama,b.kode FROM m_distributor a,
          r_organisasi b WHERE m_distributor_id='${m_distributor_id}'
          and a.r_organisasi_id = b.r_organisasi_id`);
          result.recordset[i].distributor = distributor.recordset[0];

          let m_pajak_id = distributor.recordset[0].m_pajak_id;
          let r_distribution_channel_id = distributor.recordset[0].r_distribution_channel_id;
          let pajak = await request.query(`SELECT b.kode,b.nama FROM m_pajak a,r_organisasi b
          WHERE m_pajak_id='${m_pajak_id}' and a.r_organisasi_id = b.r_organisasi_id`);
          result.recordset[i].pajak = pajak.recordset[0];

          let distributor_channel = await request.query(`SELECT kode,nama,deskripsi
          FROM r_distribution_channel
          WHERE r_distribution_channel_id='${r_distribution_channel_id}'`);
          result.recordset[i].distributor_channel = distributor_channel.recordset[0];

          let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
          FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
          AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`);
          result.recordset[i].kendaraan1 = kendaraan1.recordset;

          let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
          FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
          AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`);
          result.recordset[i].kendaraan2 = kendaraan2.recordset;

          let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
          FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
          AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=3`);
          result.recordset[i].kendaraan3 = kendaraan3.recordset;

          let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
          FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
          AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`);
          result.recordset[i].kendaraan4 = kendaraan4.recordset;

          let order1 = await request.query(`SELECT a.tonase,a.kubikasi
          FROM c_order a WHERE a.cmo_id='${cmo_id}'
          AND  week_number=1`);
          //result.recordset[i].order1 = order1.recordset[0];
          let tonase_1 = (order1.recordset[0]) ? order1.recordset[0].tonase : 0;
          let kubikasi_1 = (order1.recordset[0]) ? order1.recordset[0].kubikasi : 0;


          let order2 = await request.query(`SELECT a.tonase,a.kubikasi
          FROM c_order a WHERE a.cmo_id='${cmo_id}'
          AND  week_number=2`)
          //result.recordset[i].order2 = order2.recordset[0];
          let tonase_2 = (order2.recordset[0]) ? order2.recordset[0].tonase : 0;
          let kubikasi_2 = (order2.recordset[0]) ? order2.recordset[0].kubikasi : 0;

          let order3 = await request.query(`SELECT a.tonase,a.kubikasi
          FROM c_order a WHERE a.cmo_id='${cmo_id}'
          AND  week_number=3`)
          //result.recordset[i].order3 = order3.recordset[0];
          let tonase_3 = (order3.recordset[0]) ? order3.recordset[0].tonase : 0;
          let kubikasi_3 = (order3.recordset[0]) ? order3.recordset[0].kubikasi : 0;

          let order4 = await request.query(`SELECT a.tonase,a.kubikasi
          FROM c_order a WHERE a.cmo_id='${cmo_id}'
          AND  week_number=4`)
          //result.recordset[i].order4 = order4.recordset[0];
          let tonase_4 = (order4.recordset[0]) ? order4.recordset[0].tonase : 0;
          let kubikasi_4 = (order4.recordset[0]) ? order4.recordset[0].kubikasi : 0;


          delete result.recordset[i].r_kendaraan_1_id;
          delete result.recordset[i].r_kendaraan_2_id;
          delete result.recordset[i].r_kendaraan_3_id;
          delete result.recordset[i].r_kendaraan_4_id;
          delete result.recordset[i].m_distributor_id;
          delete result.recordset[i].r_distribution_channel_id;


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

            totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase;
            totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi;
            nama1.push(kendaraan1.recordset[i].nama);


          }

          let dataken1 = nama1.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing1 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken1, function(value, key) {  //Function looping tiap object beserta nilainya
              hasilParsing1 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing1 = hasilParsing1.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan1 = hasilParsing1;
          result.recordset[i].namakendaraan1 = keterangankendaraan1;
          let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100;
          let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100;

          result.recordset[i].totalPercentaseTonaseOrder1 = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
          result.recordset[i].totalPercentaseKubikasiOrder1 = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
          result.recordset[i].totalTonaseKendaraan1 = totalTonaseKendaraan1;
          result.recordset[i].totalKubikasiKendaraan1 = totalKubikasiKendaraan1;




          let totalTonaseKendaraan2 = 0;
          let totalKubikasiKendaraan2 = 0;

          for (let i = 0; i < kendaraan2.recordset.length; i++) {

            totalTonaseKendaraan2 = totalTonaseKendaraan2 + kendaraan2.recordset[i].tonase;
            totalKubikasiKendaraan2 = totalKubikasiKendaraan2 + kendaraan2.recordset[i].kubikasi;
            nama2.push(kendaraan2.recordset[i].nama);
          }

          let dataken2 = nama2.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing2 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken2, function(value, key) {  //Function looping tiap object beserta nilainya
              hasilParsing2 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing2 = hasilParsing2.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan2 = hasilParsing2;
          result.recordset[i].namakendaraan2 = keterangankendaraan2;

          let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100
          let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100

          result.recordset[i].totalPercentaseTonaseOrder2 = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
          result.recordset[i].totalPercentaseKubikasiOrder2 = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));

          result.recordset[i].totalTonaseKendaraan2 = totalTonaseKendaraan2;
          result.recordset[i].totalKubikasiKendaraan2 = totalKubikasiKendaraan2;

          let totalTonaseKendaraan3 = 0;
          let totalKubikasiKendaraan3 = 0;

          for (let i = 0; i < kendaraan3.recordset.length; i++) {

            totalTonaseKendaraan3 = totalTonaseKendaraan3 + kendaraan3.recordset[i].tonase;
            totalKubikasiKendaraan3 = totalKubikasiKendaraan3 + kendaraan3.recordset[i].kubikasi;
            nama3.push(kendaraan3.recordset[i].nama);
          }


          let dataken3 = nama3.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing3 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken3, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing3 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing3 = hasilParsing3.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan3 = hasilParsing3;
          result.recordset[i].namakendaraan3 = keterangankendaraan3;

          

          let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100
          let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100

          result.recordset[i].totalPercentaseTonaseOrder3 = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
          result.recordset[i].totalPercentaseKubikasiOrder3 = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));

          result.recordset[i].totalTonaseKendaraan3 = totalTonaseKendaraan3;
          result.recordset[i].totalKubikasiKendaraan3 = totalKubikasiKendaraan3;


          let totalTonaseKendaraan4 = 0;
          let totalKubikasiKendaraan4 = 0;


          for (let i = 0; i < kendaraan4.recordset.length; i++) {

            totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase;
            totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi;
            nama4.push(kendaraan4.recordset[i].nama);
          }
          
          let dataken4 = nama4.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing4 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken4, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing4 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing4 = hasilParsing4.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan4 = hasilParsing4;
          result.recordset[i].namakendaraan4 = keterangankendaraan4;
          let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100
          let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100

          result.recordset[i].totalPercentaseTonaseOrder4 = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
          result.recordset[i].totalPercentaseKubikasiOrder4 = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));

          result.recordset[i].totalTonaseKendaraan4 = totalTonaseKendaraan4;
          result.recordset[i].totalKubikasiKendaraan4 = totalKubikasiKendaraan4;


          result.recordset[i].totalTonase = tonase_1 + tonase_2 + tonase_3 + tonase_4;
          result.recordset[i].totalKubikasi = kubikasi_1 + kubikasi_2 + kubikasi_3 + kubikasi_4;


          delete result.recordset[i].r_kendaraan_1_id;
          delete result.recordset[i].r_kendaraan_2_id;
          delete result.recordset[i].r_kendaraan_3_id;
          delete result.recordset[i].r_kendaraan_4_id;
          delete result.recordset[i].m_distributor_id;
          delete result.recordset[i].r_distribution_channel_id;

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
  view: async function (req, res) {
    const {
      query: { m_user_id }
    } = req;    
    try {
      await DB.poolConnect;
      const request = DB.pool.request();
      let queryDataTable = `SELECT
                            a.cmo_id,
                            a.isactive,
                            a.created,
                            a.createdby,
                            a.updated,
                            a.updatedby,
                            a.nomor_cmo,
                            a.bulan,
                            a.tahun,
                            a.m_distributor_id,
                            a.jenis_kendaraan_1 as r_kendaraan_1_id,
                            a.jenis_kendaraan_2 as r_kendaraan_2_id,
                            a.jenis_kendaraan_3 as r_kendaraan_3_id,
                            a.jenis_kendaraan_4 as r_kendaraan_4_id,
                            a.schedule_1,
                            a.tonase_1,
                            a.kubikasi_1,
                            COALESCE(a.nomor_so_1,co1.nomor_sap) AS nomor_so_1,
                            co1.status AS status_so_1,
                            a.schedule_2,
                            a.tonase_2,
                            a.kubikasi_2,
                            COALESCE(a.nomor_so_2,co2.nomor_sap) AS nomor_so_2,
                            co2.status AS status_so_2,
                            a.schedule_3,
                            a.tonase_3,
                            a.kubikasi_3,
                            COALESCE(a.nomor_so_3,co3.nomor_sap) AS nomor_so_3,
                            co3.status AS status_so_3,
                            a.schedule_4,
                            a.tonase_4,
                            a.kubikasi_4,
                            COALESCE(a.nomor_so_4,co4.nomor_sap) AS nomor_so_4,
                            co4.status AS status_so_4,
                            a.no_sap,
                            a.flow
                            FROM cmo a
                            LEFT JOIN m_distributor b ON(a.m_distributor_id = b.m_distributor_id)
                            LEFT JOIN c_order co1 ON(co1.cmo_id = a.cmo_id and co1.week_number=1)
                            LEFT JOIN c_order co2 ON(co2.cmo_id = a.cmo_id and co2.week_number=2)
                            LEFT JOIN c_order co3 ON(co3.cmo_id = a.cmo_id and co3.week_number=3)
                            LEFT JOIN c_order co4 ON(co4.cmo_id = a.cmo_id and co4.week_number=4)
                            WHERE a.isactive='Y' AND a.kategori='CMO' AND a.cmo_id = '${req.param("id")}'
                            `;



      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        if (result.recordset.length > 0) {

          let m_distributor_id = row.m_distributor_id;
          let cmo_id = row.cmo_id;
          let flow = row.flow;
          let datajabatan = await request.query(`SELECT nama 
          FROM m_user_role_v 
          WHERE m_user_id = '${m_user_id}'`);
          let dataflow = await request.query(`SELECT nama FROM m_flow_approve WHERE line=${flow}`)
          if(m_user_id){

            let namajabatanuser = datajabatan.recordset[0].nama;
            let namaflowuser = dataflow.recordset[0].nama;            
            let action = `N`;
            if(namajabatanuser==namaflowuser){
              action=`Y`;
            }
            result.recordset[0].action = action;
            
          }

          let audits = await request.query(`SELECT TOP 1 * FROM audit_cmo WHERE cmo_id = '${cmo_id}' ORDER BY created DESC`);
          
          if(audits.recordset.length > 0){
            result.recordset[0].status = audits.recordset[0].status;
          }else{
            result.recordset[0].status = 'Draft';
          
          }

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
          GROUP BY co.cmo_id,mp.kode_brand,mp.brand,
          sov1.schedule_date,sov1.quantity,sov1.amount,
          sov2.schedule_date,sov2.quantity,sov2.amount,
          sov3.schedule_date,sov3.quantity,sov3.amount,
          sov4.schedule_date,sov4.quantity,sov4.amount,
          uom.nama`;

          let getsummaryorder = await request.query(sqlgetSummaryBrand);
          
          result.recordset[0].summaryorder = getsummaryorder.recordset;

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


            getsummaryorder.recordset[i].totalAmount = 
            getsummaryorder.recordset[i].amount1 + 
            getsummaryorder.recordset[i].amount2 + 
            getsummaryorder.recordset[i].amount3 + 
            getsummaryorder.recordset[i].amount4;


            totalAmountAll = totalAmountAll + getsummaryorder.recordset[i].amount1 + 
            getsummaryorder.recordset[i].amount2 + 
            getsummaryorder.recordset[i].amount3 + 
            getsummaryorder.recordset[i].amount4;
            
            
          }

          result.recordset[0].totalQuantity1 = totalQuantity1;
          result.recordset[0].totalQuantity2 = totalQuantity2;
          result.recordset[0].totalQuantity3 = totalQuantity3;
          result.recordset[0].totalQuantity4 = totalQuantity4;

          result.recordset[0].totalAmount1 = totalAmount1;
          result.recordset[0].totalAmount2 = totalAmount2;
          result.recordset[0].totalAmount3 = totalAmount3;
          result.recordset[0].totalAmount4 = totalAmount4;

          result.recordset[0].totalQuantityAll = totalQuantityAll;
          result.recordset[0].totalAmountAll = totalAmountAll;


          let distributor = await request.query(`SELECT a.*,b.nama,b.kode FROM m_distributor a,r_organisasi b
                                    WHERE m_distributor_id='${m_distributor_id}' and a.r_organisasi_id = b.r_organisasi_id`)
          result.recordset[0].distributor = distributor.recordset[0];

          let m_pajak_id = distributor.recordset[0].m_pajak_id;
          let r_distribution_channel_id = distributor.recordset[0].r_distribution_channel_id;

          let pajak = await request.query(`SELECT a.*,b.nama FROM m_pajak a,r_organisasi b WHERE m_pajak_id='${m_pajak_id}' and a.r_organisasi_id = b.r_organisasi_id`)
          result.recordset[0].pajak = pajak.recordset[0];

          let distributor_channel = await request.query(`SELECT * FROM r_distribution_channel WHERE r_distribution_channel_id='${r_distribution_channel_id}'`)
          result.recordset[0].distributor_channel = distributor_channel.recordset[0];

          let order1 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=1`)
          //result.recordset[0].order1 = order1.recordset[0];
          let tonase_1 = (order1.recordset[0]) ? order1.recordset[0].tonase : 0;
          let kubikasi_1 = (order1.recordset[0]) ? order1.recordset[0].kubikasi : 0;


          let order2 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=2`)
          //result.recordset[0].order2 = order2.recordset[0];
          let tonase_2 = (order2.recordset[0]) ? order2.recordset[0].tonase : 0;
          let kubikasi_2 = (order2.recordset[0]) ? order2.recordset[0].kubikasi : 0;

          let order3 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=3`)
          //result.recordset[0].order3 = order3.recordset[0];
          let tonase_3 = (order3.recordset[0]) ? order3.recordset[0].tonase : 0;
          let kubikasi_3 = (order3.recordset[0]) ? order3.recordset[0].kubikasi : 0;

          let order4 = await request.query(`SELECT a.tonase,a.kubikasi
                                    FROM c_order a WHERE a.cmo_id='${cmo_id}'
                                    AND  week_number=4`)
          //result.recordset[0].order4 = order4.recordset[0];
          let tonase_4 = (order4.recordset[0]) ? order4.recordset[0].tonase : 0;
          let kubikasi_4 = (order4.recordset[0]) ? order4.recordset[0].kubikasi : 0;

          let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`)
          result.recordset[0].kendaraan1 = kendaraan1.recordset;

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
          result.recordset[0].namakendaraan1 = keterangankendaraan1;
          let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100
          let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100

          result.recordset[0].totalPercentaseTonaseOrder1 = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
          result.recordset[0].totalPercentaseKubikasiOrder1 = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
          result.recordset[0].totalTonaseKendaraan1 = totalTonaseKendaraan1
          result.recordset[0].totalKubikasiKendaraan1 = totalKubikasiKendaraan1



          let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`)
          result.recordset[0].kendaraan2 = kendaraan2.recordset;


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
          result.recordset[0].namakendaraan2 = keterangankendaraan2;

          let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100
          let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100

          result.recordset[0].totalPercentaseTonaseOrder2 = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
          result.recordset[0].totalPercentaseKubikasiOrder2 = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));

          result.recordset[0].totalTonaseKendaraan2 = totalTonaseKendaraan2
          result.recordset[0].totalKubikasiKendaraan2 = totalKubikasiKendaraan2

          let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=3`)
          result.recordset[0].kendaraan3 = kendaraan3.recordset;

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
          result.recordset[0].namakendaraan3 = keterangankendaraan3;


          let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100
          let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100

          result.recordset[0].totalPercentaseTonaseOrder3 = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
          result.recordset[0].totalPercentaseKubikasiOrder3 = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));

          result.recordset[0].totalTonaseKendaraan3 = totalTonaseKendaraan3
          result.recordset[0].totalKubikasiKendaraan3 = totalKubikasiKendaraan3

          let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                                    FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                                    AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`)
          result.recordset[0].kendaraan4 = kendaraan4.recordset;


          let totalTonaseKendaraan4 = 0
          let totalKubikasiKendaraan4 = 0

          for (let i = 0; i < kendaraan4.recordset.length; i++) {

            totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase
            totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi
            nama4.push(kendaraan4.recordset[i].nama)
          }
          result.recordset[0].namakendaraan4 = nama4.join(",");

          let dataken4 = nama4.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
          let hasilParsing4 = ''                       //Siapkan Wadah untuk hasil
          _.forOwn(dataken4, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing4 += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
          });
          hasilParsing4 = hasilParsing4.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
          let keterangankendaraan4 = hasilParsing4;
          result.recordset[0].namakendaraan4 = keterangankendaraan4;

          let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100
          let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100

          result.recordset[0].totalPercentaseTonaseOrder4 = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
          result.recordset[0].totalPercentaseKubikasiOrder4 = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));

          result.recordset[0].totalTonaseKendaraan4 = totalTonaseKendaraan4
          result.recordset[0].totalKubikasiKendaraan4 = totalKubikasiKendaraan4

          let queryDetails = await request.query(`SELECT * FROM cmo_detail WHERE cmo_id='${cmo_id}' ORDER BY line`)

          let details = queryDetails.recordset;

          let error_counter = 0;
          let error_data = [];
          let error = undefined;
          let totalError = 0;
          let headWeek1 = 0, headWeek2 = 0; headWeek3 = 0, headWeek4 = 0;
          for (let i = 0; i < details.length; i++) {

            let valTotalOrder = details[i].total_order; //(details[i].qty_order_1 ? details[i].qty_order_1  : 0) + (details[i].qty_order_2 ? details[i].qty_order_2  : 0) + (details[i].qty_order_3 ? details[i].qty_order_3  : 0) + (details[i].qty_order_4 ?  details[i].qty_order_4  : 0 );
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
            error_data = [];
          
          }

          

          delete result.recordset[0].r_kendaraan_1_id
          delete result.recordset[0].r_kendaraan_2_id
          delete result.recordset[0].r_kendaraan_3_id
          delete result.recordset[0].r_kendaraan_4_id
          delete result.recordset[0].m_distributor_id
          delete result.recordset[0].r_distribution_channel_id

          let totalCarton1 = 0;
          let totalCarton2 = 0;
          let totalCarton3 = 0;
          let totalCarton4 = 0;
          let totalBruto = 0;
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

            delete details[i].m_produk_id
            delete details[i].r_uom_id

          }


          result.recordset[0].totalCarton1 = totalCarton1;
          result.recordset[0].totalCarton2 = totalCarton2;
          result.recordset[0].totalCarton3 = totalCarton3;
          result.recordset[0].totalCarton4 = totalCarton4;
          result.recordset[0].totalBruto = totalBruto;

          row.details = details

        }

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
      status, details,kategori } = req.body;      
    // eslint-disable-next-line no-undef
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      // eslint-disable-next-line no-undef


      let getcmo = await request.query(`SELECT mdv.region,r_organisasi_id
      FROM m_distributor_v mdv 
      WHERE mdv.m_distributor_id = '${m_distributor_id}'`);
      let region = getcmo.recordset[0].region;
      let r_organisasi_id = getcmo.recordset[0].r_organisasi_id;

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
      AND mfa.line = 1
      AND mu.email_verifikasi IS NOT NULL
      AND mu.isactive = 'Y'`);
      
      let flowjabatan = ``;
      if(getdataemail.recordset.length > 0){
        
        flowjabatan = getdataemail.recordset[0].flowjabatan;

      }else{
        flowjabatan = `ASDH`;
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

        category='RPO';

      }else{

        category='RPO';

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
          kategori)
          VALUES (
            '${cmo_id}',
            '${m_user_id}',
            '${m_user_id}',
            '${nomor_cmo}',
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
            '${category}'
        )`;



      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

       let data = details.filter(e => (e.qty_order_1 ? e.qty_order_1 : 0) + (e.qty_order_2 ? e.qty_order_2 : 0) + (e.qty_order_3 ? e.qty_order_3 : 0) + (e.qty_order_4 ? e.qty_order_4 : 0 ) > 0 );
        
        if (data.length > 0) {

          for (let i = 0; i < data.length; i++) {

            let harga = data[i].harga ? data[i].harga : 0; // akan mengambil dari service lain
            let total_order = (parseInt(data[i].qty_order_1 ? data[i].qty_order_1 : 0) + parseInt(data[i].qty_order_2 ? data[i].qty_order_2 : 0) + parseInt(data[i].qty_order_3 ? data[i].qty_order_3 : 0) + parseInt(data[i].qty_order_4 ? data[i].qty_order_4 : 0))
            let bruto = total_order * harga

            let cmo_detail_id = uuid();
            let j = i + 1;
          
            
            await request.query(`INSERT INTO cmo_detail
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
            status)
            VALUES(
            '${cmo_detail_id}',
            '${m_user_id}',
            '${m_user_id}',
            '${cmo_id}',
            ${j},
            '${data[i].m_produk_id}',
            '${data[i].r_uom_id}',
            ${data[i].stok_awal},
            ${data[i].stok_pending},
            ${data[i].total_stok},
            ${data[i].estimasi_sales_bulan_lalu},
            ${data[i].estimasi_sales_bulan_berjalan},
            ${data[i].stok_akhir},
            ${data[i].estimasi_sales_bulan_depan},
            ${data[i].buffer_stok},
            ${data[i].avarage_sales_tiga_bulan},
            ${data[i].doi},
            ${data[i].cmo},
            ${data[i].qty_order_1},
            ${data[i].qty_order_2},
            ${data[i].qty_order_3},
            ${data[i].qty_order_4},
            ${total_order},
            ${harga},
            ${bruto},
            ${data[i].estimasi_sales_duabulan_kedepan},
            '${data[i].status}'
            )`);


          }

        }


        let cmodetail = await request.query(`SELECT * FROM cmo_detail WHERE cmo_id = '${cmo_id}'`)

        for (let transform = 1; transform <= 4; transform++) {
          
          if (transform == 1 && ((schedule_1!=undefined || schedule_1) && (datatonase_1 + datakubikasi_1 > 0))) {
            console.log(1);
            for (let i = 0; i < jenis_kendaraan_1.length; i++) {
              let cmo_kendaraan_id = uuid();
            

              await request.query(`INSERT INTO cmo_kendaraan
                      (createdby,updatedby,cmo_kendaraan_id, cmo_id, week_number, r_kendaraan_id)
                      VALUES('${m_user_id}', '${m_user_id}','${cmo_kendaraan_id}', '${cmo_id}',1,'${jenis_kendaraan_1[i].r_kendaraan_id}')`)

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
                          week_number
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
                          1
                          )
                          `)
            }


          } else if(transform == 2 && ((schedule_2!=undefined || schedule_2) && (datatonase_2 + datakubikasi_2 > 0))) {      
            console.log(2);      
            for (let i = 0; i < jenis_kendaraan_2.length; i++) {
              let cmo_kendaraan_id = uuid();

              await request.query(`INSERT INTO cmo_kendaraan
                      (cmo_kendaraan_id,createdby,updatedby, cmo_id, week_number, r_kendaraan_id)
                      VALUES('${cmo_kendaraan_id}', '${m_user_id}', '${m_user_id}','${cmo_id}',2,'${jenis_kendaraan_2[i].r_kendaraan_id}')`)

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
                        week_number
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
                        2
                        )
                        `)
            }

          } else if (transform == 3 && ((schedule_3!=undefined || schedule_3) && (datatonase_3 + datakubikasi_3 > 0))) {
            console.log(3);
            for (let i = 0; i < jenis_kendaraan_3.length; i++) {
              let cmo_kendaraan_id = uuid();

              await request.query(`INSERT INTO cmo_kendaraan
                      (cmo_kendaraan_id,createdby,updatedby, cmo_id, week_number, r_kendaraan_id)
                      VALUES('${cmo_kendaraan_id}', '${m_user_id}', '${m_user_id}','${cmo_id}',3,'${jenis_kendaraan_3[i].r_kendaraan_id}')`)

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
                        week_number
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
                        3
                        )
                        `)
            }

          } else if (transform == 4 && ((schedule_4!=undefined || schedule_4) && (datatonase_4 + datakubikasi_4 > 0))) {
            console.log(4);
            for (let i = 0; i < jenis_kendaraan_4.length; i++) {
              let cmo_kendaraan_id = uuid();

              await request.query(`INSERT INTO cmo_kendaraan
                      (cmo_kendaraan_id,createdby,updatedby, cmo_id, week_number, r_kendaraan_id)
                      VALUES('${cmo_kendaraan_id}', '${m_user_id}', '${m_user_id}','${cmo_id}',4,'${jenis_kendaraan_4[i].r_kendaraan_id}')`)

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
                        week_number
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
                        4
                        )`)
            }

          }

        }
                    let audit_cmo_id = uuid();
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
                      SendEmail(dataemail.toString(), param.subject, template, (async (err, info) => {
                        if (err) {
                          console.log('error', err);
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

                    await request.query(`
                    UPDATE cmo SET status = 'Waiting ${flowjabatan}',flow=1
                    WHERE cmo_id = '${cmo_id}'`);

        return res.success({
          data: result,
          message: "Insert data successfully"
        });

      });
    } catch (err) {
      return res.error(err);
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
      let flowjabatan = getdataemail.recordset[0].flowjabatan;

      let dataemail = []
      if( getdataemail.recordset.length > 0){
        for (let i = 0; i < getdataemail.recordset.length; i++) {
        
          dataemail.push(getdataemail.recordset[i].email_verifikasi);
        
        }
      }

      let dataorg = await request.query(`SELECT nama 
      FROM m_user_role_v 
      WHERE m_user_id = '${m_user_id}'`)
      let orgnama = dataorg.recordset[0].nama

      let nomor_cmo = getcmo.recordset[0].nomor_cmo;
      let bulan = getcmo.recordset[0].bulan;
      let tahun = getcmo.recordset[0].tahun;
      let cmoattribute = orgnama.concat('-').concat(nomor_cmo).concat('-').concat(bulan).concat('-').concat(tahun);

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
          WHERE cmo_detail_id='${details[i].cmo_detail_id}' and cmo_id= '${cmo_id}'`;


          await request.query(sql);

          for (let transform = 1; transform <= 4; transform++) {
            
            if (transform == 1 && ((schedule_1!=undefined || schedule_1))) {

            
            let cmodetail = await request.query(`SELECT a.*,
            b.c_order_id FROM cmo_detail a,c_orderdetail b
            WHERE a.cmo_id = '${cmo_id}'
            and a.cmo_detail_id = '${details[i].cmo_detail_id}'
            AND a.cmo_detail_id = b.cmo_detail_id
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
              and a.cmo_detail_id = '${details[i].cmo_detail_id}'
              AND a.cmo_detail_id = b.cmo_detail_id
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
              and a.cmo_detail_id = '${details[i].cmo_detail_id}'
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
              and a.cmo_detail_id = '${details[i].cmo_detail_id}'
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
                    'Waiting ${flowjabatan}')`);


                    // if(dataemail.length > 0){

                    //   SendEmail(
                    //     dataemail.toString(),     //target email
                    //     cmoattribute,              //Subject 
                    //     "<b>CMO Direvisi Harap Diperiksa </b>",    //ini isi format html
                    //     (info) => {
                    //       console.log('info hasil kirim mail', info) //fungsi yg di jalankan saat email berhasil / gagal terkirim (asynchronous jadi kode berikutnya bisa di eksekusi meski kode ini belum beres di eksekusi)
                    //     });
  
                    // }

                    await request.query(`
                    UPDATE cmo SET status = 'Waiting ${flowjabatan}',flow=1 
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

      let getdatacmo = await request.query(`SELECT m_distributor_id
      FROM cmo 
      WHERE cmo_id = '${cmo_id}'`);
      let m_distributor_id = getdatacmo.recordset[0].m_distributor_id;


      let getorg = await request.query(`SELECT mdv.r_organisasi_id
      FROM m_distributor_v mdv 
      WHERE mdv.m_distributor_id = '${m_distributor_id}'`);
      let r_organisasi_id = getorg.recordset[0].r_organisasi_id


       let dataorg = await request.query(`SELECT murv.nama
       FROM m_user_role_v murv
       WHERE murv.m_user_id = '${m_user_id}'`)
       let orgnama = dataorg.recordset[0].nama;
               
       let emailcase = await request.query(`SELECT email_verifikasi FROM m_distributor_profile_v mdpv 
       WHERE r_organisasi_id='${r_organisasi_id}' AND rolename='RSDH'`);
      
       let audit_cmo_id = uuid();
       await request.query(`INSERT INTO audit_cmo
       (audit_cmo_id,createdby,updatedby, cmo_id, 
       m_user_id, actions, status)
       VALUES('${audit_cmo_id}','${m_user_id}',
       '${m_user_id}','${cmo_id}', '${m_user_id}',
       'Direject',
       'Direject ${orgnama}')`);

       let getdataemail = await request.query(`SELECT DISTINCT mu.email_verifikasi 
       FROM audit_cmo ac,m_user mu 
       WHERE ac.m_user_id = mu.m_user_id 
       AND ac.m_user_id <> '${m_user_id}' AND mu.email_verifikasi IS NOT NULL
       AND cmo_id='${cmo_id}'`);
 
       let dataemail = []
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

      dataemail = _.uniq(dataemail);
      
      console.log(dataemail.toString());
      

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
       let nomor_cmo = getcmo.recordset[0].nomor_cmo;
       let bulan = getcmo.recordset[0].bulan;
       let tahun = getcmo.recordset[0].tahun;
       let totalTonase = getcmo.recordset[0].totalTonase;
       let usernama = getcmo.recordset[0].usernama;
       let region = getcmo.recordset[0].region;
       let schedule_1 = getcmo.recordset[0].schedule_1;
       let schedule_2 = getcmo.recordset[0].schedule_2;
       let schedule_3 = getcmo.recordset[0].schedule_3;
       let schedule_4 = getcmo.recordset[0].schedule_4;

       let alasan = ``;
       if(reason){
        alasan = `dengan alasan : ${reason}`;
       }


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
          
          subject: `CMO ditolak oleh ${orgnama} ${alasan}`,
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
          status:`Reject ${orgnama}`

        }
        const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'cmotemplate', templateparam: param }); 
        SendEmail(dataemail.toString(), param.subject, template, (async (err, info) => {
          if (err) {
            console.log('error', err);
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

       if(orgnama=='DISTRIBUTOR'){

        await request.query(`UPDATE cmo 
        SET status='Direject ${orgnama}',
        isactive='N' WHERE cmo_id = '${cmo_id}'`);
       
      }else{

        await request.query(`UPDATE cmo 
        SET status='Direject ${orgnama}',
        flow=0 WHERE cmo_id = '${cmo_id}'`);

      }

      return res.success({
        message: "Reject data successfully"
      });
    } catch (err) {
      return res.error(err);
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

  }
};


function sumObjectsByKey(...objs) {
  return objs.reduce((a, b) => {
    for (let k in b) {
      if (b.hasOwnProperty(k))
        a[k] = (a[k] || 0) + b[k];
    }
    return a;
  }, {});
}





