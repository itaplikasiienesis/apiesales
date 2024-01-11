/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const Base64 = require('base-64');
 const soapRequest = require('easy-soap-request');
 const fs = require('fs');
 const xml2js = require('xml2js');
 const uuid = require("uuid/v4");
 const SendEmail = require('../../services/SendEmail')
 const path = require('path');
 const moment = require('moment');
 const glob = require('glob');
 const json2xls = require('json2xls');
 const axios = require("axios");
 const numeral = require('numeral');
 const puppeteer = require('puppeteer')
 const handlebars = require("handlebars");
 const { words } = require("lodash");
 const { format } = require("path");
 const _ = require('lodash');
 const { request } = require("http");
 var shell = require('shelljs');
 const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templatefkr');
 const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'fkr');
 const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
 const ClientSFTP = require('ssh2-sftp-client');
 const DB = require("../../services/DB");
 const sftp = new ClientSFTP();
 const ftpconfig = {
   host: "192.168.1.148",
   port:22,
   user: "sapftp",
   password: "sapftp@2020"
 }
 module.exports = {
   // GET ALL RESOURCE
   cek: async function(req, res) { 
    return res.success({
        error : "false",
        result: null,
        message: "General Service is UP!"
    });
   },
   

   upload : async function(req, res){
    const {folder, id/*, filename*/} = req.body
    req.file('file').upload(function (err, uploadedFiles) {
      if (err) return res.send(500, err);
      console.log('uploadedFiles', uploadedFiles)
      // return res.json({
      //   message: uploadedFiles.length + ' file(s) uploaded successfully!',
      //   files: uploadedFiles
      // })
      let filenames = ''
      for (const file of uploadedFiles) {
        console.log('filename', file.filename)
        filenames = file.filename;
        fs.mkdirSync(dokumentPath( folder, id), {
            recursive: true
        })
        const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( folder, id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
        if (filesamaDir.found.length > 0) {
            console.log('isexist file nama sama', filesamaDir.found[0])
            fs.unlinkSync(filesamaDir.found[0])
        }
        fs.renameSync(file.fd, path.resolve(dokumentPath( folder, id), file.filename))
      }

      const message = {
        totalFiles: uploadedFiles.length,
        uploadedFiles: uploadedFiles,
        // newFilename: filename, 
      }
      return res.success({
        error : "false",
        result: null,
        message: message
      }); 
    });
    

    
  },

  findCheckDataBidding: async function(req, res) {
    await DB.poolConnect;
    try {

        let r_log_bidding_id = req.param("id");

        console.log(r_log_bidding_id);

        const request = DB.pool.request();

        let sqlGetInformasiDo = `SELECT CONVERT(VARCHAR, tanggal_penjemputan ,120) AS tanggal_penjemputan FROM delivery_order_v dov WHERE dov.r_log_bidding_id = '${r_log_bidding_id}'`;
        let datadeliveryorder = await request.query(sqlGetInformasiDo);

        console.log(datadeliveryorder);
        let tanggal_penjemputan = datadeliveryorder.recordset.length > 0 ? moment(datadeliveryorder.recordset[0].tanggal_penjemputan,'YYYY-MM-DD HH:mm').format('DD-MMMM-YYYY HH:mm') : null;


        if(datadeliveryorder.recordset.length > 0){
          console.log('datado.tanggal_penjemputan ',datadeliveryorder.recordset[0].tanggal_penjemputan);
          console.log('tanggal_penjemputan ',tanggal_penjemputan);

        }else{
          console.log('tanggal_penjemputan ',tanggal_penjemputan);
        }

        return res.success({
          result: tanggal_penjemputan,
          message: "Fetch data successfully"
        });



      } catch (err) {
      return res.error(err);
    }
  },
  
  
   
 
 }
 
 async function uploadFilesKembali(id,file,folder){
   console.log('INSIDE uploadFilesKembali', id,folder)
   var uploadFile = file;
   console.log('????', uploadFile);
   let filenames = ``
   uploadFile.upload({maxBytes: 500000000000},
     async function onUploadComplete(err, files) {
       if (err) {
         console.log('ERROR uploadFilesKembali')
         let errMsg = err.message
         console.log('errMsg err: '+err);
         return errMsg //res.error(errMsg)
       }
       console.log('gak err kok')
       console.log(id,"px");
       console.log('ini logh list files', files)
     for (const file of files) {
       console.log('filename', file.filename)
       filenames = file.filename;
       fs.mkdirSync(dokumentPath( folder, id), {
           recursive: true
       })
       const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( folder, id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
       if (filesamaDir.found.length > 0) {
           console.log('isexist file nama sama', filesamaDir.found[0])
           fs.unlinkSync(filesamaDir.found[0])
       }
       fs.renameSync(file.fd, path.resolve(dokumentPath( folder, id), file.filename))
     }
     // console.log("asdas");
   })
 
 }
  
 //retur 2021