const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail');
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
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "sapftp",
  password: "sapftp@2020"
}



const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
  find: async function (req, res) {
      const {filter} =  req.body;
      console.log(filter);
      
      const request = DB.pool.request();
      try {
        let cekRole = `select * from m_user_role_v where m_user_id = '${filter.m_user_id}'`;
        let queryrole = await request.query(cekRole);
        let rolename = queryrole.recordset[0].nama
        console.log("query > ",cekRole);

        console.log(rolename);
        let query = `select * from diskon_b2b_v`;
        let queryds = await request.query(query);
        let row = queryds.recordset
        console.log("khaiedhf ",query);
        console.log("dewad"),row;


        return res.success({
            error : "false",
            result: row,
            message: "Berhasil ...."
        });
      }catch(err){
        return res.error({
            error : "true",
            result: null,
            message: "Gagal"
        });
      }
  },

  findApproveCeo: async function (req, res) {
    const {m_user_id} =  req.query;
    console.log(m_user_id);
    
    const request = DB.pool.request();
    try {
      let cekRole = `select * from m_user_role_v where m_user_id = '${m_user_id}'`;
      let queryrole = await request.query(cekRole);
      let rolename = queryrole.recordset[0].nama
      console.log("query > ",cekRole);

      console.log(rolename);
      let query = `select dbb.* from diskon_b2b dbb 
      inner join diskon_b2b_approval dbba on dbb.diskon_b2b_id = dbba.diskon_b2b_id 
      where dbba.m_user_id = 'E801E420-AF5F-49DE-80C0-1D1C10DA577F' and dbba.status = 'Need Approval'`;
      let queryds = await request.query(query);
      let row = queryds.recordset

      let jumlahApprove = `select COUNT(*) as jumlah_approval from diskon_b2b dbb 
      inner join diskon_b2b_approval dbba on dbb.diskon_b2b_id = dbba.diskon_b2b_id 
      where dbba.m_user_id = 'E801E420-AF5F-49DE-80C0-1D1C10DA577F' and dbba.status = 'Need Approval'`;
      let dataApprove = await request.query(jumlahApprove);
      let totalData = dataApprove.recordset[0].jumlah_approval;
      row.totalData = totalData ;

      console.log("khaiedhf ",query);
      console.log("dewad"),row;


      return res.send({
          error : "false",
          result: row,
          totalData: totalData,
          message: "Berhasil ...."
      });
    }catch(err){
      return res.error({
          error : "true",
          result: null,
          message: "Gagal"
      });
    }
},

