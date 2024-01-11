/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const mssql = require('mssql');
 // const nodemailer = require("nodemailer");
 const SendEmail = require('../../services/SendEmail');
 
 
 module.exports = {
 
   fillbucket: async function(req,res){
     const { data } = req.body;
     //console.log(data.length);
     await DB.poolConnect;
     try {
         const request = DB.pool.request();
         for(let i=0; i<data.length;i++){
           let ins = `insert into bucket_bidding 
             (kode,nama,email,ring,jenis_kendaraan,rute,harga,valid_from,valid_until,qty_pemakaian)
             values ('${data[i].kode_transporter}','${data[i].nama_transporter}',
             '${data[i].email}','${data[i].ring}','${data[i].jenis_kendaraan}',
             '${data[i].rute}','${data[i].harga}','${data[i].valid_from}','${data[i].valid_until}',0)`;
 
           await request.query(ins);
           //console.log(ins);
         }
         return res.success({
           result: data,
           message: "Insert data successfully"
         });
     }catch(err){
       console.log(err);
         return res.error(err);
     }
   },
   findBidding: async function(req, res){
     const {
       query: { currentPage,pageSize,m_user_id, m_transporter_id }
     } = req;
 
     console.log(`oiiii`,m_transporter_id);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       let whereClause = ``
       if(m_transporter_id){
         whereClause = `and m_transporter_id = '${m_transporter_id}'`
       }
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                             from v_penawaran_aktif where 1=1 ${whereClause}`;
 
       let queryDataTable = `select * from v_penawaran_aktif where 1=1
                             ${whereClause}
                             order by tgl_penawaran desc 
                             OFFSET ${offset} ROWS
                             FETCH NEXT ${limit} ROWS ONLY`;
 
                             console.log(queryDataTable);
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
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
 
     }catch(error){
       console.log(error);
       return res.error(error)
     }
   },
   // GET ALL RESOURCE
   find: async function (req, res) {
     const {
       query: { currentPage, pageSize }
     } = req;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       const whereClause = req.query.filter ? `WHERE ${req.query.filter} AND isactive = 'Y'` : "";
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                               FROM bidding_shipment ${whereClause}`;
 
       let queryDataTable = `SELECT * FROM bidding_shipment ${whereClause}
                             ORDER BY created desc
                             OFFSET ${offset} ROWS
                             FETCH NEXT ${limit} ROWS ONLY`;
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
       request.query(queryDataTable, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
         const meta = paginate(currentPage, count, rows, pageSize);
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
   hitungpenawaran:async function(req, res){
      const {
        query: { m_transporter_id }
      } = req;

      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let queryDataTable = `select * from v_penawaran_aktif_non_console where m_transporter_id = '${m_transporter_id}'`;
        
        //console.log(queryDataTable);
        let data = await request.query(queryDataTable);
        data = data.recordset
        //console.log(data.length);
        return res.success({
          result: data.length,
          message: "Fetch data successfully"
        });
      }catch(error){
       return res.error(error);
      }
   },
   // GET ONE RESOURCE
   findOne: async function (req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT * FROM bidding_shipment WHERE isactive = 'Y' AND bidding_shipment_id='${req.param(
         "id"
       )}'`;
 
       request.query(queryDataTable, (err, result) => {
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
   // GET ONE RESOURCE
   findBiddingOrder: async function(req, res) {
     await DB.poolConnect;
     const {
       m_transporter_id
     } = req.query;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT 
       bs.bidding_shipment_id, 
       bs.isactive, bs.created, 
       bs.createdby, bs.updated, 
       bs.updatedby, 
       do.c_order_id, 
       bs.m_transporter_id, 
       bs.r_kendaraan_id,
       rk.nama AS kendaraan,
       bs.penawaran_biaya, 
       bs.delivery_order_id,
       do.schedule_delivery_date AS schedule_date,
       do.nomor_do,do.delivery_note, 
       do.m_distributor_id,
       md.nama AS penerima,
       md.nama AS shipto,
       1 AS jumlahkendaraan,
       md.region,
       md.region AS alamat,
       md.region AS city
       FROM bidding_shipment bs
       LEFT JOIN delivery_order do ON(do.delivery_order_id = bs.delivery_order_id)
       LEFT JOIN m_distributor_v md ON(md.m_distributor_id = do.m_distributor_id)
       LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = bs.r_kendaraan_id)
       WHERE bs.m_transporter_id ='${m_transporter_id}' ORDER BY do.schedule_delivery_date DESC`;
 
       request.query(queryDataTable,async (err, result) => {
         if (err) {
           return res.error(err);
         }
         let datatransporter = await request.query(`SELECT * FROM m_transporter_v 
         WHERE m_transporter_id='${m_transporter_id}'`);
         let transporter = datatransporter.recordset[0];
         const rows = result.recordset;
         let TotalTonase = 0;
         let TotalKubikasi = 0;
 
         for(let i = 0 ;i < result.recordset.length;i++){
           
           rows[i].transporter = transporter;
           let delivery_order_id = rows[i].delivery_order_id;
           let datadetaildo = await request.query(`SELECT 0 AS nomor,dod.m_produk_id,
           mp.nama AS item,dod.jumlah,dod.tonase,dod.kubikasi
           FROM delivery_order_detail dod
           LEFT JOIN m_produk mp ON(mp.m_produk_id = dod.m_produk_id)
           WHERE dod.delivery_order_id='${delivery_order_id}'`);
 
           let datadetail = datadetaildo.recordset;
 
           for (let j = 0; j < datadetail.length; j++) {
 
             let nomor = j + 1;
             datadetail[j].nomor = nomor;
             TotalTonase = TotalTonase + datadetail[j].tonase;
             TotalKubikasi = TotalKubikasi + datadetail[j].kubikasi;
             
             
           }
 
           rows[i].tonase = TotalTonase;
           rows[i].kubikasi = TotalKubikasi;
           rows[i].detail = datadetaildo.recordset;
           
 
 
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
 
   // CREATE NEW RESOURCE
   new: async function (req, res) {
     const { m_user_id,delivery_order_id,r_kendaraan_id,penawaran_biaya,transporter } = req.body;
     
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       
       let SqlgetdeliveryOrder = `SELECT * FROM delivery_order 
       WHERE delivery_order_id = '${delivery_order_id}'`;
       let datado = await request.query(SqlgetdeliveryOrder);
       let c_order_id = datado.recordset[0].c_order_id;
 
 
       const table = new mssql.Table('bidding_shipment');
       table.create = false;
       table.columns.add('bidding_shipment_id', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('createdby', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('updatedby', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('c_order_id', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('delivery_order_id', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('m_transporter_id', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('r_kendaraan_id', mssql.TYPES.VarChar, { length: 36, nullable: false });
       table.columns.add('penawaran_biaya', mssql.TYPES.Int,{ length: 9, nullable: false });
 
       let dataemail = []
       for (let i = 0; i < transporter.length; i++) {
 
         let bidding_shipment_id = uuid();
 
         table.rows.add(bidding_shipment_id,
           m_user_id, m_user_id,
           c_order_id,
           delivery_order_id,
           transporter[i].m_transporter_id,
           r_kendaraan_id,
           penawaran_biaya
         );
 
 
         let sql = `SELECT * FROM m_transporter_v
         WHERE m_transporter_id = '${transporter[i].m_transporter_id}'`;
         let data = await request.query(sql);
         let email = data.recordset[0].email;
         dataemail.push(email);
       }
       
 
 
       let SqlUpdatedeliveryOrder = `UPDATE delivery_order SET penawaran_biaya=${penawaran_biaya},
       status='Bidding Vendor',
       kode_status='BV'
       WHERE delivery_order_id = '${delivery_order_id}'`;
       await request.query(SqlUpdatedeliveryOrder);
 
 
       await request.bulk(table);
       let cmo = await request.query(`SELECT cmo_id FROM c_order 
       WHERE c_order_id='${c_order_id}'`);
       let cmo_id = cmo.recordset[0].cmo_id;
       
 
       
       let queryDataTable = `SELECT c.cmo_id,c.nomor_cmo,md.m_distributor_id,c.bulan,c.tahun,md.nama,md.nama_pajak,md.channel,
           CASE WHEN ord1.nomor_sap IS NOT NULL AND ship1.c_order_id IS NOT NULL THEN 'Y' ELSE 'N' END AS isCreateResi1,
           CASE WHEN ord2.nomor_sap IS NOT NULL AND ship2.c_order_id IS NOT NULL THEN 'Y' ELSE 'N' END AS isCreateResi2,
           CASE WHEN ord3.nomor_sap IS NOT NULL AND ship3.c_order_id IS NOT NULL THEN 'Y' ELSE 'N' END AS isCreateResi3,
           CASE WHEN ord4.nomor_sap IS NOT NULL AND ship4.c_order_id IS NOT NULL THEN 'Y' ELSE 'N' END AS isCreateResi4,
           CASE WHEN ord1.nomor_sap IS NOT NULL AND ship1.c_order_id IS NULL THEN 'Y' ELSE 'N' END AS isbiddingweek1,
           CASE WHEN ord2.nomor_sap IS NOT NULL AND ship2.c_order_id IS NULL THEN 'Y' ELSE 'N' END AS isbiddingweek2,
           CASE WHEN ord3.nomor_sap IS NOT NULL AND ship3.c_order_id IS NULL THEN 'Y' ELSE 'N' END AS isbiddingweek3,
           CASE WHEN ord4.nomor_sap IS NOT NULL AND ship4.c_order_id IS NULL THEN 'Y' ELSE 'N' END AS isbiddingweek4,
           ord1.c_order_id AS c_order_id_1,
           CASE WHEN ship1.status IS NULL THEN 'Belum Proses Bidding' ELSE ship1.status END statusweek1,
           ord2.c_order_id AS c_order_id_2,
           CASE WHEN ship2.status IS NULL THEN 'Belum Proses Bidding' ELSE ship2.status END statusweek2,
           ord3.c_order_id AS c_order_id_3,
           CASE WHEN ship3.status IS NULL THEN 'Belum Proses Bidding' ELSE ship3.status END statusweek3,
           ord4.c_order_id AS c_order_id_4,
           CASE WHEN ship4.status IS NULL THEN 'Belum Proses Bidding' ELSE ship4.status END statusweek4,
           mtp1.nama AS transporter1,
           mtp2.nama AS transporter2,
           mtp3.nama AS transporter3,
           mtp4.nama AS transporter4,
           ship1.nomor_resi AS nomor_resi1,
           ship2.nomor_resi AS nomor_resi2,
           ship3.nomor_resi AS nomor_resi3,
           ship4.nomor_resi AS nomor_resi4,
           ship1.total_biaya AS total_biaya1,
           ship2.total_biaya AS total_biaya2,
           ship3.total_biaya AS total_biaya3,
           ship4.total_biaya AS total_biaya4
           FROM cmo c
           LEFT JOIN c_order ord1 ON (ord1.cmo_id = c.cmo_id AND ord1.week_number=1)
           LEFT JOIN c_shipment ship1 ON (ord1.c_order_id= ship1.c_order_id)
           LEFT JOIN m_transporter_v mtp1 ON (mtp1.m_transporter_id= ship1.m_transporter_id)
           LEFT JOIN c_order ord2 ON (ord2.cmo_id = c.cmo_id AND ord2.week_number=2)
           LEFT JOIN c_shipment ship2 ON (ord2.c_order_id= ship2.c_order_id)
           LEFT JOIN m_transporter_v mtp2 ON (mtp2.m_transporter_id= ship2.m_transporter_id)
           LEFT JOIN c_order ord3 ON (ord3.cmo_id = c.cmo_id AND ord3.week_number=3)
           LEFT JOIN c_shipment ship3 ON (ord3.c_order_id= ship3.c_order_id)
           LEFT JOIN m_transporter_v mtp3 ON (mtp3.m_transporter_id= ship3.m_transporter_id)
           LEFT JOIN c_order ord4 ON (ord4.cmo_id = c.cmo_id AND ord4.week_number=4)
           LEFT JOIN c_shipment ship4 ON (ord4.c_order_id= ship4.c_order_id)
           LEFT JOIN m_transporter_v mtp4 ON (mtp4.m_transporter_id= ship4.m_transporter_id)
           LEFT JOIN m_distributor_v md ON (md.m_distributor_id = c.m_distributor_id)
           WHERE c.no_sap IS NOT NULL AND c.cmo_id='${cmo_id}'`;
 
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }
         
         
         const row = result.recordset[0];
         
         if (result.recordset.length > 0) {
 
           let c_order_id_1 = row.c_order_id_1;
           let c_order_id_2 = row.c_order_id_2;
           let c_order_id_3 = row.c_order_id_3;
           let c_order_id_4 = row.c_order_id_4;
 
           let transporter1 = row.transporter1;
           let transporter2 = row.transporter2;
           let transporter3 = row.transporter3;
           let transporter4 = row.transporter4;
 
           let nomor_resi1 = row.nomor_resi1;
           let nomor_resi2 = row.nomor_resi2;
           let nomor_resi3 = row.nomor_resi3;
           let nomor_resi4 = row.nomor_resi4;
 
           let total_biaya1 = row.total_biaya1;
           let total_biaya2 = row.total_biaya2;
           let total_biaya3 = row.total_biaya3;
           let total_biaya4 = row.total_biaya4;
 
           let biddingtransporter1 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan
               FROM quo_bidding_shipment bs,m_transporter_v mtv
               WHERE bs.c_order_id='${c_order_id_1}'
               and mtv.m_transporter_id = bs.m_transporter_id`);
 
           let biddingtransporter2 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan
               FROM quo_bidding_shipment bs,m_transporter_v mtv
               WHERE bs.c_order_id='${c_order_id_2}'
               and mtv.m_transporter_id = bs.m_transporter_id`);
 
           let biddingtransporter3 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan
               FROM quo_bidding_shipment bs,m_transporter_v mtv
               WHERE bs.c_order_id='${c_order_id_3}'
               and mtv.m_transporter_id = bs.m_transporter_id`);
 
           let biddingtransporter4 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan
               FROM quo_bidding_shipment bs,m_transporter_v mtv
               WHERE bs.c_order_id='${c_order_id_4}'
               and mtv.m_transporter_id = bs.m_transporter_id`);
 
           let alltransporter = await request.query(`SELECT mtv.* FROM m_transporter_v mtv`);
 
 
           let order1 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_1}'`);
           let order2 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_2}'`);
           let order3 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_3}'`);
           let order4 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_4}'`);
 
 
 
           let quo1 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_1}'`);
           let quo2 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_2}'`);
           let quo3 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_3}'`);
           let quo4 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_4}'`);
 
 
           let total_penawaran1 = quo1.recordset[0].total_rows;
           let total_penawaran2 = quo2.recordset[0].total_rows;
           let total_penawaran3 = quo3.recordset[0].total_rows;
           let total_penawaran4 = quo4.recordset[0].total_rows;
 
           let audittracking1 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_1}' AND actions='BERANGKAT' ORDER BY created DESC`);
           let audittracking2 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_2}' AND actions='BERANGKAT' ORDER BY created DESC`);
           let audittracking3 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_3}' AND actions='BERANGKAT' ORDER BY created DESC`);
           let audittracking4 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_4}' AND actions='BERANGKAT' ORDER BY created DESC`);
 
           dataaudittracking1 = audittracking1.recordset[0];
           dataaudittracking2 = audittracking2.recordset[0];
           dataaudittracking3 = audittracking3.recordset[0];
           dataaudittracking4 = audittracking4.recordset[0];
 
           let status = ``
           let kodestatus = 0
           if (audittracking1.recordset.length > 0 && audittracking2.recordset.length > 0
             && audittracking3.recordset.length > 0 && audittracking4.recordset.length > 0) {
             status = 'Sudah Ready';
             kodestatus = 1;
           } else {
             status = 'Belum Ready';
             kodestatus = 0;
           }
 
           let dataorder1 = order1.recordset[0];
           let dataorder2 = order2.recordset[0];
           let dataorder3 = order3.recordset[0];
           let dataorder4 = order4.recordset[0];
 
           let cmo_id = row.cmo_id;
           let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
               FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
               AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`)
           //result.recordset[i].kendaraan1 = kendaraan1.recordset;
 
           let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
               FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
               AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`)
           //result.recordset[i].kendaraan2 = kendaraan2.recordset;
 
           let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
               FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
               AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =3`)
           //result.recordset[i].kendaraan3 = kendaraan3.recordset;
 
           let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
               FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
               AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`)
           // result.recordset[i].kendaraan4 = kendaraan4.recordset;
 
           let kendaraanorder1 = await request.query(`SELECT a.tonase,a.kubikasi
               FROM c_order a WHERE a.cmo_id='${cmo_id}'
               AND  week_number=1`)
           //result.recordset[i].kendaraanorder1 = kendaraanorder1.recordset[0];
           let tonase_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].tonase : 0;
           let kubikasi_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].kubikasi : 0;
 
 
           let kendaraanorder2 = await request.query(`SELECT a.tonase,a.kubikasi
               FROM c_order a WHERE a.cmo_id='${cmo_id}'
               AND  week_number=2`)
           //result.recordset[i].kendaraanorder2 = kendaraanorder2.recordset[0];
           let tonase_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].tonase : 0;
           let kubikasi_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].kubikasi : 0;
 
           let kendaraanorder3 = await request.query(`SELECT a.tonase,a.kubikasi
               FROM c_order a WHERE a.cmo_id='${cmo_id}'
               AND  week_number=3`)
           //result.recordset[i].kendaraanorder3 = kendaraanorder3.recordset[0];
           let tonase_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].tonase : 0;
           let kubikasi_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].kubikasi : 0;
 
           let kendaraanorder4 = await request.query(`SELECT a.tonase,a.kubikasi
               FROM c_order a WHERE a.cmo_id='${cmo_id}'
               AND  week_number=4`)
           //result.recordset[i].kendaraanorder4 = kendaraanorder4.recordset[0];
           let tonase_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].tonase : 0;
           let kubikasi_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].kubikasi : 0;
 
 
           delete result.recordset.r_kendaraan_1_id
           delete result.recordset.r_kendaraan_2_id
           delete result.recordset.r_kendaraan_3_id
           delete result.recordset.r_kendaraan_4_id
           delete result.recordset.m_distributor_id
           delete result.recordset.r_distribution_channel_id
 
 
           let totalTonaseKendaraan1 = 0;
           let totalKubikasiKendaraan1 = 0;
           let nama1 = [];
           let nama2 = [];
           let nama3 = [];
           let nama4 = [];
 
           for (let i = 0; i < kendaraan1.recordset.length; i++) {
 
             totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase;
             totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi;
             nama1.push(kendaraan1.recordset[i].nama);
 
 
           }
 
           let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100
           let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100
           let totalTonaseKendaraan2 = 0
           let totalKubikasiKendaraan2 = 0
 
           for (let i = 0; i < kendaraan2.recordset.length; i++) {
 
             totalTonaseKendaraan2 = totalTonaseKendaraan2 + kendaraan2.recordset[i].tonase
             totalKubikasiKendaraan2 = totalKubikasiKendaraan2 + kendaraan2.recordset[i].kubikasi
             nama2.push(kendaraan2.recordset[i].nama)
           }
 
           let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100
           let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100
           let totalTonaseKendaraan3 = 0
           let totalKubikasiKendaraan3 = 0
 
           for (let i = 0; i < kendaraan3.recordset.length; i++) {
 
             totalTonaseKendaraan3 = totalTonaseKendaraan3 + kendaraan3.recordset[i].tonase
             totalKubikasiKendaraan3 = totalKubikasiKendaraan3 + kendaraan3.recordset[i].kubikasi
             nama3.push(kendaraan3.recordset[i].nama)
           }
 
 
           let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100;
           let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100;
           let totalTonaseKendaraan4 = 0
           let totalKubikasiKendaraan4 = 0
 
           for (let i = 0; i < kendaraan4.recordset.length; i++) {
 
             totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase
             totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi
             nama4.push(kendaraan4.recordset[i].nama)
           }
 
           let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100;
           let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100;
 
           let queryDetails = await request.query(`SELECT * from cmo_detail where cmo_id='${cmo_id}'`)
 
           let details = queryDetails.recordset;
 
           delete result.recordset.r_kendaraan_1_id
           delete result.recordset.r_kendaraan_2_id
           delete result.recordset.r_kendaraan_3_id
           delete result.recordset.r_kendaraan_4_id
           delete result.recordset.m_distributor_id
           delete result.recordset.r_distribution_channel_id
 
           let totalCarton1 = 0
           let totalCarton2 = 0
           let totalCarton3 = 0
           let totalCarton4 = 0
           for (let i = 0; i < queryDetails.recordset.length; i++) {
 
             let m_produk_id = details[i].m_produk_id
             let produk = await request.query(`SELECT * from m_produk where m_produk_id='${m_produk_id}'`)
             details[i].produk = produk.recordset[i];
 
             let r_uom_id = details[i].r_uom_id
             let uom = await request.query(`SELECT * from r_uom where r_uom_id='${r_uom_id}'`)
             details[i].uom = uom.recordset[i];
 
             totalCarton1 = totalCarton1 + details[i].qty_order_1;
             totalCarton2 = totalCarton2 + details[i].qty_order_2;
             totalCarton3 = totalCarton3 + details[i].qty_order_3;
             totalCarton4 = totalCarton4 + details[i].qty_order_4;
 
 
             delete details[i].m_produk_id
             delete details[i].r_uom_id
 
           }
 
 
           row.status = status;
           row.kodestatus = kodestatus;
           
           if(totalPercentaseTonaseOrder2){
             dataorder1.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
           }
 
           if(totalPercentaseKubikasiOrder2){
             dataorder1.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
           }  
           
           if(totalPercentaseTonaseOrder2){
             dataorder2.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
           }
 
           if(totalPercentaseKubikasiOrder2){
             dataorder2.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));
           }
 
 
           if(totalPercentaseTonaseOrder3){
             dataorder3.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
           }
 
           if(totalPercentaseKubikasiOrder3){
             dataorder3.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));
           }
 
           if(totalPercentaseTonaseOrder4){
             dataorder4.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
           }
 
           if(totalPercentaseKubikasiOrder4){
             dataorder4.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));
           }
           
           if(totalCarton1){
             dataorder1.totalCarton = totalCarton1;
           }
 
           if(totalCarton2){
             dataorder2.totalCarton = totalCarton2;
           }
 
           if(totalCarton3){
             dataorder3.totalCarton = totalCarton3;
           }
 
           if(totalCarton4){
             dataorder4.totalCarton = totalCarton4;
           }
 
           if(transporter1){
             dataorder1.transporter = transporter1;
           }
 
           if(transporter2){
             dataorder2.transporter = transporter2;
           }
 
           if(transporter3){
             dataorder3.transporter = transporter3;
           }
 
           if(transporter4){
             dataorder4.transporter = transporter4;
           }
 
           if(nomor_resi1){
             dataorder1.nomor_resi = nomor_resi1;
           }
 
           if(nomor_resi2){
             dataorder2.nomor_resi = nomor_resi2;
           }
 
           if(nomor_resi3){
             dataorder3.nomor_resi = nomor_resi3;
           }
 
           if(nomor_resi4){
             dataorder4.nomor_resi = nomor_resi4;
           }
 
           if(total_biaya1){
             dataorder1.total_biaya = total_biaya1;
           }
 
           if(total_biaya2){
             dataorder2.total_biaya = total_biaya2;
           }
 
           if(total_biaya3){
             dataorder3.total_biaya = total_biaya3;
           }
 
           if(total_biaya4){
             dataorder4.total_biaya = total_biaya4;
           }
 
           if(biddingtransporter1.recordset.length > 0){
             dataorder1.biddingtransporter = biddingtransporter1.recordset;
             if(alltransporter.recordset){
               dataorder1.alltransporter = alltransporter.recordset;
             }
           }
 
           if(biddingtransporter2.recordset.length > 0){
             dataorder2.biddingtransporter = biddingtransporter2.recordset;
             if(alltransporter.recordset){
               dataorder2.alltransporter = alltransporter.recordset;
             }
           }
 
           if(biddingtransporter3.recordset.length > 0){
             dataorder3.biddingtransporter = biddingtransporter3.recordset;
             if(alltransporter.recordset){
               dataorder3.alltransporter = alltransporter.recordset;
             }
           }
 
           if(biddingtransporter4.recordset.length > 0){
             dataorder4.biddingtransporter = biddingtransporter4.recordset;
             if(alltransporter.recordset){
               dataorder4.alltransporter = alltransporter.recordset;
             }
           }
 
 
           if (total_penawaran1) {
             dataorder1.total_penawaran = total_penawaran1;
           }
           if (total_penawaran2) {
             dataorder2.total_penawaran = total_penawaran2;
           }
           if (total_penawaran3) {
             dataorder3.total_penawaran = total_penawaran3;
           }
           if (total_penawaran4) {
             dataorder4.total_penawaran = total_penawaran4;
           }
 
           if (nama1.length > 0) {
             dataorder1.namakendaraan = nama1.join(",");
           }
 
           if (nama2.length > 0) {
             dataorder2.namakendaraan = nama2.join(",");
           }
 
           if (nama3.length > 0) {
             dataorder3.namakendaraan = nama3.join(",");
           }
 
           if (nama4.length > 0) {
             dataorder4.namakendaraan = nama4.join(",");
           }
 
           if(dataorder1){
             dataorder1.isbiddingweek = row.isbiddingweek1;
           }          
           if(dataorder2){
             dataorder2.isbiddingweek = row.isbiddingweek2;
           }
           if(dataorder3){
             dataorder3.isbiddingweek = row.isbiddingweek3;
           }
           if(dataorder4){
             dataorder4.isbiddingweek = row.isbiddingweek4;
           }
 
           if(dataorder1){
             dataorder1.isCreateResi = row.isCreateResi1;
           }
           if(dataorder2){
             dataorder2.isCreateResi = row.isCreateResi2;
           }
           if(dataorder3){
             dataorder3.isCreateResi = row.isCreateResi3;
           }
           if(dataorder4){
             dataorder4.isCreateResi = row.isCreateResi4;
           }
 
           if(dataorder1){
             dataorder1.statusweek = row.statusweek1;
           }
           if(dataorder2){
             dataorder2.statusweek = row.statusweek2;
           }
           if(dataorder3){
             dataorder3.statusweek = row.statusweek3;
           }
           if(dataorder4){
             dataorder4.statusweek = row.statusweek4;
           }
 
 
           if(totalTonaseKendaraan1){
             dataorder1.totalTonaseKendaraan = totalTonaseKendaraan1;
           }
           if(totalTonaseKendaraan2){
             dataorder2.totalTonaseKendaraan = totalTonaseKendaraan2;
           }
           if(totalTonaseKendaraan3){
             dataorder3.totalTonaseKendaraan = totalTonaseKendaraan3;
           }
           if(totalTonaseKendaraan4){
             dataorder4.totalTonaseKendaraan = totalTonaseKendaraan4;
           }
 
           if(totalKubikasiKendaraan1){
             dataorder1.totalKubikasiKendaraan = totalKubikasiKendaraan1;
           }
           if(totalKubikasiKendaraan2){
             dataorder2.totalKubikasiKendaraan = totalKubikasiKendaraan2;
           }
           if(totalKubikasiKendaraan3){
             dataorder3.totalKubikasiKendaraan = totalKubikasiKendaraan3;
           }
           if(totalKubikasiKendaraan4){
             dataorder4.totalKubikasiKendaraan = totalKubikasiKendaraan4;
           }
 
           if(kendaraanorder1.recordset[0]){
             dataorder1.kendaraanorder = kendaraanorder1.recordset[0];
           }
           if(kendaraanorder2.recordset[0]){
             dataorder2.kendaraanorder = kendaraanorder2.recordset[0];
           }
           if(kendaraanorder3.recordset[0]){
             dataorder3.kendaraanorder = kendaraanorder3.recordset[0];
           }
           if(kendaraanorder4.recordset[0]){
             dataorder4.kendaraanorder = kendaraanorder4.recordset[0];
           }
 
           if(dataorder1){
             row.dataorder1 = dataorder1;
           }
           if(dataorder2){
             row.dataorder2 = dataorder2;
           }
           if(dataorder3){
             row.dataorder3 = dataorder3;
           }
           if(dataorder4){
             row.dataorder4 = dataorder4;
           }
 
           delete row.total_biaya1;
           delete row.total_biaya2;
           delete row.total_biaya3;
           delete row.total_biaya4;
 
           delete row.isCreateResi1;
           delete row.isCreateResi2;
           delete row.isCreateResi3;
           delete row.isCreateResi4;
 
           delete row.isbiddingweek1;
           delete row.isbiddingweek2;
           delete row.isbiddingweek3;
           delete row.isbiddingweek4;
 
           delete row.statusweek1;
           delete row.statusweek2;
           delete row.statusweek3;
           delete row.statusweek4;
 
           delete row.c_order_id_1;
           delete row.c_order_id_2;
           delete row.c_order_id_3;
           delete row.c_order_id_4;
 
 
           delete row.transporter1;
           delete row.transporter2;
           delete row.transporter3;
           delete row.transporter4;
 
           delete row.nomor_resi1;
           delete row.nomor_resi2;
           delete row.nomor_resi3;
           delete row.nomor_resi4;
 
           delete row.biddingtransporter1;
           delete row.biddingtransporter2;
           delete row.biddingtransporter3;
           delete row.biddingtransporter4;
 
           delete row.alltransporter;
 
           delete row.total_penawaran1;
           delete row.total_penawaran2;
           delete row.total_penawaran3;
           delete row.total_penawaran4;
 
           row.details = details
 
 
         }
 
         if(dataemail.length > 0){
 
           SendEmail(dataemail.toString(),"Bidding Delivery Order", `<b>Bidding Shipment Format html</b>`, (async (err, info) => {
             if (err) {
               console.log('error', err);
             } else {
               console.log('info', info);
               let from = info.envelope.from;
               let to = info.envelope.to.toString();
               let envelope = from.concat(' send to ');
               let combine = envelope.concat(to);
               await request.query(`INSERT INTO log_email
               (createdby, updatedby,proses,accepted,rejected,envelope, response,delivery_order_id)
               VALUES('${m_user_id}','${m_user_id}', 'Bidding CMO','${info.accepted.toString()}',
               '${info.rejected.toString()}','${combine}','${info.response}','${delivery_order_id}')`);
             }
           }));
 
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
 
   // UPDATE RESOURCE
   update: async function (req, res) {
     const { m_user_id, id, kode, nama } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `UPDATE bidding_shipment
                     SET updatedby = '${m_user_id}',
                     kode = '${kode}',
                     nama = '${nama}'
                    WHERE bidding_shipment_id='${id}'`;
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Update data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   sendQuotation: async function (req, res) {
     const { m_user_id, c_order_id, delivery_order_id,m_transporter_id, harga,keterangan } = req.body;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `INSERT INTO quo_bidding_shipment
       (createdby, updatedby, c_order_id,delivery_order_id, m_transporter_id, price, keterangan)
       VALUES('${m_user_id}', '${m_user_id}', '${c_order_id}','${delivery_order_id}', '${m_transporter_id}',${harga},'${keterangan}')`;
       
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Send Quotation successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
   // DELETE RESOURCE
   delete: async function (req, res) {
     const { id } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `DELETE FROM bidding_shipment WHERE bidding_shipment_id='${id}'`;
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Delete data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   getOne: async function (req,res){
     const {
       query: { key }
     } = req;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
 
       let datacekmultidrop = `select DISTINCT c.nama as pengirim,b.bundle_id,c.m_transporter_id,
       b.console_number 
       ,a.isactive,penerima from r_log_bidding a
       inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
       inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
       where a.r_log_bidding_id = '${key}'`;
 
       let dataparam = await request.query(datacekmultidrop);
       let console_number = dataparam.recordset.length > 0 ? dataparam.recordset[0].console_number : null;
       let m_transporter_id = dataparam.recordset.length > 0 ? dataparam.recordset[0].m_transporter_id : null;
 
       if(m_transporter_id){
 
        let queryData = `select 
        DISTINCT a.isactive from r_log_bidding a
        inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
        inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
        WHERE a.m_transporter_id = '${m_transporter_id}'
        AND a.r_log_bidding_id = '${key}'
        AND a.isactive = 1`;

        // console.log(queryData);

        let datacekkadaluarsa = await request.query(queryData);
        let kadaluarsa = datacekkadaluarsa.recordset;


        let cekErrorValidation = [];
        if(kadaluarsa.length == 0){
          cekErrorValidation.push('Penawaran sudah kadaluarsa.');
        }
  

        if(cekErrorValidation.length > 0){
          return res.success({
            result: null,
            message: "Penawaran sudah kadaluarsa.."
          });
        }else{

          let obj = {};
          let queryDataMultiDrop = `select 
          b.* from r_log_bidding a
          inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
          inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id
          WHERE a.m_transporter_id = '${m_transporter_id}'
          AND a.isactive = 1
          AND a.r_log_bidding_id = '${key}'`;


          let queryResult2 = `select c.nama as pengirim,b.bundle_id,total_tonase as tonase
          ,total_kubikasi as kubikasi,kendaraan
          ,convert(varchar(10),schedule_delivery_date,120) schedule
          ,a.isactive,penerima from r_log_bidding a
          inner join delivery_order_v b on b.r_log_bidding_id = a.delivery_order_id
          inner join m_transporter_v c on c.m_transporter_id = a.m_transporter_id 
          WHERE a.m_transporter_id = '${m_transporter_id}'
          AND a.isactive = 1
          AND a.r_log_bidding_id = '${key}'`;
          //console.log(queryResult2);
        
          let resp = await request.query(queryResult2)
          let dt = await request.query(queryDataMultiDrop)

          //console.log(resp.recordset);

          dt = dt.recordset;
          obj.result1 = dt;
          let objek = resp.recordset

         let _penerima = [...new Set(objek.map(objek => objek.penerima))]
         let _pengirim = [...new Set(objek.map(objek => objek.pengirim))]
         let _bundle_id = [...new Set(objek.map(objek => objek.bundle_id))]
         let _kendaraan = [...new Set(objek.map(objek => objek.kendaraan))]
         let _schedule = [...new Set(objek.map(objek => objek.schedule))]
         let _isactive = [...new Set(objek.map(objek => objek.isactive))]
         let _tonase = 0
         let _kubikasi = 0

          for(let i = 0; i<objek.length; i++){
            _tonase = _tonase + objek[i].tonase
            _kubikasi = _kubikasi + objek[i].kubikasi
          }

          let objekDT = {
            pengirim : _pengirim.toString(),
            bundle_id : _bundle_id.toString(),
            tonase : _tonase,
            kubikasi : _kubikasi,
            kendaraan : _kendaraan.toString(),
            schedule : _schedule.toString(),
            isactive : _isactive.toString(),
            penerima : _penerima.toString()
          }

         //  console.log(objekDT);
          let dn = []
          dn.push(objekDT)
          console.log(dn);
          obj.result2 = dn;
          

          return res.success({
            result: obj,
            message: "Berhasil"
          });

        }

      } 
 


     }catch(e){
       console.log(e);
       return res.error(e)
     }
   }
 };