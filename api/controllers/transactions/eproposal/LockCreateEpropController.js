const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const moment = require('moment');
const axios = require("axios");

module.exports = {

    process: async function (req, res) {
        const {nik} = req.body;
        await DB.poolConnect;
        try {

            const request = DB.pool.request();
            let jumlahData = 0;    


            if(jumlahData > 0){

                return res.error({
                    message: 'Menu sedang digunakan oleh user lain harap tunggu 5 sampai 10 menit kedepan'
                });
            
            }else{
                return res.success({
                    message:  'Menu dapat digunakan'
                });
            }

        } catch (err) {
          return res.error(err);
        }
    },
    processLockActivityCode: async function (req, res) {
        const {nik,activity_code} = req.body;
        await DB.poolConnect;
        try {

            const request = DB.pool.request();
            
            let sqlCheckStatusLock = `SELECT COUNT(1) AS jumlahData  FROM lock_create_eprop WHERE islock = 'Y' 
            AND nip <> '${nik}' AND activity_code = '${activity_code}'`;
            console.log('sqlCheckStatusLock ',sqlCheckStatusLock);
            let checkStatusLock = await request.query(sqlCheckStatusLock);
            let jumlahData = checkStatusLock.recordset.length > 0 ? checkStatusLock.recordset[0].jumlahData : 0;    


            if(jumlahData > 0){

                return res.error({
                    message: 'Activity sedang digunakan oleh user lain harap tunggu 5 sampai 10 menit kedepan'
                });
            
            }else{

                let insertLockEprop = `INSERT INTO lock_create_eprop
                (createdby, updatedby, nip, datelock, islock,activity_code)
                VALUES('${nik}', '${nik}', '${nik}', getdate(), 'Y','${activity_code}')`;
                await request.query(insertLockEprop);

                return res.success({
                    message:  'Menu dapat digunakan'
                });
            }

        } catch (err) {
          return res.error(err);
        }
    }
};