countB2bApprove: async function (req, res) {  
  const {
    query: {m_user_id}
  } = req;
  //console.log("MUSERID ",m_user_id);
  const request = DB.pool.request();
  try {


    // let sqlgetUserByNik = `SELECT m_user_id FROM m_user WHERE nik = '${m_user_id}'`;

    // //console.log(sqlgetUserByNik);
    // let dataUser = await request.query(sqlgetUserByNik);
    // let m_user_id = dataUser.recordset.length > 0 ? dataUser.recordset[0].m_user_id : nik;

    // let jumlahApprove = `select COUNT(*) as jumlah_approval from diskon_b2b dbb 
    // inner join diskon_b2b_approval dbba on dbb.diskon_b2b_id = dbba.diskon_b2b_id 
    // where dbba.m_user_id = '${m_user_id}' and dbba.status = 'Need Approval'`;

    // //console.log("DECSKMA ",jumlahApprove);
    // let dataApprove = await request.query(jumlahApprove);
    let totalData = 0;

    return res.send({
        error : "false",
        totalData: totalData,
        message: "Berhasil ...."
    });
  }catch(err){
    return res.error({
        error : "true",
        result: null,
        message: "Gagal"
    });
  }
},

  approved: async function (req, res) {
    const {
      query: {m_user_id,id}
    } = req;

    console.log(id,m_user_id);
    
    const request = DB.pool.request();
    try {
      
      let query = `select * from diskon_b2b where id = '${id}'`;
      let queryds = await request.query(query);
      let row = queryds.recordset

      return res.success({
          error : "false",
          result: null,
          message: "Berhasil ...."
      });
    }catch(err){
      return res.error({
          error : "true",
          result: null,
          message: "Gagal"
      });
    }
},
  view: async function(req, res){
    const {
      query: {m_user_id,id}
    } = req;

    console.log(id,m_user_id);
    try {
      await DB.poolConnect;
      const request = DB.pool.request();
      let rows = {};
      let header = `select *, 'N' as isapprove from diskon_b2b_v where diskon_b2b_id = '${id}'`;
      let detail = `select * from diskon_b2b_detail a
                    inner join m_produk b on a.m_produk_id = b.m_produk_id
                    where a.diskon_b2b_id = '${id}'`
      let approval = `select *,convert(varchar(10),updated,120) as period from diskon_b2b_approval where diskon_b2b_id = '${id}' order by seq desc`
      

      // console.log(header,detail);


      let headerds = await request.query(header);
      let rowHeader = headerds.recordset;

      let cekApproval = `select *,convert(varchar(10),updated,120) as period from diskon_b2b_approval where diskon_b2b_id = '${id}' and m_user_id = '${m_user_id}' `;
      console.log(cekApproval);
      let headerdApprove = await request.query(cekApproval);
      // console.log(headerdApprove.recordset.length );
      if (headerdApprove.recordset.length > 0 ){
        if(headerdApprove.recordset[0].status == "Need Approval" && rowHeader[0].kode_status != "RJC"){
          rowHeader[0].isapprove = 'Y'
        } 
      }

      let details = await request.query(detail);
      let rowDetails = details.recordset;

      let appr = await request.query(approval)
      let rowAppr = appr.recordset

      rows = {
        header_row : rowHeader[0],
        detail_row : rowDetails,
        approval_row : rowAppr
      }

      console.log(rows);

      return res.success({
        error : "false",
        result: rows,
        message: "Berhasil ...."
    });

    }catch(err){
      return res.error({
          error : "true",
          result: null,
          message: "Gagal"
      });
    }
  },
  approvedemail : async function(req, res){
    const {
      query: {m_user_id,id}
    } = req;

    console.log(id,m_user_id);
    return res.error({
        error : "true",
        result: null,
        message: m_user_id
    });
  },
  testupload : async function(req,res){
    const {header,items} = req.body;
    // console.log(req.body);
    console.log(JSON.parse(header));
    console.log(JSON.parse(items));
    var uploadFile = req.file("image");

    // console.log(uploadFile);
    // uploadFiles("12345678",uploadFile);
    // console.log(uploadFile);
    return res.success({
      error : "false",
        result: null,
        message: "Berhasil ...."
    });
  },
  new: async function (req, res) {
      const {header_v,items_v} = req.body;
      console.log(req.body.items_v);
      const request = DB.pool.request();
      let header ;
      let items ;
      // return res.error({
      //     error : "true",
      //     result: null,
      //     message: "Gagal Mendapat nomor dokumen"
      // });
      try {
        header = JSON.parse(header_v);
        items  = JSON.parse(items_v);
      } catch (error) {
        console.log(error);
        header =  header_v;
        items =  items_v;
      }

      console.log("HEADERNYAA = ",header);
      
      let uploadFile = req.file("image");
      let filenames = req.file.filename;
      try {
          let cekChannel = `select r_distribution_channel_id from m_distributor_v 
          where m_distributor_id = '${header.m_distributor_id}'`
          let dscek = await request.query(cekChannel)
          let dr = dscek.recordset;
          let chanel = ``;
          chanel = dr.length > 0 ? dr[0].r_distribution_channel_id : ''
          let diskon_id = uuid();
          let selectfunction = `select dbo.func_doc_b2b('${header.m_distributor_id}') as kode`
          console.log(selectfunction);
          let nodoc_cek = await request.query(selectfunction)
          let nodok = ``
          if(nodoc_cek.recordset.length > 0){
            nodok = nodoc_cek.recordset[0].kode
            console.log(nodok);

          }else{
            return res.error({
                error : "true",
                result: null,
                message: "Gagal Mendapat nomor dokumen"
            });
          }

          let insertheader = `insert into diskon_b2b 
                (diskon_b2b_id
                ,periodstart
                ,createdby
                ,m_distributor_id
                ,r_distribution_channel_id
                ,kode_status
                ,status
                ,periodend
                ,isactive
                ,nomor_dokumen
                ,attachment
                ,diskon) values
                (
                  '${diskon_id}',
                  '${header.periodstart}',
                  '${header.m_user_id}',
                  '${header.m_distributor_id}',
                  '${chanel}',
                  'DR',
                  'PENGAJUAN',
                  '${header.periodend}',
                  'Y',
                  '${nodok}',
                  '${header.filenames.replace("'"," ")}',
                  '${header.diskon}'
                )`;

          console.log(insertheader);

          // await request.query(insertheader)
         
          request.query(insertheader, async (err, result)=>{
            if (err) {
              console.log("xxxxxxxxxx",err);
                return res.error({
                  error : "true",
                  result: null,
                  message: "Gagal"
              });
            }

            try {
              console.log("cetakk ne2 >");
              for(let i = 0; i < items.length; i ++){
                let detail = `insert into diskon_b2b_detail (diskon_b2b_id,m_produk_id,qty,gross,nett,harga_asli,diskon)
                values ('${diskon_id}','${items[i].m_produk_id}',${items[i].qty},${items[i].gross},${items[i].nett},${items[i].harga},${items[i].diskon})`
                console.log("sdnabiuu",detail);
                await request.query(detail)
              }
              console.log("cek param diskon = ",header.diskon);
              let exec_sp = `exec sp_approval_b2b '${diskon_id}','${header.diskon}'`
              // let exec_sp = `exec sp_approval_b2b '${diskon_id}','55'`
              console.log("asdaindin > ",exec_sp);
              await request.query(exec_sp)
            } catch (error) {
              console.log(error);
            }
            await uploadFiles(diskon_id,uploadFile);
            

            let cekNotif = `select * from  diskon_b2b_approval where diskon_b2b_id = '${diskon_id}' and seq = 1`;
            let notifds = await request.query(cekNotif)
            let emailList = [];
            if(notifds.recordset.length > 0){
              console.log("ada............");
              let bm = `select email_verifikasi from diskon_b2b_detail a
                        inner join  m_produk_b2b b on a.m_produk_id = b.m_produk_id
                        where a.diskon_b2b_id = '${diskon_id}'
                        GROUP BY email_verifikasi`;
              console.log(bm);
              let bmds = await request.query(bm)
              emailList.push("tegar.baskoro@enesis.com")
              // emailList.push("ilyas.nurrahman74@gmail.com")
              if(bmds.recordset.length > 0){
                for(var i = 0; i<bmds.recordset.length; i++){
                  emailList.push(bmds.recordset[i].email_verifikasi)
                }
              }
              console.log(emailList.toString(),"yesss");

              let dsx = notifds.recordset;
              console.log(dsx[0].role);
              const param = await contentEmail(diskon_id);
             
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'emaildiskonb2b', templateparam: param }); 
              // console.log(template);
              SendEmail(emailList, param.subject, template);

            }
            return res.success({
                error : "false",
                result: null,
                message: "Berhasil ...."
            });
          })

      } catch (err) {
        return res.error({
          error : "true",
          result: null,
          message: "Gagal"
        });
      }
  },
  actionb2b: async function (req, res) {
    const {m_user_id,id,action} = req.body;
    console.log(m_user_id,id, action,"xxxx");
    try {
      const request = DB.pool.request();
      let cekstatus = `select * from diskon_b2b_approval where m_user_id = '${m_user_id}' and diskon_b2b_id = '${id}' `;
    

      let resCekstatus = await request.query(cekstatus);
      let dsstatus = resCekstatus.recordset;
      let seq    = dsstatus[0].seq;
      let status = dsstatus[0].status;
      
      if(action == 0){
        let updateheader = `update diskon_b2b set kode_status = 'RJC', status = 'Rejected' where diskon_b2b_id = '${id}'`
        let updateapproval = `update diskon_b2b_approval set status = 'Cancel', updated = getdate() where diskon_b2b_id = '${id}' and seq = ${seq}`
        await request.query(updateheader);
        await request.query(updateapproval);
        return res.success({
          error : "false",
          result: null,
          message: "Berhasil"
        });

      }
      
      if(seq == 1){
        console.log("satu");
        let updateheader = `update diskon_b2b set kode_status = 'APP1' , status = 'On Progress' where diskon_b2b_id = '${id}' `
        let updateprogress1 = `update diskon_b2b_approval set status  = 'Approved' where m_user_id = '${m_user_id}' 
        and diskon_b2b_id = '${id}'`
        let updateprogress2 = `update diskon_b2b_approval set status  = 'Need Approval' , updated = getdate() where seq = 2 
        and diskon_b2b_id = '${id}'`

        await request.query(updateheader);
        await request.query(updateprogress1);
        await request.query(updateprogress2);
        const param = await contentEmail(id);
        let selseq2 = `select * from diskon_b2b_approval a
                       inner join m_user b on a.m_user_id = b.m_user_id
                       where diskon_b2b_id = '${id}' and seq = 2 `
        let dtseq2 = await request.query(selseq2)
        // console.log(selseq2);
        if (dtseq2.recordset.length > 0){
          dtseq2 = dtseq2.recordset;
          let em = dtseq2[0].email_verifikasi;
          const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'emaildiskonb2b', templateparam: param }); 
          console.log(template);
          // SendEmail(em, param.subject, template);
        }
      }else if(seq == 2){
        console.log("dua");
        let updateheader = `update diskon_b2b set kode_status = 'APP2' , status = 'On Progress' where diskon_b2b_id = '${id}' `
        let updateprogress1 = `update diskon_b2b_approval set status  = 'Approved', updated = getdate() where m_user_id = '${m_user_id}' 
        and diskon_b2b_id = '${id}'`
        let updateprogress2 = `update diskon_b2b_approval set status  = 'Need Approval' where seq = 3 
        and diskon_b2b_id = '${id}'`

        await request.query(updateheader);
        await request.query(updateprogress1);
        await request.query(updateprogress2);
        const param = await contentEmail(id);
        let selseq2 = `select * from diskon_b2b_approval a
                       inner join m_user b on a.m_user_id = b.m_user_id
                       where diskon_b2b_id = '${id}' and seq = 3 `
        let dtseq2 = await request.query(selseq2)
        // console.log(selseq2);
        if (dtseq2.recordset.length > 0){
          dtseq2 = dtseq2.recordset;
          let em = dtseq2[0].email_verifikasi;
          const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'emaildiskonb2b', templateparam: param }); 
          console.log(template);
          SendEmail(em, param.subject, template);
        }
      }else{
        let cek_next = `select * from diskon_b2b_approval where diskon_b2b_id = '${id}' and seq > ${seq} `;

        console.log(seq,"************8",cek_next);
        
        let okenekt = await request.query(cek_next);
        let status = ''
        let kode_status = ''
        let dtseq2 = '';
        let param = await contentEmail(id);

        console.log(cek_next);
       
        if(okenekt.recordset.length > 0){
          console.log("Masih ada....");
          status = 'On Progress'
          kode_status = 'APP3'

          let updateprogress1 = `update diskon_b2b_approval set status  = 'Approved', updated = getdate() where seq = 3 
          and diskon_b2b_id = '${id}'`

          let updateprogress2 = `update diskon_b2b_approval set status  = 'Need Approval' where seq = 4 
          and diskon_b2b_id = '${id}'`
          let selseq2 = `select * from diskon_b2b_approval a
                      inner join m_user b on a.m_user_id = b.m_user_id
                      where diskon_b2b_id = '${id}' and seq = 4 `

          await request.query(updateprogress1);
          await request.query(updateprogress2);
          dtseq2 = await request.query(selseq2)
        }else{
          

          console.log("xxxx");

          status = 'Success Approved'
          kode_status = 'APP'
          param = await contentEmail(id,"APP");

          let selseq2 = `select * from diskon_b2b a
          inner join m_user b on b.m_user_id = a.createdby
          where diskon_b2b_id = '${id}'`
          dtseq2 = await request.query(selseq2)

          let b2b = `select b.kode,kode_sap,c.diskon
                    ,convert(varchar(10),a.periodstart,120)awal
                    ,convert(varchar(10),a.periodend,120)akhir from diskon_b2b a
                    inner join customer_b2b_v b on a.m_distributor_id = b.m_distributor_id
                    inner join diskon_b2b_detail c on c.diskon_b2b_id = a.diskon_b2b_id
                    inner join m_produk d on d.m_produk_id = c.m_produk_id
                    where a.diskon_b2b_id = '${id}' `;
          
          let dt = await request.query(b2b)
          let datas = [];
          console.log(dt.recordset.length);
          let obj = {}
          for (var i = 0; i< dt.recordset.length; i++){
       
            obj = {
              VKORG : '2100',
              VTWEG : '15',
              KUNNR : dt.recordset[0].kode,
              // KUNNR : '1000008',
              MATNR : dt.recordset[i].kode_sap,
              KBETR : dt.recordset[i].diskon.replace(".",","),
              DATAB : dt.recordset[i].awal,
              DATBI : dt.recordset[i].akhir,
            }
            datas.push(obj)
          };

          console.log(obj);

          
          // let xml = fs.readFileSync('soap/ZFM_WS_B2B.xml', 'utf-8'); 
          let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
          let hasil = racikXML2(xml, datas, 'ITAB')
          console.log(hasil);
          // let responSAP = await requestSAP(hasil);
          let remotePath = '/home/sapftp/esales/b2b/request/'+`${id}.xml`;
          let locationFiles = dokumentPath('diskonb2b_ftp','request').replace(/\\/g, '/');
          let dst = dokumentPath('diskonb2b_ftp','request') + '/' +`${id}.xml`;
          let localPath = dst.replace(/\\/g, '/');
          fs.writeFileSync(localPath, hasil);
          
          let filenames = fs.existsSync(localPath);
          if(filenames){

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

          }

          // if(responSAP == "E"){
              // return res.success({
              //   error : "true",
              //   result: null,
              //   message: "Gagal SAP"
              // });
          // }
        }
        let updateheader = `update diskon_b2b set kode_status = '${kode_status}' , status = '${status}' where diskon_b2b_id = '${id}' `
        let updateprogress1 = `update diskon_b2b_approval set status  = 'Approved', updated = getdate() where m_user_id = '${m_user_id}' 
        and diskon_b2b_id = '${id}'`

        try {
          await request.query(updateheader);
          await request.query(updateprogress1);
          
          
          // console.log(selseq2);
          if (dtseq2.recordset.length > 0){
            dtseq2 = dtseq2.recordset;
            let em = dtseq2[0].email_verifikasi;
            const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'emaildiskonb2b', templateparam: param }); 
            // console.log(template);
            // SendEmail(em, param.subject, template);
            let emx = [];{email: ""}
            // emx.push("ilyas.nurrahman74@gmail.com")
            emx.push("kukuh.budiyanto@enesis.com")
            emx.push("danny.tan@enesis.com")
            // emx.push("indra.suandi@enesis.com")
            // emx.push("henry.irawan@enesis.com")
            SendEmail(emx.toString(), param.subject, template);
          }
        } catch (error) {
          console.log(error);
          return res.success({
            error : "true",
            result: null,
            message: "Gagal"
          });
        }
        
      }



      return res.success({
        error : "false",
        result: null,
        message: "Berhasil"
      });
    } catch (error) {
      console.log(error);
      return res.error({
        error : "true",
        result: null,
        message: "Gagal"
      });
    }
    // return res.error({
    //   error : "false",
    //   result: null,
    //   message: "Gagal"
    // });
  },
  getfile: async function(req, res) {
    // const user = req.param('user')
    const record = req.param('record')
    const filename = req.param('filename')
   
    // console.log(record,filename);
    const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('diskonb2b', record), filename + '*'));
    // console.log(filesamaDir);
    if (filesamaDir.found.length > 0) {
        // console.log(filesamaDir.found[0])
  
        // return res.send(filesamaDir.found[0]);
        // return res.success('OK');
        var lastItemAkaFilename = path.basename(filesamaDir.found[0])
        // console.log(lastItemAkaFilename);
        return res.download(filesamaDir.found[0], lastItemAkaFilename)
    }
    return res.error('Failed, File Not Found');
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
        console.log(errMsg);
        return res.error(errMsg)
      }
      console.log("px");
    for (const file of files) {
      console.log('filename', file.filename)
      filenames = file.filenam;
      fs.mkdirSync(dokumentPath( 'diskonb2b', id), {
          recursive: true
      })
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'diskonb2b', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
      if (filesamaDir.found.length > 0) {
          console.log('isexist file nama sama', filesamaDir.found[0])
          fs.unlinkSync(filesamaDir.found[0])
      }
      fs.renameSync(file.fd, path.resolve(dokumentPath( 'diskonb2b', id), file.filename))
    }


    // console.log("asdas");
  })

}

