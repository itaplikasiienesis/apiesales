/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const moment = require("moment");

module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {kode,org_id,bulan,tahun,tanggal_invoice}
    } = req;

    await DB.poolConnect;
    try {
    
      const request = DB.pool.request();
      let queryDataTable = ``;
      let nomor_dokumen_klaim = ``;
      if(kode=='KLAIM'){
        

        let sqlgetOrg = `SELECT * FROM m_pajak_v WHERE m_pajak_id = '${org_id}'`;
        let getOrg = await request.query(sqlgetOrg);
        let dataorg = getOrg.recordset[0];
        

      if(dataorg){
        let kode_pajak = dataorg.kode ? dataorg.kode : '';
        //queryDataTable = `SELECT TOP 1 nomor_klaim FROM klaim WHERE m_pajak_id='${org_id}' ORDER BY created DESC`;
        queryDataTable = `SELECT COUNT(1) AS nomor_klaim FROM klaim k`;
        let getsequence = await request.query(queryDataTable);
        const row = getsequence.recordset[0];
        let linenumber = row.nomor_klaim;//getsequence.recordset.length > 0 ? (Number(row.nomor_klaim.split('/')[4]) + 1) : 1;
        let totalrows = pad(linenumber);
        let bulan = moment(tanggal_invoice,'YYYY-MM-DD').format('MMM');
        let tahun = moment(tanggal_invoice,'YYYY-MM-DD').format('YYYY');
        // nomor_dokumen_klaim = tahun+"/PROP/"+bulan.toLocaleUpperCase()+"/"+kode_pajak+"/"+totalrows;
        // console.log('nomor_dokumen_klaim ',nomor_dokumen_klaim);

        //nomor_dokumen_klaim = tahun+"/PROP/"+bulan.toLocaleUpperCase()+"/"+kode_pajak+"/"+totalrows;
        //nomor_dokumen_klaim = tahun+"/PROP/"+bulan.toLocaleUpperCase()+"/"+kode_pajak+"/"+kode_distributor+"/"+totalrows;
        nomor_dokumen_klaim = '-';
      }else{
        nomor_dokumen_klaim = 'Empty';
      }

      
    }else if(kode=='FKR'){

        let sqlgetOrg = `SELECT * FROM m_distributor_v WHERE m_distributor_id = '${org_id}'`;
        let getOrg = await request.query(sqlgetOrg);
        let dataorg = getOrg.recordset[0];

        if(dataorg){
          let r_organisasi_id = dataorg.r_organisasi_id ? dataorg.r_organisasi_id : '';
          let kode_shipto = dataorg.kode ? dataorg.kode : '';
          queryDataTable = `
          SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
          WHERE dn.kode='${kode}'
          AND dn.document_number_id = dnl.document_number_id
          AND dnl.r_organisasi_id = '${r_organisasi_id}'`;
  
          // console.log(queryDataTable);
  
          let getsequence = await request.query(queryDataTable);
          const row = getsequence.recordset[0];
          let totalrows = pad(row.totalrows);
          let bulan = moment(tanggal_invoice,'YYYY-MM-DD').format('MMM');
          let tahun = moment(tanggal_invoice,'YYYY-MM-DD').format('YYYY');
          nomor_dokumen_klaim = tahun+"/FKR/"+bulan.toLocaleUpperCase()+"/"+kode_shipto+"/"+totalrows;

        }else{
          nomor_dokumen_klaim = 'Empty';
        }

    }else if(kode=='SUBMITFAKTUR'){

        let sqlgetOrg = `SELECT * FROM m_transporter_v WHERE m_transporter_id = '${org_id}'`;
        let getOrg = await request.query(sqlgetOrg);
        let dataorg = getOrg.recordset[0];
        
        if(dataorg){
          let r_organisasi_id = dataorg.r_organisasi_id ? dataorg.r_organisasi_id : '';
          let kode_transporter = dataorg.kode  ? dataorg.kode : '';
          queryDataTable = `
          SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
          WHERE dn.kode='${kode}'
          AND dn.document_number_id = dnl.document_number_id
          AND dnl.r_organisasi_id = '${r_organisasi_id}'`;
  
          let getsequence = await request.query(queryDataTable);
          const row = getsequence.recordset[0];
          let totalrows = pad(row.totalrows);
          let bulan = moment(tanggal_invoice,'YYYY-MM-DD').format('MMM');
          let tahun = moment(tanggal_invoice,'YYYY-MM-DD').format('YYYY');
          nomor_dokumen_klaim = tahun+"/TRANS/"+bulan.toLocaleUpperCase()+"/"+kode_transporter+"/"+totalrows;

        }else{
          nomor_dokumen_klaim = 'Empty';
        }


    }else if(kode=='CMO'){

        let sqlgetOrg = `SELECT * FROM m_distributor_v WHERE m_distributor_id = '${org_id}'`;
        let getOrg = await request.query(sqlgetOrg);
        let dataorg = getOrg.recordset[0];
        // console.log(dataorg);

        if(dataorg){
          let r_organisasi_id = dataorg.r_organisasi_id ? dataorg.r_organisasi_id : '';
          let kode_shipto = dataorg.kode ? dataorg.kode : '';
  
          queryDataTable = `
          SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
          WHERE dn.kode='${kode}'
          AND dn.document_number_id = dnl.document_number_id
          AND dnl.r_organisasi_id = '${r_organisasi_id}'`;
  
          let getsequence = await request.query(queryDataTable);
          const row = getsequence.recordset[0];
          let totalrows = pad(row.totalrows);
          let bulanconvert = moment(bulan,'MM').format('MMM');
          nomor_dokumen_klaim = tahun+"/CMO/"+bulanconvert.toLocaleUpperCase()+"/"+kode_shipto+"/"+totalrows;
        }else{

          nomor_dokumen_klaim = 'Empty';

        }

    }
    // console.log('org_id ',org_id);
    // console.log('kode ',kode);
    // console.log('nomor_dokumen_klaim ',nomor_dokumen_klaim);

    return res.success({
      result: nomor_dokumen_klaim,
      message: "Fetch data successfully"
    });
     
    } catch (err) {
      return res.error(err);
    }
  },
  
 
};


async function uploadFiles(id,file){
  var uploadFile = file;
  // console.log(uploadFile);
  let filenames = ``
  uploadFile.upload({maxBytes: 500000000000},
    async function onUploadComplete(err, files) {
      if (err) {
        let errMsg = err.message
        // console.log(errMsg);
        return res.error(errMsg)
      }
      // console.log("px");
    for (const file of files) {
      // console.log('filename', file.filename)
      filenames = file.filenam;
      fs.mkdirSync(dokumentPath( 'parking', id), {
          recursive: true
      })
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'parking', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
      // console.log(filesamaDir);

      if (filesamaDir.found.length > 0) {
          // console.log('isexist file nama sama', filesamaDir.found[0]);
          fs.unlinkSync(filesamaDir.found[0])
      }
      // console.log(filesamaDir);
      fs.renameSync(file.fd, path.resolve(dokumentPath( 'parking', id), file.filename))
    }
  })
}
function pad(d) {
    var str = "" + d
    var pad = "00000"
    var ans = pad.substring(0, pad.length - str.length) + str
    return ans;
  }