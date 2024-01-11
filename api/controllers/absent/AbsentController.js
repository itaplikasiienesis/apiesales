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
// const path = require('path')
const FormData = require('form-data');
const uuid = require("uuid/v4");
// const destination = "C:/userimages";
const API_FACE_BASE_URL = "http://attendance.enesis.com:7000"; //"http://localhost:7000/recogimageservice";//"http://192.168.1.33:7000/recogimageservice"
const API_FACE_RECOG_URL = `${API_FACE_BASE_URL}/recogimageservice`
const API_FACE_ADD_URL = `${API_FACE_BASE_URL}/tambahpoto`;
const DBEMPLOYEE = require('./../../services/DBEMPLOYEE.js');

module.exports = {
  // GET ALL RESOURCE
  updatewfh : async function(req, res){
    const {nik,alamat,tanggal} = req.body;
    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      console.log(nik,alamat,tanggal);
      let id = uuid();
      let cekNik = `select * from employee_register where username = '${nik}'`
      let ds = await request.query(cekNik);
      if(ds.recordset.length == 0){
        res.error({
          error : "true",
          message : "NIK Belum terdaftar di Employee Mobile ...."
        })
      }

      

      let insert = `insert into m_karyawan_wfh (m_karyawan_wfh_id,nik,alamat,period)
                    values ('${id}','${nik}','${alamat}','${tanggal}')`;
                    console.log(insert);
      await request.query(insert);
      res.error({
        error : "false",
        message : "Berhasil"
      })
    }catch(error){
      res.error({
        error : "true",
        message : error
      })
    }
  },
  ceknik: async function (req, res) {
    const {
      query: { nik },
    } = req;
    try {


      return res.error({
        message: "Fitur Absen sudah tidak dapat digunakan",
      });

      // let token = sails.config.globals.tokenabsen;
      // let url = "http://esales.enesis.com:8000/absensi/getemployee.php";
      // let formData = { nik: nik, token: token };

      // const encodeForm = (data) => {
      //   return Object.keys(data)
      //     .map(
      //       (key) =>
      //         encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
      //     )
      //     .join("&");
      // };

      // axios
      //   .post(url, encodeForm(formData), {
      //     headers: {
      //       Accept: "application/json",
      //     },
      //   })
      //   .then(function (response) {
      //     if (response.data.data) {
      //       return res.success({
      //         result: response.data.data[0],
      //         message: "Fetch data successfully",
      //       });
      //     } else {
      //       return res.error({
      //         message: "NIK tidak valid",
      //       });
      //     }
      //   })
      //   .catch(function (error) {
      //     res.send(error);
      //   });
    } catch (err) {
      return res.error(err);
    }
  },
  historicalabsent: async function (req, res) {
    const {
      query: { nik, bulan },
    } = req;
    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      let token = sails.config.globals.tokenabsen;
      let url = "http://esales.enesis.com:8000/Absensi/gethistorical.php";
      let formData = {
        nik: nik,
        bulan: bulan,
        token: token,
      };
      const encodeForm = (data) => {
        return Object.keys(data)
          .map(
            (key) =>
              encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
          )
          .join("&");
      };

      axios
        .post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        })
        .then(async function (response) {

          let obj = response.data.data
          

          for (let i = 0; i < obj.length; i++) {              
              let wage_code = obj[i].wage_code; 
              let keterangan = obj[i].ket;
              let status = await request.query(`SELECT color FROM r_absen_status WHERE kode='${wage_code}'`);
          
              obj[i].kode_status = wage_code;
              obj[i].keterangan = keterangan;
              
              if(status.recordset.length > 0){
                obj[i].color = status.recordset[0].color;
              }else{
                obj[i].color = '000000';
              }
              

              delete obj[i].wage_code;
              delete obj[i].ket;


          }

          return res.success({
            result: obj,
            message: "Fetch data successfully",
          });
        })
        .catch(function (error) {
          res.send(error);
        });
    } catch (err) {
      return res.error(err);
    }
  },
  pushabsen: async function (req, res) {
    const { nik, type, longitude, latitude, landscape } = req.body;
    const name = nik; // legacy compability variable
    // const dirPath = destination + "/temp/" + name + "/";

    return res.error({
      message: "Fitur Absen sudah tidak dapat digunakan",
    });


    // var uploadFile = req.file("file");
    // uploadFile.upload(
    //   {
    //     // dirname: dirPath,
    //   },
    //   async function onUploadComplete(err, files) {
    //     const incomingPhoto = files;
    //     if (incomingPhoto.length === 0) {
    //       return res.error({
    //         message: "No Photo uploaded",
    //       });
    //     }

    //     // const photo = incomingPhoto[0];
    //     const { fd, filename } = incomingPhoto[0];
    //     const fileType = incomingPhoto[0].type
    //     ////
    //     const formData = new FormData() 
    //     formData.append('landscape', landscape)
    //     formData.append('name', name)
    //     // formData.append('directory', dirPath)
    //     formData.append('file', 
    //       fs.createReadStream(fd),
    //       {
    //         uri: fd, 
    //         type: fileType,
    //         name: filename,
    //       }
    //     )

    //     const headers = {
    //       ...formData.getHeaders(),
    //       // "Content-Length": formData.getLengthSync()
    //     };

    //     axios.post(
    //       API_FACE_RECOG_URL,
    //       formData, 
    //       {headers} 
    //     ).then(async function (response) {
    //             // fs.removeSync(dirPath)
    //             console.log("response dr image proices", response.data);
    //             if (response.data === "N/A") {
    //               return res.error({
    //                 message: "Wajah Tidak Dikenali !",
    //               });
    //             } else {
    //               //Logic Database
    //               await DBEMP.poolConnect;
    //               try {
    //                 const request = DBEMP.pool.request();
    //                 let token = sails.config.globals.tokenabsen;
    //                 let SqlLog = `INSERT INTO log_absent
    //                 (nik, latitude, longitude)
    //                 VALUES('${nik}', '${latitude}', '${longitude}')`;
    //                 await request.query(SqlLog);
    //                 let url ="http://esales.enesis.com:8000/absensi/getemployee.php";
    //                 let formData = { nik: nik, token: token };

    //                 const encodeForm = (data) => {
    //                   return Object.keys(data)
    //                     .map(
    //                       (key) => encodeURIComponent(key) +
    //                         "=" +
    //                         encodeURIComponent(data[key])
    //                     )
    //                     .join("&");
    //                 };

    //                 const datanik = await axios
    //                   .post(url, encodeForm(formData), {
    //                     headers: { Accept: "application/json" },
    //                   })
    //                   .then(function (response) {
    //                     if (response.data.data) {
    //                       return response.data.data[0];
    //                     } else {
    //                       return "NIK tidak valid...";
    //                     }
    //                   })
    //                   .catch(function (error) {
    //                     return error;
    //                   });

    //                 if (datanik.golid) {
    //                       let OneMeterToMiles = sails.config.globals.OneMeterToMiles;
    //                       let queryMeters = `SELECT TOP 1 meter FROM r_absen_distance ORDER BY validdate DESC`;
    //                       let standart = await request.query(queryMeters);
    //                       let meter = standart.recordset[0].meter;
    //                       let golid = datanik.golid;
    //                       let miles = meter * OneMeterToMiles;

    //                       let queryDataTable = `SELECT ADR.m_area_absen_id,ADR.kode,ADR.keterangan
    //                                     FROM m_area_absen ADR
    //                                     CROSS APPLY (SELECT cos(radians(${latitude})) * 
    //                                     cos(radians(ADR.latitude)) * cos(radians(ADR.longitude) - 
    //                                     radians(${longitude})) + sin(radians(${latitude})) * 
    //                                     sin(radians(ADR.latitude))) T(ACosInput)
    //                                     CROSS APPLY (SELECT ((3959 * acos(CASE WHEN ABS(ACosInput) > 1 THEN SIGN(ACosInput)*1 ELSE ACosInput END)))) T2(distance)
    //                                     ,employee_absen_area EAA
    //                                     WHERE ADR.latitude IS NOT NULL AND 
    //                                           ADR.longitude IS NOT NULL AND 
    //                                           distance <= ${miles}
    //                                           AND ADR.m_area_absen_id = EAA.m_area_absen_id
    //                                           AND EAA.employee_id = '${nik}'
    //                                           AND EAA.isactive = 'Y'
    //                                     ORDER BY distance`;
    //                       // await request.query(`insert into log_x (id,query,nik) values (1,'${queryDataTable}','${nik}')`)
    //                       let getlocation = await request.query(queryDataTable);
    //                       const location = getlocation.recordset;


    //                       if (location.length > 0) {
    //                         let company = location[0].kode;
    //                         //let token = sails.config.globals.tokenabsen;
    //                         // let jam = moment().format("YYYY-MM-DD HH:mm:ss");
                            
    //                         let obj = { 
    //                           nik, 
    //                           type,
    //                           latitude:Number(latitude), 
    //                           longitude:Number(longitude),
    //                           company,
    //                           golid
    //                         }

    //                         return res.success({
    //                           result:obj,
    //                           message: 'OK',
    //                         });

                            
    //                       }else{

    //                       return res.error({
    //                           message:"Lokasi Absen tidak valid, Atau Cek Jaringan GPS Anda",
    //                       });                          

    //                       }



                    
    //                 } else {
    //                   return res.error({
    //                     message: "NIK tidak valid",
    //                   });
    //                 }
    //               } catch (err) {
    //                 return res.error(err);
    //               }
    //               //END - Logic Database
    //             }
    //           })
    //           .catch(function (error) {
    //             return res.error({
    //               message: error,
    //             });
    //           });
    //       }
        // });
        /* */
        ///end
      // }
    // );
  },
  submitattendance: async function(req, res) {
    const { nik, type, longitude, latitude, company,golid} = req.body;
    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      let token = sails.config.globals.tokenabsen;

      let SqlLog = `INSERT INTO log_absent
      (nik, latitude, longitude)
      VALUES('${nik}', '${latitude}', '${longitude}')`;
      await request.query(SqlLog);

      let sqlPush = `INSERT INTO employee_attendance
      (createdby,updatedby, nik, type, latitude, longitude, company, golid)
      VALUES('${nik}', '${nik}', '${nik}', ${type}, '${latitude}', '${longitude}', '${company}', '${golid}')`;

      let OneMeterToMiles = sails.config.globals.OneMeterToMiles;
      let queryMeters = `SELECT TOP 1 meter FROM r_absen_distance ORDER BY validdate DESC`;
      let standart = await request.query(queryMeters);
      let meter = standart.recordset[0].meter;
      let miles = meter * OneMeterToMiles;

      let queryDataTable = `SELECT ADR.m_area_absen_id,ADR.kode,ADR.keterangan
                    FROM m_area_absen ADR
                    CROSS APPLY (SELECT cos(radians(${latitude})) * 
                    cos(radians(ADR.latitude)) * cos(radians(ADR.longitude) - 
                    radians(${longitude})) + sin(radians(${latitude})) * 
                    sin(radians(ADR.latitude))) T(ACosInput)
                    CROSS APPLY (SELECT ((3959 * acos(CASE WHEN ABS(ACosInput) > 1 THEN SIGN(ACosInput)*1 ELSE ACosInput END)))) T2(distance)
                    ,employee_absen_area EAA
                    WHERE ADR.latitude IS NOT NULL AND 
                          ADR.longitude IS NOT NULL AND 
                          distance <= ${miles}
                          AND ADR.m_area_absen_id = EAA.m_area_absen_id
                          AND EAA.employee_id = '${nik}'
                          AND EAA.isactive = 'Y'
                    ORDER BY distance`;
      
     
      
      let getlocation = await request.query(queryDataTable);
      let lokasi = ``;
      if(getlocation.recordset.length > 0){
        lokasi = getlocation.recordset[0].kode;
        // await request.query(`insert into log_x (id,query,nik) values (2,'${queryDataTable}','Lokasi = ${nik}')`)
        if(lokasi == nik || lokasi.length != 3){
          let ins = `insert into log_wfh (nik,waktu) values ('${nik}',getdate())`;
          await request.query(ins);
        }
  
        let url = "http://esales.enesis.com:8000/absensi/getemployee.php";
        let formData = { nik: nik, token: token };
  
        const encodeForm = (data) => {
          return Object.keys(data)
            .map(
              (key) =>
                encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
            )
            .join("&");
        };

        axios
        .post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        })
        .then(function (response) {
          if (response.data.data) {
           let companyemp = response.data.data[0].company;
           let jam = moment().format("YYYY-MM-DD HH:mm:ss");
           let url ="http://esales.enesis.com:8000/absensi/pushdata.php";
           let formData = {
            nik: nik,
            company: companyemp,
            jam: jam,
            type: type,
            golid: golid,
            token: token,
            kodelokasi:lokasi,
            lat : latitude,
            lang : longitude
          };
          const encodeForm = (data) => {
            return Object.keys(data)
              .map(
                (key) =>
                  encodeURIComponent(key) +
                  "=" +
                  encodeURIComponent(data[key])
              )
              .join("&");
          };
          axios
            .post(url, encodeForm(formData), {
              headers: { Accept: "application/json" },
            })
            .then(async function (response1) {
            await request.query(sqlPush);

            let url ="http://esales.enesis.com:8000/Absensi/getnow.php";
            let formData = {
              nik:nik,
              flag:type,
              token:token,
            };
            const encodeForm = (data) => {
              return Object.keys(data)
                .map(
                  (key) =>
                    encodeURIComponent(key) +
                    "=" +
                    encodeURIComponent(data[key])
                )
                .join("&");
            };

              axios
              .post(url, encodeForm(formData), {
                headers: { Accept: "application/json" },
              })
              .then(function (response2) {
              
              let obj = response2.data.data[0]                                          
              return res.success({
                result: obj,
                message: response1.data.data,
              });

              })
              .catch(function (error) {
                return res.error(error);
              });

            })
            .catch(function (error) {
              return res.error(error);
            });


          } else {
            return res.error({
              message: "NIK tidak valid",
            });
          }
        })
        .catch(function (error) {
          res.send(error);
        });


      }else{
        lokasi = 'WFH';
        return res.error({
          message: "NIK tidak valid",
        });
  
      }
      
      }catch (err) {
        return res.error(err);
      }
  },
  submitattendancemanual: async function(req, res) {
    const { nik, type, longitude, latitude, company,golid,jam_absen} = req.body;
    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      let token = sails.config.globals.tokenabsen;
      let jam_absen_manual = moment(jam_absen,"YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD HH:mm:ss");

      let SqlLog = `INSERT INTO log_absent
      (nik, latitude, longitude,created,updated)
      VALUES('${nik}', '${latitude}', '${longitude}','${jam_absen_manual}','${jam_absen_manual}')`;
      await request.query(SqlLog);

      let sqlPush = `INSERT INTO employee_attendance
      (createdby,updatedby, nik, type, latitude, longitude, company, golid,created,updated)
      VALUES('${nik}', '${nik}', '${nik}', ${type}, '${latitude}', '${longitude}', '${company}', '${golid}','${jam_absen_manual}','${jam_absen_manual}')`;

      let OneMeterToMiles = sails.config.globals.OneMeterToMiles;
      let queryMeters = `SELECT TOP 1 meter FROM r_absen_distance ORDER BY validdate DESC`;
      let standart = await request.query(queryMeters);
      let meter = standart.recordset[0].meter;
      let miles = meter * OneMeterToMiles;

      let queryDataTable = `SELECT ADR.m_area_absen_id,ADR.kode,ADR.keterangan
                    FROM m_area_absen ADR
                    CROSS APPLY (SELECT cos(radians(${latitude})) * 
                    cos(radians(ADR.latitude)) * cos(radians(ADR.longitude) - 
                    radians(${longitude})) + sin(radians(${latitude})) * 
                    sin(radians(ADR.latitude))) T(ACosInput)
                    CROSS APPLY (SELECT ((3959 * acos(CASE WHEN ABS(ACosInput) > 1 THEN SIGN(ACosInput)*1 ELSE ACosInput END)))) T2(distance)
                    ,employee_absen_area EAA
                    WHERE ADR.latitude IS NOT NULL AND 
                          ADR.longitude IS NOT NULL AND 
                          distance <= ${miles}
                          AND ADR.m_area_absen_id = EAA.m_area_absen_id
                          AND EAA.employee_id = '${nik}'
                          AND EAA.isactive = 'Y'
                    ORDER BY distance`;
      
     
      
      let getlocation = await request.query(queryDataTable);
      let lokasi = ``;
      if(getlocation.recordset.length > 0){
        lokasi = getlocation.recordset[0].kode;
        // await request.query(`insert into log_x (id,query,nik) values (2,'${queryDataTable}','Lokasi = ${nik}')`)
        if(lokasi == nik || lokasi.length != 3){
          let ins = `insert into log_wfh (nik,waktu) values ('${nik}',getdate())`;
          await request.query(ins);
        }
  
        let url = "http://esales.enesis.com:8000/absensi/getemployee.php";
        let formData = { nik: nik, token: token };
  
        const encodeForm = (data) => {
          return Object.keys(data)
            .map(
              (key) =>
                encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
            )
            .join("&");
        };

        axios
        .post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        })
        .then(function (response) {
          if (response.data.data) {
           let companyemp = response.data.data[0].company;
           let url ="http://esales.enesis.com:8000/absensi/pushdata.php";
           let formData = {
            nik: nik,
            company: companyemp,
            jam: jam_absen_manual,
            type: type,
            golid: golid,
            token: token,
            kodelokasi:lokasi,
            lat : latitude,
            lang : longitude
          };
          const encodeForm = (data) => {
            return Object.keys(data)
              .map(
                (key) =>
                  encodeURIComponent(key) +
                  "=" +
                  encodeURIComponent(data[key])
              )
              .join("&");
          };
          axios
            .post(url, encodeForm(formData), {
              headers: { Accept: "application/json" },
            })
            .then(async function (response1) {
            await request.query(sqlPush);

            let url ="http://esales.enesis.com:8000/Absensi/getnow.php";
            let formData = {
              nik:nik,
              flag:type,
              token:token,
            };
            const encodeForm = (data) => {
              return Object.keys(data)
                .map(
                  (key) =>
                    encodeURIComponent(key) +
                    "=" +
                    encodeURIComponent(data[key])
                )
                .join("&");
            };

              axios
              .post(url, encodeForm(formData), {
                headers: { Accept: "application/json" },
              })
              .then(function (response2) {
              
              let obj = response2.data.data[0]                                          
              return res.success({
                result: obj,
                message: response1.data.data,
              });

              })
              .catch(function (error) {
                return res.error(error);
              });

            })
            .catch(function (error) {
              return res.error(error);
            });


          } else {
            return res.error({
              message: "NIK tidak valid",
            });
          }
        })
        .catch(function (error) {
          res.send(error);
        });


      }else{
        lokasi = 'WFH';
        return res.error({
          message: "NIK tidak valid",
        });
  
      }
      
      }catch (err) {
        return res.error(err);
      }
  },
  getareaabsent: async function (req, res) {
    const {
      query: { nik, longitude, latitude },
    } = req;

    await DBEMP.poolConnect;

    try {
      const request = DBEMP.pool.request();

      let OneMeterToMiles = sails.config.globals.OneMeterToMiles;
      let queryMeters = `SELECT TOP 1 meter FROM r_absen_distance ORDER BY validdate DESC`;
      let standart = await request.query(queryMeters);
      let meter = standart.recordset[0].meter;
      let miles = meter * OneMeterToMiles;

      let queryDataTable = `SELECT ADR.m_area_absen_id,ADR.kode,ADR.keterangan
                                  FROM m_area_absen ADR
                                  CROSS APPLY (SELECT cos(radians(${latitude})) * 
                                  cos(radians(ADR.latitude)) * cos(radians(ADR.longitude) - 
                                  radians(${longitude})) + sin(radians(${latitude})) * 
                                  sin(radians(ADR.latitude))) T(ACosInput)
                                  CROSS APPLY (SELECT ((3959 * acos(CASE WHEN ABS(ACosInput) > 1 THEN SIGN(ACosInput)*1 ELSE ACosInput END)))) T2(distance)
                                  ,employee_absen_area EAA
                                  WHERE ADR.latitude IS NOT NULL AND 
                                        ADR.longitude IS NOT NULL AND 
                                        distance <= ${miles}
                                        AND ADR.m_area_absen_id = EAA.m_area_absen_id
                                        AND EAA.employee_id = '${nik}'
                                        AND EAA.isactive = 'Y'
                                  ORDER BY distance`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        if (rows.length > 0) {
          return res.success({
            data: rows[0],
            message: "Fetch data successfully",
          });
        } else {
          return res.error({
            message: "Lokasi Absen Tidak Valid",
          });
        }
      });
    } catch (err) {
      return res.error(err);
    }
  },
  register: async function (req, res) {
    const { name, landscape } = req.body;
    // const dirPath = destination + "/" + name + "/";

    var uploadFile = req.file("file");
    
    
    uploadFile.upload({}, async function onUploadComplete(err, files) {
      if (err) return res.serverError(err);

        const incomingPhoto = files;
        if (incomingPhoto.length === 0) {
          return res.error({
            message: "No Photo uploaded",
          });
        }

        const { fd, type, filename } = incomingPhoto[0];
        console.log('incominfdgPhoto fd', incomingPhoto[0])

        

        const formData = new FormData()
        formData.append('name', name)
        formData.append('landscape', landscape)
        // formData.append('directory', dirPath)
        formData.append('file', 
          fs.createReadStream(fd),
          {
            uri: fd, 
            type: type,
            name: filename,
          }
        )

        const headers = {
          ...formData.getHeaders(),
          // "Content-Length": formData.getLengthSync()
        };

        axios.post(
          API_FACE_ADD_URL,
          formData, 
          {headers} 
        )
        .then(async function (response) {
          // res.send('ok')
          //logic register yang sesungguhnya
              const { nik, password, devicetoken, os, imei, brand } = req.body;
              console.log(
                "param regis",
                nik,
                password,
                devicetoken,
                os,
                imei,
                brand
              );

              await DBEMP.poolConnect;
              try {
                const request = DBEMP.pool.request();

                let cekNik = `SELECT COUNT(1) AS total_rows FROM employee_register WHERE username='${nik}' AND imei IS NOT NULL`;

                const totalItems = await request.query(cekNik);
                const count = totalItems.recordset[0].total_rows || 0;

                if (count == 0) {
                  const sql = `DELETE FROM employee_register WHERE username='${nik}'`;

                  request.query(sql, async (err, result) => {
                    if (err) {
                      return res.error(err);
                    }

                    bcrypt.hash(password, 10, async function (
                      queryError,
                      passwordHasilHash
                    ) {


                      let insert = `INSERT INTO employee_register
                      (username, password, devicetoken, os, imei, brand)
                      VALUES('${nik}','${passwordHasilHash}','${devicetoken}','${os}','${imei}','${brand}')`;
                      await request.query(insert);

                      console.log(insert);
                      

                      let Querydata = `SELECT username,devicetoken,brand,imei FROM employee_register WHERE username='${nik}'`;
                      let datas = await request.query(Querydata);
                      let data = datas.recordset;

                      return res.success({
                        data: data,
                        message: "Insert data successfully",
                      });


                      // let url = "https://employee.enesis.com/jwt/api/change-password";
                      // let formData = { nik: nik, password: password };
                
                      // const encodeForm = (data) => {
                      //   return Object.keys(data)
                      //     .map(
                      //       (key) =>
                      //         encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
                      //     )
                      //     .join("&");
                      // };
                
                      // axios
                      //   .post(url, encodeForm(formData), {
                      //     headers: {
                      //       Accept: "application/json",
                      //     },
                      //   })
                      //   .then(async function (response) {

                      //       let insert = `INSERT INTO employee_register
                      //       (username, password, devicetoken, os, imei, brand)
                      //       VALUES('${nik}','${passwordHasilHash}','${devicetoken}','${os}','${imei}','${brand}')`;
                      //       await request.query(insert);

                      //       console.log(insert);
                            

                      //       let Querydata = `SELECT username,devicetoken,brand,imei FROM employee_register WHERE username='${nik}'`;
                      //       let datas = await request.query(Querydata);
                      //       let data = datas.recordset;

                      //       return res.success({
                      //         data: data,
                      //         message: "Insert data successfully",
                      //       });
                      //   })
                      //   .catch(function (error) {
                      //     let insert = `INSERT INTO employee_register
                      //     (username, password, devicetoken, os, imei, brand)
                      //     VALUES('${nik}','${passwordHasilHash}','${devicetoken}','${os}','${imei}','${brand}')`;
                      //     console.log(insert);
                      //     console.log(error);
                      //     res.send(error);    
                      //   });
                    });
                  });
                } else {
                  return res.error({
                    message: "NIK Sudah Terdaftar",
                  });
                }
              } catch (err) {
                return res.error(err);
              } 
        }).catch(err => { 
          console.log(JSON.stringify(err))
          res.error('Gagal Menghubungi API imageprocessingapi')
        })
        // axios({
        //   method: 'POST',
        //   url: API_FACE_ADD_URL,
        //   data: formData,
        //   headers: {
        //     'Content-Type': 'multipart/form-data' ,
        //      Accept: '*/*', 
        //   }
        //   })
        //   .then(function (response) {
        //       //handle success
        //       // console.log(response);
        //       res.send('ok')
        //   })
        //   .catch(function (response) {
        //       //handle error
        //       console.log(response)
        //       res.error('Gagal Menghubungi API imageprocessingapi')
        //   });

        
    })
    // uploadFile.upload(
    //   {
    //     dirname: dirPath,
    //   },
    //   async function onUploadComplete(err, files) {
    //     if (err) return res.serverError(err);
    //     //  IF ERROR Return and send 500 error

    //     //logic baru, gambar yg di dapat, passing lagi ke api face recog

    //     //Di bawah logic lama

    //     //pasing ke tambah poto

    //     const incomingPhoto = files;
    //     if (incomingPhoto.length === 0) {
    //       return res.error({
    //         message: "No Photo uploaded",
    //       });
    //     }

    //     const { fd } = incomingPhoto[0];
    //     const path = fd; // legacy var name
    //     console.log(fd);
    //MULAI DISINI
    //     if (!fs.existsSync(dirPath)) {
    //       fs.mkdirSync(dirPath);
    //     }
 
    //     const photoName = `${name}`;

    //     let sh = null;
    //     if (landscape) {
    //       sh = sharp(path).rotate();
    //     } else {
    //       sh = sharp(path);
    //     }

    //     sh.resize(500).toFile(
    //       dirPath + photoName + ".jpg",
    //       async (err, info) => {
    //         if (err) {
    //           console.log("err", err);
    //           return res.error({
    //             message: "No Photo uploaded",
    //           });
    //         } else {
    //           console.log("ok", info);
    //           fs.removeSync(path);

    //           //logic register yang sesungguhnya
    //           const { nik, password, devicetoken, os, imei, brand } = req.body;
    //           console.log(
    //             "param regis",
    //             nik,
    //             password,
    //             devicetoken,
    //             os,
    //             imei,
    //             brand
    //           );

    //           await DBEMP.poolConnect;
    //           try {
    //             const request = DBEMP.pool.request();

    //             let cekNik = `SELECT COUNT(1) AS total_rows FROM employee_register WHERE username='${nik}' AND imei IS NOT NULL`;

    //             const totalItems = await request.query(cekNik);
    //             const count = totalItems.recordset[0].total_rows || 0;

    //             if (count == 0) {
    //               const sql = `DELETE FROM employee_register WHERE username='${nik}'`;

    //               request.query(sql, async (err, result) => {
    //                 if (err) {
    //                   return res.error(err);
    //                 }

    //                 bcrypt.hash(password, 10, async function (
    //                   queryError,
    //                   passwordHasilHash
    //                 ) {


    //                   let url = "https://employee.enesis.com/jwt/api/change-password";
    //                   let formData = { nik: nik, password: password };
                
    //                   const encodeForm = (data) => {
    //                     return Object.keys(data)
    //                       .map(
    //                         (key) =>
    //                           encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
    //                       )
    //                       .join("&");
    //                   };
                
    //                   axios
    //                     .post(url, encodeForm(formData), {
    //                       headers: {
    //                         Accept: "application/json",
    //                       },
    //                     })
    //                     .then(async function (response) {

    //                         let insert = `INSERT INTO employee_register
    //                         (username, password, devicetoken, os, imei, brand)
    //                         VALUES('${nik}','${passwordHasilHash}','${devicetoken}','${os}','${imei}','${brand}')`;
    //                         await request.query(insert);

    //                         console.log(insert);
                            

    //                         let Querydata = `SELECT username,devicetoken,brand,imei FROM employee_register WHERE username='${nik}'`;
    //                         let datas = await request.query(Querydata);
    //                         let data = datas.recordset;

    //                         return res.success({
    //                           data: data,
    //                           message: "Insert data successfully",
    //                         });
    //                     })
    //                     .catch(function (error) {
    //                       let insert = `INSERT INTO employee_register
    //                       (username, password, devicetoken, os, imei, brand)
    //                       VALUES('${nik}','${passwordHasilHash}','${devicetoken}','${os}','${imei}','${brand}')`;
    //                       console.log(insert);
    //                       console.log(error);
    //                       res.send(error);    
    //                     });
    //                 });
    //               });
    //             } else {
    //               return res.error({
    //                 message: "NIK Sudah Terdaftar",
    //               });
    //             }
    //           } catch (err) {
    //             return res.error(err);
    //           }
    //         }
    //       }
    //     );
    //   }
    // );
  },
  login: async function (req, res) {
    const { username, password, imei } = req.body;

    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      
      let token = sails.config.globals.tokenabsen;
      let url = "http://esales.enesis.com:8000/absensi/getemployee.php";
      let formData = { nik: username, token: token };

      const encodeForm = (data) => {
        return Object.keys(data)
          .map(
            (key) =>
              encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
          )
          .join("&");
      };

      let datanip = await axios
        .post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        })
        .then(function (response) {
          if (response.data.data) {
            return response.data.data[0];
          } else {

            return "NIK tidak valid";
            
          }
        })
        .catch(function (error) {
          return error;
        });
      
      
      let sql = `SELECT username,password,imei FROM employee_register WHERE username='${username}'`;
      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        if (result.recordset.length > 0) {
          const dataUser = result.recordset[0];
          bcrypt.compare(password, dataUser.password, async function (
            queryError,
            isMatch
          ) {
            if (isMatch) {
              let userimei = dataUser.imei;
              if (userimei) {
                // if (userimei == imei) {
                  let Querydata = `SELECT username,devicetoken,brand,imei FROM employee_register WHERE username='${username}'`;
                  let datas = await request.query(Querydata);
                  let data = datas.recordset;
                  
                  data[0].name = datanip.name;
                  data[0].company = datanip.company;
                  data[0].jabatan = datanip.jabatan;
                  data[0].golid = datanip.golid;

                  return res.success({
                    data: data[0],
                    message: "Login successfully",
                  });
                // } else {
                //   return res.error({
                //     error: true,
                //     data: {},
                //     message: "NIK Sudah Terdaftar Di hanphone Lain",
                //   });
                // }
              } else {
                let QueryUpdate = `UPDATE employee_register SET imei='${imei}' WHERE username='${username}'`;
                await request.query(QueryUpdate);

                let Querydata = `SELECT username,devicetoken,brand,imei FROM employee_register WHERE username='${username}'`;
                let datas = await request.query(Querydata);
                let data = datas.recordset;

                data[0].name = datanip.name;
                data[0].company = datanip.company;
                data[0].jabatan = datanip.jabatan;
                data[0].golid = datanip.golid;

                return res.success({
                  data: data[0],
                  message: "Login successfully",
                });
              }
            } else {
              return res.error({
                error: true,
                data: {},
                message: "Username / Password Tidak Match",
              });
            }
          });
        } else {
          return res.error({
            error: true,
            data: {},
            message: "Username/Password Tidak Match",
          });
        }
      });
    } catch (err) {
      return res.error(err);
    }
  },
  // DELETE RESOURCE
  reset: async function (req, res) {
    const { nik } = req.body;

    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      const sql = `DELETE FROM employee_register WHERE username='${nik}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Reset data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  synconizePassword: async function (req, res) {
    const { nik,password } = req.body;

    await DBEMP.poolConnect;
    try {
      const request = DBEMP.pool.request();
      const sql = `SELECT * FROM employee_register WHERE username='${nik}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        let jumlahrow = result.recordset.length;
        if(jumlahrow > 0){
          bcrypt.hash(password, 10, async function (
            queryError,
            passwordHasilHash
          ) {

            if(queryError){
              return res.error(queryError);
            }
            let UpdatePassword = `UPDATE employee_register SET password='${passwordHasilHash}' WHERE username='${nik}' `;
            await request.query(UpdatePassword);

            return res.success({
              message: "Syncronize data successfully",
            });

          });

        }else{

          return res.error({
            message: "User tidak ditemukan",
          });

        }



      });
    } catch (err) {
      return res.error(err);
    }
  },

  getabsennow: async function(req, res) {
    const {
      query: { nik,clocking_date }
    } = req;
    try {

      let queryDataTable = `select employee_id,to_char(clocking_date,'yyyy-mm-dd') as tgl,to_char(time_in,'HH:MI') as time_in
      ,to_char(time_out,'HH:MI') as time_out 
      from emp_clocking_detail_tbl where clocking_date = '${clocking_date}' and employee_id = '${nik}'`;


      //console.log(queryDataTable);
    
      DBEMPLOYEE.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }


        //console.log(result);
        
        const rows = result.rows[0];
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
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};