async function contentEmail(id,stat){
      let title = 'Pengajuan Diskon B2B'
      if(stat){
        title = 'Need Appproval'
      }

      const request = DB.pool.request();
      let header = `select * from diskon_b2b_v where diskon_b2b_id = '${id}'`;
      let detail = `select * from diskon_b2b_detail a
                    inner join m_produk b on a.m_produk_id = b.m_produk_id
                    where a.diskon_b2b_id = '${id}'`
      // console.log(header,detail);


      let headerds = await request.query(header);
      let rowHeader = headerds.recordset;

      let details = await request.query(detail);
      let rowDetails = details.recordset;

      const td = await _generateTable(rowDetails);
      // console.log(td);
      const param = {
        subject : title,
        nomor: rowHeader[0].nomor_dokumen,
        distributor : rowHeader[0].nama_ship_to,
        periodestart : rowHeader[0].periodstart,
        periodeend : rowHeader[0].periodend,
        gross : rowHeader[0].gross,
        nett : rowHeader[0].nett,
        qty : rowHeader[0].qty,
        diskon : rowHeader[0].diskon,
        details : td
        
      }
      return param
}

async function _generateTable(table) {
  console.log("ini table",table);
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
          content = content + addRowSpan("kode_sap", i, false,"center")
          content = content + addRowSpan("nama", i, false,"left")
          content = content + addRowSpan("qty", i, false, "left")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
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