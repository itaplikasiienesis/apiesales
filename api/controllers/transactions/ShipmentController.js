/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const _ = require('lodash')

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
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function(item) {
       return item['r_organisasi_id'];
     });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN+= ",'"+datas+"'"
      }
      
      valueIN = valueIN.substring(1)
      

     listOrg = organization.length > 0 && req.query.filter ? `AND r_organisasi_id IN (${valueIN})` : "";      
     listOrg = organization.length > 0 && req.query.filter==undefined ? `WHERE r_organisasi_id IN (${valueIN})` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM shipment_v ${whereClause} ${listOrg}`;

      let queryDataTable = `SELECT * FROM shipment_v
                            ${whereClause}
                            ${listOrg}          
                            ORDER BY created DESC
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

        for(let i = 0 ; i< rows.length ; i++){

          let c_order_id_1 = rows[i].c_order_id_1;
          let c_order_id_2 = rows[i].c_order_id_2;
          let c_order_id_3 = rows[i].c_order_id_3;
          let c_order_id_4 = rows[i].c_order_id_4;

          let cmo_id = rows[i].cmo_id;
          let alltransporter = await request.query(`SELECT mtv.* FROM m_transporter_v mtv`);

          if(c_order_id_1){

            let biddingtransporter1 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
            FROM quo_bidding_shipment bs,m_transporter_v mtv 
            WHERE bs.c_order_id='${c_order_id_1}'
            and mtv.m_transporter_id = bs.m_transporter_id`);

            
            let transporter1 = rows[i].transporter1;
            let total_biaya1 = rows[i].total_biaya1;
            let nomor_resi1 = rows[i].nomor_resi1;

            let quo1 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_1}'`);
            let total_penawaran1 = quo1.recordset[0].total_rows;
            let order1 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_1}'`);

            let dataorder1 = order1.recordset[0];

            let deliveriorder = await request.query(`SELECT ck.cmo_kendaraan_id, 
            ck.isactive, ck.created, ck.createdby, ck.updated, 
            ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
            rk.nama,co.schedule_date
            FROM c_order co,cmo_kendaraan ck
            LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
            WHERE co.c_order_id='${c_order_id_1}'
            AND co.cmo_id = ck.cmo_id
            AND co.week_number = ck.week_number
            AND co.week_number=1
            ORDER BY ck.week_number`)
            
            let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
            FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
            AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`)
            //result.recordset[i].kendaraan1 = kendaraan1.recordset;

            let kendaraanorder1 = await request.query(`SELECT a.tonase,a.kubikasi
            FROM c_order a WHERE a.cmo_id='${cmo_id}'
            AND  week_number=1`)
            
            //result.recordset[i].kendaraanorder1 = kendaraanorder1.recordset[0];
            let tonase_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].tonase : 0;
            let kubikasi_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].kubikasi : 0;

            let totalTonaseKendaraan1 = 0;
            let totalKubikasiKendaraan1 = 0;

            let nama1 = [];
  
  
            for (let i = 0; i < kendaraan1.recordset.length; i++) {
  
              totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase
              totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi
              nama1.push(kendaraan1.recordset[i].nama)
  
  
            }

            let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100;
            let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100;


            let totalCarton1 = 0
            dataorder1.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
            dataorder1.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
            dataorder1.biddingtransporter = biddingtransporter1.recordset;
            dataorder1.alltransporter = alltransporter.recordset;
            dataorder1.deliveriorder = deliveriorder.recordset;
            dataorder1.total_penawaran = total_penawaran1;
            dataorder1.total_biaya = total_biaya1;
            dataorder1.totalCarton = totalCarton1;
            dataorder1.transporter = transporter1;
            dataorder1.nomor_resi = nomor_resi1;
                  
            

            dataorder1.namakendaraan = nama1.filter( onlyUnique ).join(",");
            dataorder1.isbiddingweek = rows[i].isbiddingweek1;
            dataorder1.isCreateResi = rows[i].isCreateResi1;
            dataorder1.statusweek = rows[i].statusweek1;
            dataorder1.totalTonaseKendaraan = totalTonaseKendaraan1;
            dataorder1.totalKubikasiKendaraan = totalKubikasiKendaraan1;
            dataorder1.kendaraanorder = kendaraanorder1.recordset[0];


          rows[i].dataorder1 = dataorder1;

          
          }
          if(c_order_id_2){

            let biddingtransporter2 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
            FROM quo_bidding_shipment bs,m_transporter_v mtv 
            WHERE bs.c_order_id='${c_order_id_2}'
            and mtv.m_transporter_id = bs.m_transporter_id`);

            let transporter2 = rows[i].transporter2;
            let total_biaya2 = rows[i].total_biaya2;
            let nomor_resi2 = rows[i].nomor_resi2;
            let quo2 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment 
            WHERE c_order_id = '${c_order_id_2}'`);
            let total_penawaran2 = quo2.recordset[0].total_rows;
            let order2 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_2}'`);
            let dataorder2 = order2.recordset[0];


            let deliveriorder = await request.query(`SELECT ck.cmo_kendaraan_id, 
            ck.isactive, ck.created, ck.createdby, ck.updated, 
            ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
            rk.nama,co.schedule_date
            FROM c_order co,cmo_kendaraan ck
            LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
            WHERE co.c_order_id='${c_order_id_2}'
            AND co.cmo_id = ck.cmo_id
            AND co.week_number = ck.week_number
            AND co.week_number=2
            ORDER BY ck.week_number`)

            let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
            FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
            AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`)
            //result.recordset[i].kendaraan2 = kendaraan2.recordset;
  
            let kendaraanorder2 = await request.query(`SELECT a.tonase,a.kubikasi
            FROM c_order a WHERE a.cmo_id='${cmo_id}'
            AND  week_number=2`)
            //result.recordset[i].kendaraanorder2 = kendaraanorder2.recordset[0];
            let tonase_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].tonase : 0;
            let kubikasi_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].kubikasi : 0;
            
            delete result.recordset[i].r_kendaraan_2_id;

            let nama2 = [];
            let totalTonaseKendaraan2 = 0
            let totalKubikasiKendaraan2 = 0

            for (let i = 0; i < kendaraan2.recordset.length; i++) {

              totalTonaseKendaraan2 = totalTonaseKendaraan2 + kendaraan2.recordset[i].tonase;
              totalKubikasiKendaraan2 = totalKubikasiKendaraan2 + kendaraan2.recordset[i].kubikasi;
              nama2.push(kendaraan2.recordset[i].nama);
            }



            let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100;
            let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100;


            let totalCarton2 = 0
            dataorder2.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
            dataorder2.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));
            dataorder2.biddingtransporter = biddingtransporter2.recordset;
            dataorder2.alltransporter = alltransporter.recordset;
            dataorder2.deliveriorder = deliveriorder.recordset;
            dataorder2.total_penawaran = total_penawaran2;
            dataorder2.total_biaya = total_biaya2;
            dataorder2.totalCarton = totalCarton2;
            dataorder2.transporter = transporter2;
            dataorder2.nomor_resi = nomor_resi2;
            dataorder2.namakendaraan = nama2.filter( onlyUnique ).join(",");
            dataorder2.isCreateResi = rows[i].isCreateResi2;



            dataorder2.isbiddingweek = rows[i].isbiddingweek2;
            dataorder2.statusweek = rows[i].statusweek2;
            dataorder2.totalTonaseKendaraan = totalTonaseKendaraan2;
            dataorder2.totalKubikasiKendaraan = totalKubikasiKendaraan2;
            dataorder2.kendaraanorder = kendaraanorder2.recordset[0];
            rows[i].dataorder2 = dataorder2;


            }
  
          if(c_order_id_3){

            let biddingtransporter3 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
            FROM quo_bidding_shipment bs,m_transporter_v mtv 
            WHERE bs.c_order_id='${c_order_id_3}'
            and mtv.m_transporter_id = bs.m_transporter_id`);

            let transporter3 = rows[i].transporter3;
            let total_biaya3 = rows[i].total_biaya3;
            let nomor_resi3 = rows[i].nomor_resi3;
            let quo3 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_3}'`);


            let total_penawaran3 = quo3.recordset[0].total_rows;
            let order3 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_3}'`);

            let deliveriorder = await request.query(`SELECT ck.cmo_kendaraan_id, 
            ck.isactive, ck.created, ck.createdby, ck.updated, 
            ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
            rk.nama,co.schedule_date
            FROM c_order co,cmo_kendaraan ck
            LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
            WHERE co.c_order_id='${c_order_id_3}'
            AND co.cmo_id = ck.cmo_id
            AND co.week_number = ck.week_number
            AND co.week_number=3
            ORDER BY ck.week_number`)

            let dataorder3 = order3.recordset[0];
            let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
            FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
            AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =3`)
            //result.recordset[i].kendaraan3 = kendaraan3.recordset;
             let kendaraanorder3 = await request.query(`SELECT a.tonase,a.kubikasi
             FROM c_order a WHERE a.cmo_id='${cmo_id}'
             AND  week_number=3`)
             //result.recordset[i].kendaraanorder3 = kendaraanorder3.recordset[0];
             let tonase_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].tonase : 0;
             let kubikasi_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].kubikasi : 0;

             let nama3 = [];
             let totalTonaseKendaraan3 = 0
             let totalKubikasiKendaraan3 = 0
   
             for (let i = 0; i < kendaraan3.recordset.length; i++) {
   
               totalTonaseKendaraan3 = totalTonaseKendaraan3 + kendaraan3.recordset[i].tonase
               totalKubikasiKendaraan3 = totalKubikasiKendaraan3 + kendaraan3.recordset[i].kubikasi
               nama3.push(kendaraan3.recordset[i].nama)
             }
   
             let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100;
             let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100;

             let totalCarton3 = 0
             dataorder3.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
             dataorder3.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));
             dataorder3.biddingtransporter = biddingtransporter3.recordset;
             dataorder3.alltransporter = alltransporter.recordset;
             dataorder3.deliveriorder = deliveriorder.recordset;
             dataorder3.total_penawaran = total_penawaran3;
             dataorder3.total_biaya = total_biaya3;
             dataorder3.totalCarton = totalCarton3;
             dataorder3.transporter = transporter3;
             dataorder3.nomor_resi = nomor_resi3;
             dataorder3.namakendaraan = nama3.filter( onlyUnique ).join(",");
             dataorder3.isbiddingweek = rows[i].isbiddingweek3;
             dataorder3.isCreateResi = rows[i].isCreateResi3;
             dataorder3.statusweek = rows[i].statusweek3;
             dataorder3.totalTonaseKendaraan = totalTonaseKendaraan3;
             dataorder3.totalKubikasiKendaraan = totalKubikasiKendaraan3;
             dataorder3.kendaraanorder = kendaraanorder3.recordset[0];
             rows[i].dataorder3 = dataorder3;


          }
          if(c_order_id_4){
            let biddingtransporter4 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
            FROM quo_bidding_shipment bs,m_transporter_v mtv 
            WHERE bs.c_order_id='${c_order_id_4}'
            and mtv.m_transporter_id = bs.m_transporter_id`);
            let transporter4 = rows[i].transporter4;
            let total_biaya4 = rows[i].total_biaya4;
            let nomor_resi4 = rows[i].nomor_resi4;
            let quo4 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_4}'`);
            let total_penawaran4 = quo4.recordset[0].total_rows;
            let order4 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_4}'`);


            let deliveriorder = await request.query(`SELECT ck.cmo_kendaraan_id, 
            ck.isactive, ck.created, ck.createdby, ck.updated, 
            ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
            rk.nama,co.schedule_date
            FROM c_order co,cmo_kendaraan ck
            LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
            WHERE co.c_order_id='${c_order_id_4}'
            AND co.cmo_id = ck.cmo_id
            AND co.week_number = ck.week_number
            AND co.week_number=4
            ORDER BY ck.week_number`)

            let dataorder4 = order4.recordset[0];
            let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
            FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
            AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`)
           // result.recordset[i].kendaraan4 = kendaraan4.recordset;
  
            let kendaraanorder4 = await request.query(`SELECT a.tonase,a.kubikasi
            FROM c_order a WHERE a.cmo_id='${cmo_id}'
            AND  week_number=4`)
            //result.recordset[i].kendaraanorder4 = kendaraanorder4.recordset[0];
            let tonase_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].tonase : 0;
            let kubikasi_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].kubikasi : 0;
            
            let nama4 = [];
            let totalTonaseKendaraan4 = 0
            let totalKubikasiKendaraan4 = 0
  
            for (let i = 0; i < kendaraan4.recordset.length; i++) {
  
              totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase;
              totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi;
              nama4.push(kendaraan4.recordset[i].nama);
            
            }
  
            let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100;
            let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100;
  
           


            let totalCarton4 = 0
            dataorder4.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
            dataorder4.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));


            dataorder4.biddingtransporter = biddingtransporter4.recordset;
            dataorder4.alltransporter = alltransporter.recordset;
            dataorder4.deliveriorder = deliveriorder.recordset;
            dataorder4.total_penawaran = total_penawaran4;
            dataorder4.total_biaya = total_biaya4;
            dataorder4.totalCarton = totalCarton4;
            dataorder4.transporter = transporter4;

            dataorder4.nomor_resi = nomor_resi4;
            dataorder4.namakendaraan = nama4.filter( onlyUnique ).join(",");
            dataorder4.isbiddingweek = rows[i].isbiddingweek4;
            dataorder4.isCreateResi = rows[i].isCreateResi4;
            dataorder4.statusweek = rows[i].statusweek4;
            dataorder4.totalTonaseKendaraan = totalTonaseKendaraan4;
            dataorder4.totalKubikasiKendaraan = totalKubikasiKendaraan4;
            dataorder4.kendaraanorder = kendaraanorder4.recordset[0];
            rows[i].dataorder4 = dataorder4;


          }
          
          let audittracking1 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_1}' AND kode_status='BERANGKAT' ORDER BY created DESC`);
          let audittracking2 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_2}' AND kode_status='BERANGKAT' ORDER BY created DESC`);
          let audittracking3 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_3}' AND kode_status='BERANGKAT' ORDER BY created DESC`);
          let audittracking4 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_4}' AND kode_status='BERANGKAT' ORDER BY created DESC`);

          dataaudittracking1 = audittracking1.recordset[0];
          dataaudittracking2 = audittracking2.recordset[0];
          dataaudittracking3 = audittracking3.recordset[0];
          dataaudittracking4 = audittracking4.recordset[0];


          let audit1 = c_order_id_1 ? audittracking1.recordset.length : 1;
          let audit2 = c_order_id_2 ? audittracking2.recordset.length : 1;
          let audit3 = c_order_id_3 ? audittracking3.recordset.length : 1;
          let audit4 = c_order_id_4 ? audittracking4.recordset.length : 1;

          let status = ``;
          let kodestatus = 0;
          if(audit1 > 0 && audit2 > 0 
            && audit3 > 0 && audit4 > 0){
              status = 'Sudah Ready';
              kodestatus = 1;
          }else{
              status = 'Belum Ready';
              kodestatus = 0;
          }

          delete result.recordset[i].m_distributor_id;
          delete result.recordset[i].r_distribution_channel_id;

          
          rows[i].status = status;
          rows[i].kodestatus = kodestatus;

      
          delete rows[i].c_order_id_1;
          delete rows[i].c_order_id_2;
          delete rows[i].c_order_id_3;
          delete rows[i].c_order_id_4;

          delete result.recordset[i].r_kendaraan_1_id;
          delete rows[i].isCreateResi1;
          delete rows[i].total_biaya1;
          delete rows[i].isbiddingweek1;
          delete rows[i].statusweek1;
          delete rows[i].transporter1;
          delete rows[i].nomor_resi1;
          delete rows[i].biddingtransporter1;
          delete rows[i].alltransporter;
          delete rows[i].total_penawaran1;

          delete result.recordset[i].r_kendaraan_2_id;
          delete rows[i].isCreateResi2;
          delete rows[i].total_biaya2;
          delete rows[i].isbiddingweek2;
          delete rows[i].statusweek2;
          delete rows[i].transporter2;
          delete rows[i].nomor_resi2;
          delete rows[i].biddingtransporter2;
          delete rows[i].total_penawaran2;

          delete result.recordset[i].r_kendaraan_3_id;
          delete rows[i].isCreateResi3;
          delete rows[i].total_biaya3;
          delete rows[i].isbiddingweek3;
          delete rows[i].statusweek3;
          delete rows[i].transporter3;
          delete rows[i].nomor_resi3;
          delete rows[i].biddingtransporter3;
          delete rows[i].total_penawaran3;


          delete result.recordset[i].r_kendaraan_4_id;
          delete rows[i].isCreateResi4;
          delete rows[i].total_biaya4;
          delete rows[i].isbiddingweek4;
          delete rows[i].statusweek4;
          delete rows[i].transporter4;
          delete rows[i].nomor_resi4;
          delete rows[i].biddingtransporter4;
          delete rows[i].total_penawaran4;

          //rows[i].details = details
          
        }

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
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

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
      LEFT JOIN c_shipment ship1 ON (ord1.c_order_id= ship1.c_order_id AND ship1.status_dokumen='VALID')
      LEFT JOIN m_transporter_v mtp1 ON (mtp1.m_transporter_id= ship1.m_transporter_id)
      LEFT JOIN c_order ord2 ON (ord2.cmo_id = c.cmo_id AND ord2.week_number=2)
      LEFT JOIN c_shipment ship2 ON (ord2.c_order_id= ship2.c_order_id AND ship2.status_dokumen='VALID')
      LEFT JOIN m_transporter_v mtp2 ON (mtp2.m_transporter_id= ship2.m_transporter_id)
      LEFT JOIN c_order ord3 ON (ord3.cmo_id = c.cmo_id AND ord3.week_number=3)
      LEFT JOIN c_shipment ship3 ON (ord3.c_order_id= ship3.c_order_id AND ship3.status_dokumen='VALID')
      LEFT JOIN m_transporter_v mtp3 ON (mtp3.m_transporter_id= ship3.m_transporter_id)
      LEFT JOIN c_order ord4 ON (ord4.cmo_id = c.cmo_id AND ord4.week_number=4)
      LEFT JOIN c_shipment ship4 ON (ord4.c_order_id= ship4.c_order_id AND ship4.status_dokumen='VALID')
      LEFT JOIN m_transporter_v mtp4 ON (mtp4.m_transporter_id= ship4.m_transporter_id)
      LEFT JOIN m_distributor_v md ON (md.m_distributor_id = c.m_distributor_id)
      WHERE c.no_sap IS NOT NULL AND c.cmo_id='${req.param(
        "id"
      )}'`;


      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        
        if(result.recordset.length > 0){

          let c_order_id_1 = row.c_order_id_1;
          let c_order_id_2 = row.c_order_id_2;
          let c_order_id_3 = row.c_order_id_3;
          let c_order_id_4 = row.c_order_id_4;

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




          let deliveriorder = await request.query(`SELECT ck.cmo_kendaraan_id, 
          ck.isactive, ck.created, ck.createdby, ck.updated, 
          ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
          rk.nama,co.schedule_date
          FROM c_order co,cmo_kendaraan ck
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
          WHERE co.c_order_id='${c_order_id_2}'
          AND co.cmo_id = ck.cmo_id
          AND co.week_number = ck.week_number
          AND co.week_number=2
          ORDER BY ck.week_number`)


          
          let deliveriorder1 = await request.query(`SELECT ck.cmo_kendaraan_id, 
          ck.isactive, ck.created, ck.createdby, ck.updated, 
          ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
          rk.nama,co.schedule_date
          FROM c_order co,cmo_kendaraan ck
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
          WHERE co.c_order_id='${c_order_id_1}'
          AND co.cmo_id = ck.cmo_id
          AND co.week_number = ck.week_number
          AND co.week_number=1
          ORDER BY ck.week_number`)


          
          let deliveriorder2 = await request.query(`SELECT ck.cmo_kendaraan_id, 
          ck.isactive, ck.created, ck.createdby, ck.updated, 
          ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
          rk.nama,co.schedule_date
          FROM c_order co,cmo_kendaraan ck
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
          WHERE co.c_order_id='${c_order_id_2}'
          AND co.cmo_id = ck.cmo_id
          AND co.week_number = ck.week_number
          AND co.week_number=2
          ORDER BY ck.week_number`)


          
          let deliveriorder3 = await request.query(`SELECT ck.cmo_kendaraan_id, 
          ck.isactive, ck.created, ck.createdby, ck.updated, 
          ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
          rk.nama,co.schedule_date
          FROM c_order co,cmo_kendaraan ck
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
          WHERE co.c_order_id='${c_order_id_3}'
          AND co.cmo_id = ck.cmo_id
          AND co.week_number = ck.week_number
          AND co.week_number=3
          ORDER BY ck.week_number`)

          
          let deliveriorder4 = await request.query(`SELECT ck.cmo_kendaraan_id, 
          ck.isactive, ck.created, ck.createdby, ck.updated, 
          ck.updatedby, ck.cmo_id, co.week_number, ck.r_kendaraan_id,
          rk.nama,co.schedule_date
          FROM c_order co,cmo_kendaraan ck
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = ck.r_kendaraan_id)
          WHERE co.c_order_id='${c_order_id_4}'
          AND co.cmo_id = ck.cmo_id
          AND co.week_number = ck.week_number
          AND co.week_number=4
          ORDER BY ck.week_number`)



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
          if(audittracking1.recordset.length > 0 && audittracking2.recordset.length > 0 
            && audittracking3.recordset.length > 0 && audittracking4.recordset.length > 0){
              status = 'Sudah Ready';
              kodestatus = 1;
          }else{
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

            totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase
            totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi
            nama1.push(kendaraan1.recordset[i].nama)


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
          dataorder1.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
          dataorder1.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
          dataorder2.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
          dataorder2.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));
          dataorder3.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
          dataorder3.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));
          dataorder4.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
          dataorder4.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));

          dataorder1.totalCarton = totalCarton1;
          dataorder2.totalCarton = totalCarton2;
          dataorder3.totalCarton = totalCarton3;
          dataorder4.totalCarton = totalCarton4;

          dataorder1.transporter = transporter1;
          dataorder2.transporter = transporter2;
          dataorder3.transporter = transporter3;
          dataorder4.transporter = transporter4;
          
          dataorder1.nomor_resi = nomor_resi1;
          dataorder2.nomor_resi = nomor_resi2;
          dataorder3.nomor_resi = nomor_resi3;
          dataorder4.nomor_resi = nomor_resi4;

          dataorder1.total_biaya = total_biaya1;
          dataorder2.total_biaya = total_biaya2;
          dataorder3.total_biaya = total_biaya3;
          dataorder4.total_biaya = total_biaya4;

          dataorder1.biddingtransporter = biddingtransporter1.recordset;
          dataorder2.biddingtransporter = biddingtransporter2.recordset;
          dataorder3.biddingtransporter = biddingtransporter3.recordset;
          dataorder4.biddingtransporter = biddingtransporter4.recordset;

          dataorder1.alltransporter = alltransporter.recordset;
          dataorder2.alltransporter = alltransporter.recordset;
          dataorder3.alltransporter = alltransporter.recordset;
          dataorder4.alltransporter = alltransporter.recordset;
        
          dataorder1.deliveriorder = deliveriorder1.recordset;
          dataorder2.deliveriorder = deliveriorder2.recordset;
          dataorder3.deliveriorder = deliveriorder3.recordset;
          dataorder4.deliveriorder = deliveriorder4.recordset;

          dataorder1.total_penawaran = total_penawaran1;
          dataorder2.total_penawaran = total_penawaran2;
          dataorder3.total_penawaran = total_penawaran3;
          dataorder4.total_penawaran = total_penawaran4;

          dataorder1.namakendaraan = nama1.join(",");
          dataorder2.namakendaraan = nama2.join(",");
          dataorder3.namakendaraan = nama3.join(",");
          dataorder4.namakendaraan = nama4.join(",");

          dataorder1.isbiddingweek = row.isbiddingweek1;
          dataorder2.isbiddingweek = row.isbiddingweek2;
          dataorder3.isbiddingweek = row.isbiddingweek3;
          dataorder4.isbiddingweek = row.isbiddingweek4;

          dataorder1.isCreateResi = row.isCreateResi1;
          dataorder2.isCreateResi = row.isCreateResi2;
          dataorder3.isCreateResi = row.isCreateResi3;
          dataorder4.isCreateResi = row.isCreateResi4;

          dataorder1.statusweek = row.statusweek1;
          dataorder2.statusweek = row.statusweek2;
          dataorder3.statusweek = row.statusweek3;
          dataorder4.statusweek = row.statusweek4;

          dataorder1.totalTonaseKendaraan = totalTonaseKendaraan1;
          dataorder2.totalTonaseKendaraan = totalTonaseKendaraan2;
          dataorder3.totalTonaseKendaraan = totalTonaseKendaraan3;
          dataorder4.totalTonaseKendaraan = totalTonaseKendaraan4;

          dataorder1.totalKubikasiKendaraan = totalKubikasiKendaraan1;
          dataorder2.totalKubikasiKendaraan = totalKubikasiKendaraan2;
          dataorder3.totalKubikasiKendaraan = totalKubikasiKendaraan3;
          dataorder4.totalKubikasiKendaraan = totalKubikasiKendaraan4;

          dataorder1.kendaraanorder = kendaraanorder1.recordset[0];
          dataorder2.kendaraanorder = kendaraanorder2.recordset[0];
          dataorder3.kendaraanorder = kendaraanorder3.recordset[0];
          dataorder4.kendaraanorder = kendaraanorder4.recordset[0];

          

          row.dataorder1 = dataorder1;
          row.dataorder2 = dataorder2;
          row.dataorder3 = dataorder3;
          row.dataorder4 = dataorder4;
          
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

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findByDriver: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT 
      sh.c_shipment_id, sh.isactive, sh.created, sh.createdby, 
      sh.updated, sh.updatedby, sh.c_order_id, 
      sh.m_driver_id, sh.nomor_shipment, sh.status, 
      sh.keterangan_status,co.schedule_date 
      FROM c_shipment sh LEFT JOIN c_order co ON(co.c_order_id = sh.c_order_id) WHERE sh.m_driver_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, (err, result) => {
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
  // GET ONE RESOURCE
  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const {m_user_id,delivery_order_id,m_transporter_id,nomor_resi,total_biaya} = req.body;
    await DB.poolConnect;
    try {

      const request = DB.pool.request();
      let cekdata = await request.query(`SELECT * FROM c_shipment 
      WHERE delivery_order_id = '${delivery_order_id}' AND status_dokumen='VALID'`);
      
      if(cekdata.recordset.length > 0){
        let row = cekdata.recordset[0]
        return res.status(200).send({
          status:200,
          error:true,
          message: "Bidding Sudah Ditentukan",
          result: row
        });

      }else{
        let c_shipment_id = uuid();
        let sql =``;

        const sql1 = `INSERT INTO c_shipment
        (c_shipment_id,createdby,updatedby, m_transporter_id, 
        nomor_resi, total_biaya, 
        status, 
        status_dokumen,delivery_order_id)
        VALUES('${c_shipment_id}','${m_user_id}',
        '${m_user_id}', 
        '${c_order_id}', '${m_transporter_id}', 
        '${nomor_resi}',${total_biaya}, 
        'Vendor Transporter Terpilih', 'VALID','${delivery_order_id}')`;


        const sql2 = `INSERT INTO c_shipment
        (c_shipment_id,createdby,updatedby, m_transporter_id, 
        nomor_resi, total_biaya, 
        status, 
        status_dokumen)
        VALUES('${c_shipment_id}','${m_user_id}',
        '${m_user_id}', 
        '${c_order_id}', '${m_transporter_id}', 
        '${nomor_resi}',${total_biaya}, 
        'Vendor Transporter Terpilih', 'VALID')`;


        
        if(delivery_order_id){
          sql = sql1;
        }else{
          sql = sql2;
        }

        request.query(sql,async (err) => {
          if (err) {
            return res.error(err);
          }
          let cmo = await request.query(`SELECT cmo_id FROM c_order WHERE c_order_id='${c_order_id}'`);
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
  
          request.query(queryDataTable,async (err, result) => {
            if (err) {
              return res.error(err);
            }
  
            const row = result.recordset[0];          
            if(result.recordset.length > 0){
    
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
              let cmo_id = row.cmo_id;

              
              
              
              let alltransporter = await request.query(`SELECT mtv.* FROM m_transporter_v mtv`);
              let totalCarton1 = 0;
              let totalCarton2 = 0;
              let totalCarton3 = 0;
              let totalCarton4 = 0;

              let audittracking1 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_1}' 
              AND actions='BERANGKAT' ORDER BY created DESC`);
              let audittracking2 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_2}' 
              AND actions='BERANGKAT' ORDER BY created DESC`);
              let audittracking3 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_3}' 
              AND actions='BERANGKAT' ORDER BY created DESC`);
              let audittracking4 = await request.query(`SELECT TOP 1 * FROM audit_tracking WHERE c_order_id = '${c_order_id_4}' 
              AND actions='BERANGKAT' ORDER BY created DESC`);


              if(c_order_id_1){
                let order1 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_1}'`);
                let dataorder1 = order1.recordset[0];
                let quo1 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_1}'`);
                let total_penawaran1 = quo1.recordset[0].total_rows;

                let kendaraan1 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=1`);

                dataaudittracking1 = audittracking1.recordset[0];
                let kendaraanorder1 = await request.query(`SELECT a.tonase,a.kubikasi
                FROM c_order a WHERE a.cmo_id='${cmo_id}'
                AND  week_number=1`);
                //result.recordset[i].kendaraanorder1 = kendaraanorder1.recordset[0];
                let tonase_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].tonase : 0;
                let kubikasi_1 = (kendaraanorder1.recordset[0]) ? kendaraanorder1.recordset[0].kubikasi : 0;

                
                let totalTonaseKendaraan1 = 0;
                let totalKubikasiKendaraan1 = 0;
                let nama1 = [];

                for (let i = 0; i < kendaraan1.recordset.length; i++) {
    
                  totalTonaseKendaraan1 = totalTonaseKendaraan1 + kendaraan1.recordset[i].tonase;
                  totalKubikasiKendaraan1 = totalKubikasiKendaraan1 + kendaraan1.recordset[i].kubikasi;
                  nama1.push(kendaraan1.recordset[i].nama);
      
      
                }          
                
                let totalPercentaseTonaseOrder1 = (tonase_1 / totalTonaseKendaraan1) * 100;
                let totalPercentaseKubikasiOrder1 = (kubikasi_1 / totalKubikasiKendaraan1) * 100;

                dataorder1.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder1.toPrecision(2));
                dataorder1.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder1.toPrecision(2));
                dataorder1.totalCarton = totalCarton1;
                dataorder1.transporter = transporter1;
                dataorder1.nomor_resi = nomor_resi1;
                dataorder1.total_biaya = total_biaya1;
                dataorder1.alltransporter = alltransporter.recordset;
                dataorder1.total_penawaran = total_penawaran1;
                dataorder1.namakendaraan = nama1.join(",");
                dataorder1.isbiddingweek = row.isbiddingweek1;
                dataorder1.isCreateResi = row.isCreateResi1;
                dataorder1.statusweek = row.statusweek1;
                dataorder1.totalTonaseKendaraan = totalTonaseKendaraan1;
                dataorder1.totalKubikasiKendaraan = totalKubikasiKendaraan1;
                dataorder1.kendaraanorder = kendaraanorder1.recordset[0];
                row.dataorder1 = dataorder1;
      
                let biddingtransporter1 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
                FROM quo_bidding_shipment bs,m_transporter_v mtv 
                WHERE bs.c_order_id='${c_order_id_1}'
                and mtv.m_transporter_id = bs.m_transporter_id`);

                dataorder1.biddingtransporter = biddingtransporter1.recordset;
                delete row.biddingtransporter1;

              }

              if(c_order_id_2){
                let order2 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_2}'`);
                let dataorder2 = order2.recordset[0];
                let quo2 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_2}'`);
                let total_penawaran2 = quo2.recordset[0].total_rows;


                let kendaraan2 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =2`);

                dataaudittracking2 = audittracking2.recordset[0];

                let biddingtransporter2 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
                FROM quo_bidding_shipment bs,m_transporter_v mtv 
                WHERE bs.c_order_id='${c_order_id_2}'
                and mtv.m_transporter_id = bs.m_transporter_id`);

                let kendaraanorder2 = await request.query(`SELECT a.tonase,a.kubikasi
                FROM c_order a WHERE a.cmo_id='${cmo_id}'
                AND  week_number=2`)
                //result.recordset[i].kendaraanorder2 = kendaraanorder2.recordset[0];
                let tonase_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].tonase : 0;
                let kubikasi_2 = (kendaraanorder2.recordset[0]) ? kendaraanorder2.recordset[0].kubikasi : 0;

                let totalTonaseKendaraan2 = 0;
                let totalKubikasiKendaraan2 = 0;
                let nama2 = [];
      
                for (let i = 0; i < kendaraan2.recordset.length; i++) {
      
                  totalTonaseKendaraan2 = totalTonaseKendaraan2 + kendaraan2.recordset[i].tonase;
                  totalKubikasiKendaraan2 = totalKubikasiKendaraan2 + kendaraan2.recordset[i].kubikasi;
                  nama2.push(kendaraan2.recordset[i].nama);
                }
      
                let totalPercentaseTonaseOrder2 = (tonase_2 / totalTonaseKendaraan2) * 100;
                let totalPercentaseKubikasiOrder2 = (kubikasi_2 / totalKubikasiKendaraan2) * 100;
      
                dataorder2.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder2.toPrecision(2));
                dataorder2.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder2.toPrecision(2));
                dataorder2.totalCarton = totalCarton2;
                dataorder2.transporter = transporter2;
                dataorder2.nomor_resi = nomor_resi2;
                dataorder2.total_biaya = total_biaya2;
                dataorder2.alltransporter = alltransporter.recordset;
                dataorder2.total_penawaran = total_penawaran2;
                dataorder2.namakendaraan = nama2.join(",");
                dataorder2.isbiddingweek = row.isbiddingweek2;
                dataorder2.isCreateResi = row.isCreateResi2;
                dataorder2.statusweek = row.statusweek2;
                dataorder2.totalTonaseKendaraan = totalTonaseKendaraan2;
                dataorder2.totalKubikasiKendaraan = totalKubikasiKendaraan2;
                dataorder2.kendaraanorder = kendaraanorder2.recordset[0];
                row.dataorder2 = dataorder2;

                dataorder2.biddingtransporter = biddingtransporter2.recordset;
                delete row.biddingtransporter2;
 
              }

              if(c_order_id_3){
                let order3 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_3}'`);
                let dataorder3 = order3.recordset[0];
                let quo3 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_3}'`);
                let total_penawaran3 = quo3.recordset[0].total_rows;

                let kendaraan3 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =3`);

                let biddingtransporter3 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
                FROM quo_bidding_shipment bs,m_transporter_v mtv 
                WHERE bs.c_order_id='${c_order_id_3}'
                and mtv.m_transporter_id = bs.m_transporter_id`);

                dataaudittracking3 = audittracking3.recordset[0];

                let kendaraanorder3 = await request.query(`SELECT a.tonase,a.kubikasi
                FROM c_order a WHERE a.cmo_id='${cmo_id}'
                AND  week_number=3`)
                //result.recordset[i].kendaraanorder3 = kendaraanorder3.recordset[0];
                let tonase_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].tonase : 0;
                let kubikasi_3 = (kendaraanorder3.recordset[0]) ? kendaraanorder3.recordset[0].kubikasi : 0;

                let totalTonaseKendaraan3 = 0;
                let totalKubikasiKendaraan3 = 0;
                let nama3 = [];
                
                for (let i = 0; i < kendaraan3.recordset.length; i++) {
      
                  totalTonaseKendaraan3 = totalTonaseKendaraan3 + kendaraan3.recordset[i].tonase
                  totalKubikasiKendaraan3 = totalKubikasiKendaraan3 + kendaraan3.recordset[i].kubikasi
                  nama3.push(kendaraan3.recordset[i].nama)
                }
      
      
                let totalPercentaseTonaseOrder3 = (tonase_3 / totalTonaseKendaraan3) * 100;
                let totalPercentaseKubikasiOrder3 = (kubikasi_3 / totalKubikasiKendaraan3) * 100;

                dataorder3.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder3.toPrecision(2));
                dataorder3.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder3.toPrecision(2));
                dataorder3.totalCarton = totalCarton3;
                dataorder3.transporter = transporter3;
                dataorder3.nomor_resi = nomor_resi3;
                dataorder3.total_biaya = total_biaya3;
                dataorder3.alltransporter = alltransporter.recordset;
                dataorder3.total_penawaran = total_penawaran3;
                dataorder3.namakendaraan = nama3.join(",");
                dataorder3.isbiddingweek = row.isbiddingweek3;
                dataorder3.isCreateResi = row.isCreateResi3;
                dataorder3.statusweek = row.statusweek3;
                dataorder3.totalTonaseKendaraan = totalTonaseKendaraan3;
                dataorder3.totalKubikasiKendaraan = totalKubikasiKendaraan3;
                dataorder3.kendaraanorder = kendaraanorder3.recordset[0];
                row.dataorder3 = dataorder3;

                dataorder3.biddingtransporter = biddingtransporter3.recordset;
                delete row.biddingtransporter3;
 
              }

              if(c_order_id_4){
                let order4 = await request.query(`SELECT * FROM c_order WHERE c_order_id = '${c_order_id_4}'`);
                let dataorder4 = order4.recordset[0];
                let quo4 = await request.query(`SELECT COUNT(1) AS total_rows FROM quo_bidding_shipment WHERE c_order_id = '${c_order_id_4}'`);
                let total_penawaran4 = quo4.recordset[0].total_rows;
                let kendaraan4 = await request.query(`SELECT b.*,a.cmo_kendaraan_id
                FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
                AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number =4`);
                let biddingtransporter4 = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
                FROM quo_bidding_shipment bs,m_transporter_v mtv 
                WHERE bs.c_order_id='${c_order_id_4}'
                and mtv.m_transporter_id = bs.m_transporter_id`);

                dataaudittracking4 = audittracking4.recordset[0];

                let kendaraanorder4 = await request.query(`SELECT a.tonase,a.kubikasi
                FROM c_order a WHERE a.cmo_id='${cmo_id}'
                AND  week_number=4`)
                //result.recordset[i].kendaraanorder4 = kendaraanorder4.recordset[0];
                let tonase_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].tonase : 0;
                let kubikasi_4 = (kendaraanorder4.recordset[0]) ? kendaraanorder4.recordset[0].kubikasi : 0;

                let totalTonaseKendaraan4 = 0;
                let totalKubikasiKendaraan4 = 0;
                let nama4 = [];

                for (let i = 0; i < kendaraan4.recordset.length; i++) {
    
                  totalTonaseKendaraan4 = totalTonaseKendaraan4 + kendaraan4.recordset[i].tonase
                  totalKubikasiKendaraan4 = totalKubikasiKendaraan4 + kendaraan4.recordset[i].kubikasi
                  nama4.push(kendaraan4.recordset[i].nama)
                }
      
                let totalPercentaseTonaseOrder4 = (tonase_4 / totalTonaseKendaraan4) * 100;
                let totalPercentaseKubikasiOrder4 = (kubikasi_4 / totalKubikasiKendaraan4) * 100;

                dataorder4.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder4.toPrecision(2));
                dataorder4.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder4.toPrecision(2));
                dataorder4.totalCarton = totalCarton4;
                dataorder4.transporter = transporter4;
                dataorder4.nomor_resi = nomor_resi4;
                dataorder4.total_biaya = total_biaya4;
                dataorder4.alltransporter = alltransporter.recordset;
                dataorder4.total_penawaran = total_penawaran4;
                dataorder4.namakendaraan = nama4.join(",");
                dataorder4.isbiddingweek = row.isbiddingweek4;
                dataorder4.isCreateResi = row.isCreateResi4;
                dataorder4.statusweek = row.statusweek4;
                dataorder4.totalTonaseKendaraan = totalTonaseKendaraan4;
                dataorder4.totalKubikasiKendaraan = totalKubikasiKendaraan4;
                dataorder4.kendaraanorder = kendaraanorder4.recordset[0];
                row.dataorder4 = dataorder4;

                dataorder4.biddingtransporter = biddingtransporter4.recordset;
                delete row.biddingtransporter4;
 
              }    

              
            
              let status = ``;
              let kodestatus = 0;
              if(audittracking1.recordset.length > 0 && audittracking2.recordset.length > 0 
                && audittracking3.recordset.length > 0 && audittracking4.recordset.length > 0){
                  status = 'Sudah Ready';
                  kodestatus = 1;
              }else{
                  status = 'Belum Ready';
                  kodestatus = 0;
              }
    
              delete result.recordset.r_kendaraan_1_id;
              delete result.recordset.r_kendaraan_2_id;
              delete result.recordset.r_kendaraan_3_id;
              delete result.recordset.r_kendaraan_4_id;
              delete result.recordset.m_distributor_id;
              delete result.recordset.r_distribution_channel_id;
    
    
              let queryDetails = await request.query(`SELECT * from cmo_detail where cmo_id='${cmo_id}'`)
    
              let details = queryDetails.recordset;
    
              delete result.recordset.r_kendaraan_1_id
              delete result.recordset.r_kendaraan_2_id
              delete result.recordset.r_kendaraan_3_id
              delete result.recordset.r_kendaraan_4_id
              delete result.recordset.m_distributor_id
              delete result.recordset.r_distribution_channel_id
    
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

            
              delete row.alltransporter;

              delete row.total_penawaran1;
              delete row.total_penawaran2;
              delete row.total_penawaran3;
              delete row.total_penawaran4;
    
              row.details = details
    
    
            }        
    
            return res.success({
              result: row,
              message: "Fetch data successfully"
            });
          });
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const { m_user_id,id,nomor_shipment,status,keterangan_status} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE c_shipment SET updatedby = '${m_user_id}',
                   nomor_shipment = '${nomor_shipment}',status = '${status}',
                   keterangan_status = '${keterangan_status}'
                   WHERE c_shipment_id='${id}'`;

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


  // UPDATE RESOURCE
  assignDriver: async function(req, res) {
    const { m_user_id,c_shipment_id,m_driver_id,nomor_plat_kendaraan,nomor_resi,nama_assisten_driver,nomor_hp_assisten_driver} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let plat_nomor = nomor_plat_kendaraan ? ` , plat_nomor_kendaraan = '${nomor_plat_kendaraan}'` : '';
      let noresi = nomor_resi ? ` , nomor_resi = '${nomor_resi}'` : '';
      let asd = nama_assisten_driver ? ` , nama_assisten_driver = '${nama_assisten_driver}'` : '';
      let noasd = nomor_hp_assisten_driver ? ` , nomor_hp_assisten_driver = '${nomor_hp_assisten_driver}'` : '';


      let sqlgetdo = `SELECT * FROM c_shipment WHERE c_shipment_id = '${c_shipment_id}'`
      let datashipment =  await request.query(sqlgetdo);
      let delivery_order_id = datashipment.recordset[0].delivery_order_id;


      
      const sql = `UPDATE c_shipment SET updatedby = '${m_user_id}',
                   status = 'Driver Ready',
                   m_driver_id = '${m_driver_id}' ${plat_nomor} ${noresi} ${asd} ${noasd}
                   WHERE c_shipment_id='${c_shipment_id}'`;

      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const InserDriverDo = `INSERT INTO
        delivery_order_driver
        (delivery_order_id, m_driver_id)
        VALUES('${delivery_order_id}', '${m_driver_id}')`;
        await request.query(InserDriverDo);

        return res.success({
          data: result,
          message: "Assign driver successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  assignDriverMultiple: async function(req, res) {
    const { m_user_id,m_driver_id,nomor_plat_kendaraan,nomor_resi,nama_assisten_driver,nomor_hp_assisten_driver,bundle} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      for (let i = 0; i < bundle.length; i++) {
        let bundle_id = bundle[i].bundle_id;
        let plat_nomor = nomor_plat_kendaraan ? ` , t1.plat_nomor_kendaraan = '${nomor_plat_kendaraan}'` : '';
        let noresi = nomor_resi ? ` , t1.nomor_resi = '${nomor_resi}'` : '';
        let asd = nama_assisten_driver ? ` , t1.nama_assisten_driver = '${nama_assisten_driver}'` : '';
        let noasd = nomor_hp_assisten_driver ? ` , t1.nomor_hp_assisten_driver = '${nomor_hp_assisten_driver}'` : '';

      
        let sql = 
        `UPDATE t1
        SET 
            t1.updated = getdate(),
            t1.updatedby = '${m_user_id}',
            t1.m_driver_id = '${m_driver_id}'
            ${plat_nomor}
            ${noresi}
            ${asd}
            ${noasd}
        FROM 
            c_shipment t1
            LEFT JOIN delivery_order t2 ON (t1.delivery_order_id = t2.delivery_order_id)
        WHERE 
        t2.bundle_id = '${bundle_id}'`;
        await request.query(sql);
        
      }

      return res.success({
          message: "Assign driver successfully"
      });
      
      // let plat_nomor = nomor_plat_kendaraan ? ` , t1.plat_nomor_kendaraan = '${nomor_plat_kendaraan}'` : '';
      // let noresi = nomor_resi ? ` , t1.nomor_resi = '${nomor_resi}'` : '';
      // let asd = nama_assisten_driver ? ` , t1.nama_assisten_driver = '${nama_assisten_driver}'` : '';
      // let noasd = nomor_hp_assisten_driver ? ` , t1.nomor_hp_assisten_driver = '${nomor_hp_assisten_driver}'` : '';

      // const sql = 
      // `UPDATE t1
      //  SET 
      //     t1.updated = getdate(),
      //     t1.updatedby = '${m_user_id}',
      //     t1.m_driver_id = '${m_driver_id}'
      //     ${plat_nomor}
      //     ${noresi}
      //     ${asd}
      //     ${noasd}
      //  FROM 
      //     c_shipment t1
      //     LEFT JOIN delivery_order t2 ON (t1.delivery_order_id = t2.delivery_order_id)
      //  WHERE 
      //  t2.bundle_id = '${bundle_id}'`;

      // console.log(sql);

      // request.query(sql, async (err, result) => {
      //   if (err) {
      //     return res.error(err);
      //   }


      //   return res.success({
      //     data: result,
      //     message: "Assign driver successfully"
      //   });
      // });
    } catch (err) {
      return res.error(err);
    }
  },
  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM c_shipment WHERE c_shipment_id='${id}'`;

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
  }
};


function onlyUnique(value, index, self) { 
  return self.indexOf(value) === index;
}