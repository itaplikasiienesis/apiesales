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
 const bcrypt = require('bcryptjs');
 const moment = require('moment');
 
 module.exports = {
   // GET ALL RESOURCE
 
   // DELETE RESOURCE
   regenerate: async function(req, res) {
     const { cmo_id,m_user_id } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let header = await request.query(`SELECT * FROM cmo WHERE cmo_id = '${cmo_id}'`);
       let detail = await request.query(`SELECT * FROM cmo_detail WHERE cmo_id = '${cmo_id}' AND total_order > 0`) ;
       let user = m_user_id ? m_user_id : 'SYS';

       let dataheader = header.recordset[0];

       console.log(header);

       let schedule_1 = dataheader.schedule_1 ? moment(dataheader.schedule_1,'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;
       console.log('schedule_1 ',schedule_1);


       let schedule_2 = dataheader.schedule_2 ? moment(dataheader.schedule_2,'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;
       console.log('schedule_2 ',schedule_2);

       let schedule_3 = dataheader.schedule_3 ? moment(dataheader.schedule_3,'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;
       console.log('schedule_3 ',schedule_3);


       let schedule_4 = dataheader.schedule_4 ? moment(dataheader.schedule_4,'YYYY-MM-DD').format('YYYY-MM-DD') : undefined;
       console.log('schedule_4 ',schedule_4);



       let data = detail.recordset;
       //console.log(datanya);
       for (let transform = 1; transform <= 4; transform++) {

            if (transform == 1 && (schedule_1)) {

                let total_tonase_1 = 0;
                let total_kubikasi_1 = 0;
                let sqlgetdeatlweek1 = `SELECT cd.*,mp.tonase,mp.kubikasi FROM cmo_detail cd,m_produk mp 
                WHERE cd.cmo_id = '${cmo_id}' AND cd.qty_order_1 > 0
                AND mp.m_produk_id = cd.m_produk_id`;
                let dataweek1 = await request.query(sqlgetdeatlweek1);
                let week1 = dataweek1.recordset;

                for (let i = 0; i < week1.length; i++) {
                    total_tonase_1 = total_tonase_1 + week1[i].tonase;
                    total_kubikasi_1 = total_kubikasi_1 + week1[i].kubikasi;
                }


                let c_order_id = uuid();
                let SqlOrder = `INSERT INTO c_order
                (c_order_id,
                createdby,
                updatedby,  
                cmo_id, week_number, schedule_date,
                tonase, kubikasi,
                status)
                VALUES('${c_order_id}','${user}', '${user}','${cmo_id}', 1,'${schedule_1}',
                ${total_tonase_1},
                ${total_kubikasi_1},
                'Draft')`;
                console.log(SqlOrder);

                await request.query(SqlOrder);


                for (let i = 0; i < week1.length; i++) {

                  let cmo_detail_id = week1[i].cmo_detail_id;
                  let m_produk_id = week1[i].m_produk_id;
                  let r_uom_id = week1[i].r_uom_id;
                  let stok_awal = week1[i].stok_awal;
                  let stok_pending = week1[i].stok_pending;
                  let total_stok = week1[i].total_stok;
                  let estimasi_sales_bulan_berjalan = week1[i].estimasi_sales_bulan_berjalan;
                  let stok_akhir = week1[i].stok_akhir;
                  let estimasi_sales_bulan_depan = week1[i].estimasi_sales_bulan_depan;
                  let buffer_stok = week1[i].buffer_stok;
                  let avarage_sales_tiga_bulan = week1[i].avarage_sales_tiga_bulan;
                  let doi = week1[i].doi;
                  let cmo = week1[i].cmo;
                  let qty = week1[i].qty_order_1;
                  let harga = week1[i].harga;
                  let total_order = qty * week1[i].harga;
                  let estimasi_sales_duabulan_kedepan = week1[i].estimasi_sales_duabulan_kedepan;
                  let estimasi_sales_bulan_lalu = week1[i].estimasi_sales_bulan_lalu;
                  let week_number = 1;
                  let harga_nett = week1[i].harga_nett;
                  let total_nett = week1[i].total_nett;
                  
                  

                  let line = i + 1;
                  let sqlInsertDetail = `INSERT INTO c_orderdetail
                  (createdby, updatedby, c_order_id, line, cmo_detail_id, m_produk_id, r_uom_id, stok_awal, stok_pending, 
                  total_stok, estimasi_sales_bulan_berjalan, stok_akhir, estimasi_sales_bulan_depan, buffer_stok, 
                  avarage_sales_tiga_bulan, doi, cmo, qty, harga, total_order, estimasi_sales_duabulan_kedepan, 
                  estimasi_sales_bulan_lalu, week_number, harga_nett, total_order_nett)
                  VALUES('${user}', '${user}', '${c_order_id}', ${line}, 
                  '${cmo_detail_id}', '${m_produk_id}', '${r_uom_id}', 
                  ${stok_awal}, ${stok_pending}, ${total_stok}, ${estimasi_sales_bulan_berjalan}, ${stok_akhir}, ${estimasi_sales_bulan_depan}, ${buffer_stok}, 
                  ${avarage_sales_tiga_bulan}, ${doi}, ${cmo}, ${qty}, ${harga}, ${total_order}, ${estimasi_sales_duabulan_kedepan}, 
                  ${estimasi_sales_bulan_lalu}, ${week_number}, ${harga_nett}, 
                  ${total_nett})`;

                  await request.query(sqlInsertDetail);

                }

            }else if (transform == 2 && (schedule_2)) {

              let total_tonase_2 = 0;
              let total_kubikasi_2 = 0;
              let sqlgetdeatlweek2 = `SELECT cd.*,mp.tonase,mp.kubikasi FROM cmo_detail cd,m_produk mp 
              WHERE cd.cmo_id = '${cmo_id}' AND cd.qty_order_2 > 0
              AND mp.m_produk_id = cd.m_produk_id`;
              let dataweek2 = await request.query(sqlgetdeatlweek2);
              let week2 = dataweek2.recordset;

              for (let i = 0; i < week2.length; i++) {
                  total_tonase_2 = total_tonase_2 + week2[i].tonase;
                  total_kubikasi_2 = total_kubikasi_2 + week2[i].kubikasi;
              }


              let c_order_id = uuid();
              let SqlOrder = `INSERT INTO c_order
              (c_order_id,
              createdby,
              updatedby,  
              cmo_id, week_number, schedule_date,
              tonase, kubikasi,
              status)
              VALUES('${c_order_id}','${user}', '${user}','${cmo_id}', 2,'${schedule_2}',
              ${total_tonase_2},
              ${total_kubikasi_2},
              'Draft')`;
              console.log(SqlOrder);

              await request.query(SqlOrder);


                for (let i = 0; i < week2.length; i++) {

                  let cmo_detail_id = week2[i].cmo_detail_id;
                  let m_produk_id = week2[i].m_produk_id;
                  let r_uom_id = week2[i].r_uom_id;
                  let stok_awal = week2[i].stok_awal;
                  let stok_pending = week2[i].stok_pending;
                  let total_stok = week2[i].total_stok;
                  let estimasi_sales_bulan_berjalan = week2[i].estimasi_sales_bulan_berjalan;
                  let stok_akhir = week2[i].stok_akhir;
                  let estimasi_sales_bulan_depan = week2[i].estimasi_sales_bulan_depan;
                  let buffer_stok = week2[i].buffer_stok;
                  let avarage_sales_tiga_bulan = week2[i].avarage_sales_tiga_bulan;
                  let doi = week2[i].doi;
                  let cmo = week2[i].cmo;
                  let qty = week2[i].qty_order_2;
                  let harga = week2[i].harga;
                  let total_order = qty * week2[i].harga;
                  let estimasi_sales_duabulan_kedepan = week2[i].estimasi_sales_duabulan_kedepan;
                  let estimasi_sales_bulan_lalu = week2[i].estimasi_sales_bulan_lalu;
                  let week_number = 2;
                  let harga_nett = week2[i].harga_nett;
                  let total_nett = week2[i].total_nett;
                  
                  

                  let line = i + 1;
                  let sqlInsertDetail = `INSERT INTO dbesales.dbo.c_orderdetail
                  (createdby, updatedby, c_order_id, line, cmo_detail_id, m_produk_id, r_uom_id, stok_awal, stok_pending, 
                  total_stok, estimasi_sales_bulan_berjalan, stok_akhir, estimasi_sales_bulan_depan, buffer_stok, 
                  avarage_sales_tiga_bulan, doi, cmo, qty, harga, total_order, estimasi_sales_duabulan_kedepan, 
                  estimasi_sales_bulan_lalu, week_number, harga_nett, total_order_nett)
                  VALUES('${user}', '${user}', '${c_order_id}', ${line}, 
                  '${cmo_detail_id}', '${m_produk_id}', '${r_uom_id}', 
                  ${stok_awal}, ${stok_pending}, ${total_stok}, ${estimasi_sales_bulan_berjalan}, ${stok_akhir}, ${estimasi_sales_bulan_depan}, ${buffer_stok}, 
                  ${avarage_sales_tiga_bulan}, ${doi}, ${cmo}, ${qty}, ${harga}, ${total_order}, ${estimasi_sales_duabulan_kedepan}, 
                  ${estimasi_sales_bulan_lalu}, ${week_number}, ${harga_nett}, 
                  ${total_nett})`;

                  await request.query(sqlInsertDetail);

                }

          }else if (transform == 3 && (schedule_3)) {

            let total_tonase_3 = 0;
            let total_kubikasi_3 = 0;
            let sqlgetdeatlweek3 = `SELECT cd.*,mp.tonase,mp.kubikasi FROM cmo_detail cd,m_produk mp 
            WHERE cd.cmo_id = '${cmo_id}' AND cd.qty_order_3 > 0
            AND mp.m_produk_id = cd.m_produk_id`;
            let dataweek3 = await request.query(sqlgetdeatlweek3);
            let week3 = dataweek3.recordset;

            for (let i = 0; i < week3.length; i++) {
                total_tonase_3 = total_tonase_3 + week3[i].tonase;
                total_kubikasi_3 = total_kubikasi_3 + week3[i].kubikasi;
            }


            let c_order_id = uuid();
            let SqlOrder = `INSERT INTO c_order
            (c_order_id,
            createdby,
            updatedby,  
            cmo_id, week_number, schedule_date,
            tonase, kubikasi,
            status)
            VALUES('${c_order_id}','${user}', '${user}','${cmo_id}', 3,'${schedule_3}',
            ${total_tonase_3},
            ${total_kubikasi_3},
            'Draft')`;
            console.log(SqlOrder);

            await request.query(SqlOrder);


            for (let i = 0; i < week3.length; i++) {

              let cmo_detail_id = week3[i].cmo_detail_id;
              let m_produk_id = week3[i].m_produk_id;
              let r_uom_id = week3[i].r_uom_id;
              let stok_awal = week3[i].stok_awal;
              let stok_pending = week3[i].stok_pending;
              let total_stok = week3[i].total_stok;
              let estimasi_sales_bulan_berjalan = week3[i].estimasi_sales_bulan_berjalan;
              let stok_akhir = week3[i].stok_akhir;
              let estimasi_sales_bulan_depan = week3[i].estimasi_sales_bulan_depan;
              let buffer_stok = week3[i].buffer_stok;
              let avarage_sales_tiga_bulan = week3[i].avarage_sales_tiga_bulan;
              let doi = week3[i].doi;
              let cmo = week3[i].cmo;
              let qty = week3[i].qty_order_3;
              let harga = week3[i].harga;
              let total_order = qty * week3[i].harga;
              let estimasi_sales_duabulan_kedepan = week3[i].estimasi_sales_duabulan_kedepan;
              let estimasi_sales_bulan_lalu = week3[i].estimasi_sales_bulan_lalu;
              let week_number = 3;
              let harga_nett = week3[i].harga_nett;
              let total_nett = week3[i].total_nett;
              
              

              let line = i + 1;
              let sqlInsertDetail = `INSERT INTO c_orderdetail
              (createdby, updatedby, c_order_id, line, cmo_detail_id, m_produk_id, r_uom_id, stok_awal, stok_pending, 
              total_stok, estimasi_sales_bulan_berjalan, stok_akhir, estimasi_sales_bulan_depan, buffer_stok, 
              avarage_sales_tiga_bulan, doi, cmo, qty, harga, total_order, estimasi_sales_duabulan_kedepan, 
              estimasi_sales_bulan_lalu, week_number, harga_nett, total_order_nett)
              VALUES('${user}', '${user}', '${c_order_id}', ${line}, 
              '${cmo_detail_id}', '${m_produk_id}', '${r_uom_id}', 
              ${stok_awal}, ${stok_pending}, ${total_stok}, ${estimasi_sales_bulan_berjalan}, ${stok_akhir}, ${estimasi_sales_bulan_depan}, ${buffer_stok}, 
              ${avarage_sales_tiga_bulan}, ${doi}, ${cmo}, ${qty}, ${harga}, ${total_order}, ${estimasi_sales_duabulan_kedepan}, 
              ${estimasi_sales_bulan_lalu}, ${week_number}, ${harga_nett}, 
              ${total_nett})`;

              console.log(sqlInsertDetail);

              await request.query(sqlInsertDetail);

            }

        }else if (transform == 4 && (schedule_4)) {

          let total_tonase_4 = 0;
          let total_kubikasi_4 = 0;
          let sqlgetdeatlweek4 = `SELECT cd.*,mp.tonase,mp.kubikasi FROM cmo_detail cd,m_produk mp 
          WHERE cd.cmo_id = '${cmo_id}' AND cd.qty_order_4 > 0
          AND mp.m_produk_id = cd.m_produk_id`;
          let dataweek4 = await request.query(sqlgetdeatlweek4);
          let week4 = dataweek4.recordset;

          for (let i = 0; i < week4.length; i++) {
              total_tonase_4 = total_tonase_4 + week4[i].tonase;
              total_kubikasi_4 = total_kubikasi_4 + week4[i].kubikasi;
          }


          let c_order_id = uuid();
          let SqlOrder = `INSERT INTO c_order
          (c_order_id,
          createdby,
          updatedby,  
          cmo_id, week_number, schedule_date,
          tonase, kubikasi,
          status)
          VALUES('${c_order_id}','${user}', '${user}','${cmo_id}', 4,'${schedule_4}',
          ${total_tonase_4},
          ${total_kubikasi_4},
          'Draft')`;
          console.log(SqlOrder);


          await request.query(SqlOrder);


          for (let i = 0; i < week4.length; i++) {

            let cmo_detail_id = week4[i].cmo_detail_id;
            let m_produk_id = week4[i].m_produk_id;
            let r_uom_id = week4[i].r_uom_id;
            let stok_awal = week4[i].stok_awal;
            let stok_pending = week4[i].stok_pending;
            let total_stok = week4[i].total_stok;
            let estimasi_sales_bulan_berjalan = week4[i].estimasi_sales_bulan_berjalan;
            let stok_akhir = week4[i].stok_akhir;
            let estimasi_sales_bulan_depan = week4[i].estimasi_sales_bulan_depan;
            let buffer_stok = week4[i].buffer_stok;
            let avarage_sales_tiga_bulan = week4[i].avarage_sales_tiga_bulan;
            let doi = week4[i].doi;
            let cmo = week4[i].cmo;
            let qty = week4[i].qty_order_4;
            let harga = week4[i].harga;
            let total_order = qty * week4[i].harga;
            let estimasi_sales_duabulan_kedepan = week4[i].estimasi_sales_duabulan_kedepan;
            let estimasi_sales_bulan_lalu = week4[i].estimasi_sales_bulan_lalu;
            let week_number = 4;
            let harga_nett = week4[i].harga_nett;
            let total_nett = week4[i].total_nett;
            
            

            let line = i + 1;
            let sqlInsertDetail = `INSERT INTO dbesales.dbo.c_orderdetail
            (createdby, updatedby, c_order_id, line, cmo_detail_id, m_produk_id, r_uom_id, stok_awal, stok_pending, 
            total_stok, estimasi_sales_bulan_berjalan, stok_akhir, estimasi_sales_bulan_depan, buffer_stok, 
            avarage_sales_tiga_bulan, doi, cmo, qty, harga, total_order, estimasi_sales_duabulan_kedepan, 
            estimasi_sales_bulan_lalu, week_number, harga_nett, total_order_nett)
            VALUES('${user}', '${user}', '${c_order_id}', ${line}, 
            '${cmo_detail_id}', '${m_produk_id}', '${r_uom_id}', 
            ${stok_awal}, ${stok_pending}, ${total_stok}, ${estimasi_sales_bulan_berjalan}, ${stok_akhir}, ${estimasi_sales_bulan_depan}, ${buffer_stok}, 
            ${avarage_sales_tiga_bulan}, ${doi}, ${cmo}, ${qty}, ${harga}, ${total_order}, ${estimasi_sales_duabulan_kedepan}, 
            ${estimasi_sales_bulan_lalu}, ${week_number}, ${harga_nett}, 
            ${total_nett})`;

            await request.query(sqlInsertDetail);

          }

        }
            
      }

        
       return res.success({
        data: data
       });
 
     } catch (err) {
       return res.error(err);
     }
   }
 };
 
