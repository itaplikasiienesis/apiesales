const xlsx = require('node-xlsx');
const uuid = require("uuid/v4");
const moment = require('moment');
const XLS = require('xlsx');
const otpGenerator = require('otp-generator');
const SendEmail = require('../../../services/SendEmail');
const soapRequest = require('easy-soap-request');
const xml2js = require('xml2js');
const Base64 = require('base-64');
const numeral = require('numeral');
const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templatefkr');
const fs = require("fs");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const path = require('path');
const glob = require("glob");
const { log } = require('console');
const { sync } = require('glob');
const { has } = require('lodash');
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
  read: async function (req, res) {

    const {m_user_id} = req.body;
    
    req.file('excel')
    .upload({
      maxBytes: 150000000
    }, async function whenDone(err, uploadedFiles) {
        if (err)
        return res.error(err);
        
        await DB.poolConnect;
        const request = DB.pool.request();



        if (uploadedFiles.length === 0) {          
          return res.error([], 'Tidak ada file yang diupload!');
        }

        const fd = uploadedFiles[0].fd;

        var obj = xlsx.parse(fd);
        var getdateExcel = XLS.readFile(fd, { cellDates: true });
        
        
        const excel = obj[0].data;
        
        let tabName = obj[0].name.toUpperCase().replace(/\s/g, '');
        let tujuan_retur = obj[0].name.toUpperCase().replace(/\s/g, '');

        if (obj[0].name.toUpperCase().replace(/\s/g, '') != tabName.toUpperCase()) {
            res.error({
              message: 'Cek Kembali!! File yang diupload tidak sesuai.'
            });
            return false;         
        }


        // let tanggalcek = Date.parse(getdateExcel.Sheets[tabName].E12.w);
        // console.log('tanggalcek ',tanggalcek);

        // console.log(getdateExcel.Sheets[tabName].E12.w);
        // let isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'MMM-YY',true).isValid();

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'MMM-YYYY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'MM-YY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'DD-MM-YYYY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'DD-MM-YY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'DD-MMM-YY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'MMM-DD-YY',true).isValid();
        // }

        // if(!isBetul){
        //   isBetul = moment(getdateExcel.Sheets[tabName].E12.w,'MMM-DD-YYYY',true).isValid();
        // }

        // console.log(isBetul);


        // if(!isNaN(Date.parse(getdateExcel.Sheets[tabName].E12.w)))
        // {
        //   console.log('buan tanggal');
        // }
        let bulan = parseInt(moment(getdateExcel.Sheets[tabName].E12.w,'MMM-YYYY').format('MM'));
        let tahun = parseInt(moment(getdateExcel.Sheets[tabName].E12.w,'MMM-YYYY').format('YYYY'));
        

        let bacaperiod = getdateExcel.Sheets[tabName].E12.w;

        let pengajuan = "";
        try {
          pengajuan = getdateExcel.Sheets[tabName].E14.w;
        } catch (error) {
          
        }
        if(bacaperiod.length > 10){
          res.error({
            message: `Format periode tanggal salah pastikan periode diisi tanggal 1 pada periode bulan \n
            tahun yang diinginkan contoh 01-08-2020 (Contoh : periode agustus 2020)`
          });
          return false;  
        }

        if(isNaN(bulan))
        {
          res.error({
            message: `Format periode tanggal salah pastikan periode diisi tanggal 1 pada periode bulan tahun yang diinginkan contoh 01-08-2020 (Contoh : periode agustus 2020)`
          });
          return false;  
        }

        
        let kode_pajak = excel[14][4];
        let kode_distributor = excel[14][5];
        //let district = excel[12][5].toUpperCase().replace(/\s/g, '');
        let sqlSelectDistributor = `SELECT * FROM m_distributor_v mdv WHERE kode_pajak='${kode_pajak}' AND kode='${kode_distributor}'`;
        let getdistributor = await request.query(sqlSelectDistributor);

        // if(getdistributor.recordset.length == 0){
        //   res.error({
        //     message: 'Template Upload Gagal Memberikan Informasi Distributor'
        //   });
        //   return false;    
        // }


        let datadistributor = getdistributor.recordset[0];
        let m_distributor_id = getdistributor.recordset.length > 0 ? datadistributor.m_distributor_id : undefined;
        let nomor_fkr = otpGenerator.generate(10, { alphabets:false, upperCase: false, specialChars: false });


        let headers = {
          m_distributor_id:m_distributor_id,
          bulan:bulan,
          tahun:tahun,
          nomor_fkr:nomor_fkr,
          tujuan_retur:tujuan_retur
        }
  
        let sqlDeleteFkr = `DELETE FROM fkr WHERE nomor_fkr='${nomor_fkr}'`;
        await request.query(sqlDeleteFkr);

        let fkr_id = uuid();
        let sqlInsertHeaderFkr = `INSERT INTO fkr
        (fkr_id,isactive,createdby, updatedby, nomor_fkr, bulan, tahun, m_distributor_id, tujuan_retur, status,periode_pengajuan)
        VALUES('${fkr_id}','N','${m_user_id}', '${m_user_id}', '${nomor_fkr}', ${bulan}, '${tahun}', 
        '${m_distributor_id}', '${tujuan_retur}', 'DRAFT','${pengajuan}')`;
        await request.query(sqlInsertHeaderFkr);


        for (let i = 17; i < (excel.length - 1); i++) {
        
            let urut = excel[i][1];
            let kode_sap = excel[i][2];
            let jenisrows = 0;

            if(kode_sap){
                jenisrows = 1;
             }else{
                jenisrows = 0;
             }
             
            if(jenisrows == 1){

                
                
                let kode_mi = excel[i][3];
                let nama_barang = excel[i][4];
                //let satuan = excel[i][5] == 'BOTOL' ? 'BTL' : excel[i][5] == 'KALENG' ? 'CAN' : excel[i][5] == 'DUS' ? 'KAR' : excel[i][5] == 'SACHET' ? 'SAC' : excel[i][5] == 'POUCH' ? 'POU' : excel[i][5];
                let satuan = excel[i][5].toUpperCase();
                // console.log('satuan ',satuan);
                // console.log('nama_barang ',nama_barang);

                let sqlGetdataSatuanTerkecil = `SELECT kode,nama,kode_satuan FROM r_satuan_mapping_fkr WHERE kode='${kode_sap}'`;
                let datasatuanterkecil = await request.query(sqlGetdataSatuanTerkecil);
                let kode_satuan = datasatuanterkecil.recordset;
    
                if(kode_satuan.length==0){
                  res.error({
                    message: `${kode_sap} kode SAP ${satuan} Tidak dikenali sebagai satuan terkecil dari produk ${nama_barang}`
                  });
                  return false;  
                }else{
                  const issatuan = (kode_satuan.some(e => e.kode_satuan === satuan ));
                  if(issatuan==false){
                    res.error({
                      message: `${kode_sap} kode SAP ${satuan} Tidak dikenali sebagai satuan terkecil dari produk ${nama_barang}`
                    });
                    return false;    
                  }
                }
                
                
                let total_retur = excel[i][6] ? excel[i][6] : 0;
                let expired_gudang = excel[i][7] ? excel[i][7] : 0;
                let expired_toko	= excel[i][8] ? excel[i][8] : 0;
                let damage = excel[i][9] ? excel[i][9] : 0;
                let recall = excel[i][10] ? excel[i][10] : 0;
                let retur_administratif = excel[i][11] ? excel[i][11] : 0;
                let rusak_di_jalan = excel[i][12] ? excel[i][12] : 0;
                let misspart = excel[i][13] ? excel[i][13] : 0;
                let peralihan = excel[i][14] ? excel[i][14] : 0;
                let repalcement = excel[i][15] ? excel[i][15] : 0;
                let delisting = excel[i][16] ? excel[i][16] : 0;
                let keterangan = excel[i][17]? excel[i][17]:0;

            
                const sql = `select * from m_produk where kode='${kode_mi}' OR kode_sap='${kode_sap}'`;
                const result = await request.query(sql);
                let m_produk_id =result.recordset.length > 0 ? result.recordset[0].m_produk_id : undefined;
                let sqlInsertDetailFkr = ``;
                if(m_produk_id){

                    let fkr_detail_id = uuid();

                    sqlInsertDetailFkr = `INSERT INTO fkr_detail
                    (fkr_detail_id, createdby, updatedby, fkr_id, m_produk_id,satuan,
                    total_retur, expired_gudang, expired_toko, damage, recall, retur_administratif, 
                    rusak_di_jalan, misspart, peralihan, repalcement, delisting, keterangan)
                    VALUES('${fkr_detail_id}','${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_produk_id}', '${satuan}',
                    ${total_retur}, 
                    ${expired_gudang}, 
                    ${expired_toko}, 
                    ${damage}, 
                    ${recall}, 
                    ${retur_administratif}, 
                    ${rusak_di_jalan}, 
                    ${misspart}, 
                    ${peralihan}, 
                    ${repalcement}, 
                    ${delisting}, 
                    '${keterangan}')`;   
                    console.log('WXYTAS');                 
                    try {
                      console.log(sqlInsertDetailFkr);
                      await request.query(sqlInsertDetailFkr);
                    } catch (error) {
                      res.error({
                        message: `Periksa pengisian jumlah harus angka dan pengisian lainnya`
                      });
                      return false;
                    }
                    
                }

            }
        
        }

        let queryHeader = `SELECT a.fkr_id, a.isactive, a.created, 
        a.createdby, a.updated, a.updatedby, 
        a.nomor_fkr, a.bulan, a.tahun, 
        a.m_distributor_id, 
        mdv.nama_pajak,
        mdv.nama AS nama_distributor,
        mdv.channel AS nama_channel,
        a.tujuan_retur, 
        a.status 
        FROM fkr a
        LEFT JOIN m_distributor_v mdv ON(a.m_distributor_id = mdv.m_distributor_id)
        WHERE fkr_id='${fkr_id}'`;
        let dataheader = await request.query(queryHeader);
        let datafkr = dataheader.recordset[0];


        let queryDetail = `SELECT a.fkr_detail_id, a.isactive, a.created, a.createdby, 
        a.updated, a.updatedby, a.fkr_id, a.m_produk_id,mp.kode AS kode_produk,mp.kode_sap,
        mp.nama AS nama_barang,
        a.total_retur, a.expired_gudang, a.expired_toko, a.damage, a.recall,a.satuan,
        a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan, 
        a.repalcement, a.delisting, a.keterangan
        FROM fkr_detail a,m_produk mp
        WHERE a.fkr_id='${fkr_id}'
        AND a.m_produk_id = mp.m_produk_id`;
        let dataDetails = await request.query(queryDetail);
        datafkr.lines = dataDetails.recordset;

        for (let i = 0; i < datafkr.lines.length; i++) {
          
          datafkr.lines[i].nomor = i+1;
          
        }

        datafkr.headers = headers;

        return res.success({
            result : datafkr,
            message: "Read data successfully"
          });
    });


},
saveFKRNonBAST2: async function(req, res){
  const {m_user_id,fkr_id,eksekusi,m_distributor_id,email,nomor_fkr,jenisfkr} = req.body;
  try{
    console.log("m_user_id",m_user_id);
    console.log("fkr_id",fkr_id);
    console.log("eksekusi",eksekusi);
    console.log("m_distributor_id",m_distributor_id);
    console.log("email",email);
    console.log("nomor_fkr",nomor_fkr);
    console.log("jenisfkr",jenisfkr);

    const request = DB.pool.request();
    let sftp = new ClientSFTP();
    console.log("Masuk FTP****************************");
    
    let total_rows = 0;
    const bulansekarang = moment().format('YYYYMM');
    let sqlcekfkrbulansekarang = `SELECT COUNT(1) AS total_rows FROM fkr WHERE m_distributor_id='${m_distributor_id}' AND CONVERT(VARCHAR(6),created,112)='${bulansekarang}' 
    AND (kode_status not in ('RJC','DRAFT'))
    AND isactive='Y'
    AND eksekusi='PEMUSNAHAN'`;
    console.log("MASUK CEK",sqlcekfkrbulansekarang);
    // let datafkrexisting= await request.query(sqlcekfkrbulansekarang);

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
    let remotePath = ``;

    console.log("MASUK 1");
    if(statusIntegasi=='DEV'){
      console.log("MASUK DEV");
      remotePath = '/home/sapftp/esales/fkr/create/requestdev/'+`${fkr_id}.xml`;
  
    }else{
      console.log("MASUK PROD");
      remotePath = '/home/sapftp/esales/fkr/create/request/'+`${fkr_id}.xml`;
      
    }


    console.log('eksekusi ',eksekusi);
    
    if(eksekusi == 'PENGEMBALIAN' || eksekusi == 'Pemusnahan' || !eksekusi){
      console.log("xxxx");
      let cek2 = `select * from m_distributor_v where m_distributor_id = '${m_distributor_id}'`;
      console.log(cek2);

      let dataCek2 = await request.query(cek2);
      //dataCek2 = dataCek2.recordset[0].kode_pajak;
      dataCek2 = dataCek2.recordset[0].kode;
    
  

      console.log(dataCek2);
      let cek = `SELECT * from fkr_pemusnahan_allowed where kode_shipto = '${dataCek2}'
      and convert(VARCHAR(8),start_period,112) <= convert(VARCHAR(8),GETDATE(),112) 
      and convert(VARCHAR(8),end_period,112) >= convert(VARCHAR(8),GETDATE(),112) `;
      console.log("CEK LIAT SINI",cek);

      let dataCek = await request.query(cek);

      console.log(dataCek);

    
      if(dataCek.recordset.length == 0){
          return res.success({
            error:true,
            message: "Pengajuan FKR Pemusnahan, tidak diizinkan"
          });
      }
    }

    //   return res.error({
    //     message: "Sudah Mengajukan FKR Pemusnahan Lokal Bulan ini"
    //   });

      let sqlUpdate = `UPDATE fkr SET 
      updated=getdate(),
      updatedby = '${m_user_id}',
      m_distributor_id = '${m_distributor_id}',
      eksekusi = 'PEMUSNAHAN' 
      WHERE fkr_id='${fkr_id}'`;

      console.log("UPDATENYA",sqlUpdate)
      
      await request.query(sqlUpdate);
  
      let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
      console.log("SELECT KE SAP",queryDataTable);
      let datafkr = await request.query(queryDataTable);
      let rows = datafkr.recordset;
      let datas = [];
      for (var i = 0; i < rows.length; i++){
      let btstnk = '';
      let bulan = pad(rows[i].bulan);
      let tahun = rows[i].tahun;
      let periode = tahun.concat(bulan);
      let kodesap = ``;

      // if(rows[i].eksekusi=='PENGEMBALIAN'){
      //   btstnk = 'REGULER FISIK';
      //   kodesap = 'ZCR1';
      // }else if(rows[i].eksekusi=='PEMUSNAHAN'){
        btstnk = 'PEMUSNAHAN LOCAL';
        kodesap = 'ZC03';
      // }else{
      //   btstnk = 'PERALIHAN';
      //   kodesap = 'ZCR1';
      // }

          
  
        datas.push({
            KUNNR : rows[i].sold_to,
            KUNNS : rows[i].ship_to,
            VTWEG : rows[i].kode_channel,
            SPART : rows[i].division,
            AUART : kodesap,
            BSARK : '2212',
            MATNR : rows[i].kode_material,
            VRKME : rows[i].satuan,
            ABRVW : 'Z1',
            KWEMNG: rows[i].total_retur,
            BSTNK : btstnk,
            VTEXT : nomor_fkr
        });
      }
      console.log("datas",datas);

      let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
      let locationFiles = dokumentPath('fkrtemp','request').replace(/\\/g, '/');
      let dst = dokumentPath('fkrtemp','request') + '/' +`${fkr_id}.xml`;
      let localPath = dst.replace(/\\/g, '/');
      let hasil = racikXML2(xml, datas, 'ITAB');

      console.log("CEK HASIL",hasil);
      // return res.error({
      //   message: "Pengajuan FKR Pemusnahan, tidak diizinkan periksa kembali !!!"
      // });
      shell.mkdir('-p', locationFiles);
      fs.writeFile(locationFiles+"/"+`${fkr_id}.xml`, hasil,async function (err) {
          if (err) 
          return err;
  
          const config = {
            host: "192.168.1.148",
            port:22,
            user: "root",
            password: "P@ssw0rd1988"
          };
          console.log("MASUK 4");
          console.log(config);

          await sftp.connect(config)
          .then(() => {
            return sftp.fastPut(localPath,remotePath);
          })
          .then(() => {
            sftp.end();
          })
          .catch(err => {
            console.error(err.message);
          });

          
          let setamount= `, amount = 35000000`;  
          let setnomorso= `, nomor_so = 122`;

          let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
          let datarole = await request.query(sqlGetRole);
          let m_role_id = datarole.recordset[0].m_role_id;
          console.log("MASUK 5");
          let sql = `UPDATE fkr 
                SET updated=getdate(),
                updatedby = '${m_user_id}',
                isactive = 'Y',
                nomor_fkr = '${nomor_fkr}',
                kode_status='WAITINGSO',
                m_distributor_id = '${m_distributor_id}',
                eksekusi = 'Pemusnahan Lokal',
                status='Waiting SO',
                email  = '${email}',
                reason = NULL
                WHERE fkr_id='${fkr_id}'`;
                await request.query(sql);
                console.log(sql,"***********")
                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'SAVE', 'WAITINGSO')`;
                await request.query(sqlinsertAudit);
          console.log("UPDATE FKRNYA",sql);

          let sel = `select * from m_distributor_v where m_distributor_id = '${m_distributor_id}'`;
          let dsSel = await request.query(sel)
          let r_org = dsSel.recordset[0].r_organisasi_id;
          console.log("MASUK 6");
          let execSP = `exec sp_tambahline_fkr '${r_org}'`
          console.log("log exec",execSP);
          await request.query(execSP)
  
          return res.success({
            result: rows,
            message: "Berhasil..."
          });
      });
      
    // }
  }catch(err){
    return res.error({
      message: err
    });
  }
},
saveFKRNonBAST: async function(req, res) {
const {m_user_id,fkr_id,eksekusi,m_distributor_id,nomor_fkr} = req.body;
console.log(fkr_id,eksekusi);

await DB.poolConnect;
try {

  const request = DB.pool.request();
  let total_rows = 0;
  const bulansekarang = moment().format('YYYYMM');
  let sqlcekfkrbulansekarang = `SELECT COUNT(1) AS total_rows FROM fkr WHERE m_distributor_id='${m_distributor_id}' 
  AND CONVERT(VARCHAR(6),created,112)='${bulansekarang}' 
  AND (kode_status not in ('RJC','DRAFT'))
  AND isactive='Y'
  AND eksekusi='PEMUSNAHAN'`;
  let datafkrexisting= await request.query(sqlcekfkrbulansekarang);
  if(eksekusi=='PENGEMBALIAN'){
    let sqlcekfkrbulansekarang = `SELECT COUNT(1) AS total_rows FROM fkr WHERE m_distributor_id='${m_distributor_id}' 
    and isactive='Y' AND eksekusi='PEMUSNAHAN' AND status not in ('Success Approve','Reject')`;

    console.log(sqlcekfkrbulansekarang);
    let fkrgantung = await request.query(sqlcekfkrbulansekarang)

    let total_gantung = fkrgantung.recordset[0].total_rows;

    console.log(sqlcekfkrbulansekarang);
    if(total_gantung > 0){
      return res.error({
        message: "Ada "+total_gantung+" Dokumen pemusnahan yang belum selesai di proses ... mohon tunggu sampai semua selesai dan dokumen BAP sudah diterima"
      });
    }
    total_rows = datafkrexisting.recordset[0].total_rows;
  
  }
  // console.log(sqlcekfkrbulansekarang);
  // console.log(total_rows);

  if(total_rows > 0){

    return res.error({
      message: "Sudah Mengajukan FKR Pemusnahan Lokal Bulan ini"
    });

  }else{

    let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
    let datarole = await request.query(sqlGetRole);
    //let rolename = datarole.recordset[0].nama;
    let m_role_id = datarole.recordset[0].m_role_id;

    
    let sqlUpdate = `UPDATE fkr SET 
    updated=getdate(),
    updatedby = '${m_user_id}',
    m_distributor_id = '${m_distributor_id}',
    eksekusi = 'PEMUSNAHAN' 
    WHERE fkr_id='${fkr_id}'`;

    await request.query(sqlUpdate);

    

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

    let url = ``;
    if(statusIntegasi=='DEV'){
      
      url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr'; // development


    }else{

      url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sofkr/300/zws_sales_sofkr/zbn_sales_sofkr'; // production

    }


    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = 'Basic ' + hash;


    let headers = {
      'Authorization':Basic,
      'user-agent': 'esalesSystem',
      'Content-Type': 'text/xml;charset=UTF-8',
      'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
    };

    
    let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
    console.log(queryDataTable);
    let datafkr = await request.query(queryDataTable);
    let rows = datafkr.recordset;


  let datas = []
  for(let i = 0;i< rows.length ; i++){

    let btstnk = '';
    let bulan = pad(rows[i].bulan);
    let tahun = rows[i].tahun;
    let periode = tahun.concat(bulan);
    let kodesap = ``;
    // if(rows[i].eksekusi=='PENGEMBALIAN'){
    //   btstnk = 'REGULER FISIK';
    //   kodesap = 'ZCR1';
    // }else if(rows[i].eksekusi=='PEMUSNAHAN'){
      btstnk = 'PEMUSNAHAN LOCAL';
      kodesap = 'ZC03';
    // }else{
    //   btstnk = 'PERALIHAN';
    //   kodesap = 'ZCR1';
    // }
        

      datas.push({

          KUNNR : rows[i].sold_to,
          KUNNS : rows[i].ship_to,
          VTWEG : rows[i].kode_channel,
          SPART : rows[i].division,
          AUART : kodesap,
          BSARK : '2212',
          MATNR : rows[i].kode_material,
          VRKME : rows[i].satuan,
          ABRVW : 'Z1',
          KWEMNG: rows[i].total_retur,
          BSTNK : btstnk

        });
        
    }


  let xml = fs.readFileSync('soap/ZFM_WS_SOFKR.xml', 'utf-8');
  let hasil = racikXML(xml, datas, 'ITAB');

  console.log(hasil);

  let { response } = await soapRequest({ url:url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
  let {body, statusCode } = response;

  console.log('statusCode ',statusCode);
  if(statusCode==200){

    var parser = new xml2js.Parser({explicitArray : false});
    parser.parseString(body, async function (err, result) {
      if (err) {
        return res.error(err);
      }
            const VALUE = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VALUE;
            const VBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VBELN;
            let nilai_so = Number(VALUE) * 100;

            let setamount= `, amount = ${nilai_so}`;  
            let setnomorso= `, nomor_so = ${VBELN}`;


            if(VBELN){
              let sql = `UPDATE fkr 
              SET updated=getdate(),
              updatedby = '${m_user_id}',
              isactive = 'Y',
              nomor_fkr = '${nomor_fkr}',
              kode_status='DRAFT',
              m_distributor_id = '${m_distributor_id}',
              eksekusi = '${eksekusi}',
              status='Waiting ASDH',
              reason=NULL ${setamount} 
              ${setnomorso}
              WHERE fkr_id='${fkr_id}'`;
              
              console.log(sql);
              //console.log(sql);
              request.query(sql, async (err) => {
                if (err) {
                  return res.error(err);
                }
        
                let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                let datafkr = await request.query(sqlgetfkr);
                const rows = datafkr.recordset;
  
                let sql = `SELECT f.m_distributor_id,mdv.nama AS distributor,f.bulan,f.tahun,mdv.r_organisasi_id FROM fkr f
                LEFT JOIN m_distributor_v mdv ON(mdv.m_distributor_id = '${m_distributor_id}')
                WHERE f.fkr_id='${fkr_id}'`;
                let result = await request.query(sql);
  
                const row = result.recordset[0];
                let distributor_id = row.m_distributor_id;
                let distributor = row.distributor;
                let bulan = moment(row.bulan,'MM').format('MMM');
                let tahun = row.tahun;
                let periode = bulan.concat('-').concat(tahun);
                let r_organisasi_id = row.r_organisasi_id;
  
                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'SAVE', 'DRAFT')`;
                await request.query(sqlinsertAudit);
                
                let sqlgetdocumentno= `SELECT document_number_id FROM document_number WHERE kode = 'FKR'`;
                let getdocument = await request.query(sqlgetdocumentno);
                let document_number_id = getdocument.recordset.length > 0 ? getdocument.recordset[0].document_number_id : '';

                let queryDataTable = `
                SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
                WHERE dn.document_number_id='${document_number_id}'
                AND dn.document_number_id = dnl.document_number_id
                AND dnl.r_organisasi_id = '${r_organisasi_id}'`;

                let getsequence = await request.query(queryDataTable);
                const datasequence = getsequence.recordset[0];
                let linenumber = parseInt(datasequence.totalrows);

                let insertDocumentNo = `INSERT INTO document_number_line
                (document_number_id, r_organisasi_id, line)
                VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
                await request.query(insertDocumentNo);
  
                  let sqlgetEmail = `SELECT * FROM m_distributor_profile_v WHERE m_distributor_id='${distributor_id}' AND rolename='ASDH'`;
                  let getdataemail = await request.query(sqlgetEmail);
  
                  let dataemail = []
                  for (let i = 0; i < getdataemail.recordset.length; i++) {
                    
                    dataemail.push(getdataemail.recordset[i].email_verifikasi);
                  
                  }
            
                  dataemail = _.uniq(dataemail);
                  let sqlgetdetails = `SELECT a.kode_mi AS kode_barang, 
                  a.nama_barang,
                  COALESCE(rst.keterangan,a.satuan) AS satuan,
                  a.total_retur AS quantity,
                  a.keterangan AS alasan 
                  FROM fkr_to_sap_v a
                  LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                  WHERE fkr_id='${fkr_id}'`;
                  let getdetails = await request.query(sqlgetdetails);
                  let details = getdetails.recordset.length > 0 ? getdetails.recordset : [];
                  
                  if(dataemail.length > 0){
            
                    let detailHtml = ''
                    for (const detail of details) {
                      detailHtml += 
                      '<tr>'
                      +`<td>${detail.kode_barang}</td>`
                      +`<td>${detail.nama_barang}</td>`
                      +`<td>${detail.satuan}</td>`
                      +`<td>${detail.quantity}</td>`
                      +`<td>${detail.alasan}</td>`
                      +`</tr>`
                    }
            
                    const param = {
            
                      subject:`Pengajuan FKR ${eksekusi}`,
                      distributor:distributor,
                      periode:periode,
                      details:detailHtml
            
                    }
            
                    const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'fkrnotice', templateparam: param });
                    SendEmail(dataemail.toString(), param.subject, template);
                  }
                  let nomorso = VBELN;
                  let lemparan = buatxml(nomorso,"Waiting Approval ASM");
                  console.log(lemparan);
                  try {
                    let responeSoap =  await callSoapApprove(lemparan);
                    let {body, statusCode } = responeSoap;
                    console.log(statusCode);
                  } catch (error) {
                    
                  }
                
                return res.success({
                  result: rows,
                  message: "Approve FKR successfully"
                });
              });

            }else{

              return res.error({
                message: "Tidak Mendapatkan Nomor SO Retur"
              });
          
            }

    });
  }else{

    return res.error({
      message: "Tidak Mendapat Response dari SAP"
    });

  }

}
} catch (err) {
return res.error(err);
}
},
saveFKR2: async function(req, res) {
  const {m_user_id,fkr_id,eksekusi,m_distributor_id,nomor_fkr} = req.body;

  // console.log(req.body);
  await DB.poolConnect;
  try {


  const request = DB.pool.request();
  
  
  let total_rows = 0;
  const bulansekarang = moment().format('YYYYMM');
  let sqlcekfkrbulansekarang = `SELECT COUNT(1) AS total_rows FROM fkr WHERE m_distributor_id='${m_distributor_id}' 
  AND CONVERT(VARCHAR(6),created,112)='${bulansekarang}' AND isactive='Y' AND eksekusi='PEMUSNAHAN'`;
  let datafkrexisting= await request.query(sqlcekfkrbulansekarang);


  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
  let remotePath = ``;

  if(statusIntegasi=='DEV'){
    
    remotePath = '/home/sapftp/esales/fkr/create/requestdev/'+`${fkr_id}.xml`;

  }else{

    remotePath = '/home/sapftp/esales/fkr/create/request/'+`${fkr_id}.xml`;

  }
  
  
  if(eksekusi=='PEMUSNAHAN'){

    total_rows = datafkrexisting.recordset[0].total_rows;
  
  }
  

  if(total_rows > 0 ){

    return res.error({
      message: "Sudah Mengajukan FKR Pemusnahan Lokal Bulan ini"
    });

  }else{

  req.file('file_bast')
    .upload({
    }, async function whenDone(err, files) {
        if (err)
        return res.error(err);

        let namafile = ``;
        for (const file of files) {
          console.log('filename', file.filename)
          // ..disini move ke tempat semestinya 
          fs.mkdirSync(dokumentPath( 'fkr', fkr_id), {
              recursive: true
          })
          const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'fkr', fkr_id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
          if (filesamaDir.found.length > 0) {
              console.log('isexist file nama sama', filesamaDir.found[0])
              fs.unlinkSync(filesamaDir.found[0])
          }
          fs.renameSync(file.fd, path.resolve(dokumentPath( 'fkr', fkr_id), file.filename))
          namafile = file.filename;

        }

        let updateBAST = ``;
        if(eksekusi=='PENGALIHAN' && !eksekusi==''){
          updateBAST = `, file_bast='${namafile}'`;
        }else{
          updateBAST = `, file_bast = NULL`;
        }

      let sqlUpdate = `UPDATE fkr SET 
      updated=getdate(),
      updatedby = '${m_user_id}',
      isactive = 'Y',
      status='Waiting ASDH',
      reason=NULL,
      kode_status='DRAFT',
      m_distributor_id = '${m_distributor_id}',
      eksekusi = '${eksekusi}' 
      ${updateBAST}
      WHERE fkr_id='${fkr_id}'`;
      await request.query(sqlUpdate);
      
      let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
      let datafkr = await request.query(queryDataTable);
      let rows = datafkr.recordset;


    let datas = []
    for(let i = 0;i< rows.length ; i++){

      let btstnk = '';
      let bulan = pad(rows[i].bulan);
      let tahun = rows[i].tahun;
      let periode = tahun.concat(bulan);
      let kodesap = ``;
      if(rows[i].eksekusi=='PENGEMBALIAN'){
        btstnk = 'REGULER FISIK';
        kodesap = 'ZCR1';
      }else if(rows[i].eksekusi=='PEMUSNAHAN'){
        btstnk = 'PEMUSNAHAN LOCAL';
        kodesap = 'ZC03';
      }else{
        btstnk = 'PERALIHAN';
        kodesap = 'ZCR1';
      }
          

        datas.push({

            KUNNR : rows[i].sold_to,
            KUNNS : rows[i].ship_to,
            VTWEG : rows[i].kode_channel,
            SPART : rows[i].division,
            AUART : kodesap,
            BSARK : '2212',
            MATNR : rows[i].kode_material,
            VRKME : rows[i].satuan,
            ABRVW : 'Z1',
            KWEMNG: rows[i].total_retur,
            BSTNK : btstnk,
            VTEXT : rows[i].periode_pengajuan
          });
          
      }
      // console.log(queryDataTable);


    let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
    let hasil = racikXML2(xml, datas, 'ITAB');
    console.log(hasil);
    // return res.error({
    //   message : "okee.."
    // })
    //let remotePath = '/home/sapftp/esales/fkr/create/requestdev/'+`${fkr_id}.xml`;
    let locationFiles = dokumentPath('fkrtemp','request').replace(/\\/g, '/');
    let dst = dokumentPath('fkrtemp','request') + '/' +`${fkr_id}.xml`;
    let localPath = dst.replace(/\\/g, '/');
    shell.mkdir('-p', locationFiles);

    fs.writeFile(locationFiles+"/"+`${fkr_id}.xml`, hasil,async function (err) {
      if (err) 
      return err;

      const config = {
        host: "192.168.1.148",
        port:22,
        user: "root",
        password: "P@ssw0rd1988"
      };

      await sftp.connect(config)
      .then(() => {
        return sftp.fastPut(localPath,remotePath);
      })
      .then(() => {
        sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });

      
      let setamount= `, amount = 0`;  
      let setnomorso= `, nomor_so = NULL`;

      let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let m_role_id = datarole.recordset[0].m_role_id;

      let sql = `UPDATE fkr 
            SET updated=getdate(),
            updatedby = '${m_user_id}',
            isactive = 'Y',
            nomor_fkr = '${nomor_fkr}',
            kode_status='WAITINGSO',
            m_distributor_id = '${m_distributor_id}',
            eksekusi = '${eksekusi}',
            status='Waiting SO',
            reason=NULL ${setamount} 
            ${setnomorso}
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);
      
            let sqlinsertAudit = `INSERT INTO fkr_audit_approve
            (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
            VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'SAVE', 'WAITINGSO')`;
            await request.query(sqlinsertAudit);

      return res.success({
        result: rows,
        message: "Berhasil..."
      });
  });


  })

}
} catch (err) {
  return res.error(err);
}
},
saveFKR: async function(req, res) {
  const {m_user_id,fkr_id,eksekusi,m_distributor_id,nomor_fkr} = req.body;

  // console.log(req.body);
  await DB.poolConnect;
  try {


  const request = DB.pool.request();
  
  
  let total_rows = 0;
  const bulansekarang = moment().format('YYYYMM');
  let sqlcekfkrbulansekarang = `SELECT COUNT(1) AS total_rows FROM fkr WHERE m_distributor_id='${m_distributor_id}' 
  AND CONVERT(VARCHAR(6),created,112)='${bulansekarang}' AND isactive='Y' AND eksekusi='PEMUSNAHAN'`;
  let datafkrexisting= await request.query(sqlcekfkrbulansekarang);
  
  
  console.log(eksekusi);
  if(eksekusi=='PEMUSNAHAN'){

    total_rows = datafkrexisting.recordset[0].total_rows;
  
  }
  
  console.log(sqlcekfkrbulansekarang);
  console.log(total_rows);

  if(total_rows > 0 ){

    return res.error({
      message: "Sudah Mengajukan FKR Pemusnahan Lokal Bulan ini"
    });

  }else{

  req.file('file_bast')
    .upload({
    }, async function whenDone(err, files) {
        if (err)
        return res.error(err);

        let namafile = ``;
        for (const file of files) {
          console.log('filename', file.filename)
          // ..disini move ke tempat semestinya 
          fs.mkdirSync(dokumentPath( 'fkr', fkr_id), {
              recursive: true
          })
          const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'fkr', fkr_id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
          if (filesamaDir.found.length > 0) {
              console.log('isexist file nama sama', filesamaDir.found[0])
              fs.unlinkSync(filesamaDir.found[0])
          }
          fs.renameSync(file.fd, path.resolve(dokumentPath( 'fkr', fkr_id), file.filename))
          namafile = file.filename;

        }

        let updateBAST = ``;
        if(eksekusi=='PENGALIHAN' && !eksekusi==''){
          updateBAST = `, file_bast='${namafile}'`;
        }else{
          updateBAST = `, file_bast = NULL`;
        }

  
  
      let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      //let rolename = datarole.recordset[0].nama;
      let m_role_id = datarole.recordset[0].m_role_id;

      let sqlUpdate = `UPDATE fkr SET 
      updated=getdate(),
      updatedby = '${m_user_id}',
      isactive = 'Y',
      status='Waiting ASDH',
      reason=NULL,
      kode_status='DRAFT',
      m_distributor_id = '${m_distributor_id}',
      eksekusi = '${eksekusi}' 
      ${updateBAST}
      WHERE fkr_id='${fkr_id}'`;
      await request.query(sqlUpdate);

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
  
      let url = ``;
      if(statusIntegasi=='DEV'){
        
        url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr'; // development
  
  
      }else{
  
        url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sofkr/300/zws_sales_sofkr/zbn_sales_sofkr'; // production
  
      }

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;


      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
      };

      
      let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
      let datafkr = await request.query(queryDataTable);
      let rows = datafkr.recordset;


    let datas = []
    for(let i = 0;i< rows.length ; i++){

      let btstnk = '';
      let bulan = pad(rows[i].bulan);
      let tahun = rows[i].tahun;
      let periode = tahun.concat(bulan);
      let kodesap = ``;
      if(rows[i].eksekusi=='PENGEMBALIAN'){
        btstnk = 'REGULER FISIK';
        kodesap = 'ZCR1';
      }else if(rows[i].eksekusi=='PEMUSNAHAN'){
        btstnk = 'PEMUSNAHAN LOCAL';
        kodesap = 'ZC03';
      }else{
        btstnk = 'PERALIHAN';
        kodesap = 'ZCR1';
      }
          

        datas.push({

            KUNNR : rows[i].sold_to,
            KUNNS : rows[i].ship_to,
            VTWEG : rows[i].kode_channel,
            SPART : rows[i].division,
            AUART : kodesap,
            BSARK : '2212',
            MATNR : rows[i].kode_material,
            VRKME : rows[i].satuan,
            ABRVW : 'Z1',
            KWEMNG: rows[i].total_retur,
            BSTNK : btstnk

          });
          
      }

      // console.log(queryDataTable);


    let xml = fs.readFileSync('soap/ZFM_WS_SOFKR.xml', 'utf-8');
    let hasil = racikXML(xml, datas, 'ITAB');

    console.log(hasil);

    let { response } = await soapRequest({ url:url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
    let {body, statusCode } = response;
    console.log(body);
    if(statusCode==200){

      var parser = new xml2js.Parser({explicitArray : false});
      parser.parseString(body, async function (err, result) {
        if (err) {
          return res.error(err);
        }
              const VALUE = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VALUE;
              const VBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VBELN;
              let nilai_so = Number(VALUE) * 100;

              let setamount= `, amount = ${nilai_so}`;  
              let setnomorso= `, nomor_so = ${VBELN}`;

              let sql = `UPDATE fkr 
              SET updated=getdate(),
              updatedby = '${m_user_id}',
              isactive = 'Y',
              nomor_fkr = '${nomor_fkr}',
              kode_status='DRAFT',
              m_distributor_id = '${m_distributor_id}',
              eksekusi = '${eksekusi}',
              status='Waiting ASDH',
              reason=NULL ${setamount} 
              ${setnomorso}
              WHERE fkr_id='${fkr_id}'`;
              
              //console.log(sql);
              request.query(sql, async (err) => {
                if (err) {
                  return res.error(err);
                }
        
                let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                let datafkr = await request.query(sqlgetfkr);
                const rows = datafkr.recordset;

                let sql = `SELECT f.m_distributor_id,mdv.nama AS distributor,f.bulan,f.tahun,mdv.r_organisasi_id FROM fkr f
                LEFT JOIN m_distributor_v mdv ON(mdv.m_distributor_id = '${m_distributor_id}')
                WHERE f.fkr_id='${fkr_id}'`;
                let result = await request.query(sql);

                const row = result.recordset[0];
                let distributor_id = row.m_distributor_id;
                let distributor = row.distributor;
                let bulan = moment(row.bulan,'MM').format('MMM');
                let tahun = row.tahun;
                let periode = bulan.concat('-').concat(tahun);
                let r_organisasi_id = row.r_organisasi_id;


                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'SAVE', 'DRAFT')`;
                await request.query(sqlinsertAudit);


                let sqlgetdocumentno= `SELECT document_number_id FROM document_number WHERE kode = 'FKR'`;
                let getdocument = await request.query(sqlgetdocumentno);
                let document_number_id = getdocument.recordset.length > 0 ? getdocument.recordset[0].document_number_id : '';

                let queryDataTable = `
                SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
                WHERE dn.document_number_id='${document_number_id}'
                AND dn.document_number_id = dnl.document_number_id
                AND dnl.r_organisasi_id = '${r_organisasi_id}'`;

                let getsequence = await request.query(queryDataTable);
                const datasequence = getsequence.recordset[0];
                let linenumber = parseInt(datasequence.totalrows);

                let insertDocumentNo = `INSERT INTO document_number_line
                (document_number_id, r_organisasi_id, line)
                VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
                await request.query(insertDocumentNo);

                  let sqlgetEmail = `SELECT * FROM m_distributor_profile_v WHERE m_distributor_id='${distributor_id}' AND rolename='ASDH'`;
                  let getdataemail = await request.query(sqlgetEmail);

                  let dataemail = []
                  for (let i = 0; i < getdataemail.recordset.length; i++) {
                    
                    dataemail.push(getdataemail.recordset[i].email_verifikasi);
                  
                  }
            
                  dataemail = _.uniq(dataemail);
                  let sqlgetdetails = `SELECT a.kode_mi AS kode_barang, 
                  a.nama_barang,
                  COALESCE(rst.keterangan,a.satuan) AS satuan,
                  a.total_retur AS quantity,
                  a.keterangan AS alasan 
                  FROM fkr_to_sap_v a
                  LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                  WHERE fkr_id='${fkr_id}'`;
                  let getdetails = await request.query(sqlgetdetails);
                  let details = getdetails.recordset.length > 0 ? getdetails.recordset : [];
                  
                  if(dataemail.length > 0){
            
                    let detailHtml = ''
                    for (const detail of details) {
                      detailHtml += 
                      '<tr>'
                      +`<td>${detail.kode_barang}</td>`
                      +`<td>${detail.nama_barang}</td>`
                      +`<td>${detail.satuan}</td>`
                      +`<td>${detail.quantity}</td>`
                      +`<td>${detail.alasan}</td>`
                      +`</tr>`
                    }
            
                    const param = {
            
                      subject:`Pengajuan FKR ${eksekusi}`,
                      distributor:distributor,
                      periode:periode,
                      details:detailHtml
            
                    }
            
                    const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'fkrnotice', templateparam: param });
                    SendEmail(dataemail.toString(), param.subject, template);
                  }
                  let nomorso = VBELN;
                  let lemparan = buatxml(nomorso,"Waiting Approval ASM");
                  console.log(lemparan);
                  try {
                    let responeSoap =  await callSoapApprove(lemparan);
                    let {body, statusCode } = responeSoap;
                    console.log(statusCode);
                  } catch (error) {
                    
                  }
                  
                return res.success({
                  result: rows,
                  message: "Approve FKR successfully"
                });
              });

      });
    }
  })

}
} catch (err) {
  return res.error(err);
}
},
rejectFKR: async function(req, res) {
  const {m_user_id,fkr_id,reason} = req.body;
  console.log("-------  reject2 -------");
  
  await DB.poolConnect;
  try {
    const request = DB.pool.request();
    let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      
    let datarole = await request.query(sqlGetRole);
    let rolename = datarole.recordset[0].nama;
    let m_role_id = datarole.recordset[0].m_role_id;

    let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
                kode_status = 'RJC',
                status='Reject',reason='${reason}'
                WHERE fkr_id='${fkr_id}'`;

    let sts = `RJC`;
    if(rolename == "ASDH"){
      sts = `APA`
    }else if(rolename == "RSDH"){
      sts = `APR`
    }else if(rolename == "SALESHO3"){
      sts = `APS1`
    }else if(rolename == "SALESHO2"){
      sts = `APS2`
    }else if(rolename == "SALESHO1"){
      sts = `APS3`
    }

    let sqlinsertAudit = `INSERT INTO fkr_audit_approve
              (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
              VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'REJECT', '${sts}','${reason}')`;
    await request.query(sql);
    await request.query(sqlinsertAudit);
    return res.success({
      data: null,
      message: "Reject FKR data successfully"
    });

  }catch(err){
    return res.error(err);
  }
},
getfile: async function(req, res) {
  //   const user = req.param('user')
    const record = req.param('record')
    const filename = req.param('filename')

    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('fkr', record), filename + '*'))
    if (filesamaDir.found.length > 0) {
        console.log(filesamaDir.found[0])

        // return res.send(filesamaDir.found[0]);
        // return res.success('OK');
        var lastItemAkaFilename = path.basename(filesamaDir.found[0])
        return res.download(filesamaDir.found[0], lastItemAkaFilename)
    }
    return res.error('Failed, File Not Found');
},
cekHarga: async function(req, res){
    const {m_distributor_id,m_produk_id,jumlah,jenis_fkr} = req.body
    
    //console.log('ini loh ',m_distributor_id,m_produk_id,jumlah,jenis_fkr);
    let jenis_pengajuan = ``;
    if(jenis_fkr=='Product Recall / Delisting'){
      jenis_pengajuan = 'PRD';
    }else if(jenis_fkr=='Over Stock'){
      jenis_pengajuan = 'OS';
    }else if(jenis_fkr=='Peralihan MI'){
      jenis_pengajuan = 'PMI';
    }else if(jenis_fkr=='Peralihan Distributor'){
      jenis_pengajuan = 'PDI';
    }else if(jenis_fkr=='Peralihan Stock'){
      jenis_pengajuan = 'PST';
    }


    //console.log('jenis_pengajuan ',jenis_pengajuan);

    // return res.error("test saja...")
    await DB.poolConnect;
    let sukses = ``;
    try {
      const request = DB.pool.request();
      let cek1 = `select * from m_distributor_v where m_distributor_id = '${m_distributor_id}'`
      console.log(cek1);
      let datacek1 = await request.query(cek1)
      let soldTo = datacek1.recordset.length > 0 ? datacek1.recordset[0].kode_pajak : null;
      let channel = datacek1.recordset.length > 0 ? datacek1.recordset[0].channel : null;
      let kode_channel = datacek1.recordset[0].kode_channel;
      let rowReturn = {}
      let query = `select * from  m_produk where m_produk_id = '${m_produk_id}'`
      let data = await request.query(query);
      let nama_produk = data.recordset[0].nama
      let kode_sap = data.recordset[0].kode_sap
      data = data.recordset
      let total_amount_fkr = 0
      for(let i = 0 ; i < data.length; i++){
        data[i].satuan = 'KAR';
        
        let selPrice = `select floor((amount * (diskon_bs)/100)) as amount,amount as realAmount from master_price_fkr where SKU = '${data[i].kode_sap}' and uom = '${data[i].satuan}' and channel = '${channel}'`
        //let selPrice = `SELECT * FROM r_harga_satuan_terkecil WHERE m_produk_id = '${m_produk_id}' AND kode_channel=${kode_channel} and kode_kemasan='BOT' `;
        console.log(selPrice);
        let dataPrice = await request.query(selPrice)
        let amount = ``
        let realamount = ``
        if(dataPrice.recordset.length > 0){
          amount = dataPrice.recordset[0].amount
          realamount = dataPrice.recordset[0].realAmount
        }else{
          sukses = `${data[i].kode_sap} satuan ${data[i].satuan} Tidak ada di master harga `;
          return res.success({
            error : 'true',
            message : sukses
          }) ;
        }
        

        let priceGroup = `select * from material_price_fkr where SKU = '${data[i].kode_sap}'`
        // console.log(priceGroup);
        let dataPricegroup = await request.query(priceGroup);
        let material_price_group = ""
        let diskon = 0
        if(dataPricegroup.recordset.length > 0){
          material_price_group = dataPricegroup.recordset[0].material_price_group
        }

        let priceDiskon = `select * from material_diskon_fkr where sold_to = '${soldTo}' and material_price_group = '${material_price_group}'`;



        // console.log(priceDiskon);
        let dataPriceDiskon = await request.query(priceDiskon);
        if(dataPriceDiskon.recordset.length > 0){
          diskon = dataPriceDiskon.recordset[0].amount.replace('-','');
        }
        let reguler = (realamount * (diskon/100))
        //console.log(data[i].kode_sap , "---" ,amount,diskon,"---",amount - (amount * diskon/100));
        total_amount_fkr = realamount - amount - reguler
        // console.log(realamount,"-",amount,"-",reguler);
        // console.log(total_amount_fkr);
      }
      // console.log("total adalah  ",total_amount_fkr);
      let uniqid = uuid();

      let sqlgetsatuanterkecil = ``;

      if(jenis_pengajuan=='PRD'){
          sqlgetsatuanterkecil = `SELECT * FROM r_satuan_mapping_fkr WHERE kode='${kode_sap}' AND kode_satuan <> 'KAR'`;
      }else{
          sqlgetsatuanterkecil = `SELECT * FROM r_satuan_mapping_fkr WHERE kode='${kode_sap}' AND kode_satuan IN ('KAR','JER')`;
      }


      //sqlgetsatuanterkecil = `SELECT * FROM r_satuan_mapping_fkr WHERE kode='${kode_sap}'`;

      let datasatuanterkecil= await request.query(sqlgetsatuanterkecil);
      let satuanterkecil = datasatuanterkecil.recordset;
      if(jenis_pengajuan=='PRD'){
        for (let i = 0; i < satuanterkecil.length; i++) {
        
          let data = satuanterkecil[i];
          let sqlgetharga = `SELECT * FROM r_harga_satuan_terkecil WHERE m_produk_id = '${m_produk_id}' AND kode_channel=${kode_channel} and kode_kemasan='${data.kode_satuan}' `;
          let dataharga = await request.query(sqlgetharga);
          let harga = dataharga.recordset.length > 0 ? dataharga.recordset[0].harga : 0;
          satuanterkecil[i].harga = harga;
      
        }

        rowReturn = {
          id : uniqid,
          nama : nama_produk,
          harga : 0,
          kode_sap : kode_sap,
          jml : jumlah,
          satuan : satuanterkecil
        }

      }else{
        for (let i = 0; i < satuanterkecil.length; i++) {
      
          satuanterkecil[i].harga = total_amount_fkr;
      
        }
        
        rowReturn = {
          id : uniqid,
          nama : nama_produk,
          harga : total_amount_fkr,
          kode_sap : kode_sap,
          jml : jumlah,
          satuan : satuanterkecil
        }
      
      }


      



      return res.success({
        error : 'false',
        message : 'Berhasil',
        data : rowReturn
      }) ;
    }catch(err){
        //console.log(err);
        return res.success({
          error : 'true',
          message : err
        }) ;
    }
}
};

function racikXMLObject(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  return xmlTemplate.replace('?', result)
}


function racikXML(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })
  const result = builder.buildObject(addTemplate)
  

  return xmlTemplate.replace('?', result)
}
function racikXML2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })

  const result = builder.buildObject(addTemplate)
  

  return xmlTemplate.replace('#', result)
}


function pad(d) {
  return (d < 10) ? '0' + d.toString() : d.toString();
}

function _generateDetailsApproveEmail(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`

          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr>`
          content = content + addRowSpan("kode_produk", i, false,"center")
          content = content + addRowSpan("nama_barang", i, false,"left")
          content = content + addRowSpan("satuan", i, false, "left")
          content = content + addRowSpan("total_retur", i, false, "right")
          content = content + addRowSpan("keterangan", i, false, "right")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}

function racikXML2Object(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  var builder = new xml2js.Builder({headless: true, rootName: rootSecond }) 
  const result1 = builder.buildObject(jsonArray[1]) 
  return xmlTemplate.replace('?', result+result1)
}
function racikXML2Object2(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  var builder = new xml2js.Builder({headless: true, rootName: rootSecond }) 
  const result1 = builder.buildObject(jsonArray[1]) 
  return xmlTemplate.replace('#', result+result1)
}

function buatxml(so,layer){
  let xml = fs.readFileSync('soap/ZFM_WS_UPDATEAPP.xml', 'utf-8');
  let datas = [so,layer];

  let hasil = racikXML2Object(xml, datas, 'VBELN','STAGE');
  return hasil
}

function buatxml2(so,layer){
  let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
  let datas = [so,layer];

  let hasil = racikXML2Object2(xml, datas, 'VBELN','STAGE');
  return hasil
}

async function priceFKR(fkr_id,m_distributor_id){
  await DB.poolConnect;
  let sukses = ``;
  const request = DB.pool.request();
  try {
    let cek1 = `select * from m_distributor_v where m_distributor_id = '${m_distributor_id}'`
    let datacek1 = await request.query(cek1)
    let soldTo = datacek1.recordset[0].kode_pajak
    let channel = datacek1.recordset[0].channel
    let kode_channel = datacek1.recordset[0].kode_channel

    let query = `select kode_sap,b.* from fkr a inner join fkr_detail b on a.fkr_id = b.fkr_id 
    inner join m_produk c on c.m_produk_id = b.m_produk_id where a.fkr_id = '${fkr_id}'`
    let data = await request.query(query);
    data = data.recordset
    let total_amount_fkr = 0
    for(let i = 0 ; i < data.length; i++){
      // console.log(data[i].kode_sap,data[i].satuan);
      let selPrice = `select floor(amount - (amount * (diskon_bs)/100)) as amount from master_price_fkr where SKU = '${data[i].kode_sap}' and uom = '${data[i].satuan}' and channel = '${channel}'`
      // console.log(selPrice);
      let dataPrice = await request.query(selPrice)
      let amount = ``
      if(dataPrice.recordset.length > 0){
        amount = dataPrice.recordset[0].amount
      }else{
        sukses = `${data[i].kode_sap} satuan ${data[i].satuan} Tidak ada di master harga `;
        return sukses ;
      }
      

      let priceGroup = `select * from material_price_fkr where SKU = '${data[i].kode_sap}'`
      // console.log(priceGroup);
      let dataPricegroup = await request.query(priceGroup);
      let material_price_group = ""
      let diskon = 0
      if(dataPricegroup.recordset.length > 0){
        material_price_group = dataPricegroup.recordset[0].material_price_group
      }

      let priceDiskon = `select * from material_diskon_fkr where sold_to = '${soldTo}' and material_price_group = '${material_price_group}'`
      // console.log(priceDiskon);
      let dataPriceDiskon = await request.query(priceDiskon);
      if(dataPriceDiskon.recordset.length > 0){
        diskon = dataPriceDiskon.recordset[0].amount.replace('-','');
      }
      console.log(data[i].kode_sap , "---" ,amount,diskon,"---",amount - (amount * diskon/100));

      // console.log(amount,material_price_group,diskon);
      let finalPrice = amount - (amount * (diskon/100))
      total_amount_fkr = total_amount_fkr + (finalPrice * data[i].total_retur)
      // console.log(data[i].kode_sap , "---" ,finalPrice*data[i].total_retur);
    }
    console.log("total adalah  ",total_amount_fkr);
    let upd =`update fkr set amount = ${total_amount_fkr} where fkr_id = '${fkr_id}'`
    await request.query(upd)
    
    return sukses;
  }catch(err){
      console.log(err);
      return sukses = err
  }
}

async function callSoapApprove(hasil){
    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

    let url = ``;
    if(statusIntegasi=='DEV'){
      
      url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_updateapp/120/zws_ws_updateapp/zbn_ws_updateapp'; 


    }else{

      url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_updateapp/300/zws_ws_updateapp/zbn_ws_updateapp'; // production

    }

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = 'Basic ' + hash;

    
    let headers = {
      'Authorization':Basic,
      'user-agent': 'esalesSystem',
      'Content-Type': 'text/xml;charset=UTF-8',
      'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_WS_UPDATEAPP:ZFM_WS_UPDATEAPPRequest',
    };
    let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 });

    return response;
}
async function lemparFTP(hasil,fkr_id){
  // console.log(ftpconfig);

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
    let remotePath = ``;
    if(statusIntegasi=='DEV'){
      
      remotePath = '/home/sapftp/esales/fkr/create/requestdev/'+`${fkr_id}.xml`;
  
    }else{
  
      remotePath = '/home/sapftp/esales/fkr/create/request/'+`${fkr_id}.xml`;
  
    }
    

    //let remotePath = '/home/sapftp/esales/fkr/status/request/'+`${fkr_id}.xml`;
    let locationFiles = dokumentPath('fkrstatus','request').replace(/\\/g, '/');
    let dst = dokumentPath('fkrstatus','request') + '/' +`${fkr_id}.xml`;
    let localPath = dst.replace(/\\/g, '/');
    shell.mkdir('-p', locationFiles);
    console.log(locationFiles+"/"+`${fkr_id}.xml`);
    fs.writeFile(locationFiles+"/"+`${fkr_id}.xml`, hasil,async function (err) {
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
//FKR 2021