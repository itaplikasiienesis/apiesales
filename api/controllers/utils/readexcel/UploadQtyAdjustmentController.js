/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * CMOController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

 const xlsx = require('node-xlsx');
 const xml2js = require('xml2js');
 const moment = require('moment');
 const SendEmail = require('../../../services/SendEmail');
 const path = require('path');
 const _ = require('lodash');
 const numeral = require('numeral');
 const fs = require('fs');
 const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
 const ClientSFTP = require('ssh2-sftp-client');
 var shell = require('shelljs');
 const sftp = new ClientSFTP();
 const ftpconfig = {
   host: "192.168.1.148",
   port:22,
   user: "sapftp",
   password: "sapftp@2020"
 } 
 module.exports = {
   upload: async function (req, res) {
     res.setTimeout(0);
     //console.log(req.body);
     const {m_user_id} = req.body;
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
         const nama_file = uploadedFiles[0].filename;
         let extentionFile = path.extname(fd);
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
         let errorValidation = [];
         let successValidation = [];


        for (let i = 1; i < (excel.length); i++) {

          let nomor_cmo = excel[i][0];
          let tahun = excel[i][1];
          let bulan = excel[i][2];
          let kode_shipto = excel[i][3];
          let week1 = excel[i][4];
          let week2 = excel[i][5];
          let week3 = excel[i][6];
          let week4 = excel[i][7];
          let sku = excel[i][8];

          // console.log(nomor_cmo);
          // console.log(tahun);
          // console.log(bulan);
          // console.log(kode_shipto);
          // console.log(week1);
          // console.log(week2);
          // console.log(week3);
          // console.log(week4);
          // console.log(sku);


          let baris = i+1;
          let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${sku}'`;
          let datasku = await request.query(sqlGetSku);

          let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
          let datashipto = await request.query(sqlGetShipto);

          //console.log(datasku);

          if(datasku.recordset.length==0){
            errorValidation.push(`Kode SKU To ${sku} tidak valid cek baris ${baris} pada template upload`);
          }

          if(datashipto.recordset.length==0){
            errorValidation.push(`Kode Shipto ${kode_shipto} tidak valid cek baris ${baris} pada template upload`);
          }
        
             
        }

          if(errorValidation.length > 0){

            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@gmail.com');
             
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('indah.kartika@enesis.com');
              dataemail.push('farid.hidayat@enesis.com');
              dataemail.push('harry.budi@enesis.com');
              dataemail.push('ilyas.nurrahman74@gmail.com');
       
            }

            if(dataemail.length > 0){

              console.log('errorValidation ',errorValidation);

              let tempError = [];
              for (let i = 0; i < errorValidation.length; i++) {

                let nomor = i + 1;
                let baris = i + 2;
                let errorText = errorValidation[i];

                tempError.push({
                  nomor:nomor,
                  baris:baris,
                  errorText:errorText
                });
                
              }

              let detailHtml = ''
              for (const detail of tempError) {
                detailHtml += 
                '<tr>'
                +`<td>${detail.nomor}</td>`
                +`<td>${detail.errorText}</td>`
                +`</tr>`
              }

              const param = {
            
                subject:`Info Validasi SKU Replacement Non Aktif SKU`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }

              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]

  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidation', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

            } 

              res.error({
                  message: errorValidation[0].toString()
              });

          }else{

            let total_week_1 = 0;
            let total_week_2 = 0;
            let total_week_3 = 0;
            let total_week_4 = 0;
            for (let i = 1; i < (excel.length); i++) {
                
                let nomor_cmo = excel[i][0];
                let tahun = excel[i][1];
                let bulan = excel[i][2];
                let kode_shipto = excel[i][3];
                let week1 = excel[i][4];
                let week2 = excel[i][5];
                let week3 = excel[i][6];
                let week4 = excel[i][7];
                let sku = excel[i][8];

                let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${sku}'`;
                let datasku = await request.query(sqlGetSku);

                let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
                let datashipto = await request.query(sqlGetShipto);

                let m_distributor_id = datashipto.recordset[0].m_distributor_id;
                let distributor = datashipto.recordset[0].nama;
                let sqlGetCmo = `SELECT * FROM cmo WHERE isactive='Y' AND
                tahun=${Number(tahun)} AND bulan=${Number(bulan)} 
                AND m_distributor_id = '${m_distributor_id}'`;

                let datacmo = await request.query(sqlGetCmo);

                if(datacmo.recordset.length > 0){
                  
                  let m_produk_id = datasku.recordset[0].m_produk_id;
                  let cmo_id = datacmo.recordset[0].cmo_id;
                  let sqlGetOrder_1 = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,
                  cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett 
                  FROM c_order co, 
                  c_orderdetail cod,m_produk mp
                  WHERE co.cmo_id='${cmo_id}'
                  AND cod.c_order_id = co.c_order_id
                  AND mp.m_produk_id = cod.m_produk_id
                  AND co.week_number = 1
                  AND mp.m_produk_id = '${m_produk_id}'`;

                  let dataorder_1 = await request.query(sqlGetOrder_1);
                  if(dataorder_1.recordset.length > 0){
                    for (let i = 0; i < dataorder_1.recordset.length; i++) {
                        let qty = dataorder_1.recordset[i].qty;
                        let harga = dataorder_1.recordset[i].harga;
                        let harga_nett = dataorder_1.recordset[i].harga_nett;
                        let total_order_gross = dataorder_1.recordset[i].total_order;
                        let total_order_nett = dataorder_1.recordset[i].total_order_nett;
                        let total_order_gross_perubahan = harga * week1;
                        let total_order_nett_perubahan = harga_nett * week1;
                        
                        if(qty!==week1){
                          total_week_1 = total_week_1 + 1;
                          successValidation.push({
                            nomor_cmo:nomor_cmo,
                            distributor:distributor,
                            sku:sku,
                            quantity_sebelumnya:qty,
                            quantity_perubahan:week1,
                            total_order_gross_sebelumnya:total_order_gross,
                            total_order_nett_sebelumnya:total_order_nett,
                            total_order_gross_perubahan:total_order_gross_perubahan,
                            total_order_nett_perubahan:total_order_nett_perubahan,
                            week_number:1
                          });
                        }


                        
                        let c_orderdetail_id = dataorder_1.recordset[i].c_orderdetail_id;                      
                        let sqlUpdate = `UPDATE c_orderdetail 
                        SET qty = ${week1},
                        total_order =${total_order_gross_perubahan},
                        total_order_nett =${total_order_nett_perubahan}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`;
                        await request.query(sqlUpdate);

                        let updatecmodetail = `UPDATE cmo_detail SET qty_order_1='${week1}' 
                        WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;
                        await request.query(updatecmodetail);
     

                    }
                    
                  }



                  let sqlGetOrder_2 = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,
                  cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett 
                  FROM c_order co, 
                  c_orderdetail cod,m_produk mp
                  WHERE co.cmo_id='${cmo_id}'
                  AND cod.c_order_id = co.c_order_id
                  AND mp.m_produk_id = cod.m_produk_id
                  AND co.week_number = 2
                  AND mp.m_produk_id = '${m_produk_id}'`;

                  let dataorder_2 = await request.query(sqlGetOrder_2);
                  if(dataorder_2.recordset.length > 0){
                    for (let i = 0; i < dataorder_2.recordset.length; i++) {
                      let qty = dataorder_2.recordset[i].qty;
                      let harga = dataorder_2.recordset[i].harga;
                      let harga_nett = dataorder_2.recordset[i].harga_nett;
                      let total_order_gross = dataorder_2.recordset[i].total_order;
                      let total_order_nett = dataorder_2.recordset[i].total_order_nett;
                      let total_order_gross_perubahan = harga * week2;
                      let total_order_nett_perubahan = harga_nett * week2;
                      
                      if(qty!==week2){
                        total_week_2 = total_week_2 + 1;
                        successValidation.push({
                          nomor_cmo:nomor_cmo,
                          distributor:distributor,
                          sku:sku,
                          quantity_sebelumnya:qty,
                          quantity_perubahan:week2,
                          total_order_gross_sebelumnya:total_order_gross,
                          total_order_nett_sebelumnya:total_order_nett,
                          total_order_gross_perubahan:total_order_gross_perubahan,
                          total_order_nett_perubahan:total_order_nett_perubahan,
                          week_number:2
                        });


                        let c_orderdetail_id = dataorder_2.recordset[i].c_orderdetail_id;                      
                        let sqlUpdate = `UPDATE c_orderdetail 
                        SET qty = ${week2},
                        total_order =${total_order_gross_perubahan},
                        total_order_nett =${total_order_nett_perubahan}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`;
                        await request.query(sqlUpdate);
                        
                        let updatecmodetail = `UPDATE cmo_detail SET qty_order_2='${week2}' 
                        WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;
                        await request.query(updatecmodetail);

                      }
                    }
                    
                  }


                  
       
                  let sqlGetOrder_3 = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,
                  cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett 
                  FROM c_order co, 
                  c_orderdetail cod,m_produk mp
                  WHERE co.cmo_id='${cmo_id}'
                  AND cod.c_order_id = co.c_order_id
                  AND mp.m_produk_id = cod.m_produk_id
                  AND co.week_number = 3
                  AND mp.m_produk_id = '${m_produk_id}'`;

                  let dataorder_3 = await request.query(sqlGetOrder_3);
                  if(dataorder_3.recordset.length > 0){
                    for (let i = 0; i < dataorder_3.recordset.length; i++) {
                      let qty = dataorder_3.recordset[i].qty;
                      let harga = dataorder_3.recordset[i].harga;
                      let harga_nett = dataorder_3.recordset[i].harga_nett;
                      let total_order_gross = dataorder_3.recordset[i].total_order;
                      let total_order_nett = dataorder_3.recordset[i].total_order_nett;
                      let total_order_gross_perubahan = harga * week3;
                      let total_order_nett_perubahan = harga_nett * week3;
                      
                      if(qty!==week3){
                        total_week_3 = total_week_3 + 1;
                        successValidation.push({
                          nomor_cmo:nomor_cmo,
                          distributor:distributor,
                          sku:sku,
                          quantity_sebelumnya:qty,
                          quantity_perubahan:week3,
                          total_order_gross_sebelumnya:total_order_gross,
                          total_order_nett_sebelumnya:total_order_nett,
                          total_order_gross_perubahan:total_order_gross_perubahan,
                          total_order_nett_perubahan:total_order_nett_perubahan,
                          week_number:3
                        });


                        let c_orderdetail_id = dataorder_3.recordset[i].c_orderdetail_id;                      
                        let sqlUpdate = `UPDATE c_orderdetail 
                        SET qty = ${week3},
                        total_order =${total_order_gross_perubahan},
                        total_order_nett =${total_order_nett_perubahan}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`;
                        await request.query(sqlUpdate);
                        
                        let updatecmodetail = `UPDATE cmo_detail SET qty_order_3='${week3}' 
                        WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;
                        await request.query(updatecmodetail);
                      }
                    }
                    
                  }



                  let sqlGetOrder_4 = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,
                  cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett 
                  FROM c_order co, 
                  c_orderdetail cod,m_produk mp
                  WHERE co.cmo_id='${cmo_id}'
                  AND cod.c_order_id = co.c_order_id
                  AND mp.m_produk_id = cod.m_produk_id
                  AND co.week_number = 4
                  AND mp.m_produk_id = '${m_produk_id}'`;

                  let dataorder_4 = await request.query(sqlGetOrder_4);
                  if(dataorder_4.recordset.length > 0){
                    for (let i = 0; i < dataorder_4.recordset.length; i++) {
                      let qty = dataorder_4.recordset[i].qty;
                      let harga = dataorder_4.recordset[i].harga;
                      let harga_nett = dataorder_4.recordset[i].harga_nett;
                      let total_order_gross = dataorder_4.recordset[i].total_order;
                      let total_order_nett = dataorder_4.recordset[i].total_order_nett;
                      let total_order_gross_perubahan = harga * week4;
                      let total_order_nett_perubahan = harga_nett * week4;
                      
                      if(qty!==week4){
                        total_week_4 = total_week_4 + 1;
                        successValidation.push({
                          nomor_cmo:nomor_cmo,
                          distributor:distributor,
                          sku:sku,
                          quantity_sebelumnya:qty,
                          quantity_perubahan:week4,
                          total_order_gross_sebelumnya:total_order_gross,
                          total_order_nett_sebelumnya:total_order_nett,
                          total_order_gross_perubahan:total_order_gross_perubahan,
                          total_order_nett_perubahan:total_order_nett_perubahan,
                          week_number:4
                        });

                        let c_orderdetail_id = dataorder_4.recordset[i].c_orderdetail_id;                      
                        let sqlUpdate = `UPDATE c_orderdetail 
                        SET qty = ${week4},
                        total_order =${total_order_gross_perubahan},
                        total_order_nett =${total_order_nett_perubahan}
                        WHERE c_orderdetail_id='${c_orderdetail_id}'`;
                        await request.query(sqlUpdate);
                        
                        let updatecmodetail = `UPDATE cmo_detail SET qty_order_4='${week4}' 
                        WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;
                        await request.query(updatecmodetail);
                      }
                    }
                    
                  }

                  let updatecmodetail = `UPDATE cmo_detail SET total_order=(qty_order_1 + qty_order_2 + qty_order_3 + qty_order_4)
                  WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;
                  await request.query(updatecmodetail);


                  let queryDataTable = `select x.*,kode_aktif from
                  (
                  SELECT 
                  cmo.nomor_cmo,
                  cmo.bulan,
                  cmo.tahun,
                  mp.item_kategori,
                  '00' as spart,
                  mpj.kode_channel as distribution_channel,
                  rop.kode as sold_to_party,
                  ro.kode as ship_to_party,
                  convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
                  convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
                  mp.kode_sap as sku_number,
                  mp.kode as sku_customer,
                  cod.qty,
                  mp.satuan,
                  convert(varchar, co.schedule_date, 112) as delivery_date,
                  cod.stok_awal as stok_awal_cycle,
                  cod.doi as doi_distributor,
                  cod.estimasi_sales_bulan_depan,
                  cod.estimasi_sales_duabulan_kedepan,
                  ro.nama,
                  co.week_number
                  FROM c_order co
                  LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
                  LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id AND cod.isactive='Y')
                  LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
                  LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
                  LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
                  LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
                  LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
                  LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
                  WHERE co.cmo_id='${cmo_id}' and cod.qty > 0
                  )x left join 
                  m_produk_replacement y on x.sku_number = y.kode_non_aktif`;
          
          
                  let datacmotogenerate = await request.query(queryDataTable);
                  let rows = datacmotogenerate.recordset;

                  let datas = []
                  for(let i = 0;i< rows.length ; i++){
                        
                      datas.push({
                          MANDT : '',
                          BSTKD : rows[i].nomor_cmo,
                          AUART : rows[i].item_kategori,
                          VTWEG : rows[i].distribution_channel,
                          SPART : rows[i].spart,
                          KUNNR : rows[i].sold_to_party,
                          KUNSH : rows[i].ship_to_party,
                          GUEBG : rows[i].validfrom,
                          GUEEN : rows[i].validto,
                          MATNR : rows[i].sku_number,
                          SKU : rows[i].sku_customer,
                          WMENG : rows[i].qty,
                          VRKME : rows[i].satuan,
                          EDATU : rows[i].delivery_date,
                          STOKA : rows[i].stok_awal_cycle,
                          DOI : rows[i].doi_distributor,
                          M1 : '',
                          M2 : '',
                          VBELN : '',
                          SMATN : rows[i].kode_aktif,
                          WEEK1 : rows[i].week_number
                        });
                        
                    }
          
                    if(datas.length > 0){
                          
                                      
                        let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8'); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
                        let hasil = racikXML2(xml, datas, 'ITAB');
                        await lemparFTP(hasil,cmo_id);
                          
          
                    }
              
                }

                
   

            }

            console.log('total_week_1 ',total_week_1);
            console.log('total_week_2 ',total_week_2);
            console.log('total_week_3 ',total_week_3);
            console.log('total_week_4 ',total_week_4);
            
            
            if(successValidation.length > 0){

              let dataemail = [];
              if(statusIntegasi=='DEV'){
         
                dataemail.push('tiasadeputra@gmail.com');
               
         
              }else{
               
                dataemail.push('tiasadeputra@gmail.com');
                dataemail.push('indah.kartika@enesis.com');
                dataemail.push('farid.hidayat@enesis.com');
                dataemail.push('harry.budi@enesis.com');
                dataemail.push('ilyas.nurrahman74@gmail.com');
         
              }


              if(dataemail.length > 0){

                  // successValidation = _.uniqBy(successValidation, function (e) {
                  //   return e.nomor;
                  // });
  
                  successValidation = _.orderBy(successValidation, ['week_number', 'distributor'], ['asc']);

                  let detailHtml = ''
                  for (const detail of successValidation) {
                  detailHtml += 
                  '<tr>'
                  +`<td>${detail.nomor_cmo}</td>`
                  +`<td>${detail.distributor}</td>`
                  +`<td>${detail.sku}</td>`
                  +`<td>${detail.quantity_sebelumnya}</td>`
                  +`<td>${detail.quantity_perubahan}</td>`
                  +`<td>${numeral(detail.total_order_gross_sebelumnya).format("0,00")}</td>`
                  +`<td>${numeral(detail.total_order_nett_sebelumnya).format("0,00")}</td>`
                  +`<td>${numeral(detail.total_order_gross_perubahan).format("0,00")}</td>`
                  +`<td>${numeral(detail.total_order_nett_perubahan).format("0,00")}</td>`
                  +`<td>${detail.week_number}</td>`
                  +`</tr>`
                  }
  
                  
                  const param = {
              
                  subject:`Adjustment Quantity Telah Dilakukan`,
                  tanggal:moment().format('YYYY-MM-DD'),
                  filename:nama_file,
                  details:detailHtml,
                  formatfile:extentionFile
          
                  }
  
                  let attachments =  [{   
                  filename: nama_file+extentionFile,
                  path: fd // stream this file
                  }]
  
      
                  const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationadjustmentquantity', templateparam: param });
                  SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

  
              
              }

          }
            

            let sqlInsertData = `INSERT INTO audit_support
            (kode,nama)
            VALUES('3', 'Adjustment Quantity')`;
            await request.query(sqlInsertData);

            res.success({
              message: 'Upload file berhasil'
            });
            return true;

          }
        
       });
   }
 };
 
 const undefinedCek = (value) => {
   // console.log(value,"ee");
   if (typeof value === 'undefined' || value === "" || value === null || value === NaN) {
     return 0;
   }else{
     
   }
 
   return Math.round(value);
 }
 function racikXML2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })
  const result = builder.buildObject(addTemplate)
  return xmlTemplate.replace('#', result)
}

 function lemparFTP(hasil,cmo_id){
  let remotePath = '/home/sapftp/esales/cmo/monthly_dev/'+`${cmo_id}.xml`;
  let locationFiles = dokumentPath('CMO','requesttemp').replace(/\\/g, '/');
  let dst = dokumentPath('CMO','requesttemp') + '/' +`${cmo_id}.xml`;
  let localPath = dst.replace(/\\/g, '/');
  shell.mkdir('-p', locationFiles);
  console.log(locationFiles+"/"+`${cmo_id}.xml`);
  fs.writeFile(locationFiles+"/"+`${cmo_id}.xml`, hasil,async function (err) {
    if (err) 
    return err;

    // await sftp.connect(ftpconfig)
    // .then(() => {
    //   return sftp.fastPut(localPath,remotePath);
    // })
    // .then(() => {
    //   sftp.end();
    // })
    // .catch(err => {
    //   console.error(err.message);
    // });

  })
}

