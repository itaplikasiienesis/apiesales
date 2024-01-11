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
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


    for (let i = 1; i < (excel.length); i++) {

        let baris = i + 1;
        let kode_status = excel[i][0];
        let nomor_klaim = excel[i][1];
        let nomor_eprop = excel[i][2];


        // SQL GET klaim_id

        let sqlGetDataKlaim = `SELECT * FROM klaim WHERE nomor_klaim = '${nomor_klaim}'`;
        let dataKlaim = await request.query(sqlGetDataKlaim);
        let klaim_id = dataKlaim.recordset.length > 0 ? dataKlaim.recordset[0].klaim_id : null;
    

        if(klaim_id){

            console.log('baris ',baris);
            console.log('kode_status ',kode_status);
            console.log('nomor_klaim ',nomor_klaim);
            console.log('nomor_eprop ',nomor_eprop);

            let catatanIt = `Nomor Klaim : ${nomor_klaim} dengan kode status awal ${kode_status} case over budget`;

            // UPDATE KLAIM
            let updateKlaim = `UPDATE klaim SET catatan_it='${catatanIt}',kode_status='RJF',status='Reject By System (Over Budget)' WHERE klaim_id = '${klaim_id}'`
            await request.query(updateKlaim);
            console.log(updateKlaim);

            // INSERT AUDIT KLAIM
            let insertData = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status,reason_reject)
            VALUES ('${klaim_id}','${m_user_id}','SYSTEM','REJECT','Reject by System Teridentifikasi Over Budget, Silahkan Periksa Kembali Budget E Proposal')`;
            await request.query(insertData);
            console.log(insertData);

            // INSERT LOG REJECT
            let insertLogReject = `INSERT INTO reject_klaim_log
            (m_user_id, klaim_id, createddate, alasan)
            VALUES('${m_user_id}', '${klaim_id}', getdate(), 'Reject by System Teridentifikasi Over Budget, Silahkan Periksa Kembali Budget E Proposal')`;
            await request.query(insertLogReject);
            console.log(insertLogReject);

        }

    }


       // PROSES INSERT AUDIT PROSES



       let sqlInsertData = `INSERT INTO audit_support
       (kode,nama)
       VALUES('OVB', 'Reject Klaim By System Over Budget')`;
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
