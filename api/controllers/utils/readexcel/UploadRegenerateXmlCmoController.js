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
const SendEmail = require('../../../services/SendEmail');
const path = require('path');
const _ = require('lodash');
const numeral = require('numeral'); 
const fs = require('fs');
const xml2js = require('xml2js');
var shell = require('shelljs');
const { Console } = require('console');
const ClientSFTP = require('ssh2-sftp-client');
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "sapftp",
  password: "sapftp@2020"
}
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);


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

        let baris = i+1;
        let kode_shipto = excel[i][0];
        let tahun = excel[i][1];
        let bulan = excel[i][2];


        let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
        let datashipto = await request.query(sqlGetShipto);

        let m_distributor_id = datashipto.recordset.length > 0 ? datashipto.recordset[0].m_distributor_id : null;
        let sqlGetCmo = `SELECT * FROM cmo WHERE isactive='Y' AND
        tahun=${Number(tahun)} AND bulan=${Number(bulan)} 
        AND m_distributor_id = '${m_distributor_id}'AND status not in ('Direject RSM','Direject ASM','Direject DPD','Direject ASDH','Direject DISTRIBUTOR','Direject SALES HEAD')`;
        // console.log(sqlGetCmo,"cek deh disini");
        let datacmo = await request.query(sqlGetCmo);


        if(datashipto.recordset.length==0 || m_distributor_id==null){
            errorValidation.push(`Kode Shipto ${kode_shipto} tidak valid cek baris ${baris} pada template upload`);
        }
   

        if(datacmo.recordset.length==0){
            errorValidation.push(`Data CMO tidak ditemukan`);
        }
 
            
    }

         if(errorValidation.length > 0){

           let dataemail = [];
           if(statusIntegasi=='DEV'){
          
             dataemail.push('tiasadeputra@gmail.com');
            
      
           }else{
            
             dataemail.push('tiasadeputra@gmail.com');

      
           }

           

           if(dataemail.length > 0){

             console.log('errorValidation ',errorValidation);

             let tempError = [];
             for (let i = 0; i < errorValidation.length; i++) {

               let nomor = i + 1;
               let errorText = errorValidation[i];

               tempError.push({
                 nomor:nomor,
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
           
               subject:`Generate Ulang XML CMO telah dilakukan`,
               tanggal:moment().format('YYYY-MM-DD'),
               filename:nama_file,
               details:detailHtml,
               formatfile:extentionFile
     
             }

             let attachments =  [{   
               filename: nama_file+extentionFile,
               path: fd // stream this file
             }]

 
             const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidationskureplacement', templateparam: param });
             SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

           } 

             res.error({
                 message: errorValidation[0].toString()
             });

         }else{


           for (let i = 1; i < (excel.length); i++) {

            let kode_shipto = excel[i][0];
            let tahun = excel[i][1];
            let bulan = excel[i][2];
            let nomor = i;

            let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
            let datashipto = await request.query(sqlGetShipto);

            let m_distributor_id = datashipto.recordset[0].m_distributor_id;
            let sqlGetCmo = `SELECT * FROM cmo WHERE isactive='Y' AND
            tahun=${Number(tahun)} AND bulan=${Number(bulan)} 
            AND m_distributor_id = '${m_distributor_id}'`;

            let datacmo = await request.query(sqlGetCmo);

            if(datacmo.recordset.length > 0){

                let cmo_id = datacmo.recordset[0].cmo_id;
                let nomor_cmo = datacmo.recordset[0].nomor_cmo;

                successValidation.push({
                    cmo_id:cmo_id,
                    nomor_cmo:nomor_cmo
                });


                }else{
                  ListFailedUpdate.push('Order Tidak Ditemukan');
                }
            
            }
           
        }

        successValidation = _.uniqBy(successValidation, function (e) {
            return e.cmo_id;
        });

    
        if(successValidation.length > 0){


            for (let i = 0; i < successValidation.length; i++) {

                successValidation[i].nomor = i + 1;

                console.log('Nomor CMO ',successValidation[i].nomor);
                console.log('CMO ID ',successValidation[i].cmo_id);
                let cmo_id = successValidation[i].cmo_id;
                let queryDataTable = `select x.*,kode_aktif from
                (
                SELECT 
                cmo.nomor_cmo,
                cmo.nomor_po,
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
                WHERE co.cmo_id='${cmo_id}' and cod.qty > 0 and cmo.no_sap ='WAITING'
                )x left join 
                m_produk_replacement y on x.sku_number = y.kode_non_aktif`;  
  
                let datacmo = await request.query(queryDataTable);
                let rows = datacmo.recordset;
        
                
                let datas = []
                for(let i = 0;i< rows.length ; i++){
                      
                    datas.push({
                        MANDT : '',
                        BSTKD : rows[i].nomor_cmo,
                        BNAME : rows[i].nomor_po,
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
                      let hasil = racikXML(xml, datas, 'ITAB');
                      lemparFTP(hasil,cmo_id);
      
                  }else{
          
                      console.log('CMO tidak ditemukan');
                        
                  }

            }

            let dataemail = [];
            if(statusIntegasi=='DEV'){
         
              dataemail.push('tiasadeputra@gmail.com');             
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
       
            }

            if(dataemail.length > 0){

              successValidation = _.uniqBy(successValidation, function (e) {
                return e.nomor;
              });

              let detailHtml = ''
              for (const detail of successValidation) {
                detailHtml += 
                '<tr>'
                +`<td>${detail.nomor}</td>`
                +`<td>${detail.nomor_cmo}</td>`
                +`</tr>`
              }


              const param = {
            
                subject:`Generate Ulang XML CMO telah dilakukan`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }

              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]

  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationregeneratexmlcmo', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);


            
            }

        }
           

        let sqlInsertData = `INSERT INTO audit_support
        (kode,nama)
        VALUES('PCMO', 'Push Data XML CMO')`;
        await request.query(sqlInsertData);

        

        res.success({
          message: 'Upload file berhasil'
        });
        return true;
     
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


function racikXML(xmlTemplate, jsonArray, rootHead) {
    var builder = new xml2js.Builder({headless: true, rootName: rootHead })
    const addTemplate = jsonArray.map(data => {
      return {item: data}
    })
    const result = builder.buildObject(addTemplate)
    return xmlTemplate.replace('#', result)
  }
  


async function lemparFTP(hasil,cmo_id){
    let remotePath = '/home/sapftp/esales/cmo/monthly/'+`${cmo_id}.xml`;
    
    console.log(remotePath);

    await DB.poolConnect;
    const request = DB.pool.request();

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

    if (statusIntegasi == 'DEV') {

      // console.log('KEDEP DONG');
      remotePath = '/home/sapftp/esales/dev/cmo/'+`${cmo_id}.xml`;

    } 


    let locationFiles = dokumentPath('CMO','request_upload').replace(/\\/g, '/');
    let dst = dokumentPath('CMO','request_upload') + '/' +`${cmo_id}.xml`;
    let localPath = dst.replace(/\\/g, '/');
    shell.mkdir('-p', locationFiles);
    console.log(locationFiles+"/"+`${cmo_id}.xml`);
    fs.writeFile(locationFiles+"/"+`${cmo_id}.xml`, hasil,async function (err) {
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
}