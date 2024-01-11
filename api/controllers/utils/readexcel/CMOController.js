/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * CMOController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

 const xlsx = require('node-xlsx');
 const moment = require('moment');
 
 module.exports = {
   read: async function (req, res) {
     res.setTimeout(0);
     //console.log(req.body);
     const {schedule1,schedule2,schedule3,schedule4,kode,bulan,tahun,m_distributor_id} = req.body;
 
     req.file('excel')
       .upload({
         maxBytes: 150000000
       }, async function whenDone(err, uploadedFiles) {
 
         if (err)
         
         return res.error(err);
 
         if (uploadedFiles.length === 0) {          
           return res.error([], 'Tidak ada file yang diupload!');
         }
         await DB.poolConnect;
         const request = DB.pool.request();
         const fd = uploadedFiles[0].fd;
         var obj = xlsx.parse(fd);
         const excel = obj[0].data;
         let tabName = 'OrderList';
     
         let sqlGetdistributor= `SELECT * FROM m_distributor_v WHERE m_distributor_id='${m_distributor_id}'`;
         let datadistributor = await request.query(sqlGetdistributor);
         let r_distribution_channel_id = datadistributor.recordset[0].r_distribution_channel_id;
         let nomor_po = excel[5][8];
         //console.log('nomor_po ',nomor_po);
 
 
         let bulanproses = parseInt(bulan);
         let tahunproses = parseInt(tahun);
         let bulanKeterangan = moment(bulan,'MM').format('MMMM');
 
         let sqlcekCmo = `SELECT COUNT(1) total_rows FROM cmo WHERE 
         m_distributor_id='${m_distributor_id}' AND isactive='Y' AND bulan='${bulanproses}' AND tahun='${tahunproses}'`;
         let datacek = await request.query(sqlcekCmo);
         let cekcmo = datacek.recordset[0].total_rows;
 
 
         let versi = excel[7][0];
         let query_versi = `select * from cmo_version where versi = '${versi}'`
         let ds = await request.query(query_versi);
         if(ds.recordset == 0){
           res.error({
             message: `Versi template CMO [${versi}] tidak di izinkan ....`
           });
           return false;  
         }
 
         if(cekcmo){
           if(cekcmo > 0){
             res.error({
               message: `Periode CMO bulan ${bulanKeterangan} tahun ${tahun} telah diupload harap periksa kembali.`
             });
             return false;  
           }
         }
 
        
         if (obj[0].name.toUpperCase().replace(/\s/g, '') !== tabName.toUpperCase() || (excel[7][2] !== "Kode" && excel[7][2] !== "Product Group" && excel[7][2] !== "SAP" && excel[7][2] !== "Kode Product")) {
           if(excel[7][2].includes("SAP")){
 
           }else{
             res.error({
               message: 'Cek Kembali!! File yang diupload tidak sesuai.'
             });
             return false;    
           }
         }        
 
         let data = [];
         let dataproduk = [];
         var j = 1;
         var totalError = 0;
 
         let headWeek1 = 0;
         let headWeek2 = 0; 
         let headWeek3 = 0; 
         let headWeek4 = 0;

         let error_counter = 0;
         let error_data = [];
         let product_empty_Count = 0;

         for (let i = 10; i < (excel.length - 1); i++) {
          //  console.log(i,excel[i][2]);
           if ((typeof excel[i][3] !== 'undefined' && isNaN(excel[i][1])===false) || (excel[i][2] == '1000448')) {
    
               let stringTotal = excel[i][3];               
               // LEWATI BARIS TOTAL
               if (!stringTotal.toLowerCase().includes("total")) {
                 let no = j;
 
 
                 let m_produk_id = null;
                 let kode_product = excel[i][2];        
                 let product_group = excel[i][3];
                 let uom = excel[i][4];
                 let stok_awal_cycle = undefinedCek(excel[i][7]);
                 let stock_pending = undefinedCek(excel[i][8]);
                 let total_stock = stok_awal_cycle + stock_pending;//undefinedCek(excel[i][9]);
                 let est_sales_before = undefinedCek(excel[i][10]);
                 let est_stok_akhir_cycle = total_stock - est_sales_before;//undefinedCek(excel[i][11]);
                 let est_sales_now = undefinedCek(excel[i][12]);
                 let buffer_stok = undefinedCek(excel[i][13]);
                 let average_sales_3_bulan = undefinedCek(excel[i][14]);
                 let doi_distributor = undefinedCek(excel[i][15]);
                 let cmo = (est_sales_now + buffer_stok) - est_stok_akhir_cycle > 0 ? (est_sales_now + buffer_stok - est_stok_akhir_cycle): 0; 
                 let order_week1 = undefinedCek(excel[i][17]);
                 let order_week2 = undefinedCek(excel[i][18]);
                 let order_week3 = undefinedCek(excel[i][19]);
                 let order_week4 = undefinedCek(excel[i][20]);
                 let order_week_total = order_week1 + order_week2 + order_week3 + order_week4 ;//undefinedCek(excel[i][21]);
                 let harga_netto = undefinedCek(excel[i][22]);
                 let harga_bruto = undefinedCek(excel[i][23]);
                 let estimasi_sales_after_onemonth = undefinedCek(excel[i][22]);
                 let estimasi_sales_after_twomonth = undefinedCek(excel[i][23]);
                 let nex1 = undefinedCek(excel[i][22]);
                 let nex2 = undefinedCek(excel[i][23]);

                  console.log("Test jalur");
                  console.log(harga_bruto);
                  console.log(harga_netto);

                 if(!excel[i][22] && order_week_total > 0){
                   res.error({
                     message: `${kode_product} ${product_group} kolom W tidak diisi`
                   });
                   return false;  
                 }
                // Validasi Sebelumnya 
                // if(!excel[i][23] && order_week_total > 0){
                //   res.error({
                //     message: `${kode_product} ${product_group} kolom Y tidak diisi`
                //   });
                //   return false;  
                // }
                 if(excel[i][23] == null && order_week_total > 0){
                   res.error({
                     message: `${kode_product} ${product_group} kolom X tidak diisi`
                   });
                   return false;  
                 }

                 if(order_week1 % 1 != 0 ){
 
                   res.error({
                     message: `Order Week 1 = ${order_week1} Order tidak boleh dalam bentuk decimal Template Ditolak`
                   });
                   return false;  
                 }
 
                 if(order_week1 < 0 ){
                   
                   res.error({
                     message: `Order Week 1 = ${order_week1} Order tidak boleh Minus Template Ditolak`
                   });
                   return false;  
 
                 }
                 
                 if(order_week2 % 1 != 0 ){
 
                   res.error({
                     message: `Order Week 2 = ${order_week2} Order tidak boleh dalam bentuk decimal Template Ditolak`
                   });
                   return false;  
                 }
 
                 if(order_week2 < 0 ){
                   
                   res.error({
                     message: `Order Week 2 = ${order_week2} Order tidak boleh Minus Template Ditolak`
                   });
                   return false;  
 
                 }
 
                 
                 if(order_week3 % 1 != 0 ){
 
                   res.error({
                     message: `Order Week 3 = ${order_week3} Order tidak boleh dalam bentuk decimal Template Ditolak`
                   });
                   return false;  
                 }
 
                 if(order_week3 < 0 ){
                   
                   res.error({
                     message: `Order Week 3 = ${order_week3} Order tidak boleh Minus Template Ditolak`
                   });
                   return false;  
 
                 }
                 
                 if(order_week4 % 1 != 0 ){
 
                   res.error({
                     message: `Order Week 4 = ${order_week4} Order tidak boleh dalam bentuk decimal Template Ditolak`
                   });
                   return false;  
                 }
 
                 if(order_week4 < 0 ){
                   
                   res.error({
                     message: `Order Week 4 = ${order_week4} Order tidak boleh Minus Template Ditolak`
                   });
                   return false;  
 
                 }
                 
                 
                 try {
                   let sql = ``;
                   if(kode_product && kode_product!=''){
                     sql = `select * from m_produk where kode='${kode_product}' OR kode_sap='${kode_product}'`;
                     console.log("####### ",sql);
                     const result = await request.query(sql);
 
                     if (result.recordset.length == 0) {                    
                       error_data.push({
                         validation: `Kode produk ${kode_product} tidak dikenali didalam system`
                       })
                       error_counter++;
                       product_empty_Count++;
                     }
                      
                     if (product_empty_Count > 0) {
                       res.error({
                         message: `${kode_product} ${product_group} Sebagai Kode Deskripsi Produk Tidak Dikenali`
                       });
                       return false;         
                     }
                     
   

 
                     m_produk_id = result.recordset[0].m_produk_id;
                     kode_product = result.recordset[0].kode;
                     product_group = result.recordset[0].nama;
                     uom = result.recordset[0].satuan;

 
                                       // AND r_distribution_channel_id = '${r_distribution_channel_id}'
                     let sqlcekharga = `SELECT a.*,a.gross AS harga FROM m_pricelist_grossnet a 
                     inner join m_produk b on a.kode_sap = b.kode_sap
                     WHERE b.m_produk_id='${m_produk_id}'  AND a.m_distributor_id = '${m_distributor_id}' ORDER BY a.created DESC`;
                     const resultcekharga = await request.query(sqlcekharga);
 
                    //  console.log(sqlcekharga,estimasi_sales_after_onemonth,estimasi_sales_after_twomonth);
                     if(resultcekharga.recordset.length > 0){
                       harga_netto = resultcekharga.recordset[0].harga;
                     }else{
                       harga_netto = 0;
                     }
 
 
                     harga_bruto = harga_netto * order_week_total;
 
                   }

           
 
                 } catch (err) {
                   error_data.push({
                     validation: `Error System`
                   })
                 }
 
            
                 // Total Order
                 let valTotalOrder = order_week1 + order_week2 + order_week3 + order_week4;
                 if (order_week1 > 0 || order_week2 > 0 || order_week3 > 0 || order_week4 > 0) {
                   if (valTotalOrder < cmo) {
                     error_data.push({
                       validation: `Jumlah order dibawah standart`
                     })
                     error_counter++;
                   }
                 }
 
                 let zero_pass = false;
                 if (order_week1 == 0 && order_week2 == 0 && order_week3 == 0 && order_week4 == 0) {
                   zero_pass = true;
                 }
 
                 totalError = totalError + error_counter;
                 headWeek1 = headWeek1 + order_week1;
                 headWeek2 = headWeek2 + order_week2;
                 headWeek3 = headWeek3 + order_week3;
                 headWeek4 = headWeek4 + order_week4;
 
                 let doi = Number(doi_distributor) >= 37000 ?  32000 : Number(doi_distributor) <= -37000 ? 32000 : Number(doi_distributor);
 
                 let error_status = (error_counter > 0) ? true : false;
               
                 let item = {
                   no, m_produk_id, kode_product, product_group, uom,
                   stok_awal_cycle :parseInt(stok_awal_cycle), stock_pending :parseInt(stock_pending), total_stock :parseInt(total_stock),
                   est_sales_before :parseInt(est_sales_before), est_stok_akhir_cycle :parseInt(est_stok_akhir_cycle), est_sales_now :parseInt(est_sales_now),
                   buffer_stok :parseInt(buffer_stok), average_sales_3_bulan :parseInt(average_sales_3_bulan), doi_distributor:parseInt(doi_distributor), doi :parseInt(doi),
                   cmo :parseInt(cmo), order_week1 : parseInt(order_week1), order_week2 : parseInt(order_week2),
                   order_week3 : parseInt(order_week3), order_week4 : parseInt(order_week4), order_week_total : parseInt(order_week_total),
                   harga_netto : parseInt(harga_netto), harga_bruto : parseInt(harga_bruto), estimasi_sales_after_onemonth : parseInt(estimasi_sales_after_onemonth),
                   estimasi_sales_after_twomonth : parseInt(estimasi_sales_after_twomonth),
    
                   no_sap: null,
                   status: 'DRAFT',nex1,nex2,
                   error: {
                     error_status,
                     error_counter,
                     error_data,
                     zero_pass
                   },
                 }
 
                   dataproduk.push(kode_product);
                   data.push(item);
                 
                 j++;
               }
             //}
           }
         }
 
 
         let result2 = ''
         _.map(_.countBy(dataproduk), (value, key) => { 
           if (value > 1) result2 += `,${key} = ${value}`
         });
         result2 = result2.substr(1)
 
         if(result2){
             res.error({
               message: `Kode Produk duplikat cek kode produk dan deskripsi produk ${result2}`
             });
             return false;
         }


         let listErrorFinal = [];
         for (let i = 0; i < data.length; i++) {
          
            let m_produk_id = data[i].m_produk_id;
            let no = data[i].no;

            if(!m_produk_id){

              listErrorFinal.push( `Kode produk pada baris nomor ${no} tidak dikenali didalam system mohon check templete terlebih dahulu`);

            }
          
         }


         if(listErrorFinal.length > 0){
          res.error({
            message: listErrorFinal.toString()
          });
          return false;
         }
         
 
  

        data = data.filter(e=> e.m_produk_id != null)
         res.success({
           result: data,
           meta: {
             error: {
               status: true,
               total: totalError,
             },
             header: {
               week1: headWeek1,
               week2: headWeek2,
               week3: headWeek3,
               week4: headWeek4,
               nomor_po: nomor_po,
               r_distribution_channel_id:r_distribution_channel_id
             }
           },
           message: 'Upload file berhasil'
         });
         return true;
       });
   }
 };
 
 const undefinedCek = (value) => {
   if (typeof value === 'undefined' || value === "" || value === null || value === NaN || !value) {
     return 0;
   }else{
     return Number(value);
   }
 
   //return Math.round(value);
 
   
 }
 