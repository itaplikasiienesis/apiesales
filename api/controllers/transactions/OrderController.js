/* eslint-disable no-empty */
/* eslint-disable no-console */
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
const otpGenerator = require('otp-generator');
const moment = require('moment');

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
      

     listOrg = organization.length > 0 && req.query.filter ? `AND c.r_organisasi_id IN (${valueIN})` : "";      
     listOrg = organization.length > 0 && req.query.filter==undefined ? `AND c.r_organisasi_id IN (${valueIN})` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM c_order a,cmo b,m_distributor_v c
                              WHERE a.cmo_id = b.cmo_id
                              AND c.m_distributor_id = b.m_distributor_id
                              ${whereClause}
                              ${listOrg}`;      

      let queryDataTable = `SELECT a.c_order_id, 
                                a.isactive, 
                                a.created, 
                                a.createdby, 
                                a.updated, 
                                a.updatedby, 
                                a.cmo_id, 
                                a.week_number,
                                CONCAT('Minggu Ke ',a.week_number) week_information,
                                a.schedule_date, 
                                a.tonase, 
                                a.kubikasi, 
                                a.nomor_sap, 
                                a.nomor_shipment, 
                                a.status
                                FROM c_order a,cmo b,m_distributor_v c
                                WHERE a.cmo_id = b.cmo_id
                                AND c.m_distributor_id = b.m_distributor_id
                                ${whereClause}
                                ${listOrg}
                            ORDER BY a.schedule_date desc
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
        
        for(let i = 0;i< rows.length ; i++){

            let cmo_id = rows[i].cmo_id;
            let cmo = await request.query(`SELECT
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
            a.nomor_so_1,
            co1.nomor_sap AS nomor_so_1,
            co1.status AS status_so_1,
            a.schedule_2,
            a.tonase_2,
            a.kubikasi_2,
            a.nomor_so_2,
            co2.nomor_sap AS nomor_so_2,
            co2.status AS status_so_2,
            a.schedule_3,
            a.tonase_3,
            a.kubikasi_3,
            a.nomor_so_3,
            co3.nomor_sap AS nomor_so_3,
            co3.status AS status_so_3,
            a.schedule_4,
            a.tonase_4,
            a.kubikasi_4,
            a.nomor_so_4,
            co4.nomor_sap AS nomor_so_4,
            co4.status AS status_so_4,
            a.no_sap
            FROM cmo a
            LEFT JOIN m_distributor b ON(a.m_distributor_id = b.m_distributor_id)
            LEFT JOIN c_order co1 ON(co1.cmo_id = a.cmo_id and co1.week_number=1)
            LEFT JOIN c_order co2 ON(co2.cmo_id = a.cmo_id and co2.week_number=2)
            LEFT JOIN c_order co3 ON(co3.cmo_id = a.cmo_id and co3.week_number=3)
            LEFT JOIN c_order co4 ON(co4.cmo_id = a.cmo_id and co4.week_number=4)
            WHERE a.cmo_id ='${cmo_id}'`)
            
            let cmorows = cmo.recordset;
            for(let j = 0;j < cmo.recordset.length ; j++){
              
              let m_distributor_id = cmorows[j].m_distributor_id;
              let r_distribution_channel_id = cmorows[j].r_distribution_channel_id;
              let r_kendaraan_1_id = cmorows[j].r_kendaraan_1_id;
              let r_kendaraan_2_id = cmorows[j].r_kendaraan_2_id;
              let r_kendaraan_3_id = cmorows[j].r_kendaraan_3_id;
              let r_kendaraan_4_id = cmorows[j].r_kendaraan_4_id;

              let distributor = await request.query(`SELECT a.*,b.nama from m_distributor a,r_organisasi b 
              where m_distributor_id='${m_distributor_id}' and a.r_organisasi_id = b.r_organisasi_id`)
              cmorows[j].distributor = distributor.recordset[0];

              let m_pajak_id = distributor.recordset[0].m_pajak_id;

              let pajak = await request.query(`SELECT a.*,b.nama from m_pajak a,r_organisasi b where m_pajak_id='${m_pajak_id}' and a.r_organisasi_id = b.r_organisasi_id`)
              cmorows[j].pajak = pajak.recordset[0];

              let distributor_channel = await request.query(`SELECT * from r_distribution_channel where r_distribution_channel_id='${r_distribution_channel_id}'`)
              cmorows[j].distributor_channel = distributor_channel.recordset[0];

              let kendaraan1 = await request.query(`SELECT * from r_kendaraan where r_kendaraan_id='${r_kendaraan_1_id}'`)
              cmorows[j].kendaraan1 = kendaraan1.recordset[0];

              let kendaraan2 = await request.query(`SELECT * from r_kendaraan where r_kendaraan_id='${r_kendaraan_2_id}'`)
              cmorows[j].kendaraan2 = kendaraan2.recordset[0];

              let kendaraan3 = await request.query(`SELECT * from r_kendaraan where r_kendaraan_id='${r_kendaraan_3_id}'`)
              cmorows[j].kendaraan3 = kendaraan3.recordset[0];

              let kendaraan4 = await request.query(`SELECT * from r_kendaraan where r_kendaraan_id='${r_kendaraan_4_id}'`)
              cmorows[j].kendaraan4 = kendaraan4.recordset[0];

              delete cmorows[j].r_kendaraan_1_id
              delete cmorows[j].r_kendaraan_2_id
              delete cmorows[j].r_kendaraan_3_id
              delete cmorows[j].r_kendaraan_4_id
              delete cmorows[j].m_distributor_id
              delete cmorows[j].r_distribution_channel_id
              
            }
            rows[i].cmo = cmorows[0];
            delete result.recordset[i].cmo_id;



            let totalTonaseKendaraan = 0;
            let totalKubikasiKendaraan = 0;
            let nama1 = [];


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

  // GET ONE RESOURCE
  view: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `
      SELECT a.c_order_id, 
      a.isactive, 
      a.created, 
      a.createdby, 
      a.updated, 
      a.updatedby, 
      a.cmo_id, 
      a.week_number,
      CONCAT('Minggu Ke ',a.week_number) week_information,
      a.schedule_date, 
      a.tonase, 
      a.kubikasi, 
      a.nomor_sap, 
      a.nomor_shipment, 
      a.status FROM c_order a WHERE a.c_order_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        if(result.recordset.length > 0){

            let week_number = row.week_number;
            let cmo_id = row.cmo_id;
            let c_order_id = row.c_order_id;
            let cmo = await request.query(`SELECT
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
            a.nomor_so_1,
            co1.nomor_sap AS nomor_so_1,
            co1.status AS status_so_1,
            a.schedule_2,
            a.tonase_2,
            a.kubikasi_2,
            a.nomor_so_2,
            co2.nomor_sap AS nomor_so_2,
            co2.status AS status_so_2,
            a.schedule_3,
            a.tonase_3,
            a.kubikasi_3,
            a.nomor_so_3,
            co3.nomor_sap AS nomor_so_3,
            co3.status AS status_so_3,
            a.schedule_4,
            a.tonase_4,
            a.kubikasi_4,
            a.nomor_so_4,
            co4.nomor_sap AS nomor_so_4,
            co4.status AS status_so_4,
            a.no_sap
            FROM cmo a
            LEFT JOIN m_distributor b ON(a.m_distributor_id = b.m_distributor_id)
            LEFT JOIN c_order co1 ON(co1.cmo_id = a.cmo_id and co1.week_number=1)
            LEFT JOIN c_order co2 ON(co2.cmo_id = a.cmo_id and co2.week_number=2)
            LEFT JOIN c_order co3 ON(co3.cmo_id = a.cmo_id and co3.week_number=3)
            LEFT JOIN c_order co4 ON(co4.cmo_id = a.cmo_id and co4.week_number=4)
            WHERE a.cmo_id ='${cmo_id}'`);
            
            let cmorows = cmo.recordset;
            for(let j = 0;j < cmo.recordset.length ; j++){
              
              let m_distributor_id = cmorows[j].m_distributor_id;
              let distributor = await request.query(`SELECT a.* from m_distributor_v a
              where m_distributor_id='${m_distributor_id}'`);
              cmorows[j].distributor = distributor.recordset[0];
              
              let r_distribution_channel_id = distributor.recordset[0].r_distribution_channel_id;
              let m_pajak_id = distributor.recordset[0].m_pajak_id;

              let pajak = await request.query(`SELECT a.*,b.nama from m_pajak a,r_organisasi b 
              where m_pajak_id='${m_pajak_id}' and a.r_organisasi_id = b.r_organisasi_id`);
              cmorows[j].pajak = pajak.recordset[0];

              let distributor_channel = await request.query(`SELECT * from r_distribution_channel 
              where r_distribution_channel_id='${r_distribution_channel_id}'`);
              cmorows[j].distributor_channel = distributor_channel.recordset[0];

              let kendaraan = await request.query(`SELECT b.*,a.cmo_kendaraan_id
              FROM cmo_kendaraan a,r_kendaraan b WHERE a.cmo_id='${cmo_id}'
              AND a.r_kendaraan_id = b.r_kendaraan_id AND week_number=${week_number}`);
              cmorows[j].kendaraan = kendaraan.recordset;

              delete cmorows[j].m_distributor_id;
              let totalTonaseKendaraan = 0;
              let totalKubikasiKendaraan = 0;
              let nama = [];

              for (let i = 0; i < kendaraan.recordset.length; i++) {
    
                totalTonaseKendaraan = totalTonaseKendaraan + kendaraan.recordset[i].tonase;
                totalKubikasiKendaraan = totalKubikasiKendaraan + kendaraan.recordset[i].kubikasi;
                nama.push(kendaraan.recordset[i].nama);
    
    
              }
              let tonase = row.tonase;
              let kubikasi = row.kubikasi;

              let totalPercentaseTonaseOrder = (tonase / totalTonaseKendaraan) * 100;
              let totalPercentaseKubikasiOrder = (kubikasi / totalKubikasiKendaraan) * 100;

              let queryDetails = await request.query(`SELECT * from cmo_detail where cmo_id='${cmo_id}'`);
              let details = queryDetails.recordset;
              let totalCarton = 0;
              let totalBruto = 0;
              for (let i = 0; i < queryDetails.recordset.length; i++) {

                let m_produk_id = details[i].m_produk_id
                let produk = await request.query(`SELECT * from m_produk where m_produk_id='${m_produk_id}'`)
                details[i].produk = produk.recordset[i];
    
                let r_uom_id = details[i].r_uom_id
                let uom = await request.query(`SELECT * from r_uom where r_uom_id='${r_uom_id}'`)
                details[i].uom = uom.recordset[i];
    
                if(week_number==1){
                  totalCarton = totalCarton + details[i].qty_order_1;
                  totalBruto = totalBruto + (details[i].qty_order_1 * details[i].harga);
                }else if(week_number==2){
                  totalCarton = totalCarton + details[i].qty_order_2;
                  totalBruto = totalBruto + (details[i].qty_order_2 * details[i].harga);
                }else if(week_number==3){
                  totalCarton = totalCarton + details[i].qty_order_3;
                  totalBruto = totalBruto + (details[i].qty_order_3 * details[i].harga);
                }else if(week_number==4){
                  totalCarton = totalCarton + details[i].qty_order_4;
                  totalBruto = totalBruto + (details[i].qty_order_4 * details[i].harga);
                }

                delete details[i].m_produk_id
                delete details[i].r_uom_id
    
              }
              let biddingtransporter = await request.query(`SELECT mtv.*,bs.price,bs.keterangan 
              FROM quo_bidding_shipment bs,m_transporter_v mtv 
              WHERE bs.c_order_id='${c_order_id}'
              and mtv.m_transporter_id = bs.m_transporter_id`);

              let alltransporter = await request.query(`SELECT mtv.* FROM m_transporter_v mtv`);


              let number = otpGenerator.generate(6, { upperCase: false, specialChars: false,alphabets:false });
              let kode_distributor = cmorows[0].distributor.kode
              let nomor_resi = moment().format('YYYYMMDD').concat("-").concat(kode_distributor).concat("-").concat(number);

              row.nomor_resi = nomor_resi;
              row.namakendaraan = nama.join(",");
              row.totalTonaseKendaraan = totalTonaseKendaraan;
              row.totalKubikasiKendaraan = totalKubikasiKendaraan;
              row.totalPercentaseTonaseOrder = parseFloat(totalPercentaseTonaseOrder.toPrecision(2));
              row.totalPercentaseKubikasiOrder = parseFloat(totalPercentaseKubikasiOrder.toPrecision(2));
              row.totalCarton = totalCarton;
              row.totalBruto = totalBruto;
              row.biddingtransporter = biddingtransporter.recordset
              row.alltransporter = alltransporter.recordset
              row.cmo = cmorows[0];

              
            }

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
  update: async function(req, res) {
    const {m_user_id,orderdetail} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      
      let dataorderdetail = ''
      for(let i = 0 ; i < orderdetail.length; i++){

        if(i < (orderdetail.length - 1)){
          dataorderdetail = dataorderdetail.concat("'".concat(orderdetail[i].c_orderdetail_id).concat("'").concat(","))
        }else{
          dataorderdetail = dataorderdetail.concat("'".concat(orderdetail[i].c_orderdetail_id).concat("'"))
        }
        
       
      }

      
      const sql = `SELECT * FROM c_orderdetail WHERE c_orderdetail_id in (${dataorderdetail})`;
      request.query(sql, async(err, result) => {
        if (err) {
          return res.error(err);
        }
          
        const rows = result.recordset;        
        for(let i = 0;i< rows.length ; i++){

              let newQty = orderdetail[i].qty
              let newProdukid = orderdetail[i].m_produk_id
              let newUomid= orderdetail[i].r_uom_id
              let newharga= orderdetail[i].harga
              let newTotalOrder= orderdetail[i].total_order


              let c_order_id = rows[i].c_order_id;
              let c_orderdetail_id = rows[i].c_orderdetail_id;
              let m_produk_id = rows[i].m_produk_id;
              let r_uom_id = rows[i].r_uom_id;
              let qty = rows[i].qty;
              let harga = rows[i].harga;
              let total_order = rows[i].total_order;
              let cmo_detail_id = rows[i].cmo_detail_id;

              if(newTotalOrder !== total_order || newharga !== harga || newUomid !== r_uom_id || newProdukid !== m_produk_id || newQty !== qty){


                      let order = await request.query(`SELECT * from c_order where c_order_id='${c_order_id}'`)
                      result.recordset[i].order = order.recordset[0];

                      let cmodetail = await request.query(`SELECT * from cmo_detail where cmo_detail_id='${cmo_detail_id}'`)
                      result.recordset[i].cmodetail = cmodetail.recordset[0];


                      let week_number = result.recordset[i].order.week_number
                      let qty1 = result.recordset[i].cmodetail.qty_order_1 
                      let qty2 = result.recordset[i].cmodetail.qty_order_2 
                      let qty3 = result.recordset[i].cmodetail.qty_order_3 
                      let qty4 = result.recordset[i].cmodetail.qty_order_4

                      let bruto = []
                      if(week_number==1){

                        let UpdateSql = `UPDATE c_orderdetail
                        SET updatedby='${m_user_id}', 
                        m_produk_id='${newProdukid}', 
                        r_uom_id='${newUomid}', 
                        qty=${newQty}, 
                        harga=${newharga}, 
                        total_order=${newTotalOrder}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`

                        request.query(UpdateSql, async(err) => {
                          if (err) {
                            return res.error(err);
                          }

                              let totalorder = parseFloat(newQty) + parseFloat(qty2) + parseFloat(qty3) + parseFloat(qty4)
                              let kalkulasibruto = totalorder * parseFloat(newharga)

                              let UpdateCmoDetail = `UPDATE cmo_detail
                              SET updatedby='${m_user_id}', 
                              m_produk_id='${newProdukid}', 
                              r_uom_id='${newUomid}', 
                              qty_order_1=${newQty}, 
                              harga=${newharga}, 
                              total_order=${totalorder},
                              bruto=${kalkulasibruto}
                              WHERE cmo_detail_id='${cmo_detail_id}'`

                              request.query(UpdateCmoDetail, async(err, resultUpdateCmoDetail) => {
                                if (err) {
                                  return res.error(err);
                                }
                                return res.success({
                                  data: resultUpdateCmoDetail,
                                  message: "Update data successfully"
                                });
                              })

                              
                        });
                        
                      }else if(week_number==2){

                        let UpdateSql = `UPDATE c_orderdetail
                        SET updatedby='${m_user_id}', 
                        m_produk_id='${newProdukid}', 
                        r_uom_id='${newUomid}', 
                        qty=${newQty}, 
                        harga=${newharga}, 
                        total_order=${newTotalOrder}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`

                        request.query(UpdateSql, async(err) => {
                          if (err) {
                            return res.error(err);
                          }

                            let totalorder = parseFloat(qty1) + parseFloat(newQty) + parseFloat(qty3) + parseFloat(qty4)
                            let kalkulasibruto = totalorder * parseFloat(newharga)

                            let UpdateCmoDetail = `UPDATE cmo_detail
                            SET updatedby='${m_user_id}', 
                            m_produk_id='${newProdukid}', 
                            r_uom_id='${newUomid}', 
                            qty_order_2=${newQty}, 
                            harga=${newharga}, 
                            total_order=${totalorder},
                            bruto=${kalkulasibruto}
                            WHERE cmo_detail_id='${cmo_detail_id}'`

                            request.query(UpdateCmoDetail, async(err, resultUpdateCmoDetail) => {
                              if (err) {
                                return res.error(err);
                              }
                              return res.success({
                                data: resultUpdateCmoDetail,
                                message: "Update data successfully"
                              });
                            })
                            
                        });
                        

                      }else if(week_number==3){

                        let UpdateSql = `UPDATE c_orderdetail
                        SET updatedby='${m_user_id}', 
                        m_produk_id='${newProdukid}', 
                        r_uom_id='${newUomid}', 
                        qty=${newQty}, 
                        harga=${newharga}, 
                        total_order=${newTotalOrder}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`

                        request.query(UpdateSql, async(err) => {
                          if (err) {
                            return res.error(err);
                          }

                            let totalorder = parseFloat(qty1) + parseFloat(qty2) + parseFloat(newQty) + parseFloat(qty4)
                            let kalkulasibruto = totalorder * parseFloat(newharga)

                            let UpdateCmoDetail = `UPDATE cmo_detail
                            SET updatedby='${m_user_id}', 
                            m_produk_id='${newProdukid}', 
                            r_uom_id='${newUomid}', 
                            qty_order_3=${newQty}, 
                            harga=${newharga}, 
                            total_order=${totalorder},
                            bruto=${kalkulasibruto}
                            WHERE cmo_detail_id='${cmo_detail_id}'`

                            request.query(UpdateCmoDetail, async(err, resultUpdateCmoDetail) => {
                              if (err) {
                                return res.error(err);
                              }
                              return res.success({
                                data: resultUpdateCmoDetail,
                                message: "Update data successfully"
                              });
                            })
                        
                          });
                                        

                      }else if(week_number==4){
                        
                        let UpdateSql = `UPDATE c_orderdetail
                        SET updatedby='${m_user_id}', 
                        m_produk_id='${newProdukid}', 
                        r_uom_id='${newUomid}', 
                        qty=${newQty}, 
                        harga=${newharga}, 
                        total_order=${newTotalOrder}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`

                        request.query(UpdateSql, async(err) => {
                          if (err) {
                            return res.error(err);
                          }

                            let totalorder = parseFloat(qty1) + parseFloat(qty2) + parseFloat(qty3) + parseFloat(newQty)
                            let kalkulasibruto = totalorder * parseFloat(newharga)

                            let UpdateCmoDetail = `UPDATE cmo_detail
                            SET updatedby='${m_user_id}', 
                            m_produk_id='${newProdukid}', 
                            r_uom_id='${newUomid}', 
                            qty_order_4=${newQty}, 
                            harga=${newharga}, 
                            total_order=${totalorder},
                            bruto=${kalkulasibruto}
                            WHERE cmo_detail_id='${cmo_detail_id}'`

                            request.query(UpdateCmoDetail, async(err, resultUpdateCmoDetail) => {
                              if (err) {
                                return res.error(err);
                              }
                              return res.success({
                                data: resultUpdateCmoDetail,
                                message: "Update data successfully"
                              });
                            })
                        
                          });
                                        

                      }
              }

              
          

        }
      });
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
      const sql = `DELETE FROM c_order WHERE c_order_id='${id}'`;

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
