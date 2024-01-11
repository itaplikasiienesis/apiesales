const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");
const { head } = require('lodash');
const { func } = require('joi');
const { Table } = require('mssql');
const path = require('path');
const glob = require("glob");
const json2xls = require('json2xls');
const ClientSFTP = require('ssh2-sftp-client');
var shell = require('shelljs');
const base64ToImage = require('base64-to-image');
const UPC = require('upc-generator');
var JsBarcode = require('jsbarcode');
var Canvas = require("canvas");
var Barc = require('barcode-generator'),barc = new Barc();
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'api/repo', param2, param3);
const dokumentPath2 = (param2) => path.resolve(sails.config.appPath, 'api/repo',param2);

module.exports = {
    find: async function(req, res) {
        const {
          query: {currentPage,pageSize,parkingType,m_transporter_id,r_kendaraan_id,startdate,enddate}
        } = req;
    

        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
          const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
        
          let filterTipe = ``;
          if(parkingType=='inbound'){
            filterTipe = ` AND p.tipe = 'INBOUND'`;
          }else{
            filterTipe = ` AND p.tipe = 'OUTBOUND'`;
          }

                
          let filterJenisKendaraan = ``;
          if(r_kendaraan_id){
            filterJenisKendaraan = ` AND mktv.r_kendaraan_id = '${r_kendaraan_id}'`;
          }

        //   console.log('r_kendaraan_id ',r_kendaraan_id);
        //   console.log('startdate ',startdate);
        //   console.log('enddate ',enddate);
    
          let filterTransporter = ``;
          if(m_transporter_id){
            filterTransporter = ` AND mktv.m_transporter_id = '${m_transporter_id}'`;
          }

          let filterBetween = ``;
          if(startdate && enddate){
            filterBetween = `AND CONVERT(VARCHAR(10),p.created,120) BETWEEN '${startdate}' AND '${enddate}'`;
          }
    

          

          let queryCountTable = `SELECT COUNT(1) AS total_rows
                                FROM parking p,m_kendaraan_transporter_v mktv WHERE 1=1 
                                AND p.m_kendaraan_transporter_id = mktv.m_kendaraan_transporter_id 
                                ${whereClause}${filterTipe}${filterTransporter}${filterJenisKendaraan}${filterBetween}`;
    
          let queryDataTable = `SELECT p.*,mktv.m_transporter_id,
          mktv.nama_kendaraan,convert(varchar(5),p.created,108) as jam_masuk,mktv.r_kendaraan_id  
          FROM parking p,m_kendaraan_transporter_v mktv WHERE 1=1 
          AND p.m_kendaraan_transporter_id  = mktv.m_kendaraan_transporter_id 
          ${whereClause}${filterTipe}${filterTransporter}${filterJenisKendaraan}${filterBetween}
          ORDER BY p.created desc
          OFFSET ${offset} ROWS
          FETCH NEXT ${limit} ROWS ONLY`;


          //console.log(queryDataTable);

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
        } catch (err) {
          return res.error(err);
        }
      },
      exportExcel: async function(req, res) {
        const {
          query: {parkingType,m_transporter_id,r_kendaraan_id,startdate,enddate}
        } = req;
    

        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          let titleReport = parkingType=='inbound' ? 'Inbound' : 'Outbound';
        
          console.log("CETAK 1");
          let filterTipe = ``;
          if(parkingType=='inbound'){
            console.log("CETAK 2");
            filterTipe = ` AND p.tipe = 'INBOUND'`;
          }else{
            console.log("CETAK 3");
            filterTipe = ` AND p.tipe = 'OUTBOUND'`;
          }
                
          let filterJenisKendaraan = ``;
          if(r_kendaraan_id){
            filterJenisKendaraan = ` AND mktv.r_kendaraan_id = '${r_kendaraan_id}'`;
          }
          console.log("CETAK 4",filterJenisKendaraan);

          let filterTransporter = ``;
          if(m_transporter_id){
            filterTransporter = ` AND mktv.m_transporter_id = '${m_transporter_id}'`;
          }
          console.log("CETAK 5",filterTransporter);

          let filterBetween = ``;
          if(startdate && enddate){
            filterBetween = `AND CONVERT(VARCHAR(10),p.created,120) BETWEEN '${startdate}' AND '${enddate}'`;
          }
          console.log("CETAK 6",filterBetween);
    
    
          let queryDataTable = `SELECT p.*,mktv.m_transporter_id,convert(varchar(10),p.created ,120) as tanggal_masuk,
          mktv.nama_kendaraan,convert(varchar(5),p.created,108) as jam_masuk,mktv.r_kendaraan_id ,
          SUBSTRING(convert(varchar, p.start_unloading_date, 8) ,0,6) AS waktu_start_unloading_date,
          SUBSTRING(convert(varchar, p.finish_unloading_date, 8) ,0,6) AS waktu_finish_unloading,
          SUBSTRING(convert(varchar, p.finish_document_date , 8) ,0,6) AS waktu_finish_document,
          Convert(varchar(10),p.jam_keluar,120) as tanggal_keluar_new,
          SUBSTRING(convert(varchar, p.jam_keluar , 8) ,0,6) AS waktu_jam_keluar,
          SUBSTRING(convert(varchar, p.startdocumentoutbound , 8) ,0,6) AS waktu_start_document,
          SUBSTRING(convert(varchar, p.pickingdateoutbound , 8) ,0,6) AS waktu_start_picking,
          SUBSTRING(convert(varchar, p.loading_date , 8) ,0,6) AS waktu_start_loading,
          SUBSTRING(convert(varchar, p.finish_loading_date , 8) ,0,6) AS waktu_finish_loading
          FROM parking p,m_kendaraan_transporter_v mktv WHERE 1=1 
          AND p.m_kendaraan_transporter_id  = mktv.m_kendaraan_transporter_id 
          ${filterTipe}${filterTransporter}${filterJenisKendaraan}${filterBetween}
          ORDER BY p.created desc`;

          console.log("CETAK 7",queryDataTable);
    
          request.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            let rows = result.recordset;
    
            let arraydetailsforexcel = [];
            for (let i = 0; i < rows.length; i++) {

                

                let nomor = i +1;
                let type_kendaraan = rows[i].nama_kendaraan;
                let transporter = rows[i].transporter;
                // let tanggal_masuk = moment(rows[i].created,'YYYY-MM-DD').format('YYYY-MM-DD');
                let tanggal_masuk = rows[i].tanggal_masuk;
                let jam_masuk = rows[i].jam_masuk ? rows[i].jam_masuk : '-';
                let waktu_start_unloading = rows[i].waktu_start_unloading_date ?  rows[i].waktu_start_unloading_date : '-';
                let waktu_finish_unloading = rows[i].waktu_finish_unloading ? rows[i].waktu_finish_unloading : '-';    
                let waktu_finish_document = rows[i].waktu_finish_document ?  rows[i].waktu_finish_document : '-';
                let tanggal_keluar = rows[i].tanggal_keluar_new ? rows[i].tanggal_keluar_new : '-';
                console.log("tanggal_keluar == "+tanggal_keluar);
                let waktu_jam_keluar = rows[i].waktu_jam_keluar ? rows[i].waktu_jam_keluar : '-';
                console.log("waktu_jam_keluar == "+waktu_jam_keluar);
                let register_by = rows[i].register_by ? rows[i].register_by : '-';
                let driver = rows[i].driver ? rows[i].driver : '-';
                let stnk = rows[i].stnk=='Y' ? 'Ada' : 'Tidak Ada';
                let sim = rows[i].sim=='Y' ? 'Ada' : 'Tidak Ada';
                let kir = rows[i].kir=='Y' ? 'Ada' : 'Tidak Ada';

                let nopol = rows[i].nopol ? rows[i].nopol : '-';
                let gate_process = rows[i].gate_process ? rows[i].gate_process : '-';
                let status = rows[i].status ? rows[i].status : '-';
                let remarks = rows[i].remarks ? rows[i].remarks : '-';
                let checker = rows[i].checker ? rows[i].checker : '-';
                let document_by = rows[i].document_by ? rows[i].document_by : '-';
                let checkout_by = rows[i].checkout_by ? rows[i].checkout_by : '-';
                let waktu_start_document = rows[i].waktu_start_document ? rows[i].waktu_start_document : '-';
                let waktu_start_picking = rows[i].waktu_start_picking ?  rows[i].waktu_start_picking : '-';
                let picking_by = rows[i].picking_by ? rows[i].picking_by : '-';
                let waktu_start_loading = rows[i].waktu_start_loading ?  rows[i].waktu_start_loading : '-';
                let waktu_finish_loading = rows[i].waktu_finish_loading ? rows[i].waktu_finish_loading : '-';
                let loading_by = rows[i].loading_by ? rows[i].loading_by : '-';
            

                if(parkingType=='inbound'){
                    let obj = {
                        "Nomor":nomor,
                        "Nomor Polisi":nopol,
                        "Tipe Kendaraan":type_kendaraan,	
                        "Transporter":transporter,
                        "Nama Supir":driver,
                        "STNK":stnk,
                        "SIM":sim,
                        "KIR":kir,
                        "Gate":gate_process,
                        "Status":status,	
                        "Catatan":remarks,
                        "Tanggal Masuk":tanggal_masuk,
                        "Jam Masuk":jam_masuk,
                        "Waktu Start Unloading":waktu_start_unloading,
                        "Waktu Finish Unloading":waktu_finish_unloading,
                        "Waktu Finish Document":waktu_finish_document,
                        "Tanggal Keluar":tanggal_keluar,
                        "Waktu Keluar":waktu_jam_keluar,
                        "Register by":register_by,		
                        "Checker by":checker,
                        "Document by":document_by,	
                        "Checkout by":checkout_by
                    }
                    console.log("OBJ ",obj);

                    arraydetailsforexcel.push(obj);

                }else{
                    let obj = {
                        "Nomor":nomor,
                        "Nomor Polisi":nopol,
                        "Tipe Kendaraan":type_kendaraan,	
                        "Transporter":transporter,
                        "Nama Supir":driver,
                        "STNK":stnk,
                        "SIM":sim,
                        "KIR":kir,
                        "Gate":gate_process,
                        "Status":status,	
                        "Catatan":remarks,
                        "Tanggal Masuk":tanggal_masuk,
                        "Jam Masuk":jam_masuk,
                        "Waktu Start Document":waktu_start_document,
                        "Waktu Start Picking":waktu_start_picking,
                        "Waktu Start Loading":waktu_start_loading,	
                        "Waktu Finish Loading":waktu_finish_loading,	
                        "Waktu Finish Document":waktu_finish_document,
                        "Tanggal Keluar":tanggal_keluar,
                        "Waktu Keluar":waktu_jam_keluar,
                        "Register by":register_by,		
                        "Picking By":picking_by,
                        "Loading By":loading_by,
                        "Document by":document_by,	
                        "Checkout by":checkout_by
                    }


        

                    arraydetailsforexcel.push(obj);
                }





            }

            if(arraydetailsforexcel.length > 0){
                let tglfile = moment().format('DD-MMM-YYYY hh:mm');
                let namafile = 'report_'.concat(titleReport).concat(tglfile).concat('.xlsx');          
                var hasilXls = json2xls(arraydetailsforexcel);
                res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
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

    updatePosisi: async function(req,res){
        const {parking_id,bundle_id,status} = req.body
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let upd = ``;
            if(status == `STARTLOAD`){
                upd = `update parking set kode_status = 'WT2', status = 'Start Loading', loading_date = getdate()
                ,bundle_id = '${bundle_id}' where parking_id = '${parking_id}'`;
            }else if(status == `FINISH`){
                upd = `update parking set kode_status = 'WT3', status = 'Finish Loading', finish_loading_date = getdate()
                ,bundle_id = '${bundle_id}' where parking_id = '${parking_id}'`;
            }else if(status == `OUT`){
                upd = `update parking set kode_status = 'WT5', status = 'Keluar Lokasi', jam_keluar = getdate()
                ,bundle_id = '${bundle_id}' where parking_id = '${parking_id}'`;
            }
            

            request.query(upd, async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                let sel = `select *
                ,DATEDIFF(HOUR , created,getdate()) AS jamstay 
                ,convert(varchar(5),created,108) as jam_masuk from parking 
                where isactive = 1 and parking_id = '${parking_id}' order by created desc`
                let dt = await request.query(sel);
                dt = dt.recordset
                return res.success({
                    error : "false",
                    result: dt,
                    message: "Berhasil ...."
                });
            })

        } catch (error) {
            return res.error(error)
        }
    },

    loading: async function(req,res){
        const {data} = req.body;
        console.log('Prosenya kesini');
        console.log(data);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            // untuk inbound

            // let no_do = data.nomor_do ? `,nomor_do = '${data.nomor_do}'`:``
            // let bundle = data.bundle_id ? `,bundle_id = '${data.bundle_id}'`:``
            // let picking = data.picking_by ? `,picking_by = '${data.picking_by}'`:``
            // let ceker = data.checker ? `,checker = '${data.checker}'`:``
            // let gate = data.gate_process ? `,gate_process = '${data.gate_process}'`:``
            // let driver = data.driver ? `,driver = '${data.driver}'`:``
            // let nomor_gr = data.nomor_gr ? `,nomor_gr = '${data.nomor_gr}'`:``
            
            let no_do = ``;
            let bundle = ``;
            let picking = ``;
            let ceker = ``;
            let gate = ``;
            let driver = ``;
            let nomor_gr = ``;
            let kode_status = '';
            let status = '';
            let startdocumentoutbound = '';
            let pickingdateoutbound = '';
            let loading_date = '';
            let loading = '';
            let finish_loading_date = '';
            let start_unloading_date = '';


            if(data.parkingType=='outbound' && data.processType=='start-document'){
                bundle = data.bundle_id ? `,bundle_id = '${data.bundle_id}'`:``;
                no_do = data.nomor_do ? `,nomor_do = '${data.nomor_do}'`:``;
                startdocumentoutbound = `,startdocumentoutbound = getdate()`;
                kode_status = 'WT2';
                status = 'Start Document';
            }

            if(data.parkingType=='outbound' && data.processType=='start-picking-process'){
                picking = data.picking_by ? `,picking_by = '${data.picking_by}'`:``;
                gate = data.gate_process ? `,gate_process = '${data.gate_process}'`:``;
                kode_status = 'WT3';
                status = 'Start Picking Proses';
                pickingdateoutbound = `,pickingdateoutbound = getdate()`;
            }
            
            if(data.parkingType=='outbound' && data.processType=='start-loading'){
                loading_date = `,loading_date = getdate()`;
                kode_status = 'WT4';
                status = 'Start Loading';
                loading = data.loading_by ? `,loading_by = '${data.loading_by}'`:``;
            }


            if(data.parkingType=='outbound' && data.processType=='finish-loading'){
                finish_loading_date = `,finish_loading_date = getdate()`;
                kode_status = 'WT5';
                status = 'Finish Loading';
            }

            if(data.parkingType=='inbound' && data.processType=='start-unloading'){
                start_unloading_date = `,start_unloading_date = getdate()`;
                kode_status = 'WT2';
                status = 'Start Unloading';
                ceker = data.checker ? `,checker = '${data.checker}'`:``;
                gate = data.gate_process ? `,gate_process = '${data.gate_process}'`:``;
            }


            
            let upd = `update parking set 
                kode_status = '${kode_status}'
                ,status = '${status}'
                ${gate}${ceker}${bundle}${no_do}${picking}${driver}${nomor_gr}${startdocumentoutbound}${pickingdateoutbound}
                ${loading}${loading_date}${finish_loading_date}${start_unloading_date}
                where parking_id = '${data.parking_id}'`;

            
            await request.query(upd)

            let finds = `select *,DATEDIFF(HOUR , created,getdate()) AS jamstay 
                ,convert(varchar(5),created,108) as jam_masuk
                from parking p where parking_id = '${data.parking_id}' `;
                //console.log(finds);
            let dt = await request.query(finds)
            dt = dt.recordset
                
            return res.success({
                error : "false",
                result: dt,
                message: "Berhasil ...."
            });
        } catch (error) {
            console.log(error);
            return res.error(error)
        }
    },
    finishLoad: async function(req,res){
        const {data} = req.body
        //console.log(data);
        await DB.poolConnect;
        console.log('finishLoad');
        try {
            const request = DB.pool.request();
            let no_do = data.nomor_do ? `,nomor_do = '${data.nomor_do}'`:``;
            let bundle = data.bundle_id ? `,bundle_id = '${data.bundle_id}'`:``;
            let picking = data.picking_by ? `,picking_by = '${data.picking_by}'`:``;
            let document_by = data.document_by ? `,document_by = '${data.document_by}'`:``;
            let ceker = data.checker ? `,checker = '${data.checker}'`:``;
            let gate = data.gate_process ? `,gate_process = '${data.gate_process}'`:``;
            let nomor_gr = data.nomor_gr ? `,nomor_gr = '${data.nomor_gr}'`:``
            let finish_unloading_date = ``;
            let finish_document_date = ``;
            let finish_loading_date = ``;
            let status = ``;
            let kode_status = '';
            


            if(data.parkingType=='inbound' && data.processType=='finish-unloading'){
                finish_unloading_date = `,finish_unloading_date = getdate()`;
                kode_status = 'WT3';
                status = 'Finish Unloading';
            }

            if(data.parkingType=='inbound' && data.processType=='finish-document'){
                finish_document_date = `,finish_document_date = getdate()`;
                document_by = data.document_by ? `,document_by = '${data.document_by}'`:``;
                kode_status = 'WT4';
                status = 'Document Finish';
            }

            if(data.parkingType=='outbound' && data.processType=='finish-loading'){
                finish_loading_date = `,finish_loading_date = getdate()`;
                kode_status = 'WT5';
                status = 'Finish Loading';
            }

            if(data.parkingType=='outbound' && data.processType=='finish-document-outbound'){
                finish_document_date = `,finish_document_date = getdate()`;
                document_by = data.document_by ? `,document_by = '${data.document_by}'`:``;
                kode_status = 'WT6';
                status = 'Document Finish';
            }
            

            let upd = `UPDATE parking SET 
                kode_status = '${kode_status}'
                ,status = '${status}'
                ${gate}${ceker}${bundle}${no_do}${picking}${finish_unloading_date}${finish_loading_date}${finish_document_date}${document_by}${nomor_gr}
                WHERE nomor_parkir = '${data.parking_id}'`;


                //console.log(upd);
            
            await request.query(upd)
            let finds = `select *,DATEDIFF(HOUR , created,getdate()) AS jamstay 
                ,convert(varchar(5),created,108) as jam_masuk
                from parking p where nomor_parkir = '${data.parking_id}' `;
                //console.log(finds);
            let dt = await request.query(finds)
            dt = dt.recordset
                
            return res.success({
                error : "false",
                result: dt,
                message: "Berhasil ...."
            });
        } catch (error) {
            console.log(error);
            return res.error(error)
        }
    },
    save: async function(req, res){
        const {nopol,truck_type,transporter,destorigin,stnk,kir,sim,filename,tipe,reff_no,remarks,nama_driver,m_kendaraan_transporter_id} = JSON.parse(req.body.document);;

        console.log("indra...",nopol,truck_type,transporter,destorigin);

        await DB.poolConnect;
        try {
            const request = DB.pool.request();

            let upc = new UPC({flagCode: '1'});
            const dataupc = upc.create();
    
            let parking_id = uuid();
            let insert = `insert into parking 
            (parking_id,nopol,truck_type ,transporter ,dest_origin ,image,isactive ,kode_status 
            ,status,stnk,kir,sim,tipe,created,reff_no,remarks,img_id,driver,nomor_parkir,m_kendaraan_transporter_id,upc_register)
            values (newid(),'${nopol}','${truck_type}','${transporter}' ,'${destorigin}' 
            ,'${filename}',1 ,'WT1' ,'Truck Incoming','${stnk}','${kir}','${sim}','${tipe}',getdate(),'${reff_no}'
            ,'${remarks}','${parking_id}','${nama_driver}',RIGHT(REPLACE(NEWID(),'-',''),7),'${m_kendaraan_transporter_id}','${dataupc}')`


            console.log(insert);
            await request.query(insert);
            var uploadFile = req.file("files");
            try {
            await uploadFiles(parking_id,uploadFile)
            
            let sel = `select *
            ,DATEDIFF(HOUR , created,getdate()) AS jamstay 
            ,convert(varchar(5),created,108) as jam_masuk from parking where isactive = 1 order by created desc`
            let dt = await request.query(sel);
            dt = dt.recordset
                
            return res.success({
                result : dt
            })
            } catch (error) {
                console.log(error);
            }

        } catch (error) {
            console.log(error);
        }
        
        return res.error("oke...")
    },
    save2: async function(req, res){
        const {nopol,truck_type,transporter,destorigin,stnk,kir,sim,filename,tipe,reff_no,
            remarks,nama_driver,m_kendaraan_transporter_id,istidakbersih,
            isadakebocoran,isaromatidaksedap,no_ktp_driver,no_sertifikat_vaksin,register_by} = req.body;


        console.log(req.body);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let parking_id = uuid();
            let filename = parking_id.concat('.png');
            let upc = new UPC({flagCode: '1'});
            const dataupc = upc.create();
            let periode = moment().format('YYYY-MM-DD');

              let isStnkYn = isYesOrNo(stnk);
              let isKirYn = isYesOrNo(stnk);
              let isSimYn = isYesOrNo(stnk);
              let istidakbersihYn = isYesOrNo(istidakbersih);
              let isadakebocoranYn = isYesOrNo(isadakebocoran);
              let isaromatidaksedapYn = isYesOrNo(isaromatidaksedap);
              let checkTipe = validationStatus(tipe);
              let registerby =  validationField(register_by);

              let status = `Register ${checkTipe}`;


              let no_ktp_driver_text = validationField(no_ktp_driver);
              let no_sertifikat_vaksin_text = validationField(no_sertifikat_vaksin);

            let sqlgetNomorUrut = `SELECT (COALESCE(MAX(nomor_urut),0) + 1) AS nomor_urut FROM parking
            WHERE CONVERT (VARCHAR(10),created,120) = '${periode}'`;
            console.log(sqlgetNomorUrut);
            let getNomorUrut = await request.query(sqlgetNomorUrut);
            let nomor_urut = getNomorUrut.recordset.length > 0 ? getNomorUrut.recordset[0].nomor_urut : 0;

            let insert = `insert into parking 
            (parking_id,nopol,truck_type ,transporter ,dest_origin ,image ,kode_status 
            ,status,stnk,kir,sim,tipe,reff_no,remarks,img_id,driver,
            nomor_parkir,upc_register,m_kendaraan_transporter_id,istidakbersih,isadakebocoran,isaromatidaksedap,
            no_ktp_driver,no_sertifikat_vaksin,register_by,nomor_urut)
            values ('${parking_id}','${nopol}','${truck_type}','${transporter}' ,'${destorigin}' 
            ,'${filename}','WT1' ,'${status}','${isStnkYn}','${isKirYn}','${isSimYn}','${tipe}','${reff_no}'
            ,'${remarks}','${parking_id}','${nama_driver}',
            RIGHT(REPLACE(NEWID(),'-',''),7),'${dataupc}',
            '${m_kendaraan_transporter_id}','${istidakbersihYn}','${isadakebocoranYn}','${isaromatidaksedapYn}',
            ${no_ktp_driver_text},${no_sertifikat_vaksin_text},${registerby},${nomor_urut})`;

            //console.log(insert);


            let InsertHistory = `INSERT INTO parking_history
            (parking_id, kode_status, status)
            VALUES('${parking_id}', 'WT1', 'Menunggu Proses')`;

            //console.log(insert);
            await request.query(insert);
            await request.query(InsertHistory);
            try {


            //await uploadFilesBase64(parking_id,files);

            
            let sel = `select *
            ,DATEDIFF(HOUR , created,getdate()) AS jamstay 
            ,convert(varchar(5),created,108) as jam_masuk from parking where isactive = 'Y' order by created desc`
            let dt = await request.query(sel);
            dt = dt.recordset
                
            return res.success({
                result : dt
            })
            } catch (error) {
                console.log(error);
            }

        } catch (error) {
            console.log(error);
        }
        
        return res.error("oke...")
    },

    checkout: async function(req,res){
        const {data} = req.body
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            console.log(data);

            let kode_status = data.tipe=='OUTBOUND' ? 'WT7' : 'WT5';

            let upd = `update parking set jam_keluar = getdate(),kode_status = '${kode_status}',
            status='Checkout',checkout_by='${data.checkout_by}'
            where parking_id = '${data.parking_id}'`

            await request.query(upd)

            let finds = `select *,DATEDIFF(HOUR , created,getdate()) AS jamstay 
                ,convert(varchar(5),created,108) as jam_masuk
                from parking p where nomor_parkir = '${data.parking_id}' `;
                console.log(finds);
            let dt = await request.query(finds)
            dt = dt.recordset
                
            return res.success({
                error : "false",
                result: dt,
                message: "Berhasil ...."
            });
        } catch (error) {
            console.log(error);
            return res.error(error)
        }
    },
    findOne : async function(req, res){
        const {
            query: {parking_id}
          } = req;

        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let finds = `select *,DATEDIFF(HOUR , created,getdate()) AS jamstay 
            ,convert(varchar(5),created,108) as jam_masuk
            from parking p where nomor_parkir = '${parking_id}' `;
            //console.log(finds);
            let data = await request.query(finds)
            data = data.recordset
            if(data.length > 0 ){
                return res.success({
                    error : "false",
                    result: data,
                    message: "Berhasil ...."
                });
            }else{
                return res.success({
                    error : "false",
                    message: "Not Found"
                });
            }
            
        }catch(err){
            console.log(err);
            return res.error(err)
        }
    },

    detail : async function(req, res){
        const id = req.param('id');
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let queryDataTable = `SELECT p.*,rk.nama AS nama_kendaraan,
            CASE WHEN p.stnk='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS isstnk,
            CASE WHEN p.sim='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS issim,
            CASE WHEN p.kir='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS iskir
            FROM 
            parking p 
            LEFT JOIN r_kendaraan rk ON(rk.kode=p.truck_type)
            WHERE p.parking_id = '${id}'`;

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

            
        }catch(err){
            //console.log(err);
            return res.error(err)
        }
    },


    delete : async function(req, res){
        const id = req.param('id');
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let queryDataTable = `DELETE FROM parking
            WHERE parking_id = '${id}'`;

            console.log(queryDataTable);


            // return res.success({
            //     message: "Delete data successfully"
            // });


            request.query(queryDataTable, (err) => {
                if (err) {
                  return res.error(err);
                }
        
                return res.success({
                  message: "Delete data successfully"
                });
            });

            
        }catch(err){
            console.log(err);
            return res.error(err)
        }
    },
    showimage: async function (req, res) {
        // //   const user = req.param('user')
        const record = req.param('record')
        const filename = req.param('filename')
        // console.log(filename);
        await DB.poolConnect;
        const request = DB.pool.request();

        let dt = await request.query(`select * from parking where nomor_parkir = '${filename}'`)

        //console.log(`select * from parking where img_id = '${filename}'`);

        let id = dt.recordset[0].img_id;
        let images = dt.recordset[0].image;

        fs.readFile(`./api/repo/parking/${id}/${images}`, function(err, data) {
            if (err){
                return res.error(err)
            }else {
              res.writeHead(200, {'Content-Type': 'image/jpeg'});
              res.end(data); // Send the file data to the browser.
            }
        });
      },
    summary:async function(req,res){
        const {data} = req.body
        //console.log(data);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let obj = {}
            let sel1 = `select convert(varchar(10),created,120) period
            ,sum(case when tipe = 'INBOUND' then 1 else 0 end ) as inbound
            ,sum(case when tipe = 'OUTBOUND' then 1 else 0 end ) as outbound
            ,sum(case when tipe not in ('OUTBOUND','INBOUND') then 1 else 0 end ) as abnormal
            ,sum(case when kode_status = 'WT1' AND tipe = 'INBOUND' then 1 else 0 end ) as register_inbound
            ,sum(case when kode_status = 'WT2' AND tipe = 'INBOUND' then 1 else 0 end ) as start_onloading_inbound
            ,sum(case when kode_status = 'WT3' AND tipe = 'INBOUND' then 1 else 0 end ) as finish_onloading_inbound
            ,sum(case when kode_status = 'WT4' AND tipe = 'INBOUND' then 1 else 0 end ) as document_finish_inbound
            ,sum(case when kode_status = 'WT1' AND tipe = 'OUTBOUND' then 1 else 0 end ) as register_outbound
            ,sum(case when kode_status = 'WT2' AND tipe = 'OUTBOUND' then 1 else 0 end ) as start_document_outbound
            ,sum(case when kode_status = 'WT3' AND tipe = 'OUTBOUND' then 1 else 0 end ) as start_picking_outbound
            ,sum(case when kode_status = 'WT4' AND tipe = 'OUTBOUND' then 1 else 0 end ) as start_loading_outbound
            ,sum(case when kode_status = 'WT5' AND tipe = 'OUTBOUND' then 1 else 0 end ) as finish_loading_outbound
            ,sum(case when kode_status = 'WT6' AND tipe = 'OUTBOUND' then 1 else 0 end ) as document_finish_outbound
            ,sum(case when kode_status = 'WT5' AND tipe = 'INBOUND' then 1 else 0 end ) as checkout_inbound
            ,sum(case when kode_status = 'WT7' AND tipe = 'OUTBOUND' then 1 else 0 end ) as checkout_outbound
            ,avg(datediff(MINUTE,loading_date,finish_loading_date)) as avg_loading_time
            from parking p where
            convert(varchar(10),created,120) <= '${data.period}'
            AND (jam_keluar IS NULL OR (jam_keluar IS NOT NULL AND CONVERT (VARCHAR(10),p.created,120) = '${data.period}'))
            group by convert(varchar(10),created,120)`;


            let sqlgetInbound = `SELECT COUNT(1) AS inbound FROM parking WHERE convert(varchar(10),created,120) = '${data.period}' AND tipe = 'INBOUND'`;
            let dataInbound = await request.query(sqlgetInbound);
            let inbound = dataInbound.recordset[0].inbound;

            let sqlgetInboundGantung = `SELECT COUNT(1) AS inboundgantung FROM parking WHERE convert(varchar(10),created,120) < '${data.period}' AND tipe = 'INBOUND' AND jam_keluar IS NULL`;
            let dataInboundGantung = await request.query(sqlgetInboundGantung);
            let inboundgantung = dataInboundGantung.recordset[0].inboundgantung;

            let sqlgetOutbound = `SELECT COUNT(1) AS outbound FROM parking WHERE convert(varchar(10),created,120) = '${data.period}' AND tipe = 'OUTBOUND'`;
            let dataOutbound = await request.query(sqlgetOutbound);
            let outbound = dataOutbound.recordset[0].outbound;
        
            
            let sqlgetOutboundGantung = `SELECT COUNT(1) AS outboundgantung FROM parking WHERE convert(varchar(10),created,120) < '${data.period}' AND tipe = 'OUTBOUND' AND jam_keluar IS NULL`;
            let dataOutboundGantung = await request.query(sqlgetOutboundGantung);
            let outboundgantung = dataOutboundGantung.recordset[0].outboundgantung;
            
            let sqlgetRegisterInbound = `SELECT COUNT(1) AS register_inbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'INBOUND' AND kode_status='WT1' AND jam_keluar IS NULL`;
            let dataRegisterInbound = await request.query(sqlgetRegisterInbound);
            let register_inbound = dataRegisterInbound.recordset[0].register_inbound;
            let sqlgetStartUnloading = `SELECT COUNT(1) AS start_onloading_inbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'INBOUND' AND kode_status='WT2' AND jam_keluar IS NULL`;
            let dataStartUnloading = await request.query(sqlgetStartUnloading);
            let start_onloading_inbound = dataStartUnloading.recordset[0].start_onloading_inbound;
            let sqlgetFinishUnloading = `SELECT COUNT(1) AS finish_onloading_inbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'INBOUND' AND kode_status='WT3' AND jam_keluar IS NULL`;
            let dataFinishUnloading = await request.query(sqlgetFinishUnloading);
            let finish_onloading_inbound = dataFinishUnloading.recordset[0].finish_onloading_inbound;
            let sqlgetDucumentFinishInbound  = `SELECT COUNT(1) AS document_finish_inbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'INBOUND' AND kode_status='WT4' AND jam_keluar IS NULL`;
            let dataDucumentFinishInbound = await request.query(sqlgetDucumentFinishInbound);
            let document_finish_inbound = dataDucumentFinishInbound.recordset[0].document_finish_inbound;
            let sqlgetCheckoutInbound = `SELECT COUNT(1) AS checkout_inbound FROM parking WHERE  convert(varchar(10),created,120) = '${data.period}' AND tipe = 'INBOUND' AND kode_status='WT5' AND jam_keluar IS NOT NULL`;
            let dataCheckoutInbound = await request.query(sqlgetCheckoutInbound);
            let checkout_inbound = dataCheckoutInbound.recordset[0].checkout_inbound;
            let sqlgetRegisterOutbound = `SELECT COUNT(1) AS register_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT1' AND jam_keluar IS NULL`;
            let dataRegisterOutbound = await request.query(sqlgetRegisterOutbound);
            let register_outbound = dataRegisterOutbound.recordset[0].register_outbound;
            let sqlgetStartDocumentOutbound = `SELECT COUNT(1) AS start_document_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT2' AND jam_keluar IS NULL`;
            let dataStartDocumentOutbound = await request.query(sqlgetStartDocumentOutbound);
            let start_document_outbound = dataStartDocumentOutbound.recordset[0].start_document_outbound;
            let sqlgetPickingOutbound = `SELECT COUNT(1) AS start_picking_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT3' AND jam_keluar IS NULL`;
            let dataPickingOutbound = await request.query(sqlgetPickingOutbound);
            let start_picking_outbound = dataPickingOutbound.recordset[0].start_picking_outbound;
            let sqlgetStartLoadingOutbound = `SELECT COUNT(1) AS start_loading_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT4' AND jam_keluar IS NULL`;
            let dataStartLoadingOutbound = await request.query(sqlgetStartLoadingOutbound);
            let start_loading_outbound = dataStartLoadingOutbound.recordset[0].start_loading_outbound;
            let sqlgetFinishLoadingOutbound = `SELECT COUNT(1) AS finish_loading_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT5' AND jam_keluar IS NULL`;
            let dataFinishLoadingOutbound = await request.query(sqlgetFinishLoadingOutbound);
            let finish_loading_outbound = dataFinishLoadingOutbound.recordset[0].finish_loading_outbound;
            let sqlgetDocumentFinishOutbound = `SELECT COUNT(1) AS document_finish_outbound FROM parking WHERE  convert(varchar(10),created,120) <= '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT6' AND jam_keluar IS NULL`;
            let dataDocumentFinishOutbound = await request.query(sqlgetDocumentFinishOutbound);
            let document_finish_outbound = dataDocumentFinishOutbound.recordset[0].document_finish_outbound;
            let sqlgetCheckoutOutbound = `SELECT COUNT(1) AS checkout_outbound FROM parking WHERE  convert(varchar(10),created,120) = '${data.period}' AND tipe = 'OUTBOUND' AND kode_status='WT7' AND jam_keluar IS NOT NULL`;
            let dataCheckoutOutbound = await request.query(sqlgetCheckoutOutbound);
            let checkout_outbound = dataCheckoutOutbound.recordset[0].checkout_outbound;

            console.log('register_outbound ',register_outbound);

            let dataObj =
            {
                period: data.period,
                inbound: inbound + inboundgantung,
                outbound: outbound + outboundgantung,
                abnormal: 0,
                register_inbound: register_inbound,
                start_onloading_inbound: start_onloading_inbound,
                finish_onloading_inbound: finish_onloading_inbound,
                document_finish_inbound: document_finish_inbound,
                register_outbound: register_outbound,
                start_document_outbound: start_document_outbound,
                start_picking_outbound: start_picking_outbound,
                start_loading_outbound: start_loading_outbound,
                finish_loading_outbound: finish_loading_outbound,
                document_finish_outbound: document_finish_outbound,
                checkout_inbound: checkout_inbound,
                checkout_outbound: checkout_outbound,
                avg_loading_time: null
            }


            console.log(obj);
            return res.success({
                error : "false",
                result: dataObj,
                message: "Berhasil ...."
            });
            //     //console.log(sel1);

            // let dt1 = await request.query(sel1)
            // // http://localhost:1337/parking/cetak/201BC
            // if(dt1.recordset.length > 0){
            //     obj = dt1.recordset[0];

            //     // let sel2 = `SELECT p.*,rk.nama AS nama_kendaraan,
            //     // CASE WHEN p.stnk='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS isstnk,
            //     // CASE WHEN p.sim='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS issim,
            //     // CASE WHEN p.kir='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS iskir
            //     // FROM 
            //     // parking p 
            //     // LEFT JOIN r_kendaraan rk ON(rk.kode=p.truck_type)
            //     // WHERE
            //     // CONVERT (VARCHAR(10),p.created,120) = '${data.period}'`;
            //     //console.log(sel2);
            //     //let dt2 = await request.query(sel2)
            //     //obj.list = dt2.recordset;


       
            // }else{
            //     return res.success({
            //         error : "false",
            //         result: null,
            //         message: "Data not found"
            //     });
            // }
            
        }catch(err){
            return res.error(err)
        }
    },

    findListDetailDashboard: async function(req, res) {
        const {
          query: { currentPage, pageSize,searchText,period}
        } = req;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
          const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";
   
          let filtersearchtext = ``;
          if (searchText) {
            filtersearchtext = `AND (p.nopol LIKE '%${searchText}%' 
             OR p.transporter LIKE '%${searchText}%'
             OR p.driver LIKE '%${searchText}%')`;
          }
   
    
          let queryCountTable = `SELECT COUNT(1) AS total_rows
                                  FROM parking p WHERE 
                                  CONVERT (VARCHAR(10),p.created,120) <= '${period}'
                                  AND (jam_keluar IS NULL OR (jam_keluar IS NOT NULL AND CONVERT (VARCHAR(10),p.created,120) = '${period}'))
                                  ${filtersearchtext} ${whereClause}`;
                                  //console.log(queryCountTable);
    
          let queryDataTable = `SELECT p.*,rk.nama AS nama_kendaraan,
                                CASE WHEN p.stnk='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS isstnk,
                                CASE WHEN p.sim='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS issim,
                                CASE WHEN p.kir='Y' THEN 'Ada' ELSE 'Tidak Ada' END AS iskir
                                FROM 
                                parking p 
                                LEFT JOIN r_kendaraan rk ON(rk.kode=p.truck_type)
                                WHERE
                                CONVERT (VARCHAR(10),p.created,120) <= '${period}'
                                AND (jam_keluar IS NULL OR (jam_keluar IS NOT NULL AND CONVERT (VARCHAR(10),p.created,120) = '${period}'))
                                ${filtersearchtext} ${whereClause}
                                ORDER BY p.created desc
                                OFFSET ${offset} ROWS
                                FETCH NEXT ${limit} ROWS ONLY`;

                                console.log(queryDataTable);
    
          const totalItems = await request.query(queryCountTable);
          const count = totalItems.recordset[0].total_rows || 0;
    
          request.query(queryDataTable,async (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset;
            for (let i = 0; i < rows.length; i++) {
                let nomor_urut = pad(rows[i].nomor_urut);
                rows[i].nomor_urut = nomor_urut;
            }
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


    cetak: async function(req,res){
        var pdf = require("pdf-creator-node");
        var fs = require("fs");

        const id = req.param('id');
        

        await DB.poolConnect;
        const request = DB.pool.request();

        let dt = await request.query(`select *,convert(varchar(5),created,108 )as jam 
        ,convert(varchar(10),created,120 )as tgl
        from parking where nomor_parkir = '${id}'`)
        let da = dt.recordset[0];

        let transporter = da.transporter;
        let truck_type = da.truck_type;
        let nopol = da.nopol;
        let dest_origin = da.dest_origin;
        let jam = da.jam;
        let tipe = da.tipe;
        let tgl = da.tgl;
        let upc_register = da.upc_register;
        let base64Text = ``;

        axios.post('https://esalesdev.enesis.com/testapi/scannerservice/generatebarcode', {
            barcode: upc_register
        })
        .then(response => {
            base64Text = response.data;
            let obj = `<html lang="en">
            <head>
            <!-- Required meta tags -->
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            
            <!-- Bootstrap CSS -->
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
            
            <title>Hello, world!</title>
            </head>
            <body>  
                <div class="row col-md-6 bg-danger">
                    <div class="col col-md-8 bg-success">
                        <table class="table">
                            <tr>
                                <td>Nama Transporter</td>
                                <td style="padding:15px">:</td>
                                <td>${transporter}</td>
                                <td rowspan=6 style="padding-right:30px"><img style="width:400px; margin-left:100px" src="${base64Text}" alt=""></td>
                            </tr>
                            <tr>
                                <td>Jenis Kendaraan</td>
                                <td style="padding:15px">:</td>
                                <td>${truck_type}</td>
                            </tr>
                            <tr>
                                <td>Nomor kendaraan</td>
                                <td style="padding:15px">:</td>
                                <td>${nopol}</td>
                            </tr>
                            <tr>
                                <td>Waktu Registrasi</td>
                                <td style="padding:15px">:</td>
                                <td>${tgl}      ${jam}</td>
                            </tr>
                            <tr>
                                <td>Tipe</td>
                                <td style="padding:15px">:</td>
                                <td>${tipe}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </body>
            </html>`

                    console.log(transporter);

                    // Read HTML Template
                    var html = fs.readFileSync(`./assets/emailtemplate/cetakparking.html`, "utf8");
                    var options = {
                        format: "A4",
                        orientation: "portrait",
                        border: "10mm",
                        header: {
                            height: "45mm",
                            contents: '<div style="text-align: center; font-size:25px"><b>FORM KEDATANGAN KENDARAAN</b></div></br><hr>'
                        },
                        footer: {
                            height: "28mm",
                            contents: {
                                first: '.',
                                2: 'Second page', // Any page number is working. 1-based index
                                default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                                last: 'Last Page'
                            }
                        }
                    };

                    

                    var users = [
                        {
                        name: "Shyam",
                        age: "26",
                        },
                        {
                        name: "Navjot",
                        age: "26",
                        },
                        {
                        name: "Vitthal",
                        age: "26",
                        },
                    ];
                    var document = {
                        html: html.replace('?',id).replace('#',obj).replace('*',tgl),
                        data: {
                        users: users,
                        regist: "12345"
                        },
                        path: `./assets/report/pdfparking/${id}.pdf`,
                        type: "",
                    };

                    pdf
                    .create(document, options)
                    .then((dt) => {
                        console.log(dt);
                        res.sendFile(path.resolve(`./assets/report/pdfparking/${id}.pdf`));
                    })
                    .catch((error) => {
                        console.error(error);
                    });
        })
        .catch(error => {
            console.error(error)
        });


        
    },
    cetakDataKendaraan: async function(req,res){
        var pdf = require("pdf-creator-node");
        var fs = require("fs");

        const id = req.param('id');
        

        await DB.poolConnect;
        const request = DB.pool.request();

        let dt = await request.query(`SELECT * FROM m_kendaraan_transporter_v 
        WHERE m_kendaraan_transporter_id = '${id}'`)
        let da = dt.recordset[0];

        let nama_transporter = da.nama_transporter;
        let plat_number = da.plat_number;
        let upc = da.upc;
        let truck_type = da.nama_kendaraan;
        let base64Text = ``;


        axios.post('https://esalesdev.enesis.com/testapi/scannerservice/generatebarcode', {
            barcode: upc
        })
        .then(response => {
            base64Text = response.data;
            let obj = `
                    <table>
                        <td>
                            <tr>
                                <td>Nama Transporter</td>
                                <td style="padding:15px">:</td>
                                <td>${nama_transporter}</td>
                            </tr>
                            <tr>
                                <td>Jenis Kendaraan</td>
                                <td style="padding:15px">:</td>
                                <td>${truck_type}</td>
                            </tr>
                            <tr>
                                <td>Nomor kendaraan</td>
                                <td style="padding:15px">:</td>
                                <td>${plat_number}</td>
                            </tr>
                        </td>
                    </table>`

                    // Read HTML Template
                    var html = fs.readFileSync(`./assets/emailtemplate/cetakdatakendaraan.html`, "utf8");
                    var options = {
                        height:"15.85cm",
                        width:"8.5cm",
                        orientation: "portrait",
                        header: {
                            height: "35mm",
                            contents: '<div style="text-align: center; font-size:25px"><b>FORM DATA KENDARAAN</b></div></br><hr>'
                        }
                    };

                    

                    var users = [
                        {
                        name: "Shyam",
                        age: "26",
                        },
                        {
                        name: "Navjot",
                        age: "26",
                        },
                        {
                        name: "Vitthal",
                        age: "26",
                        },
                    ];

                    
                    var document = {
                        html: html.replace('?',base64Text).replace('#',obj),
                        data: {
                        users: users,
                        regist: "12345"
                        },
                        path: `./assets/report/pdfparking/${id}.pdf`,
                        type: "",
                    };

                    pdf
                    .create(document, options)
                    .then((dt) => {
                        console.log(dt);
                        res.sendFile(path.resolve(`./assets/report/pdfparking/${id}.pdf`));
                    })
                    .catch((error) => {
                        console.error(error);
                    });
        })
        .catch(error => {
            console.error(error)
        });


        
    }

}
async function uploadFiles(id,file){
    var uploadFile = file;
    // console.log(uploadFile);
    let filenames = ``
    uploadFile.upload({maxBytes: 500000000000},
      async function onUploadComplete(err, files) {
        if (err) {
          let errMsg = err.message
          console.log(errMsg);
          return res.error(errMsg)
        }
        console.log("px");
      for (const file of files) {
        // console.log('filename', file.filename)
        filenames = file.filename;
        fs.mkdirSync(dokumentPath( 'parking', id), {
            recursive: true
        })
        const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'parking', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
        console.log(filesamaDir);

        if (filesamaDir.found.length > 0) {
            console.log('isexist file nama sama', filesamaDir.found[0])
            fs.unlinkSync(filesamaDir.found[0])
        }
        // console.log(filesamaDir);
        fs.renameSync(file.fd, path.resolve(dokumentPath( 'parking', id), file.filename))
      }
    })
}

async function uploadFilesBase64(id,file){
    var base64Str = file;
    var optionalObj = {'fileName': id, 'type':'png'};
            
    
    let locationFiles = dokumentPath('parking','parking').replace(/\\/g, '/');
    //shell.mkdir('-p', locationFiles);
    let imageInfo = await base64ToImage(base64Str,locationFiles,optionalObj);

    let locationFiles2 = dokumentPath('parking',id).replace(/\\/g, '/');
    shell.mkdir('-p', locationFiles2);


    let lokasi = dokumentPath2('parking').replace(/\\/g, '/');

    let oldfile = lokasi+'/parking'+id+'.png';
    let newfile = locationFiles2+'/'+id+'.png';

    console.log(oldfile.replace(/\\/g, '/'));
    console.log(locationFiles2.replace(/\\/g, '/'));

    fs.rename(oldfile, newfile, (err) => {
        if (err) throw err;
        console.log('Rename complete!');
    });

    console.log(oldfile);
    console.log(newfile);

    console.log(imageInfo);
  
}


function isYesOrNo(param){

    if(param && param!='N'){

        return 'Y';

    }else{
        return 'N';
    }

}


function validationField(param){

    if(param){

        return `'${param}'`;

    }else{
        return 'NULL';
    }

}


function validationStatus(param){

    if(param=='INBOUND'){

        return `Inbound`;

    }else{
        return 'Outbound';
    }

}


function pad(d) {
    var str = "" + d
    var pad = "00000"
    var ans = pad.substring(0, pad.length - str.length) + str
    return ans;
  }


