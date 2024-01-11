const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const mssql = require('mssql');
const moment = require('moment');
const xml2js = require('xml2js');
const numeral = require('numeral');
const bcrypt = require('bcryptjs');
const path = require('path');
const Client = require('ftp');
const fs = require('fs');
const ClientSFTP = require('ssh2-sftp-client');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const SendEmailExecutor = require('../../services/SendEmailExecutor');
const SendEmailAll = require('../../services/SendEmailAll');
const SendEmailCreatedBy = require('../../services/SendEmailCreatedBy');
const SendEmail = require('../../services/SendEmail');
const SendEmailApproval = require('../../services/SendEmailApprovalUlang');
const axios = require("axios");

module.exports = {
  // GET ALL RESOURCE

  find: async function(req, res) {
    const {
        query: {M}
      } = req;

      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        //SendEmailExecutor(proposal_id);
        SendEmailAll(proposal_id);
        // SendEmailCreatedBy(proposal_id);

              
      return res.success({
        message: "Send Email"
      });

    } catch (err) {
        return res.error(err);
      }
  
    
  },

  getsimple: async function(req, res) {
    const {
        query: {M}
      } = req;

      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let url = 'https://coderbyte.com/api/challenges/json/rest-get-simple';

        axios.get(url).then(resp => {
        console.log(resp);
        let data = resp.data;
        return res.success({
          data:data
        });
      });



    } catch (err) {
        return res.error(err);
      }
  
    
  },

  prosesPerbaikanNomorKlaimMultipleSoldto: async function(req, res) {
      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let queryGetPajak = `SELECT DISTINCT m_pajak_id FROM klaim`;
        let getpajak = await request.query(queryGetPajak);

        for (let i = 0; i < getpajak.recordset.length; i++) {
            let m_pajak_id = getpajak.recordset[i].m_pajak_id;
            console.log('m_pajak_id ',m_pajak_id);
            let queryDataTable = `SELECT klaim_id,nomor_klaim,created FROM klaim k WHERE m_pajak_id='${m_pajak_id}' ORDER BY created ASC`;
            let getsequence = await request.query(queryDataTable);
    
            console.log('panjangnya ',getsequence.recordset.length);
            for (let j = 0; j < getsequence.recordset.length; j++) {
              let nomor_klaim = getsequence.recordset[j].nomor_klaim;
              let klaim_id = getsequence.recordset[j].klaim_id;
              let newseq = pad(j + 1);
    
              let tahun = nomor_klaim.split('/')[0];
              let bulan =  nomor_klaim.split('/')[2];
              let kode_pajak =  nomor_klaim.split('/')[3];
    
              let nomor_dokumen_klaim = tahun+"/PROP/"+bulan+"/"+kode_pajak+"/"+newseq;
              let updateQuery = `UPDATE klaim SET nomor_klaim='${nomor_dokumen_klaim}' WHERE klaim_id='${klaim_id}'`;
              await request.query(updateQuery);
              console.log(updateQuery);
    
            }
        }
        return res.success({
          message: "Perbaikan Multiple Behasil"
        });

    } catch (err) {
        return res.error(err);
      }
  
    
  },

  prosesPerbaikanNomorKlaim: async function(req, res) {
    const {m_pajak_id} = req.body;

      await DB.poolConnect;
      try {
        const request = DB.pool.request();
              
        let queryDataTable = `SELECT klaim_id,nomor_klaim,created FROM klaim k WHERE m_pajak_id='${m_pajak_id}' ORDER BY created ASC`;
        let getsequence = await request.query(queryDataTable);

        console.log('panjangnya ',getsequence.recordset.length);
        for (let i = 0; i < getsequence.recordset.length; i++) {
          let nomor_klaim = getsequence.recordset[i].nomor_klaim;
          let klaim_id = getsequence.recordset[i].klaim_id;
          let newseq = pad(i + 1);

          let tahun = nomor_klaim.split('/')[0];
          let bulan =  nomor_klaim.split('/')[2];
          let kode_pajak =  nomor_klaim.split('/')[3];

          let nomor_dokumen_klaim = tahun+"/PROP/"+bulan+"/"+kode_pajak+"/"+newseq;
          let updateQuery = `UPDATE klaim SET nomor_klaim='${nomor_dokumen_klaim}' WHERE klaim_id='${klaim_id}'`;
          await request.query(updateQuery);
          console.log(updateQuery);

        }

        return res.success({
          message: "Perbaikan Multiple Behasil"
        });

    } catch (err) {
        return res.error(err);
      }
  
    
  },
  testemailFKR: async function(req, res) {
    const {fkr_id,m_user_id,email} = req.body;
      await DB.poolConnect;
      try {
        const request = DB.pool.request();


        // let dataemail = ['tiasadeputra@gmail.com '];
        let dataemail = [email];
        let sqlParam = `SELECT fkr_id,nama_distributor,status,nomor_fkr,
        CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode,
        eksekusi,nomor_so,amount FROM fkr_v   WHERE fkr_id = '${fkr_id}'`
        console.log(sqlParam);
        let getdataparam = await request.query(sqlParam);
        let dataparam = getdataparam.recordset[0];
        let nomor_fkr = dataparam.nomor_fkr;
        console.log(dataparam);

        let queryDetail = `SELECT a.fkr_detail_id, 
                a.isactive, a.created, a.createdby, 
                a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
                COALESCE(rst.keterangan,a.satuan) AS satuan,
                mp.kode AS kode_produk,
                mp.kode_sap,
                mp.nama AS nama_barang,
                a.total_retur, 
                a.expired_gudang, a.expired_toko, a.damage, a.recall, 
                a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
                a.repalcement, a.delisting, a.keterangan
                FROM fkr_detail a
                LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                ,m_produk mp
                WHERE a.fkr_id='${fkr_id}'
                AND a.m_produk_id = mp.m_produk_id`;
                let dataDetails = await request.query(queryDetail);
                let details = dataDetails.recordset;
        for (let i = 0; i < details.length; i++) {
          
            details[i].nomor = i + 1;
          
        }
        let detailshtml = _generateDetailsApproveEmail(details);
        // dataemail.push(['']);
        const param = {
          
          subject:'NEED APPROVAL FKR '+nomor_fkr,
          distributor:dataparam.nama_distributor,
          eksekusi:dataparam.eksekusi,
          periode:dataparam.periode,
          nominal_so:numeral(dataparam.amount).format('0,0'),
          status:dataparam.status,
          details:detailshtml,
          linkapprove:`https://esales.enesis.com/api/fkr/approve?m_user_id=${m_user_id}&fkr_id=${fkr_id}`,
          linkreject:`https://esales.enesis.com/api/fkr/reject?m_user_id=${m_user_id}&fkr_id=${fkr_id}`
  
        }
  
        const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'fkr_progress2', templateparam: param }); 
        SendEmail(dataemail.toString(), param.subject, template);

              
      return res.success({
        message: "Send Email",
      });

    } catch (err) {
        return res.error(err);
      }
  
    
    },


    kirimUlangEmailApproval: async function(req, res) {
      const {proposal_id,no_appr,email} = req.body;

        await DB.poolConnect;
        try {
      
          const request = DB.pool.request();

          SendEmailApproval(proposal_id,no_appr,email);

        return res.success({
          data:proposal_id,
          message: "Split Sukses"
        });
  
      } catch (err) {
          return res.error(err);
        }
    
      
    },

    testSplitString: async function(req, res) {
      const {string,m_pajak_id} = req.body;

        await DB.poolConnect;
        try {
      
          const request = DB.pool.request();
          
          let queryDataTable = `SELECT TOP 1 nomor_klaim FROM klaim WHERE m_pajak_id='${m_pajak_id}' ORDER BY created DESC`;
          let getsequence = await request.query(queryDataTable);
          const row = getsequence.recordset[0];
          let linenumber = getsequence.recordset.length > 0 ? (Number(row.nomor_klaim.split('/')[4]) + 1) : 1;
          let totalrows = pad(linenumber);

          console.log(totalrows);

          let bulan = moment('2021-01-22','YYYY-MM-DD').format('MMM');
          let tahun = moment('2021-01-22','YYYY-MM-DD').format('YYYY');
          let nomor_dokumen_klaim = tahun+"/PROP/"+bulan.toLocaleUpperCase()+"/"+'100006'+"/"+totalrows;

        return res.success({
          data:nomor_dokumen_klaim,
          message: "Split Sukses"
        });
  
      } catch (err) {
          return res.error(err);
        }
    
      
    },

      klaimValidateHeader: async function(req, res) {  
          await DB.poolConnect;
          try {
        
            const request = DB.pool.request();
            
            let queryDataTable = `SELECT * FROM klaim WHERE total_klaim=0 AND status <> 'Reject'`;
            let data = await request.query(queryDataTable);

            for (let i = 0; i < data.recordset.length; i++) {

              let klaim_id = data.recordset[i].klaim_id;

              let sqlgetSumKlaimDetail = `SELECT
              SUM(kd.total_klaim) AS total_klaim,
              CASE WHEN k.tipe_pajak = 'PPN 10%' THEN SUM(kd.total_klaim) * 10 / 100 ELSE 0 END AS nominal_pajak,
              SUM(kd.total_klaim) + CASE WHEN k.tipe_pajak = 'PPN 10%' THEN SUM(kd.total_klaim) * 10 / 100 ELSE 0 END AS nominal_claimable 
              FROM klaim k,klaim_detail kd 
              WHERE  k.klaim_id = kd.klaim_id
              AND k.total_klaim=0
              AND kd.klaim_id='${klaim_id}'
              GROUP BY k.klaim_id,k.total_klaim,k.tipe_pajak,k.status`;
              let datadetails = await request.query(sqlgetSumKlaimDetail);
              let total_klaim = datadetails.recordset[0].total_klaim;
              let nominal_pajak = datadetails.recordset[0].nominal_pajak;
              let nominal_claimable = datadetails.recordset[0].nominal_claimable;


              let updateHeader = `UPDATE klaim SET total_klaim=${total_klaim},
              nominal_pajak=${nominal_pajak},
              nominal_claimable=${nominal_claimable} WHERE klaim_id = '${klaim_id}'`;
              await request.query(updateHeader);

            }
  
          return res.success({
            message: "Validate Sukses"
          });
    
        } catch (err) {
            return res.error(err);
          }
      
        
        },


        updateHeaderKlaim: async function(req, res) {  
          await DB.poolConnect;
          try {
            const {klaim_id} = req.body;
            const request = DB.pool.request();
            
            let queryDataTable = `SELECT SUM(total_klaim) AS total_klaim,SUM(asdh_amount) AS asdh_amount,SUM(sales_amount) AS sales_amount,
            SUM(accounting_amount) AS accounting_amount 
            FROM klaim_detail WHERE klaim_id = '${klaim_id}'`;
            let datas = await request.query(queryDataTable);
            let data = datas.recordset[0];

            let total_klaim = data.total_klaim;
            let sales_amount = data.sales_amount;
            let accounting_amount = data.accounting_amount;


            let updateQuery = `UPDATE klaim SET total_klaim=${total_klaim},
            kode_status='RJF',
            status='Reject',
            reason='Reject By System',
            nominal_pajak= CASE WHEN tipe_pajak='PPN 10%' THEN (${total_klaim} * 10 / 100) ELSE 0 END,
            nominal_claimable = ${total_klaim} + CASE WHEN tipe_pajak='PPN 10%' THEN (${total_klaim} * 10 / 100) ELSE 0 END,
            sales_approve_amount = ${sales_amount},
            accounting_approve_amount = ${accounting_amount}
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateQuery);
            
  
          return res.success({
            message: `Update Sukses ${klaim_id}`
          });
    
        } catch (err) {
            return res.error(err);
          }
      
        
        },

        
        testLogic: async function(req, res) {  
          await DB.poolConnect;
          try {
            const {m_user_id,nominal_approve} = req.query;
            const request = DB.pool.request();

            let sqlGetRole = `SELECT nama,m_role_id 
            FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
            
            let datarole = await request.query(sqlGetRole);
            let rolename = datarole.recordset[0].nama;
            
            let slgetTopApprovement = `SELECT mr.nama
            FROM fkr_role_amount_approve fraa
            LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
            WHERE fraa.amount <= ${nominal_approve} 
            ORDER BY fraa.amount DESC`;
    
            //console.log(rolename);
    
            let dataTopApprovement = await request.query(slgetTopApprovement);
            let dataarraypapprovement = dataTopApprovement.recordset;
            let topapprovementuser = dataTopApprovement.recordset[0].nama;
            let position = 0;
            let nextemail = ``;
            for (let i = 0; i < dataarraypapprovement.length; i++){
                topapprovement = dataTopApprovement.recordset[i].nama;
                if(topapprovement == rolename){
                  position = i;
                }
            }
            
  
            console.log(topapprovementuser);
          return res.success({
            message: `position Sukses ${position}`
          });
    
        } catch (err) {
            return res.error(err);
          }
      
        
        }



        

};


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


function pad(d) {
  var str = "" + d
  var pad = "00000"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}