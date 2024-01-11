/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const axios = require("axios");
 const bcrypt = require("bcryptjs");
 const moment = require("moment");
 const fs = require("fs-extra");
 const sharp = require("sharp");
 const json2xls = require('json2xls');
 const FormData = require('form-data');
 const uuid = require("uuid/v4");
 // const destination = "C:/userimages";
 const API_FACE_BASE_URL = "http://attendance.enesis.com:7000"; //"http://localhost:7000/recogimageservice";//"http://192.168.1.33:7000/recogimageservice"
 const API_FACE_RECOG_URL = `${API_FACE_BASE_URL}/recogimageservice`
 const API_FACE_ADD_URL = `${API_FACE_BASE_URL}/tambahpoto`;
 
 module.exports = {
   // GET ALL RESOURCE
   sinkronbytgl : async function(req, res){
     const {nik,alamat,tanggal} = req.body;
     await DBEMP.poolConnect;
     try {
       const request = DBEMP.pool.request();
       let id = uuid();

       let paramtanggal = moment(tanggal,'YYYY-MM-DD');

       let tahun = paramtanggal.format('YYYY');
       let bulan = paramtanggal.format('MM');
       let date = paramtanggal.format('DD');

       let combineparam = tahun+bulan+date

       console.log(combineparam);

       let cekNik = `SELECT username AS nik FROM employee_register 
       WHERE username IN(
       SELECT nik FROM log_absent WHERE CONVERT(VARCHAR(8), created, 112) = '${combineparam}'
       ) AND username NOT IN(
       SELECT nik FROM employee_attendance WHERE CONVERT(VARCHAR(8), created, 112) = '${combineparam}'
       )`;

       let ds = await request.query(cekNik);
       let datanik = ds.recordset;
       console.log(datanik.length);

       for (let i = 0; i < datanik.length; i++) {
           let nik = datanik[i].nik;
           let sqlgetlonglat = `SELECT latitude,longitude FROM log_absent la where nik = '${nik}' order by created desc`;
           let datalonglat = await request.query(sqlgetlonglat);
           let latitude = datalonglat.recordset > 0 ? datalonglat.recordset[0].latitude : '';
           let longitude = datalonglat.recordset > 0 ? datalonglat.recordset[0].longitude : '';
           let m_area_absen_id = '';


           //Cek master apakah sudah ada

           let sqlcekmaster = `select COUNT(1) AS dataarea from m_area_absen where kode = '${nik}'`;
           let datamasterarea = await request.query(sqlcekmaster);
           let statusmasterarea = datamasterarea.recordset[0].dataarea;


           if(statusmasterarea==0){

                m_area_absen_id = uuid();
                let insertAreaMaster = `INSERT INTO m_area_absen (m_area_absen_id,longitude, latitude, kode, keterangan, ishome) 
                VALUES('${m_area_absen_id}','${longitude}', '${latitude}', '${nik}', '${nik}', 1)`;
                await request.query(insertAreaMaster);

                
                let registermastertoemployee = `INSERT INTO employee_absen_area
                (employee_id, m_area_absen_id, kode_area)
                VALUES('${nik}', '${m_area_absen_id}', '${nik}')`;
                await request.query(registermastertoemployee);

                datanik[i].status = 'Baru Terdaftar WFH';
           
            }else{

                let sqlcekmaster = `select * from m_area_absen where kode = '${nik}'`;
                let datamasterarea = await request.query(sqlcekmaster);
                m_area_absen_id = datamasterarea.recordset.length > 0 ? datamasterarea.recordset[0].m_area_absen_id : null;

                let cekregistrationarea = `SELECT COUNT(1) AS statuslokasiwfhterdaftar 
                FROM employee_absen_area WHERE employee_id='${nik}'
                AND kode_area='${nik}' AND m_area_absen_id='${m_area_absen_id}'`;
                console.log(cekregistrationarea);
                let datastatuslokasiwfhterdaftar = await request.query(cekregistrationarea);
                let statuslokasiwfhterdaftar = datastatuslokasiwfhterdaftar.recordset[0].statuslokasiwfhterdaftar;

                

                if(statuslokasiwfhterdaftar==0){

                    let registermastertoemployee = `INSERT INTO employee_absen_area
                    (employee_id, m_area_absen_id, kode_area)
                    VALUES('${nik}', '${m_area_absen_id}', '${nik}')`;

                    await request.query(registermastertoemployee);
                    datanik[i].status = 'Area Sudah ada namun belum terdaftar Terdaftar WFH';

                }else{

                    datanik[i].status = 'Sudah Lengkap Terdaftar WFH';

                }
                
            }
           
           
       }
       res.success({
         result: datanik,
         message : "Berhasil"
       })


     }catch(error){
       res.error({
         error : "true",
         message : error
       })
     }
   },
  

   updatelocationnik: async function(req, res) {
    const {m_user_id,nik} = req.body;

    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();


      const sqlcekdataupdate = `SELECT TOP 1 latitude,longitude FROM log_absent WHERE nik = '${nik}' ORDER BY created DESC`;
      let dataterupdate = await request.query(sqlcekdataupdate);
      let latitude = dataterupdate.recordset.length > 0 ? dataterupdate.recordset[0].latitude : null;
      let longitude = dataterupdate.recordset.length > 0 ? dataterupdate.recordset[0].longitude : null;

      let sqlcekmaster = `select COUNT(1) AS dataarea from m_area_absen where kode = '${nik}'`;
      let datamasterarea = await request.query(sqlcekmaster);
      let statusmasterarea = datamasterarea.recordset[0].dataarea;


          if(statusmasterarea==0){

                let m_area_absen_id = uuid();
                let insertAreaMaster = `INSERT INTO m_area_absen (m_area_absen_id,longitude, latitude, kode, keterangan, ishome) 
                VALUES('${m_area_absen_id}','${longitude}', '${latitude}', '${nik}', '${nik}', 1)`;
                await request.query(insertAreaMaster);

                
                let registermastertoemployee = `INSERT INTO employee_absen_area
                (employee_id, m_area_absen_id, kode_area)
                VALUES('${nik}', '${m_area_absen_id}', '${nik}')`;
                await request.query(registermastertoemployee);

           
          }else{
            

              let sqlcekmaster = `select * from m_area_absen where kode = '${nik}'`;
              let datamasterarea = await request.query(sqlcekmaster);
              let m_area_absen_id = datamasterarea.recordset.length > 0 ? datamasterarea.recordset[0].m_area_absen_id : null;

              let cekregistrationarea = `SELECT COUNT(1) AS statuslokasiwfhterdaftar 
              FROM employee_absen_area WHERE employee_id='${nik}' 
              AND kode_area='${nik}' AND m_area_absen_id='${m_area_absen_id}'`;
              let datastatuslokasiwfhterdaftar = await request.query(cekregistrationarea);
              let statuslokasiwfhterdaftar = datastatuslokasiwfhterdaftar.recordset[0].statuslokasiwfhterdaftar;


              let updatePositionMasterArea = `UPDATE m_area_absen SET latitude='${latitude}',
              longitude='${longitude}' WHERE kode='${nik}'`;
              await request.query(updatePositionMasterArea);
            

              if(statuslokasiwfhterdaftar==0){

                  let registermastertoemployee = `INSERT INTO employee_absen_area
                  (employee_id, m_area_absen_id, kode_area)
                  VALUES('${nik}', '${m_area_absen_id}', '${nik}')`;

                  await request.query(registermastertoemployee);

              }
          
          }

      return res.success({
        message: "Update data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },

  getlocationemployeebatch: async function (req, res) {
    const {
      query: { nik },
    } = req;

    await DBEMP.poolConnect;

    try {
      const request = DBEMP.pool.request();

      let apikeygooglemap = sails.config.globals.apikeygooglemap;

      let queryDataTable = `SELECT a.username AS nik,b.latitude,b.longitude 
      FROM employee_register a,m_area_absen b 
      WHERE a.username=b.kode`;

      let getdataemployee = await request.query(queryDataTable);
      let dataemployee = getdataemployee.recordset;

      let arraydetailsforexcel = [];
      for (let i = 0; i < dataemployee.length; i++) {


        let latitude = dataemployee[i].latitude;
        let longitude = dataemployee[i].longitude;
        let res = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apikeygooglemap}`);

        if(res.status==200){

          alamat = res.data.results[0].formatted_address;

        }else{
          alamat = 'KOSONG';
        }
                
        let obj = {

          'NO': i + 1,
          'NIK' : dataemployee[i].nik,
          'LATITUDE': dataemployee[i].latitude,
          'LONGITUDE': dataemployee[i].longitude,
          'ALAMAT': alamat,
        }
        arraydetailsforexcel.push(obj);

        
      }

      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'data_employee_wfh_'.concat(tglfile).concat('.xlsx');          
        
        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.end(hasilXls, 'binary');
      }else{

        return res.error({
          message: "Data tidak ada"
        });

      }

    } catch (err) {
      return res.error(err);
    }
  },

 };
 
 